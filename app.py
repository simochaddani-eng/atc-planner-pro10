# app.py
import streamlit as st
import streamlit.components.v1 as components
import json
from scheduler_ortools import ATCSchedulerORTools

st.set_page_config(page_title="ATC Planner - AIAC", layout="wide")

if 'scheduler' not in st.session_state:
    st.session_state.scheduler = ATCSchedulerORTools()

# --- NOUVEAU : Sync immédiate avec Supabase au démarrage ---
# Cela force le backend à lire les promotions dès que l'application s'ouvre.
if 'promotions_synced' not in st.session_state:
    st.session_state.promotions_synced = st.session_state.scheduler.get_all_promotions()
    st.session_state.promotions_loaded = True

def load_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

html = load_file('index.html')
css = load_file('styles.css')
js = load_file('app.js')

html = html.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css}</style>')
html = html.replace('<script src="app.js"></script>', f'<script>{js}</script>')

# --- ROUTES BACKEND (API) ---
action = st.query_params.get("action")
data_str = st.query_params.get("data")
id_str = st.query_params.get("id")

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
        # On rafraîchit la liste des promotions immédiatement après création
        st.session_state.promotions_synced = st.session_state.scheduler.get_all_promotions()
        
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = result["status"]
        st.query_params.message = result["message"]
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

elif action == "delete" and id_str:
    try:
        st.session_state.scheduler.delete_promotion(int(id_str))
        # On rafraîchit la liste des promotions immédiatement après suppression
        st.session_state.promotions_synced = st.session_state.scheduler.get_all_promotions()
        
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "success"
        st.query_params.message = "Promotion supprimée."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- CSS FULL PAGE ---
st.markdown("""
<style>
    #MainMenu, header, footer, [data-testid="stToolbar"] { display: none !important; }
    [data-testid="stAppViewContainer"] { padding: 0 !important; margin: 0 !important; }
    [data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: none !important; }
    iframe { width: 100vw !important; height: 100vh !important; border: none !important; position: fixed !important; top: 0 !important; left: 0 !important; z-index: 9999 !important; }
</style>
""", unsafe_allow_html=True)

components.html(html, height=None, scrolling=True)
