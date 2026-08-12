// app.js (Version ULTIME - Navigation, CRUD Modale, & Connexion Backend OR-Tools)

// --- CONFIGURATION DE BASE ---
const defaultResources = [
  { id: 'twr', name: 'TWR 1–4', positions: 4, icon: '♜', phases: ['aerodrome'], availability: 'Disponible', type: 'TWR' },
  { id: 'radar1', name: 'RADAR 1', positions: 4, icon: '◉', phases: ['approach-procedure', 'approach-radar'], availability: 'Disponible', type: 'APP' },
  { id: 'radar2', name: 'RADAR 2', positions: 2, icon: '◉', phases: ['enroute-procedure', 'enroute-radar'], availability: 'Disponible', type: 'ENR' }
];

const phaseLabels = {
  aerodrome: 'Aérodrome',
  'approach-procedure': 'Approche Procédure',
  'enroute-procedure': 'En-route Procédure',
  'approach-radar': 'Approche Radar',
  'enroute-radar': 'En-route Radar'
};

const state = { 
    phase: 'approach-radar', 
    selectedResources: new Set(['radar1']), 
    currentStep: 1, 
    generated: false, 
    editingPromotionId: null 
};

// --- UTILITAIRES ---
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]); }
function initials(name) { return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase(); }

// --- GESTION DU STOCKAGE LOCAL (LOCALSTORAGE) ---
let appData = loadData();
function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem('atc-planner-data'));
        if(saved) return saved;
    } catch(e) {}
    return { resources: defaultResources, instructors: [], promotions: [] };
}
function saveData() {
    localStorage.setItem('atc-planner-data', JSON.stringify(appData));
}

// --- HORLOGE EN TEMPS RÉEL ---
function updateClock() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    $('#todayDate').textContent = now.toLocaleDateString('fr-FR', options);
    $('#todayTime').textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);

// --- GESTION DE LA MODALE CSS ---
function openModal(content) { 
    $('#modalContent').innerHTML = content; 
    $('#modalBackdrop').hidden = false; 
}
function closeModal() { 
    $('#modalBackdrop').hidden = true; 
}

// --- NAVIGATION DOM (CORRECTION DES BOUTONS) ---
function setView(viewId) {
  $$('.view').forEach(view => view.style.display = 'none');
  const targetView = document.getElementById(viewId);
  if(targetView) targetView.style.display = 'block';

  $$('.nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  const headings = {
    dashboard: ['Bonjour, ' + (localStorage.getItem('userName') || 'Utilisateur'), 'Vue d’ensemble de la planification ATC'],
    promotions: ['Promotions & planification', 'Gérer les promotions et générer un planning automatique'],
    'phase-tracking': ['Suivi de phase', 'Avancement, groupes et ressources de la promotion'],
    planning: ['Planning des simulateurs', 'Vue détaillée · occupation hebdomadaire'],
    resources: ['Gestion des simulateurs', 'Positions disponibles et polyvalentes'],
    sessions: ['Séances de simulation', 'Suivi des rotations et des exercices'],
    instructors: ['Instructeurs', 'Disponibilités et affectations'],
    students: ['Étudiants', 'Suivi des promotions'],
    reports: ['Rapports', 'Capacité et performance'],
    settings: ['Paramètres', 'Configuration de la plateforme']
  };
  
  document.getElementById('pageTitle').textContent = headings[viewId][0];
  document.getElementById('pageSubtitle').textContent = headings[viewId][1];
  
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'resources') renderResources();
  if (viewId === 'instructors') renderInstructors();
}

// --- GESTION DU FORMULAIRE (STEPS) ---
function setStep(stepNumber) {
    state.currentStep = stepNumber;
    $$('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum === stepNumber);
    });

    document.querySelector('.planner-section.phase-selection')?.classList.toggle('hidden', stepNumber !== 2);
    document.querySelector('.planner-section.resources-choice')?.classList.toggle('hidden', stepNumber !== 3);
    document.getElementById('previewSection')?.classList.toggle('hidden', stepNumber !== 4);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- CALCULS ESTIMATIFS (Frontend) ---
