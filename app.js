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

const state = { phase: 'approach-radar', selectedResources: new Set(['radar1']), maintenance: null, generated: false, editingPromotionId: null, trackingPromotionId: null, planningMode: 'week', planningWeekStart: new Date() };
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const defaultPromotions = [];
const defaultInstructors = [];
const storageKey = 'atc-planner-management-v3';
const defaultSettings = { academyName: 'Aviation Academy', defaultStart: '09:00', defaultEnd: '16:30', defaultDuration: 45, defaultBreak: 45 };
function loadManagementData() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem('atc-planner-management-v2') || localStorage.getItem('atc-planner-management-v1'));
    if (saved && Array.isArray(saved.promotions) && Array.isArray(saved.instructors)) {
      const demonstrationIds = new Set(['p-a', 'p-b', 'p-c', 'p-d', 'i-sophie', 'i-thomas', 'i-julien', 'i-camille', 'i-marc']);
      const cleanedPromotions = saved.promotions.filter(item => !demonstrationIds.has(item.id)).map(item => ({ ...item, startDate: item.startDate || dateKey(new Date()), sessionDuration: item.sessionDuration || 45, dayStart: item.dayStart || '09:00', dayEnd: item.dayEnd || '16:30' }));
      const cleanedInstructors = saved.instructors.filter(item => !demonstrationIds.has(item.id)).map(item => ({ ...item, speciality: item.speciality === 'RADAR' ? 'Approche Radar' : item.speciality === 'TWR & RADAR' ? 'TWR + Approche Radar' : item.speciality }));
      return { promotions: cleanedPromotions, instructors: cleanedInstructors, resources: Array.isArray(saved.resources) ? saved.resources : defaultResources, students: Array.isArray(saved.students) ? saved.students : [], settings: { ...defaultSettings, ...(saved.settings || {}) } };
    }
  } catch (_) { /* Local storage can be disabled when opening a local file. */ }
  return { promotions: defaultPromotions, instructors: defaultInstructors, resources: defaultResources, students: [], settings: defaultSettings };
}
const management = loadManagementData();
let promotions = management.promotions;
let instructors = management.instructors;
let resources = management.resources;
let students = management.students;
let settings = management.settings;
function persistManagementData() {
  try { localStorage.setItem(storageKey, JSON.stringify({ promotions, instructors, resources, students, settings })); } catch (_) { /* Changes remain available during this visit. */ }
}
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]); }
function initials(name) { return name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase(); }

function durationMinutes() {
  const [sh, sm] = $('#dayStart').value.split(':').map(Number);
  const [eh, em] = $('#dayEnd').value.split(':').map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - Number($('#breakDuration').value));
}

function countWorkingDays(from, needed, selectedDays) {
  const date = new Date(`${from}T12:00:00`);
  let count = 0;
  while (count < needed) {
    if (selectedDays.includes(date.getDay())) count++;
    if (count < needed) date.setDate(date.getDate() + 1);
  }
  return date;
}

