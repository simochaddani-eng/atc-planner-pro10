import streamlit as st
import pandas as pd
import math
import plotly.express as px

def render():
    st.markdown("## 🎯 Suivi de Formation & Phases")
    
    # 1. Récupération des données dynamiques
    promotions = st.session_state.get("promotions", [])
    instructeurs = st.session_state.get("instructors", [])
    
    if not promotions:
        st.info("📌 Aucune promotion enregistrée. Rendez-vous dans le menu **'Gestion des données'** pour en ajouter une.")
        return

    # 2. Sélecteur de promotion
    nom_promos = [p["Nom"] for p in promotions]
    col_sel, _ = st.columns([2, 2])
    with col_sel:
        selected_promo_name = st.selectbox("Sélectionner la promotion à suivre :", nom_promos)
    
    # Extraction de la promotion active
    promo = next((p for p in promotions if p["Nom"] == selected_promo_name), promotions[0])
    effectif_total = int(promo.get("Effectif", 30))
    
    st.markdown("---")
    st.markdown(f"### 🎯 Suivi de Formation – Promotion **{selected_promo_name}** ({effectif_total} étudiants)")
    
    # 3. Visualisation des 5 Phases ATC
    c1, c2, c3, c4, c5 = st.columns(5)
    with c1:
        st.metric("1. Aérodrome", "100%", delta="Terminé")
    with c2:
        st.metric("2. App. Proc.", "100%", delta="Terminé")
    with c3:
        st.metric("3. En-route Proc.", "60%", delta="En cours", delta_color="normal")
    with c4:
        st.metric("4. App. Radar", "0%", delta="À venir", delta_color="off")
    with c5:
        st.metric("5. En-route Radar", "0%", delta="À venir", delta_color="off")

    st.markdown("<br>", unsafe_allow_html=True)

    # 4. Génération dynamique des groupes (Max 4 étudiants par groupe ATC)
    taille_groupe = 4
    nb_groupes = math.ceil(effectif_total / taille_groupe)
    
    groupes_data = []
    affectations_data = []
    liste_inst_noms = [i["Nom"] for i in instructeurs] if instructeurs else ["À attribuer"]

    for g in range(1, nb_groupes + 1):
        start_std = (g - 1) * taille_groupe + 1
        end_std = min(g * taille_groupe, effectif_total)
        count = end_std - start_std + 1
        nom_grp = f"Groupe {g}"
        
        # Durée estimée selon effectif du groupe
        heures = 6 if count == 4 else math.ceil(count * 1.5)
        
        groupes_data.append({
            "Groupe": nom_grp,
            "Étudiants": f"{start_std} - {end_std}",
            "Effectif": count,
            "Séances": 8,
            "Durée estimée": f"{heures}h 00"
        })
        
        # Attribuer les instructeurs réels en rotation (Round-Robin)
        inst_nom = liste_inst_noms[(g - 1) % len(liste_inst_noms)]
        statut_phase = "En cours" if g <= 2 else "Prévu"
        
        affectations_data.append({
            "Groupe": nom_grp,
            "Instructeur": inst_nom,
            "Statut": statut_phase
        })

    # 5. Affichage des deux tableaux côte à côte
    col_left, col_right = st.columns(2)
    
    with col_left:
        st.markdown("### 👥 Groupes générés automatiquement")
        st.dataframe(pd.DataFrame(groupes_data), use_container_width=True, hide_index=True)
        
    with col_right:
        st.markdown("### 👨‍🏫 Affectation des Instructeurs")
        st.dataframe(pd.DataFrame(affectations_data), use_container_width=True, hide_index=True)

    st.markdown("---")
    
    # 6. Graphiques d'Analyse de Charge & Occupation
    st.markdown("### 📊 Analyse de Charge & Occupation")
    c_chart1, c_chart2 = st.columns(2)
    
    with c_chart1:
        st.markdown("**Charge hebdomadaire (Heures par Groupe)**")
        df_chart1 = pd.DataFrame({
            "Groupe": [g["Groupe"] for g in groupes_data],
            "Heures": [6 if g["Effectif"] == 4 else 3 for g in groupes_data]
        })
        fig1 = px.bar(df_chart1, x="Groupe", y="Heures", text="Heures", color="Groupe")
        fig1.update_layout(showlegend=False, height=280, margin=dict(l=10, r=10, t=20, b=10))
        st.plotly_chart(fig1, use_container_width=True)
        
    with c_chart2:
        st.markdown("**Taux d'occupation des simulateurs (%)**")
        df_chart2 = pd.DataFrame({
            "Jour": ["Lun", "Mar", "Mer", "Jeu", "Ven"],
            "Taux (%)": [80, 95, 70, 85, 60]
        })
        fig2 = px.line(df_chart2, x="Jour", y="Taux (%)", markers=True)
        fig2.update_layout(height=280, margin=dict(l=10, r=10, t=20, b=10))
        st.plotly_chart(fig2, use_container_width=True)
