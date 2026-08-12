# app.py (Version ancienne et ultra-stable)
import streamlit as st

st.set_page_config(
    page_title="ATC Planner - Aviation Academy", 
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- Chargement des fichiers locaux ---
def load_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

html_content = load_file('index.html')
css_content = load_file('styles.css')
js_content = load_file('app.js')

# --- Injection du CSS et JS directement dans le HTML ---
# Remplace les balises externes par le contenu inline pour garantir le fonctionnement
html_content = html_content.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css_content}</style>')
html_content = html_content.replace('<script src="app.js"></script>', f'<script>{js_content}</script>')

# --- CSS pour masquer l'interface de Streamlit (Full Page) ---
st.markdown("""
<style>
    /* On force l'iframe à prendre toute la page */
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
    /* On cache tout le reste de Streamlit */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# --- Affichage du composant ---
# height=None permet à l'iframe de s'étendre à l'infini
st.components.v1.html(html_content, height=None, scrolling=True)
