import streamlit as st

st.set_page_config(page_title="ATC Planner – Aviation Academy", layout="wide", page_icon="✈️")

# 1. Initialisation des données dynamiques dans le Session State
if "promotions" not in st.session_state:
    st.session_state["promotions"] = [
        {"Nom": "P2025-A", "Effectif": 30, "Statut": "En cours"},
        {"Nom": "P2025-B", "Effectif": 28, "Statut": "En cours"},
        {"Nom": "P2025-C", "Effectif": 30, "Statut": "À planifier"}
    ]

if "instructors" not in st.session_state:
    st.session_state["instructors"] = [
        {"Nom": "Sophie Bernard", "Spécialité": "TWR", "Statut": "Disponible"},
        {"Nom": "Julien Moreau", "Spécialité": "RADAR", "Statut": "Disponible"},
        {"Nom": "Thomas Leroy", "Spécialité": "TWR", "Statut": "Occupé"}
    ]

# Authentification
if "authenticated" not in st.session_state:
    st.session_state["authenticated"] = False

if not st.session_state["authenticated"]:
    st.markdown("<br><br>", unsafe_allow_html=True)
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown("## 🔐 ATC Planner - Connexion")
        pwd = st.text_input("Mot de passe d'accès :", type="password")
        if st.button("Se connecter", type="primary", use_container_width=True):
            if pwd == "ATC2026":
                st.session_state["authenticated"] = True
                st.rerun()
            else:
                st.error("Mot de passe incorrect.")
    st.stop()

# Import des modules
from modules import dashboard, new_planning, planning_view, phase_management, management

# Menu latéral
with st.sidebar:
    st.markdown("### ✈️ AVIATION ACADEMY")
    st.caption("Gestion & Planification ATC")
    st.markdown("---")
    
    menu = st.radio(
        "Navigation",
        ["Tableau de bord", "Nouvelle planification", "Planning des simulateurs", "Suivi des phases", "Gestion des données"],
        format_func=lambda x: {
            "Tableau de bord": "📊 Tableau de bord",
            "Nouvelle planification": "➕ Nouvelle planification",
            "Planning des simulateurs": "📅 Planning des simulateurs",
            "Suivi des phases": "🎯 Suivi des phases",
            "Gestion des données": "⚙️ Gestion Promotions/Instructeurs"
        }[x]
    )
    
    st.markdown("---")
    st.markdown("👤 **Alexandre Martin**\n\n*Administrateur*")
    if st.button("Déconnexion", use_container_width=True):
        st.session_state["authenticated"] = False
        st.rerun()

# Router
if menu == "Tableau de bord":
    dashboard.render()
elif menu == "Nouvelle planification":
    new_planning.render()
elif menu == "Planning des simulateurs":
    planning_view.render()
elif menu == "Suivi des phases":
    phase_management.render()
elif menu == "Gestion des données":
    management.render()
