// app.js - Version Ultra-Stable pour boutons

// --- CONFIGURATION DE BASE ---
const defaultResources = [
  { id: 'twr', name: 'TWR 1–4', positions: 4, icon: '♜', phases: ['aerodrome'], availability: 'Disponible', type: 'TWR' },
  { id: 'radar1', name: 'RADAR 1', positions: 4, icon: '◉', phases: ['approach-procedure', 'approach-radar'], availability: 'Disponible', type: 'APP' },
  { id: 'radar2', name: 'RADAR 2', positions: 2, icon: '◉', phases: ['enroute-procedure', 'enroute-radar'], availability: 'Disponible', type: 'ENR' }
];

const state = { phase: 'approach-radar' };
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// --- NAVIGATION DES MENUS (100% ROBUSTE) ---
function setView(viewId) {
  // 1. Cacher toutes les vues
  $$('.view').forEach(view => view.style.display = 'none');
  // 2. Afficher la vue demandée
  const target = document.getElementById(viewId);
  if(target) target.style.display = 'block';

  // 3. Mettre en surbrillance le menu
  $$('.nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if(activeBtn) activeBtn.classList.add('active');

  // 4. Mettre à jour le titre
  const titles = { dashboard: 'Tableau de bord', promotions: 'Promotions', 'phase-tracking': 'Suivi des phases', planning: 'Planning', resources: 'Simulateurs', sessions: 'Séances', instructors: 'Instructeurs', students: 'Étudiants', reports: 'Rapports', settings: 'Paramètres' };
  document.getElementById('pageTitle').textContent = 'Bonjour, ' + (localStorage.getItem('userName') || 'Utilisateur');
  document.getElementById('pageSubtitle').textContent = titles[viewId] || 'Vue d’ensemble';
}

// --- ATTACHEMENT DES ÉVÉNEMENTS ---
function setupEvents() {
  console.log('✅ Initialisation des boutons...');

  // 1. Tous les boutons du menu latéral
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      setView(this.dataset.view);
    });
  });

  // 2. Tous les boutons "Aller à" (data-go)
  $$('[data-go]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      setView(this.dataset.go);
    });
  });

  // 3. Bouton "Réduire le menu" (Correction ultime)
  const collapseBtn = document.querySelector('.collapse');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.toggle('open');
        // Si on est sur mobile, on ferme aussi le menu hamburger
      }
    });
  }

  // 4. Bouton "Menu Hamburger" (Mobile)
  const menuBtn = document.querySelector('.menu-button');
  if (menuBtn) {
    menuBtn.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelector('.sidebar').classList.toggle('open');
    });
  }
}

// --- DÉMARRAGE ---
document.addEventListener('DOMContentLoaded', function() {
  setView('dashboard');
  setupEvents();
  console.log('✅ ATC Planner prêt !');
});
