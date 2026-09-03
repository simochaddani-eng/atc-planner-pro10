"""ATC Planner – entry point for Streamlit Community Cloud.

Supabase values are read from Streamlit Secrets, never hard-coded in GitHub.
"""

from __future__ import annotations

import json
import base64
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).parent


def secret(name: str, default: str = "") -> str:
    """Read a flat Streamlit secret without failing during local preview."""
    try:
        return str(st.secrets.get(name, default))
    except FileNotFoundError:
        return default


st.set_page_config(
    page_title="ATC Planner – AIAC",
    page_icon="✈",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Only the Supabase *anon* key belongs in browser code. Never use a service key
# here: it would be visible to every visitor of the public application.
public_config = {
    "url": secret("SUPABASE_URL"),
    "anonKey": secret("SUPABASE_ANON_KEY"),
    "workspace": secret("ATC_WORKSPACE", "aiac"),
}
config_script = json.dumps(public_config).replace("</", "<\\/")

st.markdown(
    """
    <style>
      #MainMenu, header, footer, [data-testid="stToolbar"],
      [data-testid="stStatusWidget"], [data-testid="stDecoration"] { display: none !important; }
      [data-testid="stAppViewContainer"], [data-testid="stMain"] { background: #f7f9fd !important; }
      [data-testid="stMainBlockContainer"] { max-width: none !important; padding: 0 !important; }
      [data-testid="stVerticalBlock"] { gap: 0 !important; }
      div[data-testid="stElementContainer"]:has(iframe) { width: 100% !important; margin: 0 !important; }
      iframe { border: 0 !important; width: 100% !important; }
    </style>
    """,
    unsafe_allow_html=True,
)

html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
javascript = (ROOT / "app.js").read_text(encoding="utf-8")

# components.html renders the interface in an iframe. A relative image path
# would therefore point to the iframe document rather than to this project.
# Embed the AIAC logo so it is available identically on localhost and Streamlit
# Community Cloud.
logo_path = ROOT / "image.png"
if logo_path.exists():
    logo_data_uri = "data:image/png;base64," + base64.b64encode(logo_path.read_bytes()).decode("ascii")
    html = html.replace('src="image.png"', f'src="{logo_data_uri}"')

html = html.replace('<link rel="stylesheet" href="styles.css" />', f"<style>{css}</style>")
html = html.replace(
    '<script src="app.js"></script>',
    f"<script>window.ATC_SUPABASE_CONFIG = {config_script};</script><script>{javascript}</script>",
)

# A regular responsive component is essential on phone. Do not force an iframe
# to desktop width or fixed positioning.
# The interface owns its scrolling and deliberately fills the Streamlit page.
# A generous height prevents the application from being clipped on wide screens
# while the responsive CSS keeps the phone layout compact.
components.html(html, height=3000, scrolling=True)
