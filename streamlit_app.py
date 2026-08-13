# streamlit_app.py
from pathlib import Path
import streamlit as st

ROOT = Path(__file__).parent

st.set_page_config(
    page_title="ATC Planner",
    page_icon="✈",
    layout="wide",
    initial_sidebar_state="collapsed",
)

html_template = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
javascript = (ROOT / "app.js").read_text(encoding="utf-8")

html_template = html_template.replace(
    '<link rel="stylesheet" href="styles.css" />', f"<style>{css}</style>"
)
html_template = html_template.replace('<script src="app.js"></script>', f"<script>{javascript}</script>")

st.markdown(
    f"""
    <style>
      #MainMenu, header, footer, [data-testid="stToolbar"],
      [data-testid="stStatusWidget"], [data-testid="stDecoration"],
      [data-testid="stAppViewContainer"] {{
          display: none !important;
      }}
      .main-container {{
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          overflow: hidden !important;
      }}
      .main-container iframe {{
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          display: block !important;
      }}
      body {{
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
      }}
    </style>
    <div class="main-container">
        <iframe srcdoc="{html_template.replace('"', '&quot;')}"></iframe>
    </div>
    """,
    unsafe_allow_html=True,
)
