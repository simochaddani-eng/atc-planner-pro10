# app.py
import streamlit as st
import os

st.set_page_config(
    page_title="ATC Planner - Aviation Academy", 
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- 1. Lire le contenu des fichiers statiques ---
def load_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

html_content = load_file('index.html')
css_content = load_file('styles.css')
js_content = load_file('app.js')

# --- 2. Injection du CSS ---
html_content = html_content.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css_content}</style>')

# --- 3. Injection du JS de façon sécurisée ---
# Solution ultime : On demande au navigateur de charger le fichier JS externe directement
js_loader = f"""
<script>
    // Chargement dynamique du fichier app.js externe
    var script = document.createElement('script');
    script.src = './app.js';
    script.type = 'text/javascript';
    document.head.appendChild(script);
    console.log('✅ app.js chargé dynamiquement');
</script>
"""
html_content = html_content.replace('<script src="app.js"></script>', js_loader)

# --- 4. CSS pour masquer Streamlit ---
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
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# --- 5. Affichage du composant ---
st.components.v1.html(html_content, height=None, scrolling=True)
