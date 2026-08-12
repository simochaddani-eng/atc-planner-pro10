import streamlit as st
import pandas as pd

def render():
    st.markdown("## 📅 Planning des Simulateurs – Vue Détaillée")
    
    # Zone d'alertes
    st.markdown("""
    <div class="alert-box">
        <strong>⚠️ Conflits détectés en temps réel (3) :</strong><br>
        • <b>TWR 2 :</b> Chevauchement P2025-B à 10:30.<br>
        • <b>Instructeur :</b> S. Bernard indisponible sur le créneau du matin.<br>
        • <b>Dépassement :</b> TWR 4 dépasse le quota quotidien maximum (8h).
    </div>
    """, unsafe_allow_html=True)

    if st.button("🔄 Recalculer & Optimiser l'emploi du temps", type="primary"):
        st.toast("Optimisation terminée : Conflits résolus !", icon="✅")

    # Filtres
    f1, f2, f3 = st.columns(3)
    f1.selectbox("Promotion", ["Toutes", "P2025-A", "P2025-B", "P2025-C"])
    f2.selectbox("Phase", ["Toutes", "Aérodrome", "Approche Radar", "En-route Radar"])
    f3.selectbox("Instructeur", ["Tous", "Sophie Bernard", "Thomas Leroy", "Julien Moreau"])

    # Matrice
    days = ["Lun. 10/08", "Mar. 11/08", "Mer. 12/08", "Jeu. 13/08", "Ven. 14/08"]
    resources = ["TWR 1", "TWR 2", "TWR 3", "TWR 4", "RADAR 1 (Pos 1)", "RADAR 1 (Pos 2)", "RADAR 2"]
    
    matrix_data = [
        ["P2025-A (08h-10h30)", "P2025-C (09h-11h30)", "P2025-E (08h-10h30)", "P2025-A (13h30-16h)", "P2025-D (09h-11h30)"],
        ["P2025-B (10h30-13h)", "⚠️ CHEVAUCHEMENT", "P2025-D (11h-13h30)", "P2025-C (10h30-13h)", "P2025-E (13h30-16h)"],
        ["P2025-C (13h30-16h)", "P2025-A (13h30-16h)", "P2025-B (11h-13h30)", "P2025-E (11h-13h30)", "P2025-A (08h-10h30)"],
        ["P2025-D (08h-11h)", "P2025-E (08h-11h)", "P2025-A (11h30-15h30)", "⚠️ DÉPASSEMENT", "P2025-B (08h-12h)"],
        ["Approche Radar", "En-route Radar", "Approche Radar", "En-route Radar", "Approche Radar"],
        ["En-route Radar", "Approche Radar", "En-route Radar", "Approche Radar", "En-route Radar"],
        ["P2025-B (08h-12h)", "P2025-C (13h30-17h)", "P2025-D (08h-12h)", "P2025-E (13h30-17h)", "P2025-A (08h-12h)"],
    ]
    
    df_matrix = pd.DataFrame(matrix_data, index=resources, columns=days)
    st.table(df_matrix)