function calculateEstimates() {
  const students = Math.max(1, Number($('#studentCount').value) || 1);
  const sessions = Number($('#sessionCount').value) || 8;
  const minutes = Number($('#sessionDuration').value) || 45;
  
  const selected = appData.resources.filter(r => state.selectedResources.has(r.id));
  const positions = selected.reduce((sum, r) => sum + r.positions, 0) || 1;
  
  const totalSessions = students * sessions;
  const totalHours = (totalSessions * minutes) / 60;
  const groups = Math.ceil(students / positions);
  
  const slotsPerDay = 7;
  const days = Math.ceil((groups * sessions) / slotsPerDay);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  document.getElementById('estimateSessions').textContent = totalSessions;
  document.getElementById('estimateHours').textContent = `${totalHours.toFixed(totalHours % 1 ? 1 : 0)} h`;
  document.getElementById('estimateGroups').textContent = `${groups} groupe${groups > 1 ? 's' : ''}`;
  document.getElementById('estimateDays').textContent = `${days} jour${days > 1 ? 's' : ''}`;
  document.getElementById('estimateEnd').textContent = endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
}

// --- RESSOURCES (CRUD AVEC MODALE) ---
function renderResourceSelector() {
  const eligible = appData.resources.filter(r => r.phases.includes(state.phase) && r.availability !== 'Indisponible');
  const container = document.getElementById('resourceSelector');
  if(!container) return;
  
  container.innerHTML = eligible.map(resource => `
    <label class="resource-choice ${state.selectedResources.has(resource.id) ? 'selected' : ''}">
      <input type="checkbox" value="${resource.id}" ${state.selectedResources.has(resource.id) ? 'checked' : ''} />
      <span class="choice-dot">✓</span><span><b>${resource.name}</b><small>${resource.positions} positions · ${resource.type}</small><i class="choice-badge">polyvalent</i></span>
    </label>`).join('');
    
  $$('#resourceSelector input').forEach(input => input.addEventListener('change', () => {
    if (input.checked) state.selectedResources.add(input.value); else state.selectedResources.delete(input.value);
    renderResourceSelector(); 
    calculateEstimates();
  }));
}

function renderResources() {
    const target = document.getElementById('resourceCards');
    if(!target) return;
    
    const twr = appData.resources.filter(r => r.type === 'TWR').reduce((sum, r) => sum + r.positions, 0);
    const radar = appData.resources.filter(r => r.type !== 'TWR').reduce((sum, r) => sum + r.positions, 0);
    document.getElementById('resourceTwrPositions').textContent = twr;
    document.getElementById('resourceRadarPositions').textContent = radar;
    document.getElementById('resourceAvailablePositions').textContent = twr + radar;
    document.getElementById('resourceAvailabilityInfo').textContent = `${appData.resources.length} ressources`;

    target.innerHTML = appData.resources.map(r => `
        <article class="resource-card">
            <div class="resource-card-header">
                <div><span class="mini-icon ${r.type === 'TWR' ? 'blue' : 'purple'}">${r.icon}</span><h3>${escapeHtml(r.name)}</h3><p>${r.positions} positions · ${r.type === 'TWR' ? 'TWR' : r.type === 'APP' ? 'Approche Radar' : 'En-route Radar'}</p></div>
                <span class="availability ${r.availability !== 'Disponible' ? 'busy' : ''}">${r.availability}</span>
            </div>
            <div class="compatibility">${r.phases.map(phase => `<span>${phaseLabels[phase]}</span>`).join('')}</div>
            <div class="resource-card-footer"><span>${r.positions} positions</span><div><button onclick="editResource('${r.id}')">Modifier</button><button onclick="deleteResource('${r.id}')" class="resource-delete">Supprimer</button></div></div>
        </article>
    `).join('');
}

function addResourceForm() {
    const formHtml = `
        <h3>Ajouter une ressource</h3>
        <p>Définissez les positions et phases compatibles.</p>
        <div class="modal-form">
            <label>Nom de la ressource <input id="modalResName" placeholder="Ex. RADAR APP 3" /></label>
            <label>Nombre de positions <input id="modalResPos" type="number" min="1" value="2" /></label>
            <label>Type <select id="modalResType"><option value="TWR">TWR</option><option value="APP">Approche Radar</option><option value="ENR">En-route Radar</option></select></label>
        </div>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="saveResource()">Ajouter</button>
        </div>
    `;
    openModal(formHtml);
}

function saveResource() {
    const name = $('#modalResName').value.trim();
    const positions = parseInt($('#modalResPos').value) || 1;
    const type = $('#modalResType').value;
    if(!name) return alert("Indiquez un nom.");
    
    const phasesByType = { TWR: ['aerodrome'], APP: ['approach-procedure', 'approach-radar'], ENR: ['enroute-procedure', 'enroute-radar'] };
    const newRes = { id: `r-${Date.now()}`, name, positions, icon: type === 'TWR' ? '♜' : '◉', phases: phasesByType[type], availability: 'Disponible', type };
    appData.resources.push(newRes);
    saveData();
    closeModal();
    renderResources();
    renderResourceSelector();
}

