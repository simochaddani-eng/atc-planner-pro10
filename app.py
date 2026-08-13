# app.py - Version avec Suppression par Modale fonctionnelle
import streamlit as st
import streamlit.components.v1 as components
import json
from storage import load_all_data, save_all_data

st.set_page_config(page_title="ATC Planner - Partagé", layout="wide")

MASTER_PASSWORD = "PILOTE2026"

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

shared_data = load_all_data()
promotions = json.dumps(shared_data.get("promotions", []))
instructors = json.dumps(shared_data.get("instructors", []))

# Lecture des paramètres de l'URL
action = st.query_params.get("action")
data_str = st.query_params.get("data")  # Pour la génération
password = st.query_params.get("password")
id_str = st.query_params.get("id")      # Pour la suppression

# --- PROTECTION BACKEND ---
if action in ["generate", "delete", "edit"] and password != MASTER_PASSWORD:
    st.query_params.clear()
    st.query_params.action = "result"
    st.query_params.status = "failure"
    st.query_params.message = "🔒 Mot de passe incorrect. Les données sont en lecture seule."

# --- CRÉATION DE PROMOTION ---
elif action == "generate" and data_str:
    try:
        data = json.loads(data_str)
        import time
        new_promo = {
            "id": str(int(time.time())),
            "name": data['name'],
            "students": data['students'],
            "phase": data['phase']
        }
        shared_data["promotions"].append(new_promo)
        if save_all_data(shared_data):
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "success"
            st.query_params.message = "Promotion enregistrée dans l'espace partagé !"
        else:
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "failure"
            st.query_params.message = "Erreur de sauvegarde."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- SUPPRESSION DE PROMOTION ---
elif action == "delete" and id_str:
    try:
        promo_id = id_str
        
        # On filtre la liste pour enlever la promotion avec cet ID
        shared_data["promotions"] = [p for p in shared_data.get("promotions", []) if p.get('id') != promo_id]
        
        if save_all_data(shared_data):
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "success"
            st.query_params.message = "Promotion supprimée avec succès !"
        else:
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "failure"
            st.query_params.message = "Erreur lors de la suppression."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- INJECTION ---
data_injection = f"""
<script>
    window.__SHARED_PROMOTIONS = {promotions};
    window.__SHARED_INSTRUCTORS = {instructors};
    window.__MASTER_PASSWORD = "{MASTER_PASSWORD}";
</script>
"""
html = html.replace('</body>', data_injection + '</body>')

st.markdown("""
<style>
    #MainMenu, header, footer, [data-testid="stToolbar"] { display: none !important; }
    [data-testid="stAppViewContainer"] { padding: 0 !important; margin: 0 !important; }
    [data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: none !important; }
    iframe { width: 100vw !important; height: 100vh !important; border: none !important; position: fixed !important; top: 0 !important; left: 0 !important; z-index: 9999 !important; }
</style>
""", unsafe_allow_html=True)

components.html(html, height=None, scrolling=True)
