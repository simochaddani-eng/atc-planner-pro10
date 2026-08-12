import streamlit as st
import pandas as pd

def render():
    st.markdown("## ✈️ ATC Planner – Tableau de bord")
    
    # --- CALCUL DYNAMIQUE DES KPIs ---
    nb_promotions = len(st.session_state.get("promotions", []))
    total_etudiants = sum([p.get("Effectif", 0) for p in st.session_state.get("promotions", [])])
    
    nb_instructeurs = len(st.session_state.get("instructors", []))
    inst_dispos = len([i for i in st.session_state.get("instructors", []) if i.get("Statut") == "Disponible"])
    
    # 1. Cartes Métriques (Top Bar dynamique)
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""<div style="background-color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 5px solid #2563EB;">
            <div style="font-size: 14px; color: #64748B;">Promotions actives</div>
            <div style="font-size: 24px; font-weight: bold; color: #0F172A;">{nb_promotions}</div>
            <span style="color:#64748B; font-size:12px;">{total_etudiants} Étudiants au total</span>
        </div>""", unsafe_allow_html=True)
    with c2:
        st.markdown("""<div style="background-color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 5px solid #10B981;">
            <div style="font-size: 14px; color: #64748B;">Simulateurs disponibles</div>
            <div style="font-size: 24px; font-weight: bold; color: #0F172A;">6 / 6</div>
            <span style="color:#10B981; font-size:12px;">100% Fonctionnels</span>
        </div>""", unsafe_allow_html=True)
    with c3:
        st.markdown(f"""<div style="background-color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 5px solid #F59E0B;">
            <div style="font-size: 14px; color: #64748B;">Instructeurs affectés</div>
            <div style="font-size: 24px; font-weight: bold; color: #0F172A;">{nb_instructeurs}</div>
            <span style="color:#64748B; font-size:12px;">{inst_dispos} disponibles aujourd'hui</span>
        </div>""", unsafe_allow_html=True)
    with c4:
        st.markdown("""<div style="background-color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-left: 5px solid #8B5CF6;">
            <div style="font-size: 14px; color: #64748B;">Phases en cours</div>
            <div style="font-size: 24px; font-weight: bold; color: #0F172A;">0</div>
            <span style="color:#2563EB; font-size:12px;">En attente de planification</span>
        </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    
    # 2. Section Aperçu Rapide
    col_g, col_d = st.columns([2, 1])
    
    with col_g:
        st.markdown("### 📋 Liste des Promotions")
        if st.session_state["promotions"]:
            st.dataframe(pd.DataFrame(st.session_state["promotions"]), use_container_width=True, hide_index=True)
        else:
            st.info("Aucune promotion n'est actuellement enregistrée. Allez dans 'Gestion des données' pour en ajouter.")
            
    with col_d:
        st.markdown("### 👨‍🏫 Aperçu des Instructeurs")
        if st.session_state["instructors"]:
            st.dataframe(pd.DataFrame(st.session_state["instructors"]), use_container_width=True, hide_index=True)
        else:
            st.info("Aucun instructeur affecté pour le moment.")
