# storage.py
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import json

# Configuration du fichier de clé JSON (celui que vous avez téléchargé)
SCOPE = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
CREDS = ServiceAccountCredentials.from_json_keyfile_name("service_account.json", SCOPE)
CLIENT = gspread.authorize(CREDS)

# Remplacez CE CODE par l'ID de votre Google Sheet (la partie entre /d/ et /edit dans l'URL)
SHEET_ID = "VOTRE_ID_DE_SHEET_ICI"

def get_worksheet():
    try:
        sh = CLIENT.open_by_key(SHEET_ID)
        return sh.sheet1
    except Exception as e:
        print("Erreur Google Sheets:", e)
        return None

def load_all_data():
    """Lit toutes les données du Google Sheet et les renvoie sous forme de liste."""
    worksheet = get_worksheet()
    if not worksheet:
        return {"promotions": [], "instructors": []}
    
    try:
        # On saute la première ligne (les en-têtes)
        records = worksheet.get_all_records()
        
        promotions = []
        instructors = []
        
        for row in records:
            if row.get("type") == "promotion":
                promotions.append({
                    "id": str(row.get("id", "")),
                    "name": str(row.get("name", "")),
                    "students": int(row.get("value", 0) or 0),
                    "phase": str(row.get("extra", ""))
                })
            elif row.get("type") == "instructor":
                instructors.append({
                    "id": str(row.get("id", "")),
                    "name": str(row.get("name", "")),
                    "speciality": str(row.get("value", ""))
                })
        return {"promotions": promotions, "instructors": instructors}
    except Exception as e:
        print("Erreur de lecture:", e)
        return {"promotions": [], "instructors": []}

def save_promotion(name, students, phase):
    """Ajoute une nouvelle promotion au Google Sheet."""
    worksheet = get_worksheet()
    if not worksheet:
        return False
    
    try:
        # Génération d'un ID simple
        import time
        new_id = int(time.time())
        
        # Ajout de la ligne : id, type, name, value, extra
        worksheet.append_row([new_id, "promotion", name, students, phase])
        return True
    except Exception as e:
        print("Erreur sauvegarde promotion:", e)
        return False
