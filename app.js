// app.js (Version ULTIME - Navigation + Gestion Ressources/Instructeurs + Horloge)

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

// --- ÉTAT DE L'APPLICATION ---
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
function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem('atc-planner-data'));
        if(saved) return saved;
    } catch(e) {}
    return { resources: defaultResources, instructors: [], promotions: [] };
}

function saveData(data) {
    localStorage.setItem('atc-planner-data', JSON.stringify(data));
}

let appData = loadData();

// --- HORLOGE EN TEMPS RÉEL ---
function updateClock() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    $('#todayDate').textContent = now.toLocaleDateString('fr-FR', options);
    $('#todayTime').textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);

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

// --- CALCULS ESTIMATIFS ---
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

// --- RESSOURCES (VUE COMPLÈTE) ---
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
            <div class="resource-card-footer"><span>${r.positions} positions</span><div><button onclick="alert('Modifier ${escapeHtml(r.name)}')">Modifier</button><button onclick="deleteResource('${r.id}')" class="resource-delete">Supprimer</button></div></div>
        </article>
    `).join('');
}

function deleteResource(id) {
    if(!confirm("Supprimer cette ressource ?")) return;
    appData.resources = appData.resources.filter(r => r.id !== id);
    state.selectedResources.delete(id);
    saveData(appData);
    renderResources();
}

function addResource() {
    const name = prompt("Nom de la nouvelle ressource (ex: RADAR 3)");
    if(!name) return;
    const newRes = { id: `r-${Date.now()}`, name, positions: 2, icon: '◉', phases: ['approach-radar', 'enroute-radar'], availability: 'Disponible', type: 'APP' };
    appData.resources.push(newRes);
    saveData(appData);
    renderResources();
    renderResourceSelector();
}

// --- INSTRUCTEURS (VUE COMPLÈTE) ---
function renderInstructors() {
    const target = document.getElementById('instructorList');
    if(!target) return;
    document.getElementById('instructorCount').textContent = `${appData.instructors.length} instructeurs`;
    
    target.innerHTML = appData.instructors.map(i => `
        <article class="instructor-card">
            <div class="avatar">${initials(i.name)}</div>
            <div><strong>${escapeHtml(i.name)}</strong><p>${escapeHtml(i.speciality)}</p><span class="load">● ${i.groups || 'Disponible'}</span></div>
            <div class="instructor-actions">
                <button onclick="alert('Modifier ${escapeHtml(i.name)}')">Modifier</button>
                <button onclick="deleteInstructor('${i.id}')" class="remove-instructor">×</button>
            </div>
        </article>
    `).join('');
}

function deleteInstructor(id) {
    if(!confirm("Supprimer cet instructeur ?")) return;
    appData.instructors = appData.instructors.filter(i => i.id !== id);
    saveData(appData);
    renderInstructors();
}

function addInstructor() {
    const name = prompt("Nom de l'instructeur");
    if(!name) return;
    const newInst = { id: `i-${Date.now()}`, name, speciality: 'Approche Radar', groups: 0 };
    appData.instructors.push(newInst);
    saveData(appData);
    renderInstructors();
}

// --- DASHBOARD ---
function renderDashboard() {
    document.getElementById('dashboardPromotionTotal').textContent = appData.promotions.length;
    document.getElementById('dashboardInstructorTotal').textContent = appData.instructors.length;
}

// --- CONFIGURATION DES ÉVÉNEMENTS (BOUTONS) ---
function setupEvents() {
  // 1. Navigation latérale
  $$('.nav-item').forEach(button => {
    button.addEventListener('click', function() { setView(this.dataset.view); });
  });

  // 2. Les boutons data-go
  $$('[data-go]').forEach(button => {
    button.addEventListener('click', function() { setView(this.dataset.go); });
  });

  // 3. Le stepper
  $$('.step').forEach(step => {
    step.addEventListener('click', function() { setStep(parseInt(this.dataset.step)); });
  });

  // 4. Boutons Next / Prev
  $$('[data-next-step]').forEach(btn => {
    btn.addEventListener('click', function() { setStep(parseInt(this.dataset.nextStep)); });
  });

  // 5. Cartes de phases
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

  // 6. Champs du formulaire
  ['studentCount', 'sessionCount', 'sessionDuration'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', calculateEstimates);
  });

  // 7. Bouton "Ajouter une ressource"
  document.getElementById('openResourceCreator')?.addEventListener('click', addResource);

  // 8. Bouton "Ajouter un instructeur"
  document.getElementById('addInstructor')?.addEventListener('click', addInstructor);

  // 9. Bouton Enregistrer/Générer
  document.getElementById('savePromotion')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    alert('✅ Promotion "' + name + '" enregistrée !');
  });
  
  document.getElementById('generatePlan')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    alert('🚀 Lancement OR-Tools pour "' + name + '"');
  });

  // 10. Boutons de l'en-tête
  document.querySelector('.icon-button.notification')?.addEventListener('click', () => alert('🔔 3 notifications'));
  document.querySelector('.icon-button[aria-label="Aide"]')?.addEventListener('click', () => alert('📖 Aide disponible'));
  document.querySelector('.chevron')?.addEventListener('click', () => alert('⚙️ Profil utilisateur'));
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
