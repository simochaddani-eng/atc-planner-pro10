// app.js (Version FINALE - Prévisualisation & Paramètres fonctionnels)

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
    return { resources: defaultResources, instructors: [], promotions: [], settings: { name: 'SIMO', start: '09:00', end: '16:00' } };
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

// --- NAVIGATION DOM ---
function setView(viewId) {
  $$('.view').forEach(view => view.style.display = 'none');
  const targetView = document.getElementById(viewId);
  if(targetView) targetView.style.display = 'block';

  $$('.nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  const headings = {
    dashboard: ['Bonjour, ' + (appData.settings.name || 'Utilisateur'), 'Vue d’ensemble de la planification ATC'],
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
  if (viewId === 'settings') renderSettings();
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

// --- CALCULS ESTIMATIFS ET PRÉVISUALISATION ---
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
  
  // MISE À JOUR DE LA PRÉVISUALISATION (Étape 4)
  const name = document.getElementById('cohortName').value.trim() || '—';
  const phaseName = phaseLabels[state.phase] || '—';
  const resName = selected.map(r => r.name).join(', ') || '—';
  
  document.getElementById('previewName').textContent = name;
  document.getElementById('previewStudents').textContent = students;
  document.getElementById('previewPhase').textContent = phaseName;
  document.getElementById('previewResources').textContent = resName + ` (${positions} positions)`;
}

// --- RESSOURCES (CRUD) ---
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
        <article class="resource-card"><div class="resource-card-header"><div><span class="mini-icon ${r.type === 'TWR' ? 'blue' : 'purple'}">${r.icon}</span><h3>${escapeHtml(r.name)}</h3><p>${r.positions} positions · ${r.type === 'TWR' ? 'TWR' : r.type === 'APP' ? 'Approche Radar' : 'En-route Radar'}</p></div><span class="availability ${r.availability !== 'Disponible' ? 'busy' : ''}">${r.availability}</span></div><div class="compatibility">${r.phases.map(phase => `<span>${phaseLabels[phase]}</span>`).join('')}</div><div class="resource-card-footer"><span>${r.positions} positions</span><div><button onclick="editResource('${r.id}')">Modifier</button><button onclick="deleteResource('${r.id}')" class="resource-delete">Supprimer</button></div></div></article>
    `).join('');
}

// --- PARAMÈTRES (SAUVEGARDE) ---
function renderSettings() {
    document.getElementById('settingAcademyName').value = 'Aviation Academy';
    document.getElementById('settingDefaultStart').value = appData.settings.start || '09:00';
    document.getElementById('settingDefaultEnd').value = appData.settings.end || '16:00';
    document.getElementById('settingDefaultDuration').value = 45;
    document.getElementById('settingDefaultBreak').value = 15;
    document.getElementById('settingUserName').value = appData.settings.name || 'SIMO';
}

function saveSettings() {
    appData.settings.name = document.getElementById('settingUserName').value.trim() || 'Utilisateur';
    appData.settings.start = document.getElementById('settingDefaultStart').value;
    appData.settings.end = document.getElementById('settingDefaultEnd').value;
    saveData();
    // Mise à jour immédiate du nom
    document.querySelector('.user-name strong').textContent = appData.settings.name;
    document.querySelector('.avatar').textContent = initials(appData.settings.name);
    document.getElementById('pageTitle').textContent = 'Bonjour, ' + appData.settings.name;
    alert('✅ Paramètres enregistrés avec succès !');
}

// --- INSTRUCTEURS ---
function renderInstructors() {
    const target = document.getElementById('instructorList');
    if(!target) return;
    document.getElementById('instructorCount').textContent = `${appData.instructors.length} instructeurs`;
    target.innerHTML = appData.instructors.map(i => `
        <article class="instructor-card"><div class="avatar">${initials(i.name)}</div><div><strong>${escapeHtml(i.name)}</strong><p>${escapeHtml(i.speciality)} · ${i.groups || 'Disponible'}</p><span class="load">● ${i.groups ? 'Affecté' : 'Disponible aujourd’hui'}</span></div><div class="instructor-actions"><button onclick="editInstructor('${i.id}')">Modifier</button><button onclick="deleteInstructor('${i.id}')" class="remove-instructor">×</button></div></article>
    `).join('');
}

// --- DASHBOARD ---
function renderDashboard() {
    document.getElementById('dashboardPromotionTotal').textContent = appData.promotions.length;
    document.getElementById('dashboardInstructorTotal').textContent = appData.instructors.length;
}

// --- CONFIGURATION DES ÉVÉNEMENTS ---
function setupEvents() {
  // 1. Navigation
  $$('.nav-item').forEach(button => button.addEventListener('click', function() { setView(this.dataset.view); }));
  $$('[data-go]').forEach(button => button.addEventListener('click', function() { setView(this.dataset.go); }));
  $$('.step').forEach(step => step.addEventListener('click', function() { setStep(parseInt(this.dataset.step)); }));
  $$('[data-next-step]').forEach(btn => btn.addEventListener('click', function() { setStep(parseInt(this.dataset.nextStep)); }));

  // 2. Phases et Champs (Mise à jour automatique de la prévisualisation)
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
  ['studentCount', 'sessionCount', 'sessionDuration', 'cohortName'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', calculateEstimates);
  });

  // 3. Bouton Enregistrer les Paramètres
  document.getElementById('saveSettings')?.addEventListener('click', saveSettings);

  // 4. Bouton Enregistrer la promotion (Locales)
  document.getElementById('savePromotion')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    const newPromo = { id: `p-${Date.now()}`, name, students: $('#studentCount').value, phase: state.phase };
    appData.promotions.push(newPromo);
    saveData();
    alert('✅ Promotion "' + name + '" enregistrée avec succès !');
  });

  // 5. Bouton GÉNÉRER (Connexion Backend)
  document.getElementById('generatePlan')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    const totalPos = appData.resources.filter(r => state.selectedResources.has(r.id)).reduce((s, r) => s + r.positions, 0);
    const data = {
        name: name,
        students: parseInt(document.getElementById('studentCount').value),
        phase: state.phase,
        sessions: parseInt(document.getElementById('sessionCount').value),
        duration: parseInt(document.getElementById('sessionDuration').value),
        startDate: document.getElementById('startDate').value || new Date().toISOString().slice(0,10),
        positions: totalPos,
        dailyHours: [9, 10, 11, 14, 15, 16]
    };
    const params = new URLSearchParams({ action: 'generate', data: JSON.stringify(data) });
    window.location.search = params.toString();
  });
}

// --- RÉCUPÉRATION DU RÉSULTAT BACKEND ---
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('action') === 'result') {
    const status = urlParams.get('status');
    const message = urlParams.get('message');
    alert(status === 'success' ? '✅ ' + message : '❌ ' + message);
    setTimeout(() => { window.history.replaceState({}, document.title, window.location.pathname); }, 100);
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
