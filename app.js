// app.js - Version avec répartition automatique des groupes

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
    return { 
        resources: defaultResources, 
        instructors: [], 
        promotions: [], 
        settings: { name: 'Utilisateur', start: '09:00', end: '16:30', duration: 45, break: 45 } 
    };
}
function saveData() {
    localStorage.setItem('atc-planner-data', JSON.stringify(appData));
}

// --- GESTION DE LA MODALE CSS ---
function openModal(content) { 
    $('#modalContent').innerHTML = content; 
    $('#modalBackdrop').hidden = false; 
}
function closeModal() { 
    $('#modalBackdrop').hidden = true; 
}

// --- HORLOGE EN TEMPS RÉEL ---
function updateClock() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    $('#todayDate').textContent = now.toLocaleDateString('fr-FR', options);
    $('#todayTime').textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);

// --- NAVIGATION DOM ---
function setView(viewId) {
  $$('.view').forEach(view => view.style.display = 'none');
  const targetView = document.getElementById(viewId);
  if(targetView) targetView.style.display = 'block';

  $$('.nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  const userName = appData.settings.name || 'Utilisateur';

  const headings = {
    dashboard: ['Bonjour, ' + userName, 'Vue d’ensemble de la planification ATC'],
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
  if (viewId === 'phase-tracking') renderPhaseTracking(); // Appel explicite
}

// --- GESTION DU FORMULAIRE (STEPS) ---
function setStep(stepNumber) {
    state.currentStep = stepNumber;
    $$('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum === stepNumber);
    });

    document.getElementById('sectionPromotion')?.classList.toggle('hidden', stepNumber !== 1);
    document.getElementById('sectionParams')?.classList.toggle('hidden', stepNumber !== 2);
    document.getElementById('sectionResources')?.classList.toggle('hidden', stepNumber !== 3);
    document.getElementById('sectionPreview')?.classList.toggle('hidden', stepNumber !== 4);
    
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
  
  const name = document.getElementById('cohortName').value.trim() || '—';
  const phaseName = phaseLabels[state.phase] || '—';
  const resName = selected.map(r => r.name).join(', ') || '—';
  
  document.getElementById('previewName').textContent = name;
  document.getElementById('previewStudents').textContent = students;
  document.getElementById('previewPhase').textContent = phaseName;
  document.getElementById('previewResources').textContent = resName + ` (${positions} positions)`;

  renderInstructorPills();
}

// --- RESSOURCES & INSTRUCTEURS ---
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

function renderInstructorPills() {
    const target = document.getElementById('instructorPills');
    if (!target) return;

    const compatible = appData.instructors.filter(instructor => {
        if (state.phase === 'aerodrome') return instructor.speciality === 'TWR' || instructor.speciality === 'TWR + Approche Radar';
        if (state.phase === 'approach-procedure' || state.phase === 'approach-radar') return instructor.speciality === 'Approche Radar' || instructor.speciality === 'TWR + Approche Radar';
        return instructor.speciality === 'En-route Radar';
    });

    if (!compatible.length) {
        target.innerHTML = '<span>Instructeurs compatibles</span><small>Aucun instructeur de cette spécialité. Ajoutez-en depuis le menu Instructeurs.</small>';
        return;
    }
    
    target.innerHTML = `<span>Instructeurs compatibles</span>${compatible.map((instructor, index) => `
        <label><input type="checkbox" value="${instructor.id}" ${index < 4 ? 'checked' : ''} /> ${escapeHtml(instructor.name)}</label>
    `).join('')}`;
}

// --- SUIVI DE PHASE (AVEC RÉPARTITION DES GROUPES) ---
function renderPhaseTracking() {
    // Sélection de la promotion à suivre (la première ou celle sélectionnée)
    const promotion = appData.promotions[0];
    const journey = document.getElementById('phaseJourney');
    const target = document.getElementById('phaseInstructorAssignments');
    const groupTarget = document.getElementById('phaseGroups');

    if (!promotion) {
        $('#phaseTrackingTitle').textContent = 'Suivi de phase';
        $('#phaseTrackingSubtitle').textContent = 'Sélectionnez une promotion dans la liste pour consulter son avancement.';
        journey.innerHTML = '<div class="empty-state">Aucune promotion enregistrée.</div>';
        $('#phaseMetricLabel').textContent = 'Aucune promotion sélectionnée';
        $('#phaseMetricStatus').textContent = 'En attente';
        if(target) target.innerHTML = '';
        if(groupTarget) groupTarget.innerHTML = '';
        return;
    }

    const resource = appData.resources.find(r => state.selectedResources.has(r.id)) || defaultResources[1];
    const positions = resource ? resource.positions : 1;
    const groups = Math.ceil(promotion.students / positions);
    const duration = 45;
    const totalHours = promotion.students * promotion.sessions * duration / 60;

    $('#phaseTrackingTitle').textContent = `Suivi de la formation — ${promotion.name}`;
    $('#phaseTrackingSubtitle').textContent = `${promotion.students} étudiants · ${promotion.sessions} séances`;
    $('#phaseMetricLabel').textContent = `${phaseLabels[promotion.phase] || 'Phase'} · ${promotion.name}`;
    $('#phaseMetricStatus').textContent = 'Planifiée';
    $('#phaseStudents').textContent = promotion.students;
    $('#phaseSessions').textContent = promotion.sessions;
    $('#phaseDuration').textContent = `${duration} min`;
    $('#phasePositions').textContent = positions;

    // --- RÉPARTITION DES GROUPES SUR LES INSTRUCTEURS ---
    const compatible = appData.instructors.filter(instructor => {
        if (promotion.phase === 'aerodrome') return instructor.speciality === 'TWR' || instructor.speciality === 'TWR + Approche Radar';
        if (promotion.phase === 'approach-procedure' || promotion.phase === 'approach-radar') return instructor.speciality === 'Approche Radar' || instructor.speciality === 'TWR + Approche Radar';
        return instructor.speciality === 'En-route Radar';
    });

    if (target) {
        if (!compatible.length) {
            target.innerHTML = '<div class="empty-state">Aucun instructeur compatible. Ajoutez-en dans le menu Instructeurs.</div>';
        } else {
            // Calcul de la répartition
            const totalGroups = groups;
            const numInstructors = compatible.length;
            const baseGroups = Math.floor(totalGroups / numInstructors);
            const remainder = totalGroups % numInstructors;

            let instructorList = compatible.map((inst, index) => {
                let assignedGroups = baseGroups;
                if (index < remainder) assignedGroups += 1;
                return {
                    ...inst,
                    groups: assignedGroups
                };
            });

            target.innerHTML = instructorList.map(inst => `
                <div class="assignment-row">
                    <span class="avatar">${initials(inst.name)}</span>
                    <strong>${escapeHtml(inst.name)}</strong>
                    <small>${escapeHtml(inst.speciality)} · ${inst.groups} groupe(s)</small>
                </div>
            `).join('');
        }
    }

    // --- TABLEAU DES GROUPES ---
    if (groupTarget) {
        const rows = Array.from({ length: groups }, (_, index) => {
            const first = index * positions + 1;
            const last = Math.min(promotion.students, (index + 1) * positions);
            const count = last - first + 1;
            return `<div class="group-table-row"><strong>Groupe ${index + 1}</strong><span>Étudiants ${first} – ${last}</span><span>${count}</span><span>${promotion.sessions}</span><span>${(promotion.sessions * duration / 60).toFixed(1)} h</span></div>`;
        }).join('');
        groupTarget.innerHTML = `<div class="group-table-head"><span>Groupe</span><span>Étudiants</span><span>Effectif</span><span>Séances</span><span>Durée</span></div>${rows}<div class="group-table-row"><strong>Total</strong><span></span><span>${promotion.students}</span><span>${promotion.sessions * groups}</span><span>${totalHours.toFixed(1)} h</span></div>`;
    }
}

// --- RESSOURCES CRUD ---
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
        <article class="resource-card"><div class="resource-card-header"><div><span class="mini-icon ${r.type === 'TWR' ? 'blue' : 'purple'}">${r.icon}</span><h3>${escapeHtml(r.name)}</h3><p>${r.positions} positions · ${r.type}</p></div><span class="availability ${r.availability !== 'Disponible' ? 'busy' : ''}">${r.availability}</span></div><div class="compatibility">${r.phases.map(phase => `<span>${phaseLabels[phase]}</span>`).join('')}</div><div class="resource-card-footer"><span>${r.positions} positions</span><div><button onclick="editResource('${r.id}')">Modifier</button><button onclick="deleteResource('${r.id}')" class="resource-delete">Supprimer</button></div></div></article>
    `).join('');
}

function addResourceForm() {
    const formHtml = `
        <h3>Ajouter une ressource</h3>
        <div class="modal-form">
            <label>Nom <input id="modalResName" placeholder="RADAR 3" /></label>
            <label>Positions <input id="modalResPos" type="number" min="1" value="2" /></label>
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
    if(!name) return;
    const phases = { TWR: ['aerodrome'], APP: ['approach-procedure', 'approach-radar'], ENR: ['enroute-procedure', 'enroute-radar'] };
    appData.resources.push({ id: `r-${Date.now()}`, name, positions, icon: type === 'TWR' ? '♜' : '◉', phases: phases[type], availability: 'Disponible', type });
    saveData(); closeModal(); renderResources(); renderResourceSelector();
}