function formatDate(date) {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
}
function updateCurrentClock() {
  const now = new Date();
  $('#todayDate').textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#todayTime').textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  $('#dashboardDateLabel').textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}

function calculate() {
  const students = Math.max(1, Number($('#studentCount').value) || 1);
  const sessions = Number($('#sessionCount').value);
  const minutes = Number($('#sessionDuration').value);
  const selected = resources.filter(r => state.selectedResources.has(r.id));
  const positions = selected.reduce((sum, r) => sum + r.positions, 0) || 1;
  const totalSessions = students * sessions;
  const positionHours = totalSessions * minutes / 60;
  const groups = Math.ceil(students / positions);
  const slotsPerDay = Math.max(1, Math.floor(durationMinutes() / minutes));
  // A rotation is a complete pass of the groups through the positions. This makes the estimate readable operationally.
  const totalRotations = groups * sessions;
  const days = Math.ceil(totalRotations / slotsPerDay);
  const selectedDays = $$('#dayToggles button.selected').map(button => Number(button.dataset.day));
  const startValue = $('#startDate').value || dateKey(new Date());
  const end = countWorkingDays(startValue, days, selectedDays.length ? selectedDays : [1,2,3,4,5]);
  return { students, sessions, minutes, positions, totalSessions, positionHours, groups, slotsPerDay, totalRotations, days, end, selected };
}

function updateEstimates() {
  const value = calculate();
  $('#estimateSessions').textContent = value.totalSessions;
  $('#estimateHours').textContent = `${value.positionHours.toFixed(value.positionHours % 1 ? 1 : 0)} h`;
  $('#estimateGroups').textContent = `${value.groups} groupe${value.groups > 1 ? 's' : ''}`;
  $('#estimateDays').textContent = `${value.days} jour${value.days > 1 ? 's' : ''}`;
  $('#estimateEnd').textContent = formatDate(value.end);
  $('#resourceCompatibility').textContent = value.selected.length ? `${value.positions} position${value.positions > 1 ? 's' : ''} sélectionnée${value.positions > 1 ? 's' : ''} · ${value.selected.map(r => r.name).join(', ')}` : 'Sélectionnez une ressource compatible';
}

function renderResourceSelector() {
  const eligible = resources.filter(r => r.phases.includes(state.phase) && r.availability !== 'Indisponible');
  $('#resourceSelector').innerHTML = eligible.map(resource => `
    <label class="resource-choice ${state.selectedResources.has(resource.id) ? 'selected' : ''}">
      <input type="checkbox" value="${resource.id}" ${state.selectedResources.has(resource.id) ? 'checked' : ''} />
      <span class="choice-dot">✓</span><span><b>${resource.name}</b><small>${resource.positions} positions · ${resource.type}</small><i class="choice-badge">polyvalent</i></span>
    </label>`).join('');
  $$('#resourceSelector input').forEach(input => input.addEventListener('change', () => {
    if (input.checked) state.selectedResources.add(input.value); else state.selectedResources.delete(input.value);
    renderResourceSelector(); updateEstimates();
  }));
}

function dashboardRow(name, icon, blocks) {
  const capacity = name === 'TWR 1–4' ? '4 positions' : name === 'RADAR 1' ? '4 positions' : name === 'RADAR 2' ? '2 positions' : '1 position';
  return `<div class="occupancy-row"><div class="resource-label"><span class="res-icon">${icon}</span><span>${name}<small>${capacity}</small></span></div><div class="time-track">${blocks.map(block => `<div class="booking ${block.type}" style="grid-column:${block.start}/span ${block.span}">${block.title}<span>${block.time}</span></div>`).join('')}</div></div>`;
}

/* Legacy static mock-up data retained only as a reference; it is not rendered. */
function renderDashboardOccupancyDemo() {
  const data = [
    ['TWR 1', '♜', [{ start:1, span:2, title:'P2025-A', time:'08:00 – 09:30', type:'blue-booking' }, { start:3, span:2, title:'P2025-B', time:'09:45 – 11:15', type:'green-booking' }, { start:5, span:2, title:'P2025-C', time:'11:30 – 13:00', type:'purple-booking' }, { start:7, span:2, title:'P2025-A', time:'13:45 – 15:15', type:'amber-booking' }]],
    ['TWR 2', '♜', [{ start:1, span:2, title:'P2025-B', time:'08:00 – 09:30', type:'green-booking' }, { start:3, span:2, title:'P2025-A', time:'09:45 – 11:15', type:'purple-booking' }, { start:5, span:2, title:'P2025-C', time:'11:30 – 13:00', type:'amber-booking' }, { start:7, span:2, title:'P2025-B', time:'13:45 – 15:15', type:'blue-booking' }]],
    ['TWR 3', '♜', [{ start:1, span:2, title:'P2025-C', time:'08:00 – 09:30', type:'purple-booking' }, { start:3, span:2, title:'P2025-A', time:'09:45 – 11:15', type:'amber-booking' }, { start:5, span:2, title:'P2025-B', time:'11:30 – 13:00', type:'green-booking' }, { start:7, span:2, title:'P2025-C', time:'13:45 – 15:15', type:'blue-booking' }]],
    ['RADAR 1', '◉', [{ start:1, span:8, title:'4 positions actives en parallèle', time:'08:00 – 16:00 · Approche Radar', type:'blue-booking' }]],
    ['RADAR 2', '◉', [{ start:1, span:2, title:'P2025-B', time:'08:00 – 09:30', type:'green-booking' }, { start:3, span:2, title:'P2025-A', time:'09:45 – 11:15', type:'purple-booking' }, { start:5, span:2, title:'P2025-C', time:'11:30 – 13:00', type:'blue-booking' }, { start:7, span:2, title:'P2025-A', time:'13:45 – 15:15', type:'green-booking' }]]
  ];
  $('#dashboardOccupancy').innerHTML = data.map(row => dashboardRow(...row)).join('');
}

const weekDaysDemo = ['Lun. 02/06', 'Mar. 03/06', 'Mer. 04/06', 'Jeu. 05/06', 'Ven. 06/06'];
const weekResources = [
  { name:'TWR 1', sub:'1 position', days:[[0,'P2025-A','08:00 – 10:30','blue'],[1,'P2025-C','09:00 – 11:30','green'],[3,'P2025-A','08:00 – 10:30','blue'],[4,'P2025-D','09:00 – 11:30','amber']] },
  { name:'TWR 2', sub:'1 position', days:[[0,'P2025-B','10:30 – 13:00','green'],[1,'P2025-B','10:30 – 13:00','conflict'],[2,'P2025-D','11:00 – 13:30','amber'],[3,'P2025-C','08:00 – 10:30','green'],[4,'P2025-F','13:30 – 16:00','purple']] },
  { name:'RADAR 1', sub:'4 positions polyvalentes', days:[[0,'Approche Radar','08:00 – 11:30','blue'],[1,'En-route Radar','12:30 – 16:00','green'],[2,'Approche Radar','08:00 – 11:30','blue'],[3,'En-route Radar','12:30 – 16:00','green'],[4,'Approche Radar','08:00 – 11:30','blue']] },
  { name:'RADAR 2', sub:'2 positions polyvalentes', days:[[0,'P2025-B','08:00 – 12:00','green'],[1,'P2025-C','13:30 – 17:00','purple'],[2,'Maintenance','09:00 – 12:00','maintenance'],[3,'P2025-E','13:30 – 17:00','amber'],[4,'P2025-A','08:00 – 12:00','blue']] }
];

function renderWeekGridDemo() {
  const heads = ['Ressource / position', ...weekDaysDemo].map((day, index) => `<div class="grid-head">${day}${index ? '<small>08:00 · 16:30</small>' : ''}</div>`).join('');
  const rows = weekResources.map(resource => {
    const cells = weekDaysDemo.map((_, index) => {
      const items = resource.days.filter(item => item[0] === index);
      let html = items.map(item => `<div class="grid-event ${item[3] === 'conflict' ? 'amber-event conflict' : item[3] === 'maintenance' ? 'maintenance' : `${item[3]}-event`}"><b>${item[1]}</b><span>${item[2]}</span></div>`).join('');
      if (state.maintenance && resource.name === 'RADAR 2' && index === 3) html += '<div class="grid-event maintenance"><b>Indisponible</b><span>09:00 – 10:30</span></div>';
      return `<div class="grid-cell">${html}</div>`;
    }).join('');
    return `<div class="grid-res-label">${resource.name}<small>${resource.sub}</small></div>${cells}`;
  }).join('');
  $('#weekGrid').innerHTML = heads + rows;
}

function startOfWeek(date) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}
function addDays(date, amount) { const result = new Date(date); result.setDate(result.getDate() + amount); return result; }
function dateKey(date) { return date.toISOString().slice(0, 10); }
function dateFromKey(value) { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? null : date; }
function frenchDay(date) { return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', ''); }
function timeRange(start, minutes) {
  const [hour, minute] = (start || '09:00').split(':').map(Number);
  const begin = hour * 60 + minute; const end = begin + minutes;
  const pad = value => String(value).padStart(2, '0');
  return `${pad(Math.floor(begin / 60))}:${pad(begin % 60)} – ${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
}
function planningRows() {
  return resources.map(resource => ({ id: resource.id, name: resource.name, sub: `${resource.positions} position${resource.positions > 1 ? 's' : ''} · ${resource.type}` }));
}
function resourceForPromotion(promotion) {
  const preferred = (promotion.selectedResourceIds || []).map(id => resources.find(resource => resource.id === id)).find(Boolean);
  return preferred || resources.find(resource => resource.phases.includes(promotion.phase));
}
function nextWorkingDate(start, offset) {
  let result = new Date(start); let added = 0;
  while (added < offset) { result = addDays(result, 1); if (result.getDay() !== 0 && result.getDay() !== 6) added++; }
  return result;
}
function minutesFromTime(value, fallback) {
  const [hour, minute] = (value || fallback).split(':').map(Number);
  return hour * 60 + minute;
}
function timeLabel(minutes) {
  const pad = value => String(value).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
function dailySlots(promotion) {
  const start = minutesFromTime(promotion.dayStart, '09:00');
  const end = minutesFromTime(promotion.dayEnd, '16:30');
  const duration = Math.max(1, Number(promotion.sessionDuration) || 45);
  const breakMinutes = Math.max(0, Number(promotion.breakDuration) || 45);
  const totalSlots = Math.max(1, Math.floor((end - start - breakMinutes) / duration));
  const beforeBreak = breakMinutes ? Math.floor(totalSlots / 2) : totalSlots;
  const slots = [];
  for (let index = 0; index < totalSlots; index++) {
    const afterBreak = index >= beforeBreak;
    slots.push(start + index * duration + (afterBreak ? breakMinutes : 0));
  }
  return slots.filter(slot => slot + duration <= end);
}
function scheduledEvents() {
  const colours = ['blue', 'green', 'purple', 'amber']; const events = [];
  promotions.filter(promotion => promotion.status === 'Planifiée' && promotion.startDate).forEach((promotion, promotionIndex) => {
    const start = dateFromKey(promotion.startDate); const resource = resourceForPromotion(promotion);
    if (!start || !resource) return;
    const sessions = Math.max(1, Number(promotion.sessions) || 1);
    const duration = Math.max(1, Number(promotion.sessionDuration) || 45);
    const groups = Math.max(1, Math.ceil((Number(promotion.students) || 1) / resource.positions));
    const slots = dailySlots(promotion);
    for (let rotation = 0; rotation < sessions * groups; rotation++) {
      const date = nextWorkingDate(start, Math.floor(rotation / slots.length));
      const startMinutes = slots[rotation % slots.length]; const group = (rotation % groups) + 1; const session = Math.floor(rotation / groups) + 1;
      events.push({ promotionId: promotion.id, resourceId: resource.id, date: dateKey(date), title: `${promotion.name} · G${group}`, time: `${timeLabel(startMinutes)} – ${timeLabel(startMinutes + duration)}`, startMinutes, endMinutes: startMinutes + duration, group, session, colour: colours[promotionIndex % colours.length] });
    }
  });
  return events;
}
function planningConflicts() {
  const events = scheduledEvents(); const byResourceAndDate = new Map(); const conflicts = [];
  events.forEach(event => {
    const key = `${event.resourceId}-${event.date}`;
    const existing = byResourceAndDate.get(key) || [];
    const overlap = existing.find(other => event.startMinutes < other.endMinutes && event.endMinutes > other.startMinutes);
    if (overlap) conflicts.push({ type: 'overlap', event, existing: overlap });
    existing.push(event); byResourceAndDate.set(key, existing);
  });
  if (state.maintenance) events.filter(event => event.resourceId === state.maintenance.resourceId && event.date === state.maintenance.date).forEach(event => conflicts.push({ type: 'maintenance', event }));
  return conflicts;
}
function updatePlanningAlerts() {
  const conflicts = planningConflicts(); const count = $('#alertCount'); const text = $('#alertText');
  count.textContent = conflicts.length;
  if (!conflicts.length) text.textContent = 'Aucun conflit détecté dans la période affichée.';
  else if (conflicts[0].type === 'maintenance') text.textContent = `${conflicts.length} séance${conflicts.length > 1 ? 's' : ''} touchée${conflicts.length > 1 ? 's' : ''} par une indisponibilité.`;
  else text.textContent = `${conflicts.length} chevauchement${conflicts.length > 1 ? 's' : ''} de ressource à résoudre.`;
}
function displayedDates() {
  const start = startOfWeek(state.planningWeekStart); const length = state.planningMode === 'month' ? 20 : 5;
  const dates = []; let cursor = new Date(start);
  while (dates.length < length) { if (cursor.getDay() !== 0 && cursor.getDay() !== 6) dates.push(new Date(cursor)); cursor = addDays(cursor, 1); }
  return dates;
}
function renderDashboardOccupancy() {
  const dates = displayedDates().slice(0, 5); const events = scheduledEvents();
  const rows = planningRows().map(resource => {
    const blocks = events.filter(event => event.resourceId === resource.id).map(event => {
      const dayIndex = dates.findIndex(date => dateKey(date) === event.date);
      return dayIndex >= 0 ? { start: dayIndex * 2 + 1, span: 2, title: escapeHtml(event.title), time: event.time, type: `${event.colour}-booking` } : null;
    }).filter(Boolean);
    return [resource.name, resource.type === 'TWR' ? '♜' : '◉', blocks];
  });
  $('#dashboardOccupancy').innerHTML = rows.map(row => dashboardRow(...row)).join('');
}
function renderDashboardPreview() {
  const target = $('#dashboardPreview'); const dates = displayedDates().slice(0, 10); const events = scheduledEvents();
  const planned = promotions.filter(promotion => promotion.status === 'Planifiée');
  if (!planned.length) { target.innerHTML = '<div class="empty-state">Aucun planning généré. Ajoutez une promotion puis cliquez sur « Générer le planning ».</div>'; return; }
  const labels = dates.map(date => `<span>${date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}<br /><b>${date.getDate()}</b></span>`).join('');
  const bars = planned.slice(0, 4).map((promotion, index) => {
    const count = events.filter(event => event.promotionId === promotion.id && dates.some(date => dateKey(date) === event.date)).length;
    return `<span>${escapeHtml(promotion.name)}</span><div class='bar-row'><i class='bar ${['blue-bar','green-bar','violet-bar','amber-bar'][index]}' style='width:${Math.max(8, count * 10)}%'></i></div>`;
  }).join('');
  target.innerHTML = `<div class='calendar-days'>${labels}</div><div class='promotion-bars'>${bars}</div>`;
}
function renderDashboard() {
  const active = promotions.filter(promotion => promotion.status === 'Planifiée' || promotion.status === 'En cours');
  const students = promotions.reduce((sum, promotion) => sum + (Number(promotion.students) || 0), 0);
  $('#dashboardPromotionTotal').textContent = active.length;
  $('#dashboardStudentTotal').textContent = students ? `${students} étudiant${students > 1 ? 's' : ''} au total` : 'Aucun étudiant enregistré';
  const totalPositions = resources.reduce((sum, resource) => sum + resource.positions, 0);
  $('#dashboardPositionTotal').innerHTML = `${totalPositions} <em>/ ${totalPositions}</em>`;
  $('#dashboardPositionInfo').textContent = `${totalPositions} positions configurées`;
  $('#dashboardInstructorTotal').textContent = instructors.length;
  $('#dashboardInstructorInfo').textContent = instructors.length ? `${instructors.filter(instructor => !instructor.groups).length} disponible${instructors.filter(instructor => !instructor.groups).length > 1 ? 's' : ''} maintenant` : 'Aucun instructeur enregistré';
  $('#dashboardPhaseTotal').textContent = active.length;
  $('#dashboardPhaseInfo').textContent = active.length ? `${scheduledEvents().length} séance${scheduledEvents().length > 1 ? 's' : ''} planifiée${scheduledEvents().length > 1 ? 's' : ''}` : 'Aucune séance planifiée';
  $('#dashboardOccupationSubtitle').textContent = active.length ? `Période : ${formatDate(displayedDates()[0])} – ${formatDate(displayedDates()[4])}` : 'Aucune séance planifiée';
  const capacityPromotion = promotions.find(promotion => promotion.status === 'Planifiée') || promotions[0]; const stats = $$('.capacity-stats > div');
  if (!capacityPromotion) {
    $('#dashboardCapacityTitle').textContent = 'Capacité — aucune promotion'; $('#dashboardCapacitySubtitle').textContent = 'Ajoutez une promotion pour calculer sa charge.';
    stats.forEach(stat => { stat.querySelector('strong').textContent = '—'; stat.querySelector('small').textContent = 'En attente de données'; });
  } else {
    const resource = resourceForPromotion(capacityPromotion) || { positions: 1 }; const total = capacityPromotion.students * capacityPromotion.sessions;
    const hours = total * (capacityPromotion.sessionDuration || 45) / 60; const groups = Math.ceil(capacityPromotion.students / resource.positions);
    $('#dashboardCapacityTitle').textContent = `Capacité — ${capacityPromotion.name}`;
    $('#dashboardCapacitySubtitle').textContent = `${phaseLabels[capacityPromotion.phase] || 'Phase'} · ${capacityPromotion.students} étudiants`;
    $('#dashboardCapacityInfo').textContent = `${resource.name} · ${resource.positions} positions disponibles pour cette phase.`;
    const values = [[total, `${capacityPromotion.students} étudiants × ${capacityPromotion.sessions}`], [`${hours.toFixed(hours % 1 ? 1 : 0)}h`, `${capacityPromotion.sessionDuration || 45} min par séance`], [groups, `${resource.positions} positions en parallèle`], [capacityPromotion.sessions, 'Séances prévues par étudiant']];
    values.forEach((value, index) => { stats[index].querySelector('strong').textContent = value[0]; stats[index].querySelector('small').textContent = value[1]; });
  }
  renderDashboardPreview(); renderDashboardOccupancy();
}
function renderWeekGrid() {
  const target = $('#weekGrid'); const dates = displayedDates(); const rows = planningRows(); const events = scheduledEvents();
  target.style.gridTemplateColumns = `143px repeat(${dates.length}, minmax(130px, 1fr))`;
  $('#planningPeriodLabel').textContent = state.planningMode === 'week' ? `Semaine · ${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}` : `4 semaines · ${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
  const heads = [`<div class='grid-head'>Ressource / position</div>`, ...dates.map(date => `<div class='grid-head'>${frenchDay(date)}<small>Horaires configurables</small></div>`)].join('');
  const content = rows.map(resource => {
    const cells = dates.map((date, index) => {
      const items = events.filter(event => event.resourceId === resource.id && event.date === dateKey(date));
      let html = items.map(event => `<div class='grid-event ${event.colour}-event'><b>${escapeHtml(event.title)}</b><span>${event.time}</span></div>`).join('');
      if (state.maintenance && resource.id === state.maintenance.resourceId && dateKey(date) === state.maintenance.date) html += `<div class="grid-event maintenance"><b>Indisponible</b><span>${escapeHtml(state.maintenance.reason || 'Maintenance')}</span></div>`;
      return `<div class='grid-cell'>${html}</div>`;
    }).join('');
    return `<div class='grid-res-label'>${resource.name}<small>${resource.sub}</small></div>${cells}`;
  }).join('');
  target.innerHTML = heads + content;
  updatePlanningAlerts();
}
function renderGeneratedPlan() {
  const planned = promotions.filter(promotion => promotion.status === 'Planifiée' && promotion.startDate);
  const title = $('#generatedPlanTitle'); const subtitle = $('#generatedPlanSubtitle'); const status = $('#generatedPlanStatus'); const slots = $('#generatedSlots');
  if (!planned.length) {
    title.textContent = 'Aucun planning généré'; subtitle.textContent = 'Créez une promotion et lancez la génération pour afficher les rotations.'; status.textContent = 'En attente'; slots.innerHTML = '';
    return;
  }
  const promotion = planned[0]; const events = scheduledEvents().filter(event => event.promotionId === promotion.id).slice(0, 8);
  title.textContent = `Planning généré — ${promotion.name}`; subtitle.textContent = `${events.length} séances sont affichées à partir du ${formatDate(dateFromKey(promotion.startDate))}.`; status.textContent = 'Prêt à valider';
  slots.innerHTML = events.map((event, index) => `<article class='generated-slot'><strong>Séance ${index + 1}</strong><p>${event.time} · ${resourceForPromotion(promotion).name}</p><span class='tag'>${escapeHtml(event.title)}</span></article>`).join('');
}

function slotsForGeneratedPlan() {
  const info = calculate();
  const names = instructors.length ? instructors.map(instructor => instructor.name) : ['Affectation à confirmer'];
  const resourceName = info.selected[0]?.name || 'RADAR 1';
  const startHour = $('#dayStart').value;
  const groups = Array.from({length: Math.min(info.groups, 8)}, (_, i) => {
    const groupSize = i === info.groups - 1 ? info.students - (i * info.positions) : Math.min(info.positions, info.students - i * info.positions);
    const mins = ((Number(startHour.split(':')[0]) * 60 + Number(startHour.split(':')[1])) + i * info.minutes);
    const h = String(Math.floor(mins / 60)).padStart(2,'0'); const m = String(mins % 60).padStart(2,'0');
    const end = mins + info.minutes; const eh = String(Math.floor(end / 60)).padStart(2,'0'); const em = String(end % 60).padStart(2,'0');
    return `<article class="generated-slot"><strong>Groupe ${i+1} · ${groupSize} étudiants</strong><p>${h}:${m} – ${eh}:${em} · ${resourceName}</p><span class="tag">${names[i % names.length]}</span></article>`;
  });
  return groups.join('');
}

function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3500); }
function openModal(content) { $('#modalContent').innerHTML = content; $('#modalBackdrop').hidden = false; }
function closeModal() { $('#modalBackdrop').hidden = true; }

