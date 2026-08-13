# app.py - Version Stable avec st.components
import streamlit as st
import streamlit.components.v1 as components
import json
from scheduler_ortools import ATCSchedulerORTools

st.set_page_config(page_title="ATC Planner - AIAC", layout="wide")

if 'scheduler' not in st.session_state:
    st.session_state.scheduler = ATCSchedulerORTools()

# Lecture du HTML, CSS et JS
def load_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

html = load_file('index.html')
css = load_file('styles.css')
js = load_file('app.js')

# Injection du CSS et JS dans le HTML
html = html.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css}</style>')
html = html.replace('<script src="app.js"></script>', f'<script>{js}</script>')

# --- ROUTES BACKEND (API) ---
action = st.query_params.get("action")
data_str = st.query_params.get("data")
id_str = st.query_params.get("id")

# 1. GÉNÉRATION D'UNE NOUVELLE PROMOTION
if action == "generate" and data_str:
    try:
        data = json.loads(data_str)
        result = st.session_state.scheduler.create_phase_and_generate(
            promo_name=data['name'],
            student_count=int(data['students']),
            phase_type=data['phase'],
            sessions_per_student=int(data['sessions']),
            duration_min=int(data['duration']),
            start_date=data['startDate'],
            available_positions=int(data['positions']),
            daily_hours=data['dailyHours']
        )
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = result["status"]
        st.query_params.message = result["message"]
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# 2. SUPPRESSION D'UNE PROMOTION
elif action == "delete" and id_str:
    try:
        # Ici, vous appellerez votre fonction de suppression
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "success"
        st.query_params.message = "Promotion supprimée avec succès."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# 3. MODIFICATION D'UNE PROMOTION
elif action == "edit" and id_str:
    try:
        st.query_params.clear()
        st.query_params.view = "promotions"
        st.query_params.edit_id = id_str
    except Exception as e:
        pass

# --- CSS FULL PAGE (Pour supprimer les barres Streamlit) ---
st.markdown("""
<style>
    #MainMenu, header, footer, [data-testid="stToolbar"] { display: none !important; }
    [data-testid="stAppViewContainer"] { padding: 0 !important; margin: 0 !important; }
    [data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: none !important; }
    iframe { width: 100vw !important; height: 100vh !important; border: none !important; position: fixed !important; top: 0 !important; left: 0 !important; z-index: 9999 !important; }
</style>
""", unsafe_allow_html=True)

# --- AFFICHAGE DU COMPOSANT (Height=None est crucial) ---
components.html(html, height=None, scrolling=True)
