# app.py - Backend Injection Fix
import streamlit as st
import streamlit.components.v1 as components
import json
from supabase import create_client, Client

st.set_page_config(page_title="ATC Planner - AIAC", layout="wide")

# --- CONNEXION SUPABASE ---
SUPABASE_URL = "https://bwctfhuwpbkxnebqslpn.supabase.co"

# Try to get the key from Streamlit Cloud Secrets. Fallback to hardcoded key for local testing.
try:
    SUPABASE_KEY = st.secrets["SUPABASE_KEY"]
except Exception:
    # This is just a fallback for local computer testing. 
    # On the Cloud, it reads from the Secrets you just pasted above.
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Y3RmaHV3cGJreG5lYnFzbHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzQ2NTQsImV4cCI6MjEwMjE1MDY1NH0.5zSMn62M-PMwwOurNsVGPMJeRnKyEbmBnA3-nZ7jtM0"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def load_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

html = load_file('index.html')
css = load_file('styles.css')
js = load_file('app.js')

# --- INJECTION DU CSS ---
html = html.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css}</style>')

# --- INJECTION DES DONNÉES SUPABASE DIRECTEMENT DANS LE HTML ---
try:
    response = supabase.table('planner_state').select("data").eq('workspace', 'aiac').execute()
    if response.data and len(response.data) > 0:
        backend_data = response.data[0]['data']
        json_data = json.dumps(backend_data)
        
        # On injecte le script qui force l'écrasement du localStorage
        injection_script = f"""
        <script>
            localStorage.setItem('atc-planner-management-v3', '{json_data}');
            console.log('✅ Données injectées par le Backend');
        </script>
        """
        # On injecte le script juste avant le JS principal
        html = html.replace('<script src="app.js"></script>', injection_script + '<script src="app.js"></script>')
except Exception as e:
    pass 

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
