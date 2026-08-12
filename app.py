# app.py
import streamlit as st
import json
from datetime import datetime
from scheduler_ortools import ATCSchedulerORTools

st.set_page_config(page_title="ATC Planner - Aviation Academy", layout="wide")

# --- Moteur OR-Tools (Backend) ---
if 'scheduler_ortools' not in st.session_state:
    st.session_state.scheduler_ortools = ATCSchedulerORTools()

# --- Récupération des fichiers locaux ---
def load_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

html_content = load_file('index.html')
css_content = load_file('styles.css')
js_content = load_file('app.js')

# --- Injection du JS et CSS dans le HTML ---
html_content = html_content.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css_content}</style>')
html_content = html_content.replace('<script src="app.js"></script>', f'<script>{js_content}</script>')

# --- Affichage du composant ---
st.components.v1.html(html_content, height=1000, scrolling=True)

# --- INTERCEPTION DES REQUÊTES PYTHON (API) ---
# Lecture des paramètres de l'URL
action = st.query_params.get("action")
data_str = st.query_params.get("data")

if action == "generate" and data_str:
    try:
        data = json.loads(data_str)
        
        # Appel du moteur OR-Tools
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
        
        # Retourner le résultat en JSON via les query params
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
