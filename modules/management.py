import streamlit as st
import pandas as pd

def render():
    st.markdown("## ⚙️ Gestion des Promotions & Instructeurs")
    
    tab_promo, tab_inst = st.tabs(["🎓 Promotions", "👨‍🏫 Instructeurs"])
    
    # =========================================================
    # TAB 1 : GESTION DES PROMOTIONS
    # =========================================================
    with tab_promo:
        col_add_p, col_del_p = st.columns(2)
        
        # --- BLOC AJOUTER ---
        with col_add_p:
            st.markdown("### ➕ Ajouter une promotion")
            with st.form("add_promo_form", clear_on_submit=True):
                nom = st.text_input("Nom de la promotion (ex: P2026-A)")
                c1, c2 = st.columns(2)
                effectif = c1.number_input("Effectif", min_value=1, value=30)
                statut = c2.selectbox("Statut", ["À planifier", "En cours", "Terminée"])
                
                if st.form_submit_button("Ajouter", type="primary", use_container_width=True) and nom:
                    if any(p["Nom"] == nom for p in st.session_state["promotions"]):
                        st.error("Cette promotion existe déjà !")
                    else:
                        st.session_state["promotions"].append({"Nom": nom, "Effectif": effectif, "Statut": statut})
                        st.success(f"Promotion {nom} ajoutée !")
                        st.rerun()

        # --- BLOC SUPPRIMER ---
        with col_del_p:
            st.markdown("### 🗑️ Supprimer une promotion")
            with st.form("del_promo_form"):
                liste_promos = [p["Nom"] for p in st.session_state["promotions"]]
                if liste_promos:
                    promo_to_delete = st.selectbox("Sélectionnez la promotion", liste_promos)
                    if st.form_submit_button("Supprimer", use_container_width=True):
                        st.session_state["promotions"] = [p for p in st.session_state["promotions"] if p["Nom"] != promo_to_delete]
                        st.success(f"Promotion {promo_to_delete} supprimée !")
                        st.rerun()
                else:
                    st.info("Aucune promotion à supprimer.")
                    st.form_submit_button("Supprimer", disabled=True)

        st.markdown("---")
        
        # --- BLOC MODIFIER (TABLEAU) ---
        st.markdown("### ✏️ Modifier la liste des promotions")
        
        if st.session_state["promotions"]:
            df_promos = pd.DataFrame(st.session_state["promotions"])
            edited_promos = st.data_editor(df_promos, num_rows="dynamic", use_container_width=True, key="promo_editor")
            
            if st.button("💾 Enregistrer les modifications", key="save_promo"):
                st.session_state["promotions"] = edited_promos.to_dict("records")
                st.success("Tableau des promotions mis à jour !")
        else:
            st.warning("La liste des promotions est vide. Ajoutez-en une pour commencer.")

    # =========================================================
    # TAB 2 : GESTION DES INSTRUCTEURS
    # =========================================================
    with tab_inst:
        col_add_i, col_del_i = st.columns(2)
        
        # --- BLOC AJOUTER ---
        with col_add_i:
            st.markdown("### ➕ Ajouter un instructeur")
            with st.form("add_inst_form", clear_on_submit=True):
                nom_inst = st.text_input("Nom & Prénom")
                c1, c2 = st.columns(2)
                spec = c1.selectbox("Spécialité", ["TWR", "RADAR", "Polyvalent"])
                dispo = c2.selectbox("Statut", ["Disponible", "Occupé", "En congé"])
                
                if st.form_submit_button("Ajouter", type="primary", use_container_width=True) and nom_inst:
                    if any(i["Nom"] == nom_inst for i in st.session_state["instructors"]):
                        st.error("Cet instructeur existe déjà !")
                    else:
                        st.session_state["instructors"].append({"Nom": nom_inst, "Spécialité": spec, "Statut": dispo})
                        st.success(f"Instructeur {nom_inst} ajouté !")
                        st.rerun()

        # --- BLOC SUPPRIMER ---
        with col_del_i:
            st.markdown("### 🗑️ Supprimer un instructeur")
            with st.form("del_inst_form"):
                liste_inst = [i["Nom"] for i in st.session_state["instructors"]]
                if liste_inst:
                    inst_to_delete = st.selectbox("Sélectionnez l'instructeur", liste_inst)
                    if st.form_submit_button("Supprimer", use_container_width=True):
                        st.session_state["instructors"] = [i for i in st.session_state["instructors"] if i["Nom"] != inst_to_delete]
                        st.success(f"Instructeur {inst_to_delete} supprimé !")
                        st.rerun()
                else:
                    st.info("Aucun instructeur à supprimer.")
                    st.form_submit_button("Supprimer", disabled=True)

        st.markdown("---")
        
        # --- BLOC MODIFIER (TABLEAU) ---
        st.markdown("### ✏️ Modifier la liste des instructeurs")
        
        if st.session_state["instructors"]:
            df_inst = pd.DataFrame(st.session_state["instructors"])
            edited_inst = st.data_editor(df_inst, num_rows="dynamic", use_container_width=True, key="inst_editor")
            
            if st.button("💾 Enregistrer les modifications", key="save_inst"):
                st.session_state["instructors"] = edited_inst.to_dict("records")
                st.success("Tableau des instructeurs mis à jour !")
        else:
            st.warning("La liste des instructeurs est vide. Ajoutez-en un pour commencer.")
