import streamlit as st

# Configuration de la page
st.set_page_config(
    page_title="ATC Planner – Aviation Academy",
    layout="wide",
    page_icon="✈️"
)

# Chargement du style CSS personnalisé
def load_css(file_name):
    try:
        with open(file_name) as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
    except FileNotFoundError:
        pass

load_css("styles.css")

# Système d'authentification simple
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

# Importation des modules applicatifs
from modules import dashboard, new_planning, planning_view, phase_management

# Barre latérale (Menu de navigation)
with st.sidebar:
    st.markdown("### ✈️ AVIATION ACADEMY")
    st.caption("Gestion & Planification ATC")
    st.markdown("---")
    
    menu = st.radio(
        "Navigation",
        ["Tableau de bord", "Nouvelle planification", "Planning des simulateurs", "Suivi des phases"],
        format_func=lambda x: {
            "Tableau de bord": "📊 Tableau de bord",
            "Nouvelle planification": "➕ Nouvelle planification",
            "Planning des simulateurs": "📅 Planning des simulateurs",
            "Suivi des phases": "🎯 Suivi des phases"
        }[x]
    )
    
    st.markdown("---")
    st.markdown("👤 **Alexandre Martin**\n\n*Administrateur*")
    if st.button("Déconnexion", use_container_width=True):
        st.session_state["authenticated"] = False
        st.rerun()

# Router principal
if menu == "Tableau de bord":
    dashboard.render()
elif menu == "Nouvelle planification":
    new_planning.render()
elif menu == "Planning des simulateurs":
    planning_view.render()
elif menu == "Suivi des phases":
    phase_management.render()
