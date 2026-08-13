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
  
  // --- BOUTON MENU (HAMBURGER) ---
  $('.menu-button').addEventListener('click', () => $('.sidebar').classList.toggle('open'));

  // --- CORRECTION ICI : BOUTON RÉDUIRE LE MENU ---
  document.querySelector('.collapse')?.addEventListener('click', () => {
      $('.sidebar').classList.toggle('open');
  });

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
