"""ATC Planner – Streamlit Community Cloud entry point."""

from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).parent

st.set_page_config(
    page_title="ATC Planner",
    page_icon="✈",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# CSS ULTIME POUR LE FULL PAGE (Suppression de tous les espaces blancs)
st.markdown(
    """
    <style>
      /* Suppression de tous les éléments par défaut de Streamlit */
      #MainMenu, header, footer, [data-testid="stToolbar"],
      [data-testid="stStatusWidget"], [data-testid="stDecoration"] { display: none !important; }
      
      /* Suppression des fonds blancs et des marges */
      [data-testid="stAppViewContainer"], [data-testid="stMain"] { 
          background: #f7f9fd !important; 
          padding: 0 !important;
          margin: 0 !important;
      }
      [data-testid="stMainBlockContainer"] { 
          max-width: none !important; 
          padding: 0 !important; 
          margin: 0 !important;
      }
      [data-testid="stVerticalBlock"] { gap: 0 !important; }
      div[data-testid="stElementContainer"]:has(iframe) { 
          width: 100vw !important; 
          margin: 0 !important; 
          padding: 0 !important;
      }
      
      /* Forçage de l'iframe à 100% de la fenêtre */
      iframe { 
          border: 0 !important; 
          width: 100vw !important; 
          height: 100vh !important; 
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 9999 !important;
          margin: 0 !important;
          padding: 0 !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

html_template = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
javascript = (ROOT / "app.js").read_text(encoding="utf-8")

# Keep the complete front-end in one Streamlit component so every interactive
# action (forms, local storage, planner and exports) works after deployment.
html_template = html_template.replace(
    '<link rel="stylesheet" href="styles.css" />', f"<style>{css}</style>"
)
html_template = html_template.replace('<script src="app.js"></script>', f"<script>{javascript}</script>")

# height=None est crucial pour que l'iframe prenne toute la place
components.html(html_template, height=None, scrolling=True)
