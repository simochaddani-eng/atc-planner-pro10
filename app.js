// app.js - Version ULTRA SIMPLE pour boutons fiables

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

// --- NAVIGATION DOM ---
function setView(viewId) {
  // 1. Cacher tout
  $$('.view').forEach(view => view.style.display = 'none');
  // 2. Afficher la cible
  const targetView = document.getElementById(viewId);
  if(targetView) targetView.style.display = 'block';

  // 3. Mettre en surbrillance le menu
  $$('.nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  // 4. Mettre à jour le titre
  const headings = {
    dashboard: ['Tableau de bord', 'Vue d’ensemble'],
    promotions: ['Promotions', 'Gérer les promotions'],
    'phase-tracking': ['Suivi de phase', 'Avancement des phases'],
    planning: ['Planning', 'Vue hebdomadaire'],
    resources: ['Simulateurs', 'Positions et ressources'],
    sessions: ['Séances', 'Suivi des rotations'],
    instructors: ['Instructeurs', 'Disponibilités'],
    students: ['Étudiants', 'Suivi des promotions'],
    reports: ['Rapports', 'Capacité et performance'],
    settings: ['Paramètres', 'Configuration']
  };
  
  document.getElementById('pageTitle').textContent = headings[viewId][0];
  document.getElementById('pageSubtitle').textContent = headings[viewId][1];
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

  // 6. Sauvegarde promotion (Simple confirmation)
  document.getElementById('savePromotion')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    alert('✅ Promotion "' + name + '" enregistrée !');
  });

  // 7. Bouton Générer
  document.getElementById('generatePlan')?.addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    alert('🚀 Génération lancée pour "' + name + '"');
  });

  // 8. Topbar
  document.querySelector('.icon-button.notification')?.addEventListener('click', () => alert('🔔 3 notifications'));
  document.querySelector('.icon-button[aria-label="Aide"]')?.addEventListener('click', () => alert('📖 Aide disponible'));
  document.querySelector('.chevron')?.addEventListener('click', () => alert('⚙️ Profil utilisateur'));
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', function() {
    setView('dashboard');
    setupEvents();
    console.log('✅ ATC Planner prêt !');
});