function editResource(id) {
    const res = appData.resources.find(r => r.id === id);
    if(!res) return;
    const formHtml = `
        <h3>Modifier ${escapeHtml(res.name)}</h3>
        <div class="modal-form">
            <label>Nom <input id="modalEditResName" value="${escapeHtml(res.name)}" /></label>
            <label>Positions <input id="modalEditResPos" type="number" min="1" value="${res.positions}" /></label>
        </div>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="updateResource('${id}')">Enregistrer</button>
        </div>
    `;
    openModal(formHtml);
}

function updateResource(id) {
    const res = appData.resources.find(r => r.id === id);
    if(!res) return;
    res.name = $('#modalEditResName').value.trim() || res.name;
    res.positions = parseInt($('#modalEditResPos').value) || res.positions;
    saveData();
    closeModal();
    renderResources();
}

function deleteResource(id) {
    openModal(`
        <h3>Supprimer cette ressource ?</h3>
        <p class="modal-confirm">Cette action est irréversible.</p>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="confirmDeleteResource('${id}')">Supprimer</button>
        </div>
    `);
}
function confirmDeleteResource(id) {
    appData.resources = appData.resources.filter(r => r.id !== id);
    state.selectedResources.delete(id);
    saveData();
    closeModal();
    renderResources();
    renderResourceSelector();
}

// --- INSTRUCTEURS (CRUD AVEC MODALE) ---
function renderInstructors() {
    const target = document.getElementById('instructorList');
    if(!target) return;
    document.getElementById('instructorCount').textContent = `${appData.instructors.length} instructeurs`;
    
    target.innerHTML = appData.instructors.map(i => `
        <article class="instructor-card">
            <div class="avatar">${initials(i.name)}</div>
            <div><strong>${escapeHtml(i.name)}</strong><p>${escapeHtml(i.speciality)} · ${i.groups || 'Disponible'}</p><span class="load">● ${i.groups ? 'Affecté' : 'Disponible aujourd’hui'}</span></div>
            <div class="instructor-actions">
                <button onclick="editInstructor('${i.id}')">Modifier</button>
                <button onclick="deleteInstructor('${i.id}')" class="remove-instructor">×</button>
            </div>
        </article>
    `).join('');
}

function addInstructorForm() {
    const formHtml = `
        <h3>Ajouter un instructeur</h3>
        <p>La spécialité détermine les phases auxquelles il peut être affecté.</p>
        <div class="modal-form">
            <label>Nom complet <input id="modalInstName" placeholder="Ex. Nadia Benali" /></label>
            <label>Spécialité <select id="modalInstSpec"><option>TWR</option><option>Approche Radar</option><option>TWR + Approche Radar</option><option>En-route Radar</option></select></label>
            <label>Groupes déjà affectés <input id="modalInstGroups" type="number" min="0" value="0" /></label>
        </div>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="saveInstructor()">Ajouter</button>
        </div>
    `;
    openModal(formHtml);
}

function saveInstructor() {
    const name = $('#modalInstName').value.trim();
    const speciality = $('#modalInstSpec').value;
    const groups = parseInt($('#modalInstGroups').value) || 0;
    if(!name) return alert("Indiquez un nom.");
    
    appData.instructors.push({ id: `i-${Date.now()}`, name, speciality, groups });
    saveData();
    closeModal();
    renderInstructors();
}

function editInstructor(id) {
    const inst = appData.instructors.find(i => i.id === id);
    if(!inst) return;
    const formHtml = `
        <h3>Modifier ${escapeHtml(inst.name)}</h3>
        <div class="modal-form">
            <label>Nom <input id="modalEditInstName" value="${escapeHtml(inst.name)}" /></label>
            <label>Spécialité <select id="modalEditInstSpec"><option ${inst.speciality === 'TWR' ? 'selected' : ''}>TWR</option><option ${inst.speciality === 'Approche Radar' ? 'selected' : ''}>Approche Radar</option><option ${inst.speciality === 'TWR + Approche Radar' ? 'selected' : ''}>TWR + Approche Radar</option><option ${inst.speciality === 'En-route Radar' ? 'selected' : ''}>En-route Radar</option></select></label>
            <label>Groupes <input id="modalEditInstGroups" type="number" min="0" value="${inst.groups || 0}" /></label>
        </div>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="updateInstructor('${id}')">Enregistrer</button>
        </div>
    `;
    openModal(formHtml);
}

function updateInstructor(id) {
    const inst = appData.instructors.find(i => i.id === id);
    if(!inst) return;
    inst.name = $('#modalEditInstName').value.trim() || inst.name;
    inst.speciality = $('#modalEditInstSpec').value;
    inst.groups = parseInt($('#modalEditInstGroups').value) || 0;
    saveData();
    closeModal();
    renderInstructors();
}