function editResource(id) {
    const r = appData.resources.find(i => i.id === id);
    if(!r) return;
    openModal(`
        <h3>Modifier ${escapeHtml(r.name)}</h3>
        <div class="modal-form">
            <label>Nom <input id="modalEditResName" value="${escapeHtml(r.name)}" /></label>
            <label>Positions <input id="modalEditResPos" type="number" min="1" value="${r.positions}" /></label>
        </div>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="updateResource('${id}')">Enregistrer</button>
        </div>
    `);
}

function updateResource(id) {
    const r = appData.resources.find(i => i.id === id);
    if(!r) return;
    r.name = $('#modalEditResName').value.trim() || r.name;
    r.positions = parseInt($('#modalEditResPos').value) || r.positions;
    saveData(); closeModal(); renderResources();
}

function deleteResource(id) {
    openModal(`
        <h3>Supprimer</h3>
        <p>Cette action est irréversible.</p>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="confirmDeleteResource('${id}')">Supprimer</button>
        </div>
    `);
}
function confirmDeleteResource(id) {
    appData.resources = appData.resources.filter(i => i.id !== id);
    state.selectedResources.delete(id);
    saveData(); closeModal(); renderResources(); renderResourceSelector();
}

// --- INSTRUCTEURS CRUD ---
function renderInstructors() {
    const target = document.getElementById('instructorList');
    if(!target) return;
    document.getElementById('instructorCount').textContent = `${appData.instructors.length} instructeurs`;
    target.innerHTML = appData.instructors.map(i => `
        <article class="instructor-card"><div class="avatar">${initials(i.name)}</div><div><strong>${escapeHtml(i.name)}</strong><p>${escapeHtml(i.speciality)}</p><span class="load">● ${i.groups ? 'Affecté' : 'Disponible'}</span></div><div class="instructor-actions"><button onclick="editInstructor('${i.id}')">Modifier</button><button onclick="deleteInstructor('${i.id}')" class="remove-instructor">×</button></div></article>
    `).join('');
}

