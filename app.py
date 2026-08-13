# app.py
import streamlit as st

# Le point d'entrée de l'application redirige directement vers le composant HTML
from streamlit_app import st, components, Path, ROOT, html_template, css, javascript

st.set_page_config(
    page_title="ATC Planner",
    page_icon="✈",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Full page CSS
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

# On passe height=None pour qu'elle s'adapte à l'écran (Full Page)
components.html(html_template, height=None, scrolling=True)
