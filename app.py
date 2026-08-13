# app.py - Version totale sans librairie externe
import streamlit as st
import streamlit.components.v1 as components
import json
from storage import load_all_data, save_promotion

st.set_page_config(page_title="ATC Planner - Partagé (Cache)", layout="wide")

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

# --- LECTURE DES DONNÉES PARTAGÉES VIA LE CACHE ---
shared_data = load_all_data()
promotions = json.dumps(shared_data["promotions"])
instructors = json.dumps(shared_data["instructors"])

# --- INTERCEPTION DE L'ACTION "GENERATE" POUR SAUVEGARDER ---
action = st.query_params.get("action")
data_str = st.query_params.get("data")

if action == "generate" and data_str:
    try:
        data = json.loads(data_str)
        success = save_promotion(data['name'], data['students'], data['phase'])
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "success" if success else "failure"
        st.query_params.message = "Promotion enregistrée sur le serveur !" if success else "Erreur de sauvegarde."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- INJECTION DES DONNÉES DANS LE JAVASCRIPT ---
data_injection = f"""
<script>
    window.__SHARED_PROMOTIONS = {promotions};
    window.__SHARED_INSTRUCTORS = {instructors};
    console.log("✅ Données du serveur chargées ! Promos:", {len(shared_data['promotions'])});
</script>
"""
html = html.replace('</body>', data_injection + '</body>')

# --- CSS PLEIN ÉCRAN ---
st.markdown("""
<style>
    #MainMenu, header, footer, [data-testid="stToolbar"] { display: none !important; }
    [data-testid="stAppViewContainer"] { padding: 0 !important; margin: 0 !important; }
    [data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: none !important; }
    iframe { width: 100vw !important; height: 100vh !important; border: none !important; position: fixed !important; top: 0 !important; left: 0 !important; z-index: 9999 !important; }
</style>
""", unsafe_allow_html=True)

components.html(html, height=None, scrolling=True)