function addInstructorForm() {
    const formHtml = `
        <h3>Ajouter un instructeur</h3>
        <div class="modal-form">
            <label>Nom <input id="modalInstName" placeholder="Ex. Nadia Benali" /></label>
            <label>Spécialité <select id="modalInstSpec"><option>TWR</option><option>Approche Radar</option><option>TWR + Approche Radar</option><option>En-route Radar</option></select></label>
            <label>Groupes <input id="modalInstGroups" type="number" min="0" value="0" /></label>
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
    if(!name) return;
    appData.instructors.push({ id: `i-${Date.now()}`, name, speciality, groups });
    saveData(); closeModal(); renderInstructors();
    renderInstructorPills();
}

function editInstructor(id) {
    const i = appData.instructors.find(x => x.id === id);
    if(!i) return;
    openModal(`
        <h3>Modifier ${escapeHtml(i.name)}</h3>
        <div class="modal-form">
            <label>Nom <input id="modalEditInstName" value="${escapeHtml(i.name)}" /></label>
            <label>Spécialité <select id="modalEditInstSpec"><option ${i.speciality === 'TWR' ? 'selected' : ''}>TWR</option><option ${i.speciality === 'Approche Radar' ? 'selected' : ''}>Approche Radar</option><option ${i.speciality === 'TWR + Approche Radar' ? 'selected' : ''}>TWR + Approche Radar</option><option ${i.speciality === 'En-route Radar' ? 'selected' : ''}>En-route Radar</option></select></label>
            <label>Groupes <input id="modalEditInstGroups" type="number" min="0" value="${i.groups || 0}" /></label>
        </div>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="updateInstructor('${id}')">Enregistrer</button>
        </div>
    `);
}

function updateInstructor(id) {
    const i = appData.instructors.find(x => x.id === id);
    if(!i) return;
    i.name = $('#modalEditInstName').value.trim() || i.name;
    i.speciality = $('#modalEditInstSpec').value;
    i.groups = parseInt($('#modalEditInstGroups').value) || 0;
    saveData(); closeModal(); renderInstructors();
    renderInstructorPills();
}

function deleteInstructor(id) {
    openModal(`
        <h3>Retirer cet instructeur</h3>
        <p>Il ne sera plus disponible.</p>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="confirmDeleteInstructor('${id}')">Retirer</button>
        </div>
    `);
}
function confirmDeleteInstructor(id) {
    appData.instructors = appData.instructors.filter(i => i.id !== id);
    saveData(); closeModal(); renderInstructors();
    renderInstructorPills();
}

// --- PARAMÈTRES ---
function renderSettings() {
    document.getElementById('settingAcademyName').value = 'Aviation Academy';
    document.getElementById('settingDefaultStart').value = appData.settings.start || '09:00';
    document.getElementById('settingDefaultEnd').value = appData.settings.end || '16:30';
    document.getElementById('settingDefaultDuration').value = appData.settings.duration || 45;
    document.getElementById('settingDefaultBreak').value = appData.settings.break || 45;
    document.getElementById('settingUserName').value = appData.settings.name || 'Utilisateur';
}

function saveSettings() {
    const newName = document.getElementById('settingUserName').value.trim();
    const newStart = document.getElementById('settingDefaultStart').value;
    const newEnd = document.getElementById('settingDefaultEnd').value;
    const newDuration = parseInt(document.getElementById('settingDefaultDuration').value) || 45;
    const newBreak = parseInt(document.getElementById('settingDefaultBreak').value) || 45;

    appData.settings = {
        name: newName || 'Utilisateur',
        start: newStart,
        end: newEnd,
        duration: newDuration,
        break: newBreak
    };
    saveData();

    document.querySelector('.user-name strong').textContent = appData.settings.name;
    document.querySelector('.avatar').textContent = initials(appData.settings.name);
    document.getElementById('pageTitle').textContent = 'Bonjour, ' + appData.settings.name;

    alert('✅ Paramètres enregistrés avec succès !');
}

// --- DASHBOARD ---
function renderDashboard() {
    document.getElementById('dashboardPromotionTotal').textContent = appData.promotions.length;
    document.getElementById('dashboardInstructorTotal').textContent = appData.instructors.length;
}

// --- CONFIGURATION DES ÉVÉNEMENTS ---
function setupEvents() {
  $$('.nav-item').forEach(btn => btn.addEventListener('click', function() { setView(this.dataset.view); }));
  $$('[data-go]').forEach(btn => btn.addEventListener('click', function() { setView(this.dataset.go); }));
  $$('.step').forEach(step => step.addEventListener('click', function() { setStep(parseInt(this.dataset.step)); }));
  $$('[data-next-step]').forEach(btn => btn.addEventListener('click', function() { setStep(parseInt(this.dataset.nextStep)); }));

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

  document.getElementById('saveSettings')?.addEventListener('click', saveSettings);
  document.getElementById('openResourceCreator')?.addEventListener('click', addResourceForm);
  document.getElementById('addInstructor')?.addEventListener('click', addInstructorForm);
  
  document.getElementById('savePromotion')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) return alert('Veuillez donner un nom.');
    appData.promotions.push({ id: `p-${Date.now()}`, name, students: $('#studentCount').value, phase: state.phase });
    saveData();
    alert('✅ Promotion "' + name + '" enregistrée.');
  });

  document.getElementById('generatePlan')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) return alert('Veuillez donner un nom.');
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

// --- RÉSULTAT BACKEND ---
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('action') === 'result') {
    alert(urlParams.get('status') === 'success' ? '✅ ' + urlParams.get('message') : '❌ ' + urlParams.get('message'));
    setTimeout(() => { window.history.replaceState({}, document.title, window.location.pathname); }, 100);
}

// --- INITIALISATION FINALE ---
document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setView('dashboard');
    renderResourceSelector();
    calculateEstimates();
    setupEvents();
    console.log('✅ ATC Planner avec répartition des groupes OK');
});