function renderInstructorPills() {
  const target = $('#instructorPills');
  if (!target) return;
  const compatible = instructors.filter(instructor => {
    if (state.phase === 'aerodrome') return instructor.speciality === 'TWR' || instructor.speciality === 'TWR + Approche Radar';
    if (state.phase === 'approach-procedure' || state.phase === 'approach-radar') return instructor.speciality === 'Approche Radar' || instructor.speciality === 'TWR + Approche Radar';
    return instructor.speciality === 'En-route Radar';
  });
  if (!compatible.length) {
    target.innerHTML = '<span>Instructeurs compatibles</span><small>Aucun instructeur de cette spécialité. Ajoutez-en depuis le menu Instructeurs.</small>';
    return;
  }
  target.innerHTML = `<span>Instructeurs compatibles</span>${compatible.map((instructor, index) => `<label><input type="checkbox" value="${instructor.id}" ${index < 4 ? 'checked' : ''} /> ${escapeHtml(instructor.name)}</label>`).join('')}`;
}

function renderPromotions() {
  const target = $('#promotionList');
  if (!target) return;
  $('#promotionCount').textContent = `${promotions.length} promotion${promotions.length > 1 ? 's' : ''}`;
  if (!promotions.length) {
    target.innerHTML = '<div class="empty-state">Aucune promotion enregistrée. Cliquez sur « Ajouter une promotion » pour commencer.</div>';
    return;
  }
  target.innerHTML = promotions.map(promotion => `<article class="management-item">
    <span class="list-icon">♧</span>
    <div><strong>${escapeHtml(promotion.name)}</strong><small>${promotion.students} étudiants · ${promotion.sessions} séances</small></div>
    <span class="list-phase">${phaseLabels[promotion.phase] || 'Phase à définir'}</span>
    <span class="list-status">${escapeHtml(promotion.status || 'À planifier')}</span>
    <div class="row-actions"><button class="row-action" data-promo-action="track" data-promotion-id="${promotion.id}">Suivi</button><button class="row-action" data-promo-action="edit" data-promotion-id="${promotion.id}">Modifier</button><button class="row-action delete" data-promo-action="delete" data-promotion-id="${promotion.id}">Supprimer</button></div>
  </article>`).join('');
}

