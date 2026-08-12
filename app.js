// app.js - Version avec Gestion des Étudiants (Modale)

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
    currentStep: 1 
};

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
        students: [], // NOUVEAU : Stockage des étudiants
        settings: { name: 'Utilisateur', start: '09:00', end: '16:30' } 
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

// --- NAVIGATION DOM ---
function setView(viewId) {
  $$('.view').forEach(view => view.style.display = 'none');
  const targetView = document.getElementById(viewId);
  if(targetView) targetView.style.display = 'block';

  $$('.nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  const headings = {
    dashboard: ['Tableau de bord', 'Vue d’ensemble'],
    promotions: ['Promotions', 'Gérer les promotions'],
    'phase-tracking': ['Suivi de phase', 'Avancement des phases'],
    planning: ['Planning', 'Vue hebdomadaire'],
    resources: ['Simulateurs', 'Positions et ressources'],
    sessions: ['Séances', 'Suivi des rotations'],
    instructors: ['Instructeurs', 'Disponibilités'],
    students: ['Étudiants', 'Suivi des promotions'], // Nom de la page
    reports: ['Rapports', 'Capacité et performance'],
    settings: ['Paramètres', 'Configuration']
  };
  
  document.getElementById('pageTitle').textContent = headings[viewId][0];
  document.getElementById('pageSubtitle').textContent = headings[viewId][1];

  // Appel du rendu des étudiants si on est sur la page Students
  if (viewId === 'students') renderStudents();
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

// --- GESTION DES ÉTUDIANTS (NOUVEAU) ---
function renderStudents() {
    const select = document.getElementById('studentPromotionSelect');
    const target = document.getElementById('studentList');
    const countLabel = document.getElementById('studentCountLabel');
    
    if (!promotions.length) {
        select.innerHTML = '<option>Aucune promotion</option>';
        target.innerHTML = '<div class="empty-state">Aucune promotion enregistrée.</div>';
        return;
    }

    // Remplissage du menu déroulant
    let optionsHtml = promotions.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    select.innerHTML = optionsHtml;
    
    // Si une promotion est sélectionnée, on affiche ses étudiants
    const selectedId = select.value;
    const promoStudents = appData.students.filter(s => s.promotionId === selectedId);
    const currentPromo = promotions.find(p => p.id === selectedId);
    
    countLabel.textContent = `${promoStudents.length} inscrit · effectif prévu ${currentPromo ? currentPromo.students : 0}`;

    if (!promoStudents.length) {
        target.innerHTML = '<div class="empty-state">Aucun étudiant nommé. Utilisez « Ajouter un étudiant » pour constituer la liste.</div>';
        return;
    }

    target.innerHTML = promoStudents.map((student, index) => `
        <article class="student-card">
            <span class="student-avatar">${initials(student.name)}</span>
            <div><strong>${escapeHtml(student.name)}</strong><small>Étudiant ${index + 1}</small></div>
            <button onclick="deleteStudent('${student.id}')">×</button>
        </article>
    `).join('');
}

// --- OUVERTURE DE LA MODALE AJOUT ÉTUDIANT ---
function openAddStudentModal() {
    if (!appData.promotions.length) {
        alert('Veuillez d\'abord créer une promotion dans le menu "Promotions".');
        return;
    }

    const options = appData.promotions.map(p => 
        `<option value="${p.id}">${escapeHtml(p.name)}</option>`
    ).join('');

    const modalHtml = `
        <h3>Ajouter un étudiant</h3>
        <div class="modal-form">
            <label>Nom complet <input id="newStudentName" placeholder="Ex. Amine Bensaid" /></label>
            <label>Promotion <select id="newStudentPromotion">${options}</select></label>
        </div>
        <div class="modal-actions">
            <button class="outline-button" onclick="closeModal()">Annuler</button>
            <button class="primary-button" onclick="saveStudentFromModal()">Ajouter</button>
        </div>
    `;
    openModal(modalHtml);
}

// --- SAUVEGARDE D'UN ÉTUDIANT ---
function saveStudentFromModal() {
    const name = document.getElementById('newStudentName').value.trim();
    const promotionId = document.getElementById('newStudentPromotion').value;

    if (!name || !promotionId) {
        alert('Veuillez remplir le nom et sélectionner une promotion.');
        return;
    }

    // Ajout de l'étudiant
    appData.students.push({
        id: `student-${Date.now()}`,
        name: name,
        promotionId: promotionId
    });
    
    // Mise à jour du nombre d'étudiants dans la promotion (incrément de 1)
    const promo = appData.promotions.find(p => p.id === promotionId);
    if (promo) promo.students = (parseInt(promo.students) || 0) + 1;

    saveData();
    closeModal();
    renderStudents(); // Recharge la liste
    alert('✅ Étudiant "' + name + '" ajouté avec succès !');
}

// --- SUPPRESSION D'UN ÉTUDIANT ---
function deleteStudent(id) {
    if (!confirm('Supprimer cet étudiant ?')) return;

    const student = appData.students.find(s => s.id === id);
    if (student) {
        // Mise à jour du compteur de la promotion
        const promo = appData.promotions.find(p => p.id === student.promotionId);
        if (promo) promo.students = Math.max(0, (parseInt(promo.students) || 0) - 1);
        
        appData.students = appData.students.filter(s => s.id !== id);
        saveData();
        renderStudents();
    }
}

// --- CONFIGURATION DES ÉVÉNEMENTS (BOUTONS) ---
function setupEvents() {
  console.log('✅ Initialisation des boutons...');
  
  // 1. Navigation latérale
  $$('.nav-item').forEach(button => {
    button.addEventListener('click', function() { setView(this.dataset.view); });
  });

  // 2. Tous les boutons data-go
  $$('[data-go]').forEach(button => {
    button.addEventListener('click', function() { setView(this.dataset.go); });
  });

  // 3. Le stepper (haut du formulaire)
  $$('.step').forEach(step => {
    step.addEventListener('click', function() { setStep(parseInt(this.dataset.step)); });
  });

  // 4. Boutons Suivant / Précédent
  $$('[data-next-step]').forEach(btn => {
    btn.addEventListener('click', function() { setStep(parseInt(this.dataset.nextStep)); });
  });

  // 5. Cartes des phases
  const cards = document.querySelectorAll('.phase-card');
  cards.forEach(card => {
    card.addEventListener('click', function() {
      cards.forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      state.phase = this.dataset.phase;
    });
  });

  // 6. Ajouter un étudiant (Le bouton qui ne marchait pas)
  document.getElementById('addStudent')?.addEventListener('click', openAddStudentModal);

  // 7. Sauvegarde promotion
  document.getElementById('savePromotion')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    
    // Ajout de la promotion dans le stockage
    appData.promotions.push({ 
        id: `p-${Date.now()}`, 
        name, 
        students: parseInt(document.getElementById('studentCount').value), 
        phase: state.phase 
    });
    saveData();
    
    alert('✅ Promotion "' + name + '" enregistrée !');
  });

  // 8. Bouton Générer
  document.getElementById('generatePlan')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    alert('🚀 Génération lancée pour "' + name + '"');
  });

  // 9. Topbar
  document.querySelector('.icon-button.notification')?.addEventListener('click', () => alert('🔔 3 notifications'));
  document.querySelector('.icon-button[aria-label="Aide"]')?.addEventListener('click', () => alert('📖 Aide disponible'));
  document.querySelector('.chevron')?.addEventListener('click', () => alert('⚙️ Profil utilisateur'));
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', function() {
    setView('dashboard');
    setupEvents();
    console.log('✅ ATC Planner Étudiants prêt !');
});
