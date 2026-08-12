import streamlit as st
import pandas as pd
from modules.engine import calculate_phase_metrics

def render():
    st.markdown("## ➕ Nouvelle Planification Automatique")
    
    col_form, col_summary = st.columns([2, 1])
    
    with col_form:
        st.markdown("#### 1. Promotion & Phase")
        c1, c2 = st.columns(2)
        promo_name = c1.text_input("Nom de la promotion", value="P2025-C")
        effectif = c2.number_input("Effectif (Étudiants)", min_value=1, max_value=100, value=30)
        
        phase = st.selectbox("Phase de formation", [
            "1. Aérodrome",
            "2. Approche aux procédures",
            "3. En-route aux procédures",
            "4. Approche Radar",
            "5. En-route Radar"
        ])
        
        st.markdown("#### 2. Paramètres des Séances")
        p1, p2, p3 = st.columns(3)
        nb_seances = p1.number_input("Séances / étudiant", value=8)
        duree_seance = p2.selectbox("Durée par étudiant", [45, 30, 60], format_func=lambda x: f"{x} min")
        date_debut = p3.date_input("Date de début")
        
        st.markdown("#### 3. Ressources & Horaires")
        h1, h2 = st.columns(2)
        horaires = h1.text_input("Fenêtre quotidienne", value="09:00 - 16:30")
        ressource = h2.selectbox("Ressource principale", [
            "TWR (4 positions)",
            "RADAR 1 (4 positions)",
            "RADAR 2 (Polyvalent)"
        ])
        
        nb_pos = 4 if "4" in ressource else 1
        
        if st.button("🚀 Générer le planning automatique", type="primary", use_container_width=True):
            st.success(f"Planning généré avec succès pour {promo_name} !")

    with col_summary:
        st.markdown("### 📊 Résultat Estimatif")
        metrics = calculate_phase_metrics(effectif, nb_seances, duree_seance, nb_pos)
        
        st.metric("Total séances", f"{metrics['total_seances']}")
        st.metric("Heures-position totales", f"{metrics['total_heures']:.1f} h")
        st.metric("Groupes / Rotations", f"{metrics['nb_groupes']} groupes / {metrics['rotations']} rot.")
        st.metric("Durée en jours", f"{metrics['jours_estimes']} jours")
        st.metric("Durée en semaines", f"{metrics['semaines_estimees']} semaines")
        
        st.info("Le calcul prend en compte l'occupation parallèle des positions disponibles.")