function resetPromotionForm() {
  state.editingPromotionId = null;
  state.generated = false;
  $('#cohortName').value = '';
  $('#studentCount').value = 30;
  $('#startDate').value = dateKey(new Date());
  $('#sessionCount').value = 8;
  $('#sessionDuration').value = settings.defaultDuration;
  $('#breakDuration').value = settings.defaultBreak;
  $('#dayStart').value = settings.defaultStart;
  $('#dayEnd').value = settings.defaultEnd;
  state.phase = 'approach-radar';
  const firstCompatibleResource = resources.find(resource => resource.phases.includes(state.phase) && resource.availability !== 'Indisponible');
  state.selectedResources = new Set(firstCompatibleResource ? [firstCompatibleResource.id] : []);
  $$('.phase-card').forEach(card => card.classList.toggle('selected', card.dataset.phase === state.phase));
  renderResourceSelector();
  renderInstructorPills();
  updateEstimates();
}

function saveCurrentPromotion() {
  const name = $('#cohortName').value.trim();
  if (!name) { showToast('Indiquez un nom de promotion avant de l’enregistrer.'); $('#cohortName').focus(); return null; }
  const record = {
    id: state.editingPromotionId || `promotion-${Date.now()}`,
    name,
    students: Math.max(1, Number($('#studentCount').value) || 1),
    phase: state.phase,
    sessions: Number($('#sessionCount').value),
    sessionDuration: Number($('#sessionDuration').value),
    breakDuration: Number($('#breakDuration').value),
    startDate: $('#startDate').value || dateKey(new Date()),
    dayStart: $('#dayStart').value,
    dayEnd: $('#dayEnd').value,
    selectedResourceIds: [...state.selectedResources],
    status: state.generated ? 'Planifiée' : 'À planifier'
  };
  const previousIndex = promotions.findIndex(item => item.id === record.id);
  if (previousIndex >= 0) promotions.splice(previousIndex, 1, record); else promotions.unshift(record);
  state.editingPromotionId = record.id;
  state.trackingPromotionId = record.id;
  persistManagementData();
  renderPromotions();
  renderDashboard();
  renderWeekGrid();
  renderGeneratedPlan();
  renderPhaseTracking();
  return record;
}

function editPromotion(id) {
  const promotion = promotions.find(item => item.id === id);
  if (!promotion) return;
  state.editingPromotionId = promotion.id;
  $('#cohortName').value = promotion.name;
  $('#studentCount').value = promotion.students;
  $('#sessionCount').value = promotion.sessions;
  $('#sessionDuration').value = promotion.sessionDuration || 45;
  $('#breakDuration').value = promotion.breakDuration ?? 45;
  if (promotion.startDate) $('#startDate').value = promotion.startDate;
  if (promotion.dayStart) $('#dayStart').value = promotion.dayStart;
  if (promotion.dayEnd) $('#dayEnd').value = promotion.dayEnd;
  state.phase = promotion.phase;
  const eligible = resources.filter(resource => resource.phases.includes(state.phase) && resource.availability !== 'Indisponible');
  const savedResources = (promotion.selectedResourceIds || []).filter(id => eligible.some(resource => resource.id === id));
  state.selectedResources = new Set(savedResources.length ? savedResources : [eligible[0]?.id || 'radar1']);
  $$('.phase-card').forEach(card => card.classList.toggle('selected', card.dataset.phase === state.phase));
  renderResourceSelector();
  renderInstructorPills();
  updateEstimates();
  $('#cohortName').scrollIntoView({ behavior: 'smooth', block: 'center' });
  showToast(`Promotion ${promotion.name} ouverte en modification.`);
}

function deletePromotion(id) {
  const promotion = promotions.find(item => item.id === id);
  if (!promotion) return;
  openModal(`<h3>Supprimer ${escapeHtml(promotion.name)} ?</h3><p class="modal-confirm">Cette action retirera la promotion de la liste et du tableau de bord. Elle ne peut pas être annulée dans cette version.</p><div class="modal-actions"><button class="outline-button" id="modalCancel">Annuler</button><button class="primary-button" data-confirm-delete-promotion="${promotion.id}">Supprimer</button></div>`);
}

