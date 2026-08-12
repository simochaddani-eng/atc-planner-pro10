// app.js (Version FINALE - Navigation DOM 100% Streamlit)

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

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// --- NAVIGATION DOM (AU LIEU DE URL) ---
function setView(viewId) {
  // 1. Cacher toutes les vues
  $$('.view').forEach(view => view.style.display = 'none');
  
  // 2. Afficher la vue ciblée
  const targetView = document.getElementById(viewId);
  if(targetView) targetView.style.display = 'block';

  // 3. Mettre à jour la barre latérale
  $$('.nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  // 4. Mettre à jour le titre en haut
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
  
  // 5. Appeler les fonctions de rendu si besoin
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'planning') renderWeekGrid();
}

// --- GESTION DU FORMULAIRE (STEPS) ---
function setStep(stepNumber) {
    state.currentStep = stepNumber;
    
    // Mise à jour du Stepper
    $$('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum === stepNumber);
    });

    // Gestion des sections
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
  
  const selected = defaultResources.filter(r => state.selectedResources.has(r.id));
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

function renderResourceSelector() {
  const eligible = defaultResources.filter(r => r.phases.includes(state.phase) && r.availability !== 'Indisponible');
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

// --- DASHBOARD FICTIF (Afficher juste les 0 pour l'instant) ---
function renderDashboard() {
  // Pour l'instant, on laisse les 0 affichés par le HTML.
  // Plus tard, on viendra lire les données du localStorage ici.
}

// --- PLANNING FICTIF ---
function renderWeekGrid() {
    const target = document.getElementById('weekGrid');
    if(!target) return;
    target.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #7d899e;">Générez un planning pour afficher la grille hebdomadaire.</div>';
}

// --- NAVIGATION DES BOUTONS (LA CORRECTION DU SIÈCLE) ---
function setupEvents() {
  // 1. Navigation de la barre latérale
  $$('.nav-item').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      setView(this.dataset.view);
    });
  });

  // 2. Les boutons "data-go"
  $$('[data-go]').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      setView(this.dataset.go);
    });
  });

  // 3. Le stepper (haut du formulaire)
  $$('.step').forEach(step => {
    step.addEventListener('click', function() {
      setStep(parseInt(this.dataset.step));
    });
  });

  // 4. Les boutons "Next / Prev"
  $$('[data-next-step]').forEach(btn => {
    btn.addEventListener('click', function() {
      setStep(parseInt(this.dataset.nextStep));
    });
  });

  // 5. Les cartes de phases
  const cards = document.querySelectorAll('.phase-card');
  cards.forEach(card => {
    card.addEventListener('click', function() {
      cards.forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      state.phase = this.dataset.phase;
      const eligible = defaultResources.filter(r => r.phases.includes(state.phase));
      state.selectedResources = new Set(eligible.map(r => r.id));
      renderResourceSelector();
      calculateEstimates();
    });
  });

  // 6. Calcul en temps réel (Étudiants, Séances)
  ['studentCount', 'sessionCount', 'sessionDuration'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', calculateEstimates);
  });

  // 7. Bouton "Enregistrer la promotion"
  document.getElementById('savePromotion').addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    alert('✅ Promotion "' + name + '" enregistrée (Simulation pour le moment).');
  });

  // 8. Bouton "Générer le planning"
  document.getElementById('generatePlan').addEventListener('click', function() {
    const name = document.getElementById('cohortName').value;
    if(!name) { alert('Veuillez donner un nom à la promotion.'); return; }
    alert('🚀 Lancement de OR-Tools pour "' + name + '" (Bientôt connecté au backend !)');
  });
  
  // 9. Boutons de l'en-tête (Notif, Aide, Profil)
  document.querySelector('.icon-button.notification')?.addEventListener('click', () => alert('🔔 Vous avez 3 notifications.'));
  document.querySelector('.icon-button[aria-label="Aide"]')?.addEventListener('click', () => alert('📖 Aide : Utilisez le menu "Promotions" pour créer un planning.'));
  document.querySelector('.chevron')?.addEventListener('click', () => alert('⚙️ Menu profil (en cours de développement).'));
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', function() {
    // On démarre sur le Dashboard
    setView('dashboard');
    // On initialise la sélection des ressources
    renderResourceSelector();
    // On calcule les estimatifs
    calculateEstimates();
    // On lance les événements
    setupEvents();
    
    console.log('✅ Application ATC Planner prête !');
});
