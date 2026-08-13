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

# Present the planner as the application, not as a small card inside Streamlit.
st.markdown(
    """
    <style>
      #MainMenu, header, footer, [data-testid="stToolbar"],
      [data-testid="stStatusWidget"], [data-testid="stDecoration"] { display: none !important; }
      [data-testid="stAppViewContainer"], [data-testid="stMain"] { background: #f7f9fd !important; }
      [data-testid="stMainBlockContainer"] { max-width: none !important; padding: 0 !important; }
      [data-testid="stVerticalBlock"] { gap: 0 !important; }
      div[data-testid="stElementContainer"]:has(iframe) { width: 100vw !important; margin: 0 !important; }
      iframe { border: 0 !important; width: 100% !important; }
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

components.html(html_template, height=2100, scrolling=True)