const phasePath = ['aerodrome', 'approach-procedure', 'enroute-procedure', 'approach-radar', 'enroute-radar'];
function compatibleInstructorsForPhase(phase) {
  return instructors.filter(instructor => {
    if (phase === 'aerodrome') return instructor.speciality === 'TWR' || instructor.speciality === 'TWR + Approche Radar';
    if (phase === 'approach-procedure' || phase === 'approach-radar') return instructor.speciality === 'Approche Radar' || instructor.speciality === 'TWR + Approche Radar';
    return instructor.speciality === 'En-route Radar';
  });
}
function renderPhaseTracking() {
  const promotion = promotions.find(item => item.id === state.trackingPromotionId) || promotions[0];
  const journey = $('#phaseJourney');
  if (!promotion) {
    $('#phaseTrackingTitle').textContent = 'Suivi de phase';
    $('#phaseTrackingSubtitle').textContent = 'Sélectionnez une promotion dans la liste pour consulter son avancement.';
    journey.innerHTML = '<div class="empty-state">Aucune promotion enregistrée.</div>';
    $('#phaseMetricLabel').textContent = 'Aucune promotion sélectionnée'; $('#phaseMetricStatus').textContent = 'En attente';
    ['#phaseStudents','#phaseSessions','#phaseDuration','#phasePositions','#phaseTotalDuration','#phaseSummaryStudents','#phaseSummarySessions','#phaseSummaryDuration','#phaseEstimatedDays'].forEach(selector => $(selector).textContent = '—');
    $('#phaseCapacityInfo').textContent = 'Créez une promotion pour voir le calcul de capacité.';
    $('#phaseInstructorAssignments').innerHTML = ''; $('#phaseGroups').innerHTML = '';
    return;
  }
  state.trackingPromotionId = promotion.id;
  const phaseIndex = phasePath.indexOf(promotion.phase);
  const resource = resourceForPromotion(promotion) || { positions: 1, name: 'Ressource à définir' };
  const groups = Math.max(1, Math.ceil(promotion.students / resource.positions));
  const duration = promotion.sessionDuration || 45;
  const totalHours = promotion.students * promotion.sessions * duration / 60;
  const groupsHours = promotion.sessions * duration / 60;
  const dailyCapacity = dailySlots(promotion).length * resource.positions;
  const estimateDays = Math.max(1, Math.ceil((promotion.students * promotion.sessions) / dailyCapacity));
  const instructorsForPhase = compatibleInstructorsForPhase(promotion.phase);
  $('#phaseTrackingTitle').textContent = `Suivi de la formation — ${promotion.name}`;
  $('#phaseTrackingSubtitle').textContent = `${promotion.students} étudiants · début ${formatDate(dateFromKey(promotion.startDate))}`;
  journey.innerHTML = phasePath.map((phase, index) => `<button class="phase-step ${index < phaseIndex ? 'completed' : index === phaseIndex ? 'current' : ''}" data-set-phase="${phase}" data-tracking-promotion="${promotion.id}"><span class="phase-step-icon">${index < phaseIndex ? '✓' : index + 1}</span><span><b>${escapeHtml(phaseLabels[phase])}</b><small>${index < phaseIndex ? 'Terminée' : index === phaseIndex ? 'Phase en cours' : 'À venir'}</small></span><em>${index < phaseIndex ? '100%' : index === phaseIndex ? 'En cours' : '0%'}</em></button>`).join('');
  $('#phaseMetricLabel').textContent = `${phaseLabels[promotion.phase]} · ${promotion.name}`;
  $('#phaseMetricStatus').textContent = promotion.status;
  $('#phaseStudents').textContent = promotion.students;
  $('#phaseSessions').textContent = promotion.sessions;
  $('#phaseDuration').textContent = `${duration} min`;
  $('#phasePositions').textContent = resource.positions;
  $('#phaseCapacityInfo').textContent = `${resource.name} · ${resource.positions} positions · ${dailySlots(promotion).length} créneaux par jour · pause de ${promotion.breakDuration ?? 45} min.`;
  $('#phaseInstructorAssignments').innerHTML = instructorsForPhase.length ? instructorsForPhase.map(instructor => `<div class="assignment-row"><span class="avatar">${initials(instructor.name)}</span><strong>${escapeHtml(instructor.name)}</strong><small>${escapeHtml(instructor.speciality)} · ${instructor.groups || 0} groupe(s)</small></div>`).join('') : '<div class="empty-state">Aucun instructeur compatible avec cette phase.</div>';
  $('#phaseGroupSubtitle').textContent = `${groups} groupes, selon ${resource.positions} positions disponibles sur ${resource.name}.`;
  const rows = Array.from({ length: groups }, (_, index) => {
    const first = index * resource.positions + 1; const last = Math.min(promotion.students, (index + 1) * resource.positions);
    const count = last - first + 1;
    return `<div class="group-table-row"><strong>Groupe ${index + 1}</strong><span>Étudiants ${first} – ${last}</span><span>${count}</span><span>${promotion.sessions}</span><span>${groupsHours.toFixed(groupsHours % 1 ? 1 : 0)} h</span></div>`;
  }).join('');
  $('#phaseGroups').innerHTML = `<div class="group-table-head"><span>Groupe</span><span>Étudiants</span><span>Effectif</span><span>Séances</span><span>Durée</span></div>${rows}<div class="group-table-row"><strong>Total</strong><span></span><span>${promotion.students}</span><span>${promotion.sessions * groups}</span><span>${totalHours.toFixed(totalHours % 1 ? 1 : 0)} h</span></div>`;
  $('#phaseTotalDuration').textContent = `${totalHours.toFixed(totalHours % 1 ? 1 : 0)} h`;
  $('#phaseSummaryStudents').textContent = promotion.students;
  $('#phaseSummarySessions').textContent = promotion.sessions;
  $('#phaseSummaryDuration').textContent = `${duration} min`;
  $('#phaseEstimatedDays').textContent = `${estimateDays} jour${estimateDays > 1 ? 's' : ''}`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
function renderSessions() {
  const select = $('#sessionFilter'); const filter = select?.value || 'all'; const today = dateKey(new Date()); const weekEnd = dateKey(addDays(startOfWeek(new Date()), 6));
  let events = scheduledEvents().sort((first, second) => first.date.localeCompare(second.date) || first.startMinutes - second.startMinutes);
  if (filter === 'today') events = events.filter(event => event.date === today);
  if (filter === 'week') events = events.filter(event => event.date >= dateKey(startOfWeek(new Date())) && event.date <= weekEnd);
  $('#sessionsTitle').textContent = `${events.length} séance${events.length > 1 ? 's' : ''} ${filter === 'today' ? 'aujourd’hui' : filter === 'week' ? 'cette semaine' : 'planifiée(s)'}`;
  $('#sessionsSubtitle').textContent = events.length ? 'Créneaux générés à partir des horaires, pauses et positions sélectionnées.' : 'Planifiez une promotion pour générer les séances.';
  const target = $('#sessionsTable');
  if (!events.length) { target.innerHTML = '<div class="empty-state">Aucune séance pour cette période.</div>'; return; }
  target.innerHTML = `<div class="session-table-head"><span>Promotion / groupe</span><span>Date</span><span>Créneau</span><span>Ressource</span><span>Statut</span></div>${events.map(event => `<div class="session-table-row"><strong>${escapeHtml(event.title)}</strong><span>${formatDate(dateFromKey(event.date))}</span><span>${event.time}</span><span>${escapeHtml(resources.find(resource => resource.id === event.resourceId)?.name || '—')}</span><span class="session-status">Planifiée</span></div>`).join('')}`;
}
function renderStudents() {
  const select = $('#studentPromotionSelect'); const target = $('#studentList');
  if (!promotions.length) { select.innerHTML = '<option>Aucune promotion</option>'; $('#studentCountLabel').textContent = '0 étudiant'; target.innerHTML = '<div class="empty-state">Ajoutez une promotion avant d’ajouter des étudiants.</div>'; return; }
  const currentId = state.studentPromotionId && promotions.some(promotion => promotion.id === state.studentPromotionId) ? state.studentPromotionId : promotions[0].id;
  state.studentPromotionId = currentId;
  select.innerHTML = promotions.map(promotion => `<option value="${promotion.id}" ${promotion.id === currentId ? 'selected' : ''}>${escapeHtml(promotion.name)}</option>`).join('');
  const promotion = promotions.find(item => item.id === currentId); const roster = students.filter(student => student.promotionId === currentId);
  $('#studentCountLabel').textContent = `${roster.length} inscrit${roster.length > 1 ? 's' : ''} · effectif prévu ${promotion.students}`;
  target.innerHTML = roster.length ? roster.map((student, index) => `<article class="student-card"><span class="student-avatar">${initials(student.name)}</span><div><strong>${escapeHtml(student.name)}</strong><small>Étudiant ${index + 1} · ${escapeHtml(promotion.name)}</small></div><button data-delete-student="${student.id}" title="Supprimer">×</button></article>`).join('') : '<div class="empty-state">Aucun étudiant nommé. Utilisez « Ajouter un étudiant » pour constituer la liste.</div>';
}
function addStudentModal() {
  if (!promotions.length) { showToast('Créez une promotion avant d’ajouter des étudiants.'); setView('promotions'); return; }
  const options = promotions.map(promotion => `<option value="${promotion.id}" ${promotion.id === state.studentPromotionId ? 'selected' : ''}>${escapeHtml(promotion.name)}</option>`).join('');
  openModal(`<h3>Ajouter un étudiant</h3><p>Il sera rattaché à la promotion sélectionnée et l’effectif sera actualisé.</p><div class="modal-form"><label>Nom complet<input id="newStudentName" autocomplete="name" placeholder="Ex. Amine Bensaid" /></label><label>Promotion<select id="newStudentPromotion">${options}</select></label></div><div class="modal-actions"><button class="outline-button" id="modalCancel">Annuler</button><button class="primary-button" id="saveStudent">Ajouter</button></div>`);
}
function saveStudentFromModal() {
  const name = $('#newStudentName')?.value.trim(); const promotionId = $('#newStudentPromotion')?.value;
  if (!name || !promotionId) { showToast('Indiquez le nom et la promotion de l’étudiant.'); return; }
  students.push({ id: `student-${Date.now()}`, name, promotionId }); const promotion = promotions.find(item => item.id === promotionId);
  if (promotion) promotion.students = Math.max(0, Number(promotion.students) || 0) + 1;
  state.studentPromotionId = promotionId; persistManagementData(); renderStudents(); renderPromotions(); renderDashboard(); renderPhaseTracking(); closeModal(); showToast(`${name} a été ajouté.`);
}
function deleteStudent(id) {
  const student = students.find(item => item.id === id); if (!student) return;
  students = students.filter(item => item.id !== id); const promotion = promotions.find(item => item.id === student.promotionId);
  if (promotion) promotion.students = Math.max(0, (Number(promotion.students) || 0) - 1);
  persistManagementData(); renderStudents(); renderPromotions(); renderDashboard(); renderPhaseTracking(); showToast('Étudiant supprimé.');
}
function renderReports() {
  const events = scheduledEvents(); const plannedPromotions = promotions.filter(promotion => promotion.status === 'Planifiée');
  const totalHours = events.reduce((sum, event) => sum + (event.endMinutes - event.startMinutes) / 60, 0);
  const totalStudents = promotions.reduce((sum, promotion) => sum + (Number(promotion.students) || 0), 0);
  $('#reportGrid').innerHTML = `<article class="report-card"><small>Promotions planifiées</small><strong>${plannedPromotions.length}</strong><p>Sur ${promotions.length} promotion(s)</p></article><article class="report-card"><small>Séances générées</small><strong>${events.length}</strong><p>Rotations planifiées</p></article><article class="report-card"><small>Heures-position</small><strong>${totalHours.toFixed(totalHours % 1 ? 1 : 0)} h</strong><p>Charge totale estimée</p></article><article class="report-card"><small>Étudiants</small><strong>${totalStudents}</strong><p>Effectif des promotions</p></article>`;
  const resourceHours = resources.map(resource => ({ resource, hours: events.filter(event => event.resourceId === resource.id).reduce((sum, event) => sum + (event.endMinutes - event.startMinutes) / 60, 0) }));
  const max = Math.max(1, ...resourceHours.map(item => item.hours));
  $('#resourceReportList').innerHTML = resourceHours.length ? resourceHours.map(item => `<div class="resource-report-row"><strong>${escapeHtml(item.resource.name)}</strong><div class="meter"><i style="width:${item.hours / max * 100}%"></i></div><span>${item.hours.toFixed(item.hours % 1 ? 1 : 0)} h</span></div>`).join('') : '<div class="empty-state">Aucune ressource configurée.</div>';
}
function renderSettings() {
  $('#settingAcademyName').value = settings.academyName;
  $('#settingDefaultStart').value = settings.defaultStart;
  $('#settingDefaultEnd').value = settings.defaultEnd;
  $('#settingDefaultDuration').value = settings.defaultDuration;
  $('#settingDefaultBreak').value = settings.defaultBreak;
}
function saveSettings() {
  settings = { academyName: $('#settingAcademyName').value.trim() || 'Aviation Academy', defaultStart: $('#settingDefaultStart').value || '09:00', defaultEnd: $('#settingDefaultEnd').value || '16:30', defaultDuration: Number($('#settingDefaultDuration').value), defaultBreak: Number($('#settingDefaultBreak').value) };
  document.querySelector('.brand-name').innerHTML = `${escapeHtml(settings.academyName).toUpperCase().replace(' ', '<br />')}`;
  persistManagementData(); showToast('Paramètres enregistrés. Ils seront utilisés pour les nouvelles promotions.');
}

function instructorModal(instructor = null) {
  const data = instructor || { name: '', speciality: 'TWR', groups: 0 };
  openModal(`<h3>${instructor ? 'Modifier' : 'Ajouter'} un instructeur</h3><p>La spécialité détermine les phases auxquelles il peut être affecté.</p><div class="modal-form"><label>Nom complet<input id="newInstructorName" autocomplete="name" value="${escapeHtml(data.name)}" placeholder="Ex. Nadia Benali" /></label><label>Spécialité<select id="newInstructorSpeciality"><option ${data.speciality === 'TWR' ? 'selected' : ''}>TWR</option><option ${data.speciality === 'Approche Radar' ? 'selected' : ''}>Approche Radar</option><option ${data.speciality === 'TWR + Approche Radar' ? 'selected' : ''}>TWR + Approche Radar</option><option ${data.speciality === 'En-route Radar' ? 'selected' : ''}>En-route Radar</option></select></label><label>Groupes déjà affectés<input id="newInstructorGroups" type="number" min="0" value="${data.groups || 0}" /></label></div><div class="modal-actions"><button class="outline-button" id="modalCancel">Annuler</button><button class="primary-button" data-save-instructor="${instructor?.id || ''}">${instructor ? 'Enregistrer' : 'Ajouter'}</button></div>`);
}
function addInstructorFromModal(id = '') {
  const nameInput = $('#newInstructorName');
  const specialityInput = $('#newInstructorSpeciality');
  const groupsInput = $('#newInstructorGroups');
  const name = nameInput?.value.trim();
  if (!name) { nameInput?.focus(); showToast('Indiquez le nom de l’instructeur.'); return; }
  const instructor = { id: id || `instructor-${Date.now()}`, name, speciality: specialityInput.value, groups: Math.max(0, Number(groupsInput.value) || 0) };
  const index = instructors.findIndex(item => item.id === instructor.id);
  if (index >= 0) instructors.splice(index, 1, instructor); else instructors.unshift(instructor);
  persistManagementData();
  renderInstructors();
  renderInstructorPills();
  renderDashboard();
  closeModal();
  showToast(`${name} a été enregistré dans l’équipe pédagogique.`);
}

function deleteInstructor(id) {
  const instructor = instructors.find(item => item.id === id);
  if (!instructor) return;
  openModal(`<h3>Retirer ${escapeHtml(instructor.name)} ?</h3><p class="modal-confirm">Cet instructeur ne pourra plus être affecté aux nouveaux créneaux. Les plannings déjà affichés restent inchangés.</p><div class="modal-actions"><button class="outline-button" id="modalCancel">Annuler</button><button class="primary-button" data-confirm-delete-instructor="${instructor.id}">Retirer</button></div>`);
}

function renderResourceSummary() {
  const twr = resources.filter(resource => resource.type === 'TWR').reduce((sum, resource) => sum + resource.positions, 0);
  const radar = resources.filter(resource => resource.type !== 'TWR').reduce((sum, resource) => sum + resource.positions, 0);
  const available = resources.filter(resource => resource.availability !== 'Indisponible').reduce((sum, resource) => sum + resource.positions, 0);
  $('#resourceTwrPositions').textContent = twr;
  $('#resourceRadarPositions').textContent = radar;
  $('#resourceAvailablePositions').textContent = available;
  $('#resourceAvailabilityInfo').textContent = `${resources.length} ressource${resources.length > 1 ? 's' : ''} configurée${resources.length > 1 ? 's' : ''}`;
}
function resourceModal(resource = null) {
  const isEditing = Boolean(resource);
  const data = resource || { name: '', positions: 1, type: 'TWR', phases: ['aerodrome'], availability: 'Disponible' };
  openModal(`<h3>${isEditing ? 'Modifier' : 'Ajouter'} une ressource</h3><p>Définissez les positions et les phases compatibles. Une ressource peut servir plusieurs promotions, sans être attachée définitivement à une seule phase.</p><div class="modal-form"><label>Nom de la ressource<input id="resourceNameInput" value="${escapeHtml(data.name)}" placeholder="Ex. RADAR APP 3" /></label><label>Nombre de positions<input id="resourcePositionsInput" type="number" min="1" value="${data.positions}" /></label><label>Type<select id="resourceTypeInput"><option value="TWR" ${data.type === 'TWR' ? 'selected' : ''}>TWR</option><option value="APP" ${data.type === 'APP' ? 'selected' : ''}>Approche Radar</option><option value="ENR" ${data.type === 'ENR' ? 'selected' : ''}>En-route Radar</option></select></label><label>Disponibilité<select id="resourceAvailabilityInput"><option ${data.availability === 'Disponible' ? 'selected' : ''}>Disponible</option><option ${data.availability === 'Indisponible' ? 'selected' : ''}>Indisponible</option></select></label></div><div class="modal-actions"><button class="outline-button" id="modalCancel">Annuler</button><button class="primary-button" data-save-resource="${resource?.id || ''}">${isEditing ? 'Enregistrer' : 'Ajouter'}</button></div>`);
}
function saveResourceFromModal(id) {
  const name = $('#resourceNameInput')?.value.trim(); const positions = Number($('#resourcePositionsInput')?.value) || 0; const type = $('#resourceTypeInput')?.value;
  if (!name || positions < 1) { showToast('Indiquez un nom et au moins une position.'); return; }
  const phasesByType = { TWR: ['aerodrome'], APP: ['approach-procedure', 'approach-radar'], ENR: ['enroute-procedure', 'enroute-radar'] };
  const resource = { id: id || `resource-${Date.now()}`, name, positions, type, icon: type === 'TWR' ? '♜' : '◉', phases: phasesByType[type], availability: $('#resourceAvailabilityInput').value };
  const index = resources.findIndex(item => item.id === resource.id);
  if (index >= 0) resources.splice(index, 1, resource); else resources.push(resource);
  persistManagementData(); renderResourceCards(); renderResourceSummary(); renderResourceSelector(); renderDashboard(); renderWeekGrid(); closeModal(); showToast(`Ressource ${name} enregistrée.`);
}
function deleteResource(id) {
  const resource = resources.find(item => item.id === id); if (!resource) return;
  openModal(`<h3>Supprimer ${escapeHtml(resource.name)} ?</h3><p class="modal-confirm">Cette ressource ne sera plus disponible pour les nouveaux plannings. Les promotions la utilisant devront être recalculées.</p><div class="modal-actions"><button class="outline-button" id="modalCancel">Annuler</button><button class="primary-button" data-confirm-delete-resource="${resource.id}">Supprimer</button></div>`);
}
function renderResourceCards() {
  const target = $('#resourceCards');
  if (!resources.length) { target.innerHTML = '<div class="empty-state">Aucune ressource enregistrée. Ajoutez une ressource pour commencer la planification.</div>'; return; }
  target.innerHTML = resources.map(resource => `<article class="resource-card"><div class="resource-card-header"><div><span class="mini-icon ${resource.type === 'TWR' ? 'blue' : 'purple'}">${resource.icon}</span><h3>${escapeHtml(resource.name)}</h3><p>${resource.positions} position${resource.positions > 1 ? 's' : ''} · ${resource.type === 'TWR' ? 'TWR' : resource.type === 'APP' ? 'Approche Radar' : 'En-route Radar'}</p></div><span class="availability ${resource.availability !== 'Disponible' ? 'busy' : ''}">${resource.availability}</span></div><div class="compatibility">${resource.phases.map(phase => `<span>${phaseLabels[phase]}</span>`).join('')}</div><div class="resource-card-footer"><span>${resource.positions} positions</span><div><button data-edit-resource="${resource.id}">Modifier</button><button class="resource-delete" data-delete-resource="${resource.id}">Supprimer</button></div></div></article>`).join('');
}

function renderInstructors() {
  const target = $('#instructorList');
  if (!target) return;
  $('#instructorCount').textContent = `${instructors.length} instructeur${instructors.length > 1 ? 's' : ''}`;
  if (!instructors.length) {
    target.innerHTML = '<div class="empty-state">Aucun instructeur enregistré. Cliquez sur « Ajouter un instructeur ».</div>';
    return;
  }
  target.innerHTML = instructors.map(instructor => `<article class="instructor-card"><div class="avatar">${initials(instructor.name)}</div><div><strong>${escapeHtml(instructor.name)}</strong><p>${escapeHtml(instructor.speciality)} · ${instructor.groups ? `${instructor.groups} groupe${instructor.groups > 1 ? 's' : ''}` : 'Disponible'}</p><span class="load">● ${instructor.groups ? 'Affecté aujourd’hui' : 'Disponible aujourd’hui'}</span></div><div class="instructor-actions"><button data-edit-instructor="${instructor.id}">Modifier</button><button class="remove-instructor" title="Retirer ${escapeHtml(instructor.name)}" data-delete-instructor="${instructor.id}">×</button></div></article>`).join('');
}

function setView(viewId) {
  $$('.view').forEach(view => view.classList.toggle('active-view', view.id === viewId));
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
  const headings = {dashboard:['Bonjour, Alexandre','Vue d’ensemble de la planification ATC'], promotions:['Promotions & planification','Gérer les promotions et générer un planning automatique'], 'phase-tracking':['Suivi de phase','Avancement, groupes et ressources de la promotion'], planning:['Planning des simulateurs','Vue détaillée · occupation hebdomadaire'], resources:['Gestion des simulateurs','Positions disponibles et polyvalentes'], sessions:['Séances de simulation','Suivi des rotations et des exercices'], instructors:['Instructeurs','Disponibilités et affectations'], students:['Étudiants','Suivi des promotions'], reports:['Rapports','Capacité et performance'], settings:['Paramètres','Configuration de la plateforme']};
  $('#pageTitle').textContent = headings[viewId][0]; $('#pageSubtitle').textContent = headings[viewId][1];
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'phase-tracking') renderPhaseTracking();
  if (viewId === 'planning') { renderWeekGrid(); renderGeneratedPlan(); }
  if (viewId === 'sessions') renderSessions();
  if (viewId === 'students') renderStudents();
  if (viewId === 'reports') renderReports();
  if (viewId === 'settings') renderSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupEvents() {
  $$('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $$('[data-go]').forEach(button => button.addEventListener('click', () => setView(button.dataset.go)));
  $('#phaseCards').addEventListener('click', event => { const card = event.target.closest('.phase-card'); if (!card) return; state.phase = card.dataset.phase; $$('.phase-card').forEach(item => item.classList.toggle('selected', item === card)); const allowed = new Set(resources.filter(r => r.phases.includes(state.phase) && r.availability !== 'Indisponible').map(r => r.id)); state.selectedResources = new Set([...state.selectedResources].filter(id => allowed.has(id))); if (!state.selectedResources.size && allowed.size) state.selectedResources.add([...allowed][0]); renderResourceSelector(); renderInstructorPills(); updateEstimates(); });
  ['studentCount','sessionCount','sessionDuration','breakDuration','dayStart','dayEnd','startDate'].forEach(id => $(`#${id}`).addEventListener('input', updateEstimates));
  $$('#dayToggles button').forEach(button => button.addEventListener('click', () => { button.classList.toggle('selected'); updateEstimates(); }));
  $('#generatePlan').addEventListener('click', () => { state.generated = true; const saved = saveCurrentPromotion(); if (!saved) return; const info = calculate(); state.planningWeekStart = dateFromKey(saved.startDate) || new Date(); renderWeekGrid(); renderDashboard(); renderGeneratedPlan(); setView('planning'); showToast(`${info.groups} groupes et ${info.totalRotations} rotations ont été proposés automatiquement.`); });
  $('#savePromotion').addEventListener('click', () => { state.generated = false; const saved = saveCurrentPromotion(); if (saved) showToast(`Promotion ${saved.name} enregistrée.`); });
  $('#resetPlanner').addEventListener('click', () => { resetPromotionForm(); showToast('Formulaire de planification réinitialisé.'); });
  $('#newPromotion').addEventListener('click', () => { resetPromotionForm(); $('#cohortName').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#cohortName').focus(); showToast('Nouvelle promotion : complétez le formulaire puis enregistrez-la.'); });
  $('#recalculate').addEventListener('click', () => { renderWeekGrid(); renderDashboard(); const conflicts = planningConflicts(); showToast(conflicts.length ? `${conflicts.length} conflit${conflicts.length > 1 ? 's' : ''} à examiner après recalcul.` : 'Planning recalculé : aucun conflit détecté.'); });
  $('#optimize').addEventListener('click', () => $('#recalculate').click());
  $('#addMaintenance').addEventListener('click', () => { const date = dateKey(displayedDates()[0]); openModal(`<h3>Ajouter une indisponibilité</h3><p>La position sera bloquée à la date choisie et les conflits éventuels seront signalés.</p><div class="modal-form"><label>Ressource<select id="maintenanceResource">${resources.map(resource => `<option value="${resource.id}">${escapeHtml(resource.name)}</option>`).join('')}</select></label><label>Date<input id="maintenanceDate" type="date" value="${date}" /></label><label>Motif<input id="maintenanceReason" value="Maintenance" /></label></div><div class="modal-actions"><button class="outline-button" id="modalCancel">Annuler</button><button class="primary-button" id="saveMaintenance">Bloquer la ressource</button></div>`); });
  $('#showConflict').addEventListener('click', () => { const conflicts = planningConflicts(); const details = conflicts.length ? conflicts.map(conflict => `<li>${escapeHtml(conflict.event.title)} · ${formatDate(dateFromKey(conflict.event.date))} · ${conflict.type === 'maintenance' ? 'ressource indisponible' : 'créneau en chevauchement'}</li>`).join('') : '<li>Aucun conflit détecté.</li>'; openModal(`<h3>Contrôles de planning</h3><p>Les alertes sont calculées avec les données que vous avez créées.</p><ul>${details}</ul><p>Modifiez la promotion, une ressource ou une indisponibilité, puis recalculez.</p><div class="modal-actions"><button class="outline-button" id="modalCancel">Fermer</button><button class="primary-button" id="modalRecalculate">Recalculer</button></div>`); });
  $('#modalClose').addEventListener('click', closeModal); $('#modalBackdrop').addEventListener('click', event => { if (event.target === $('#modalBackdrop')) closeModal(); });
  $('#openResourceCreator').addEventListener('click', () => resourceModal());
  $('#addInstructor').addEventListener('click', () => instructorModal());
  $('#previousPeriod').addEventListener('click', () => { state.planningWeekStart = addDays(state.planningWeekStart, state.planningMode === 'month' ? -28 : -7); renderWeekGrid(); renderDashboard(); });
  $('#nextPeriod').addEventListener('click', () => { state.planningWeekStart = addDays(state.planningWeekStart, state.planningMode === 'month' ? 28 : 7); renderWeekGrid(); renderDashboard(); });
  $('#currentPeriod').addEventListener('click', () => { const firstPlanned = promotions.find(promotion => promotion.status === 'Planifiée' && promotion.startDate); state.planningWeekStart = firstPlanned ? dateFromKey(firstPlanned.startDate) : new Date(); renderWeekGrid(); renderDashboard(); });
  $$('[data-planning-mode]').forEach(button => button.addEventListener('click', () => { state.planningMode = button.dataset.planningMode; $$('[data-planning-mode]').forEach(item => item.classList.toggle('active', item === button)); renderWeekGrid(); showToast(state.planningMode === 'month' ? 'Vue mensuelle affichée.' : 'Vue hebdomadaire affichée.'); }));
  $('#exportPlanning').addEventListener('click', () => {
    const rows = [['Promotion', 'Ressource', 'Date', 'Créneau'], ...scheduledEvents().map(event => [event.title, resources.find(resource => resource.id === event.resourceId)?.name || '', event.date, event.time])];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'atc-planner-planning.csv'; link.click(); URL.revokeObjectURL(url); showToast('Export du planning téléchargé.');
  });
  $('#regenerateGroups').addEventListener('click', () => { renderPhaseTracking(); showToast('Groupes recalculés selon les positions disponibles.'); });
  $('.menu-button').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
  document.addEventListener('click', event => {
    const promotionButton = event.target.closest('[data-promo-action]');
    const phaseButton = event.target.closest('[data-set-phase]');
    const instructorButton = event.target.closest('[data-delete-instructor]');
    const editInstructor = event.target.closest('[data-edit-instructor]');
    const confirmedPromotion = event.target.closest('[data-confirm-delete-promotion]');
    const confirmedInstructor = event.target.closest('[data-confirm-delete-instructor]');
    const editResource = event.target.closest('[data-edit-resource]');
    const removeResource = event.target.closest('[data-delete-resource]');
    const saveResource = event.target.closest('[data-save-resource]');
    const confirmedResource = event.target.closest('[data-confirm-delete-resource]');
    if (promotionButton) { if (promotionButton.dataset.promoAction === 'edit') editPromotion(promotionButton.dataset.promotionId); else if (promotionButton.dataset.promoAction === 'track') { state.trackingPromotionId = promotionButton.dataset.promotionId; setView('phase-tracking'); } else deletePromotion(promotionButton.dataset.promotionId); }
    if (phaseButton) { const promotion = promotions.find(item => item.id === phaseButton.dataset.trackingPromotion); if (promotion) { promotion.phase = phaseButton.dataset.setPhase; promotion.status = 'En cours'; persistManagementData(); renderPromotions(); renderPhaseTracking(); renderDashboard(); renderWeekGrid(); showToast(`Phase mise à jour : ${phaseLabels[promotion.phase]}.`); } }
    if (instructorButton) deleteInstructor(instructorButton.dataset.deleteInstructor);
    if (editInstructor) instructorModal(instructors.find(item => item.id === editInstructor.dataset.editInstructor));
    if (editResource) resourceModal(resources.find(item => item.id === editResource.dataset.editResource));
    if (removeResource) deleteResource(removeResource.dataset.deleteResource);
    if (saveResource) saveResourceFromModal(saveResource.dataset.saveResource);
    if (confirmedPromotion) { promotions = promotions.filter(item => item.id !== confirmedPromotion.dataset.confirmDeletePromotion); if (state.editingPromotionId === confirmedPromotion.dataset.confirmDeletePromotion) resetPromotionForm(); if (state.trackingPromotionId === confirmedPromotion.dataset.confirmDeletePromotion) state.trackingPromotionId = null; persistManagementData(); renderPromotions(); renderDashboard(); renderWeekGrid(); renderGeneratedPlan(); renderPhaseTracking(); closeModal(); showToast('Promotion supprimée.'); }
    if (confirmedInstructor) { instructors = instructors.filter(item => item.id !== confirmedInstructor.dataset.confirmDeleteInstructor); persistManagementData(); renderInstructors(); renderInstructorPills(); renderDashboard(); closeModal(); showToast('Instructeur retiré.'); }
    if (confirmedResource) { resources = resources.filter(item => item.id !== confirmedResource.dataset.confirmDeleteResource); state.selectedResources.delete(confirmedResource.dataset.confirmDeleteResource); persistManagementData(); renderResourceCards(); renderResourceSummary(); renderResourceSelector(); renderDashboard(); renderWeekGrid(); closeModal(); showToast('Ressource supprimée.'); }
    if (event.target.id === 'modalCancel') closeModal();
    if (event.target.id === 'modalRecalculate') { closeModal(); $('#recalculate').click(); }
    if (event.target.id === 'modalDone') closeModal();
    if (event.target.id === 'modalAddInstructor') addInstructorFromModal();
    if (event.target.closest('[data-save-instructor]')) addInstructorFromModal(event.target.closest('[data-save-instructor]').dataset.saveInstructor);
    if (event.target.id === 'saveMaintenance') { state.maintenance = { resourceId: $('#maintenanceResource').value, date: $('#maintenanceDate').value, reason: $('#maintenanceReason').value.trim() || 'Maintenance' }; renderWeekGrid(); renderDashboard(); closeModal(); showToast('Indisponibilité ajoutée au planning.'); }
  });
}

if (!$('#startDate').value) $('#startDate').value = dateKey(new Date());
updateCurrentClock(); setInterval(updateCurrentClock, 10000); renderResourceSelector(); renderResourceSummary(); renderResourceCards(); renderPromotions(); renderInstructors(); renderInstructorPills(); updateEstimates(); renderDashboard(); renderWeekGrid(); renderGeneratedPlan(); renderPhaseTracking(); setupEvents();
