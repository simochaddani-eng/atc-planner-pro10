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

# --- CSS ULTIME POUR LE FULL PAGE (COLLAGE AUX COINS) ---
st.markdown(
    """
    <style>
      /* 1. Cacher absolument tout ce qui est Streamlit */
      #MainMenu, header, footer, [data-testid="stToolbar"],
      [data-testid="stStatusWidget"], [data-testid="stDecoration"],
      [data-testid="stAppViewContainer"], [data-testid="stMain"],
      [data-testid="stMainBlockContainer"], [data-testid="stVerticalBlock"] {
          all: unset !important;
          display: none !important;
          margin: 0 !important;
          padding: 0 !important;
          height: 0 !important;
          width: 0 !important;
      }

      /* 2. Forcer l'iframe à couvrir 100% de l'écran */
      iframe {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          border: none !important;
          z-index: 9999 !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
      }
      
      /* 3. Supprimer les marges résiduelles du body */
      body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

html_template = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
javascript = (ROOT / "app.js").read_text(encoding="utf-8")

# Injection du CSS et du JS dans le HTML
html_template = html_template.replace(
    '<link rel="stylesheet" href="styles.css" />', f"<style>{css}</style>"
)
html_template = html_template.replace('<script src="app.js"></script>', f"<script>{javascript}</script>")

# height=None permet à l'iframe de prendre la hauteur que le CSS lui impose
components.html(html_template, height=None, scrolling=True)
