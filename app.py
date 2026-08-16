# app.py - Version avec Gestion des Instructeurs (Phase, Groupe, Slot)
import streamlit as st
import streamlit.components.v1 as components
import json
import time
from storage import load_all_data, save_all_data

st.set_page_config(page_title="ATC Planner - Gestion Instructeurs", layout="wide")

MASTER_PASSWORD = "PILOTE2026"

def load_file(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return ""

html = load_file('index.html')
css = load_file('styles.css')
js = load_file('app.js')

html = html.replace('<link rel="stylesheet" href="styles.css" />', f'<style>{css}</style>')
html = html.replace('<script src="app.js"></script>', f'<script>{js}</script>')

# Lecture des données partagées
shared_data = load_all_data()
promotions = json.dumps(shared_data.get("promotions", []))
instructors = json.dumps(shared_data.get("instructors", []))

# Lecture des paramètres de l'URL
action = st.query_params.get("action")
data_str = st.query_params.get("data")
password = st.query_params.get("password")
id_str = st.query_params.get("id")

# --- PROTECTION BACKEND ---
if action in ["generate", "delete", "edit", "set_phase_instructor", "set_group_instructor", "set_slot_instructor"] and password != MASTER_PASSWORD:
    st.query_params.clear()
    st.query_params.action = "result"
    st.query_params.status = "failure"
    st.query_params.message = "🔒 Mot de passe incorrect. Les données sont en lecture seule."

# --- CRÉATION DE PROMOTION ---
elif action == "generate" and data_str:
    try:
        data = json.loads(data_str)
        new_promo = {
            "id": str(int(time.time())),
            "name": data['name'],
            "students": data['students'],
            "phase": data['phase'],
            "sessions": data['sessions'],
            "sessionDuration": data['duration'],
            "startDate": data['startDate'],
            "dayStart": "09:00",
            "dayEnd": "16:30",
            "selectedResourceIds": data['selectedResourceIds'] or ["radar1"],
            "status": "Planifiée"
        }
        shared_data["promotions"].append(new_promo)
        if save_all_data(shared_data):
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "success"
            st.query_params.message = "Promotion enregistrée dans l'espace partagé !"
        else:
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "failure"
            st.query_params.message = "Erreur de sauvegarde."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- SUPPRESSION DE PROMOTION ---
elif action == "delete" and id_str:
    try:
        shared_data["promotions"] = [p for p in shared_data.get("promotions", []) if p.get('id') != id_str]
        if save_all_data(shared_data):
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "success"
            st.query_params.message = "Promotion supprimée avec succès !"
        else:
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "failure"
            st.query_params.message = "Erreur lors de la suppression."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- [NOUVEAU] SAUVEGARDE INSTRUCTEUR PAR PHASE ---
elif action == "set_phase_instructor" and data_str:
    try:
        data = json.loads(data_str)
        promo_id = data['promotionId']
        instructor_id = data['instructorId']
        
        # Chercher la promotion et mettre à jour l'instructeur de phase
        for p in shared_data.get("promotions", []):
            if p['id'] == promo_id:
                p['phaseInstructorId'] = instructor_id
                # Optionnel : Mettre à jour les créneaux non manuels
                for event in p.get('plannedEvents', []):
                    if not event.get('manualInstructor'):
                        event['instructorId'] = instructor_id
                break
        
        if save_all_data(shared_data):
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "success"
            st.query_params.message = "Instructeur de phase mis à jour."
        else:
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "failure"
            st.query_params.message = "Erreur de sauvegarde."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- [NOUVEAU] SAUVEGARDE INSTRUCTEUR PAR GROUPE ---
elif action == "set_group_instructor" and data_str:
    try:
        data = json.loads(data_str)
        promo_id = data['promotionId']
        group_num = data['groupNumber']
        instructor_id = data['instructorId']
        
        for p in shared_data.get("promotions", []):
            if p['id'] == promo_id:
                if p.get('groupInstructorIds') is None:
                    p['groupInstructorIds'] = {}
                p['groupInstructorIds'][str(group_num)] = instructor_id
                # Mise à jour des créneaux du groupe
                for event in p.get('plannedEvents', []):
                    if str(event.get('group')) == str(group_num) and not event.get('manualInstructor'):
                        event['instructorId'] = instructor_id
                break
        
        if save_all_data(shared_data):
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "success"
            st.query_params.message = f"Instructeur du groupe {group_num} mis à jour."
        else:
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "failure"
            st.query_params.message = "Erreur de sauvegarde."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- [NOUVEAU] SAUVEGARDE INSTRUCTEUR PAR CRÉNEAU (SLOT) ---
elif action == "set_slot_instructor" and data_str:
    try:
        data = json.loads(data_str)
        promo_id = data['promotionId']
        event_id = data['eventId']
        instructor_id = data['instructorId']
        
        for p in shared_data.get("promotions", []):
            if p['id'] == promo_id:
                for event in p.get('plannedEvents', []):
                    if event.get('id') == event_id:
                        event['instructorId'] = instructor_id
                        event['manualInstructor'] = True
                        break
                break
        
        if save_all_data(shared_data):
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "success"
            st.query_params.message = "Instructeur du créneau mis à jour."
        else:
            st.query_params.clear()
            st.query_params.action = "result"
            st.query_params.status = "failure"
            st.query_params.message = "Erreur de sauvegarde."
    except Exception as e:
        st.query_params.clear()
        st.query_params.action = "result"
        st.query_params.status = "failure"
        st.query_params.message = str(e)

# --- INJECTION DES DONNÉES DANS LE NAVIGATEUR ---
data_injection = f"""
<script>
    window.__SHARED_PROMOTIONS = {promotions};
    window.__SHARED_INSTRUCTORS = {instructors};
    window.__MASTER_PASSWORD = "{MASTER_PASSWORD}";
</script>
"""
html = html.replace('</body>', data_injection + '</body>')

# --- CSS PLEIN ÉCRAN ---
st.markdown("""
<style>
    #MainMenu, header, footer, [data-testid="stToolbar"] { display: none !important; }
    [data-testid="stAppViewContainer"] { padding: 0 !important; margin: 0 !important; }
    [data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: none !important; }
    iframe { width: 100vw !important; height: 100vh !important; border: none !important; position: fixed !important; top: 0 !important; left: 0 !important; z-index: 9999 !important; }
</style>
""", unsafe_allow_html=True)

components.html(html, height=None, scrolling=True)
