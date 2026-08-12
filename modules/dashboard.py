import streamlit as st
import pandas as pd
import plotly.express as px

def render():
    st.markdown("## ✈️ ATC Planner – Tableau de bord")
    
    # KPIs Top
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown("""<div class="kpi-card">
            <div class="kpi-title">Promotions actives</div>
            <div class="kpi-value">4</div>
            <span style="color:#64748B; font-size:12px;">128 Étudiants au total</span>
        </div>""", unsafe_allow_html=True)
    with c2:
        st.markdown("""<div class="kpi-card">
            <div class="kpi-title">Simulateurs disponibles</div>
            <div class="kpi-value">6 / 6</div>
            <span style="color:#10B981; font-size:12px;">100% Fonctionnels</span>
        </div>""", unsafe_allow_html=True)
    with c3:
        st.markdown("""<div class="kpi-card">
            <div class="kpi-title">Instructeurs affectés</div>
            <div class="kpi-value">11</div>
            <span style="color:#64748B; font-size:12px;">3 disponibles aujourd'hui</span>
        </div>""", unsafe_allow_html=True)
    with c4:
        st.markdown("""<div class="kpi-card">
            <div class="kpi-title">Phases en cours</div>
            <div class="kpi-value">5</div>
            <span style="color:#2563EB; font-size:12px;">18 séances aujourd'hui</span>
        </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    
    # Section Médiane
    col_capa, col_gantt = st.columns([1, 1])
    
    with col_capa:
        st.markdown("### Capacité – Promotion P2025-A")
        mc1, mc2, mc3, mc4 = st.columns(4)
        mc1.metric("Total séances", "240", "30 étud. × 8")
        mc2.metric("Heures-position", "180h", "240 × 45 min")
        mc3.metric("Rotations", "45", "180h ÷ 4 pos.")
        mc4.metric("Durée estimée", "11.25 j", "16h/j")
        
    with col_gantt:
        st.markdown("### Aperçu planning")
        df_gantt = pd.DataFrame([
            dict(Task="P2025-A", Start='2026-08-10', Finish='2026-08-21', Phase='Aérodrome'),
            dict(Task="P2025-B", Start='2026-08-12', Finish='2026-08-25', Phase='Approche Radar'),
            dict(Task="P2025-C", Start='2026-08-15', Finish='2026-08-28', Phase='En-route Radar'),
        ])
        fig = px.timeline(df_gantt, x_start="Start", x_end="Finish", y="Task", color="Phase", height=180)
        fig.update_layout(margin=dict(l=0, r=0, t=0, b=0), showlegend=False)
        st.plotly_chart(fig, use_container_width=True)

    # Grid Occupation
    st.markdown("### Occupation des simulateurs – Aujourd'hui")
    simu_data = {
        "Simulateur": ["TWR 1", "TWR 2", "TWR 3", "TWR 4", "RADAR 1 (4 pos.)", "RADAR 2"],
        "08h00 - 09h30": ["P2025-A", "P2025-B", "P2025-C", "P2025-A", "Disponible", "P2025-B"],
        "09h45 - 11h15": ["P2025-B", "P2025-A", "P2025-A", "P2025-C", "Disponible", "P2025-A"],
        "11h30 - 13h00": ["P2025-C", "P2025-C", "P2025-B", "P2025-B", "Actif (Approche)", "P2025-C"],
        "13h45 - 15h15": ["P2025-A", "P2025-B", "P2025-C", "P2025-A", "Actif (Approche)", "P2025-A"],
        "15h30 - 17h00": ["P2025-B", "P2025-A", "P2025-A", "P2025-C", "Actif (En-route)", "P2025-B"],
    }
    st.dataframe(pd.DataFrame(simu_data), use_container_width=True, hide_index=True)