function deleteInstructor(id) {
    openModal(`
        <h3>Retirer cet instructeur ?</h3>
        <p class="modal-confirm">Il ne sera plus disponible pour les futurs plannings.</p>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="confirmDeleteInstructor('${id}')">Retirer</button>
        </div>
    `);
}
function confirmDeleteInstructor(id) {
    appData.instructors = appData.instructors.filter(i => i.id !== id);
    saveData();
    closeModal();
    renderInstructors();
}

// --- DASHBOARD ---
function renderDashboard() {
    document.getElementById('dashboardPromotionTotal').textContent = appData.promotions.length;
    document.getElementById('dashboardInstructorTotal').textContent = appData.instructors.length;
}

// --- CONFIGURATION DES ÉVÉNEMENTS (BOUTONS) ---
function setupEvents() {
  // 1. Navigation
  $$('.nav-item').forEach(button => button.addEventListener('click', function() { setView(this.dataset.view); }));
  $$('[data-go]').forEach(button => button.addEventListener('click', function() { setView(this.dataset.go); }));
  $$('.step').forEach(step => step.addEventListener('click', function() { setStep(parseInt(this.dataset.step)); }));
  $$('[data-next-step]').forEach(btn => btn.addEventListener('click', function() { setStep(parseInt(this.dataset.nextStep)); }));

  // 2. Phases et Champs
  const cards = document.querySelectorAll('.phase-card');
  cards.forEach(card => {
    card.addEventListener('click', function() {
      cards.forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      state.phase = this.dataset.phase;
      const eligible = appData.resources.filter(r => r.phases.includes(state.phase));
      state.selectedResources = new Set(eligible.map(r => r.id));
      renderResourceSelector();
      calculateEstimates();
    });
  });
  ['studentCount', 'sessionCount', 'sessionDuration'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', calculateEstimates);
  });

  // 3. Modales (Ouvrir Ajout)
  document.getElementById('openResourceCreator')?.addEventListener('click', addResourceForm);
  document.getElementById('addInstructor')?.addEventListener('click', addInstructorForm);

  // 4. Bouton Enregistrer (LocalStorage)
  document.getElementById('savePromotion')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    const newPromo = { id: `p-${Date.now()}`, name, students: $('#studentCount').value, phase: state.phase };
    appData.promotions.push(newPromo);
    saveData();
    alert('✅ Promotion "' + name + '" enregistrée avec succès !');
  });

  // 5. Bouton GÉNÉRER LE PLANNING (Connexion Backend OR-Tools)
  document.getElementById('generatePlan')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    
    // Récupération des données pour le Backend
    const selectedRes = appData.resources.filter(r => state.selectedResources.has(r.id));
    const totalPositions = selectedRes.reduce((s, r) => s + r.positions, 0);

    const data = {
        name: name,
        students: parseInt(document.getElementById('studentCount').value),
        phase: state.phase,
        sessions: parseInt(document.getElementById('sessionCount').value),
        duration: parseInt(document.getElementById('sessionDuration').value),
        startDate: document.getElementById('startDate').value || new Date().toISOString().slice(0,10),
        positions: totalPositions,
        dailyHours: [9, 10, 11, 14, 15, 16] // Horaires par défaut
    };
    
    // Envoi au Backend (API Streamlit)
    const params = new URLSearchParams({
        action: 'generate',
        data: JSON.stringify(data)
    });
    // Redirection pour déclencher le backend
    window.location.search = params.toString(); 
  });

  // 6. Topbar (Notif, Aide, Profil)
  document.querySelector('.icon-button.notification')?.addEventListener('click', () => alert('🔔 3 notifications'));
  document.querySelector('.icon-button[aria-label="Aide"]')?.addEventListener('click', () => alert('📖 Aide disponible'));
  document.querySelector('.chevron')?.addEventListener('click', () => alert('⚙️ Profil utilisateur'));
}

// --- RÉCUPÉRATION DU RÉSULTAT BACKEND (Après génération) ---
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('action') === 'result') {
    const status = urlParams.get('status');
    const message = urlParams.get('message');
    if (status === 'success') {
        alert('✅ ' + message);
    } else {
        alert('❌ Erreur OR-Tools : ' + message);
    }
    // Nettoyer l'URL pour éviter de rejouer la génération au rafraîchissement
    setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
    }, 100);
}

// --- INITIALISATION FINALE ---
document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setView('dashboard');
    renderResourceSelector();
    calculateEstimates();
    setupEvents();
    console.log('✅ ATC Planner prêt !');
});
