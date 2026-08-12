import streamlit as st
import pandas as pd

def render():
    st.markdown("## ⚙️ Gestion des Promotions & Instructeurs")
    
    tab_promo, tab_inst = st.tabs(["🎓 Promotions", "👨‍🏫 Instructeurs"])
    
    # ---------------------------------------------------------
    # TAB 1 : GESTION DES PROMOTIONS
    # ---------------------------------------------------------
    with tab_promo:
        st.markdown("### Ajouter une nouvelle promotion")
        with st.form("add_promo_form", clear_on_submit=True):
            c1, c2, c3 = st.columns(3)
            nom = c1.text_input("Nom de la promotion (ex: P2026-A)")
            effectif = c2.number_input("Effectif (Étudiants)", min_value=1, value=30)
            statut = c3.selectbox("Statut", ["À planifier", "En cours", "Terminée"])
            
            if st.form_submit_button("➕ Ajouter la promotion") and nom:
                st.session_state["promotions"].append({"Nom": nom, "Effectif": effectif, "Statut": statut})
                st.success(f"Promotion {nom} ajoutée avec succès !")
                st.rerun()

        st.markdown("---")
        st.markdown("### Modifier la liste des promotions")
        st.caption("Vous pouvez modifier directement les cellules du tableau ou ajouter/supprimer des lignes.")
        
        df_promos = pd.DataFrame(st.session_state["promotions"])
        edited_promos = st.data_editor(df_promos, num_rows="dynamic", use_container_width=True, key="promo_editor")
        
        if st.button("💾 Enregistrer les modifications (Promotions)"):
            st.session_state["promotions"] = edited_promos.to_dict("records")
            st.success("Liste des promotions mise à jour !")

    # ---------------------------------------------------------
    # TAB 2 : GESTION DES INSTRUCTEURS
    # ---------------------------------------------------------
    with tab_inst:
        st.markdown("### Ajouter un nouvel instructeur")
        with st.form("add_inst_form", clear_on_submit=True):
            c1, c2, c3 = st.columns(3)
            nom_inst = c1.text_input("Nom & Prénom")
            spec = c2.selectbox("Spécialité principale", ["TWR", "RADAR", "Polyvalent"])
            dispo = c3.selectbox("Statut initial", ["Disponible", "Occupé", "En congé"])
            
            if st.form_submit_button("➕ Ajouter l'instructeur") and nom_inst:
                st.session_state["instructors"].append({"Nom": nom_inst, "Spécialité": spec, "Statut": dispo})
                st.success(f"Instructeur {nom_inst} ajouté !")
                st.rerun()

        st.markdown("---")
        st.markdown("### Modifier la liste des instructeurs")
        df_inst = pd.DataFrame(st.session_state["instructors"])
        edited_inst = st.data_editor(df_inst, num_rows="dynamic", use_container_width=True, key="inst_editor")
        
        if st.button("💾 Enregistrer les modifications (Instructeurs)"):
            st.session_state["instructors"] = edited_inst.to_dict("records")
            st.success("Liste des instructeurs mise à jour !")
