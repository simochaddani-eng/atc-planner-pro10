import streamlit as st
import pandas as pd
import plotly.express as px
from modules.engine import generate_groups

def render():
    st.markdown("## 🎯 Suivi de Formation – Promotion P2025-A")
    
    # Etapes des 5 phases
    p1, p2, p3, p4, p5 = st.columns(5)
    p1.markdown("<span class='status-pill status-done'>1. Aérodrome (100%)</span>", unsafe_allow_html=True)
    p2.markdown("<span class='status-pill status-done'>2. App. Proc. (100%)</span>", unsafe_allow_html=True)
    p3.markdown("<span class='status-pill status-progress'>3. En-route Proc. (60%)</span>", unsafe_allow_html=True)
    p4.markdown("<span class='status-pill status-pending'>4. App. Radar (0%)</span>", unsafe_allow_html=True)
    p5.markdown("<span class='status-pill status-pending'>5. En-route Radar (0%)</span>", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    
    c_grp, c_inst = st.columns(2)
    
    with c_grp:
        st.markdown("#### Groupes générés automatiquement")
        groups = generate_groups(30, max_per_group=4)
        st.dataframe(pd.DataFrame(groups), use_container_width=True, hide_index=True)
        
    with c_inst:
        st.markdown("#### Affectation des Instructeurs")
        instructors = [
            {"Groupe": f"Groupe {i}", "Instructeur": inst, "Statut": "En cours" if i <= 2 else "Prévu"}
            for i, inst in enumerate([
                "Julien Moreau", "Sophie Bernard", "Marc Dubois", "Claire Fontaine",
                "Antoine Leroy", "Élise Petit", "Nicolas Garnier", "Julien Moreau"
            ], start=1)
        ]
        st.dataframe(pd.DataFrame(instructors), use_container_width=True, hide_index=True)

    # Charts de charge
    st.markdown("#### Analyse de Charge & Occupation")
    ch1, ch2 = st.columns(2)
    
    with ch1:
        chart_data = pd.DataFrame({"Semaine": [f"S{i}" for i in range(21, 29)], "Heures": [18, 28, 31, 33, 25, 17, 10, 7]})
        fig_bar = px.bar(chart_data, x="Semaine", y="Heures", title="Charge hebdomadaire (Heures)")
        st.plotly_chart(fig_bar, use_container_width=True)
        
    with ch2:
        occ_data = pd.DataFrame({
            "Semaine": [f"S{i}" for i in range(21, 29)],
            "Positions (%)": [48, 60, 68, 62, 48, 41, 22, 18],
            "Instructeurs (%)": [72, 85, 88, 82, 70, 52, 35, 30]
        })
        fig_line = px.line(occ_data, x="Semaine", y=["Positions (%)", "Instructeurs (%)"], title="Taux d'occupation (%)")
        st.plotly_chart(fig_line, use_container_width=True)
