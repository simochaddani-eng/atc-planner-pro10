# app.py (Version FULL PAGE + Boutons fonctionnels)
import streamlit as st
import json
from datetime import datetime
from scheduler_ortools import ATCSchedulerORTools

st.set_page_config(page_title="ATC Planner - Aviation Academy", layout="wide")

if 'scheduler_ortools' not in st.session_state:
    st.session_state.scheduler_ortools = ATCSchedulerORTools()

def load_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

html_content = load_file('index.html')
css_content = load_file('styles.css')
js_content = load_file('app.js')

html_content = html_content.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css_content}</style>')
html_content = html_content.replace('<script src="app.js"></script>', f'<script>{js_content}</script>')

# --- CORRECTION 1 : CSS POUR ENLEVER LA SCROLLBAR ET METTRE EN PLEIN ÉCRAN ---
st.markdown("""
<style>
    iframe {
        width: 100vw;
        height: 100vh;
        border: none;
        margin: 0;
        padding: 0;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 9999;
    }
    /* Cache les éléments par défaut de Streamlit */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# --- CORRECTION 2 : SCRIPT POUR FORCER LE RECHARGEMENT DES BOUTONS ---
js_force_events = """
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Rejoue l'initialisation de vos événements JS après le chargement
        if (typeof setupEvents === 'function') {
            setupEvents();
            console.log('✅ Events re-initialisés avec succès');
        }
    });
</script>
"""
html_content = html_content.replace('</body>', js_force_events + '</body>')

# --- AFFICHAGE DU COMPOSANT ---
st.components.v1.html(html_content, height=None, scrolling=True)

# --- INTERCEPTION DES REQUÊTES PYTHON ---
action = st.query_params.get("action")
data_str = st.query_params.get("data")

if action == "generate" and data_str:
    try:
        data = json.loads(data_str)
        result = st.session_state.scheduler_ortools.create_phase_and_generate(
            promo_name=data['name'],
            student_count=int(data['students']),
            phase_type=data['phase'],
            sessions_per_student=int(data['sessions']),
            duration_min=int(data['duration']),
            start_date=datetime.strptime(data['startDate'], '%Y-%m-%d').date(),
            available_positions=int(data['positions']),
            daily_hours=[int(h) for h in data['dailyHours']]
        )
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = result["status"]
        st.query_params.message = result["message"]
        st.query_params.data = json.dumps(result)
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)
