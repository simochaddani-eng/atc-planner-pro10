import streamlit as st
import pandas as pd
import math
import plotly.express as px

def render():
    st.markdown("## 🎯 Suivi de Formation & Phases")
    
    # Récupération des données dynamiques
    promotions = st.session_state.get("promotions", [])
    instructeurs = st.session_state.get("instructors", [])
    
    if not promotions:
        st.info("📌 Aucune promotion enregistrée. Allez dans 'Gestion des données' pour en ajouter une.")
        return

    # Sélecteur de promotion
    nom_promos = [p["Nom"] for p in promotions]
    col_sel, _ = st.columns([2, 2])
    with col_sel:
        selected_promo_name = st.selectbox("Sélectionner la promotion :", nom_promos)
    
    promo = next((p for p in promotions if p["Nom"] == selected_promo_name), promotions[0])
    effectif_total = int(promo.get("Effectif", 30))
    
    st.markdown("---")
    st.markdown(f"### 🎯 Suivi de Formation – Promotion **{selected_promo_name}** ({effectif_total} étudiants)")
    
    # Indicateurs des 5 Phases ATC
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("1. Aérodrome", "100%", delta="Terminé")
    c2.metric("2. App. Proc.", "100%", delta="Terminé")
    c3.metric("3. En-route Proc.", "60%", delta="En cours")
    c4.metric("4. App. Radar", "0%", delta="À venir", delta_color="off")
    c5.metric("5. En-route Radar", "0%", delta="À venir", delta_color="off")

    st.markdown("<br>", unsafe_allow_html=True)

    # Calcul dynamique des groupes (Max 4 élèves)
    taille_groupe = 4
    nb_groupes = math.ceil(effectif_total / taille_groupe)
    
    groupes_data = []
    liste_noms_inst = [i["Nom"] for i in instructeurs] if instructeurs else ["Aucun instructeur"]

    for g in range(1, nb_groupes + 1):
        start_std = (g - 1) * taille_groupe + 1
        end_std = min(g * taille_groupe, effectif_total)
        count = end_std - start_std + 1
        heures = 6 if count == 4 else math.ceil(count * 1.5)
        
        groupes_data.append({
            "Groupe": f"Groupe {g}",
            "Étudiants": f"{start_std} - {end_std}",
            "Effectif": count,
            "Séances": 8,
            "Durée estimée": f"{heures}h 00"
        })

    col_left, col_right = st.columns([1, 1])
    
    with col_left:
        st.markdown("### 👥 Groupes générés")
        st.dataframe(pd.DataFrame(groupes_data), use_container_width=True, hide_index=True)
        
    with col_right:
        st.markdown("### 👨‍🏫 Affectation des Instructeurs Réels")
        if not instructeurs:
            st.warning("⚠️ Aucun instructeur disponible dans la base. Ajoutez-en via l'onglet 'Gestion des données'.")
        else:
            # Formulaire d'affectation dynamique sans aucun nom fictif
            affectations = []
            for g in range(1, nb_groupes + 1):
                c_grp, c_inst, c_stat = st.columns([1, 2, 1])
                c_grp.write(f"**Groupe {g}**")
                
                # Sélection parmi vos vrais instructeurs
                default_idx = (g - 1) % len(liste_noms_inst)
                inst_choisi = c_inst.selectbox(
                    f"Instructeur G{g}", 
                    liste_noms_inst, 
                    index=default_idx, 
                    label_visibility="collapsed",
                    key=f"select_inst_g_{g}"
                )
                statut_val = "En cours" if g <= 2 else "Prévu"
                c_stat.caption(f"🟢 {statut_val}" if g <= 2 else f"⚪ {statut_val}")

    st.markdown("---")
    
    # Graphiques de charge
    st.markdown("### 📊 Analyse de Charge & Occupation")
    c_chart1, c_chart2 = st.columns(2)
    
    with c_chart1:
        st.markdown("**Charge par Groupe (Heures)**")
        df_chart1 = pd.DataFrame({
            "Groupe": [g["Groupe"] for g in groupes_data],
            "Heures": [6 if g["Effectif"] == 4 else 3 for g in groupes_data]
        })
        fig1 = px.bar(df_chart1, x="Groupe", y="Heures", text="Heures", color="Groupe")
        fig1.update_layout(showlegend=False, height=280, margin=dict(l=10, r=10, t=20, b=10))
        st.plotly_chart(fig1, use_container_width=True)
        
    with c_chart2:
        st.markdown("**Taux d'occupation (%)**")
        df_chart2 = pd.DataFrame({
            "Jour": ["Lun", "Mar", "Mer", "Jeu", "Ven"],
            "Taux (%)": [80, 95, 70, 85, 60]
        })
        fig2 = px.line(df_chart2, x="Jour", y="Taux (%)", markers=True)
        fig2.update_layout(height=280, margin=dict(l=10, r=10, t=20, b=10))
        st.plotly_chart(fig2, use_container_width=True)
