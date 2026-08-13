# app.py
import streamlit as st
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

html = html.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css}</style>')
html = html.replace('<script src="app.js"></script>', f'<script>{js}</script>')

# --- ROUTE POUR LA GENERATION (BACKEND) ---
action = st.query_params.get("action")
data_str = st.query_params.get("data")

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

# Affichage de l'interface
st.markdown("""
<style>
    #MainMenu, header, footer, [data-testid="stToolbar"] { display: none !important; }
    .main-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; margin: 0; padding: 0; border: none; overflow: hidden; }
    .main-container iframe { width: 100%; height: 100%; border: none; margin: 0; padding: 0; overflow: hidden; display: block; }
    body { margin: 0; padding: 0; overflow: hidden; }
</style>
<div class="main-container">
    <iframe srcdoc='""" + html.replace("'", "\\'") + """'></iframe>
</div>
""", unsafe_allow_html=True)
