// app.js (Version CORRIGÉE - Navigation et Calculs dynamiques)

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
    currentStep: 1, // 1=Promotion, 2=Paramètres, 3=Ressources, 4=Prévisualisation
    generated: false, 
    editingPromotionId: null 
};

// --- UTILITAIRES ---
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function formatDate(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
}
function dateKey(date) { return date.toISOString().slice(0, 10); }

// --- CALCUL DU RÉSULTAT ESTIMATIF (En temps réel) ---
function calculateEstimates() {
  const students = Math.max(1, Number($('#studentCount').value) || 1);
  const sessions = Number($('#sessionCount').value) || 8;
  const minutes = Number($('#sessionDuration').value) || 45;
  
  // Calcul des positions sélectionnées
  const selected = defaultResources.filter(r => state.selectedResources.has(r.id));
  const positions = selected.reduce((sum, r) => sum + r.positions, 0) || 1;
  
  // Calculs
  const totalSessions = students * sessions;
  const totalHours = (totalSessions * minutes) / 60;
  const groups = Math.ceil(students / positions);
  
  // Estimation grossière des jours (selon créneaux)
  const slotsPerDay = 7; // Simulation de 7 créneaux de 45 min par jour
  const days = Math.ceil((groups * sessions) / slotsPerDay);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  // Mise à jour du panneau
  $('#estimateSessions').textContent = totalSessions;
  $('#estimateHours').textContent = `${totalHours.toFixed(totalHours % 1 ? 1 : 0)} h`;
  $('#estimateGroups').textContent = `${groups} groupe${groups > 1 ? 's' : ''}`;
  $('#estimateDays').textContent = `${days} jour${days > 1 ? 's' : ''}`;
  $('#estimateEnd').textContent = formatDate(endDate);
}

// --- NAVIGATION ENTRE LES ÉTAPES ---
function setStep(stepNumber) {
    state.currentStep = stepNumber;
    
    // Mise à jour de la barre de progression (Stepper)
    $$('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active');
        if(stepNum === stepNumber) step.classList.add('active');
    });

    // Affichage/Masquage des sections du formulaire
    document.querySelector('.planner-section.phase-selection')?.classList.toggle('hidden', stepNumber !== 2);
    document.querySelector('.planner-section.resources-choice')?.classList.toggle('hidden', stepNumber !== 3);
    
    // Scroll en haut de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- NAVIGATION PAR LE HAUT (STEPPER) ---
function setupStepper() {
    $$('.step').forEach(step => {
        step.addEventListener('click', function() {
            const stepNum = parseInt(this.dataset.step);
            setStep(stepNum);
        });
        step.style.cursor = 'pointer';
    });
}

// --- GESTION DE LA SÉLECTION DES RESSOURCES ---
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

// --- GESTION DES PHASES (CARTES) ---
function setupPhaseCards() {
    const cards = document.querySelectorAll('.phase-card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            cards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            state.phase = this.dataset.phase;
            
            // Reset des ressources si elles ne sont plus compatibles
            const eligible = defaultResources.filter(r => r.phases.includes(state.phase));
            state.selectedResources = new Set(eligible.map(r => r.id));
            renderResourceSelector();
            calculateEstimates();
        });
    });
}

// --- MISE À JOUR DU FORMULAIRE AU CHANGEMENT ---
function setupFormListeners() {
    const inputs = ['studentCount', 'sessionCount', 'sessionDuration'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', calculateEstimates);
    });
}

// --- INITIALISATION DE L'APPLICATION ---
function initApp() {
    setupStepper();
    setupPhaseCards();
    setupFormListeners();
    
    // Boutons de navigation manuels
    document.querySelectorAll('[data-next-step]').forEach(btn => {
        btn.addEventListener('click', function() {
            setStep(parseInt(this.dataset.nextStep));
        });
    });
    
    // Initialisation des ressources
    renderResourceSelector();
    
    // Calcul initial
    calculateEstimates();
    
    console.log('✅ Application ATC Planner initialisée avec succès.');
}

// --- LANCEMENT ---
document.addEventListener('DOMContentLoaded', initApp);
