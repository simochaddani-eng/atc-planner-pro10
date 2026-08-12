import streamlit as st
import pandas as pd

def render():
    st.markdown("## 📅 Planning des Simulateurs – Vue Détaillée")
    
    # Récupération des données réelles depuis le session_state
    promotions = st.session_state.get("promotions", [])
    instructeurs = st.session_state.get("instructors", [])
    schedule = st.session_state.get("schedule", [])

    # --- FILTRES DE NAVIGATION ---
    col1, col2, col3 = st.columns(3)
    with col1:
        liste_promos = ["Toutes"] + [p["Nom"] for p in promotions]
        selected_promo = st.selectbox("Promotion", liste_promos)
    with col2:
        selected_phase = st.selectbox("Phase", ["Toutes", "Phase 1 - TWR", "Phase 2 - RADAR", "Phase 3 - En-route"])
    with col3:
        liste_inst = ["Tous"] + [i["Nom"] for i in instructeurs]
        selected_inst = st.selectbox("Instructeur", liste_inst)

    st.markdown("<br>", unsafe_allow_html=True)

    # --- DÉTECTION ET AFFICHAGE DES CONFLITS RÉELS ---
    conflicts = st.session_state.get("conflicts", [])
    
    if conflicts:
        st.error(f"⚠️ Conflits détectés en temps réel ({len(conflicts)}) :")
        for c in conflicts:
            st.markdown(f"• **{c['titre']}** : {c['description']}")
    else:
        st.success("✅ Aucun conflit détecté. Toutes les ressources et instructeurs sont correctement alignés.")

    if st.button("🔄 Recalculer & Optimiser l'emploi du temps", type="primary"):
        # Logique de vérification dynamique
        new_conflicts = []
        
        # Vérification si des instructeurs sont occupés/en congé
        inst_occupes = [i["Nom"] for i in instructeurs if i.get("Statut") == "Occupé"]
        if inst_occupes:
            new_conflicts.append({
                "titre": "Instructeur indisponible",
                "description": f"Instructeur(s) non disponible(s) : {', '.join(inst_occupes)}"
            })
            
        st.session_state["conflicts"] = new_conflicts
        st.rerun()

    st.markdown("---")

    # --- GRILLE D'AFFICHAGE DU PLANNING ---
    ressources = ["TWR 1", "TWR 2", "TWR 3", "TWR 4", "RADAR 1 (Pos 1)", "RADAR 1 (Pos 2)", "RADAR 2"]
    jours = ["Lun. 10/08", "Mar. 11/08", "Mer. 12/08", "Jeu. 13/08", "Ven. 14/08"]

    if schedule:
        # Affichage du planning généré
        df_schedule = pd.DataFrame(schedule)
        st.dataframe(df_schedule, use_container_width=True)
    else:
        # Structure de grille propre en attente de planification
        st.info("📌 Aucun créneau planifié pour l'instant. Utilisez le module **'Nouvelle planification'** pour attribuer les séances aux promotions actives (ICNA).")
        
        # Tableau vide structuré par simulateur
        data_empty = {jour: ["Libre" for _ in ressources] for jour in jours}
        df_grid = pd.DataFrame(data_empty, index=ressources)
        
        st.dataframe(df_grid, use_container_width=True)
