# storage.py - Version sans gspread (100% Streamlit Cloud compatible)
import requests
import json

# Votre ID de Google Sheet (la partie entre /d/ et /edit dans l'URL)
SHEET_ID = "VOTRE_ID_DE_SHEET_ICI"

def load_all_data():
    # On utilise l'API publique de Google Sheets pour lire les données (JSON)
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json&tq=SELECT%20*"
    try:
        response = requests.get(url)
        # Nettoyage de la réponse (Google rajoute du texte avant le JSON)
        text = response.text
        import re
        json_text = re.sub(r'^.*?\(', '', text)
        json_text = json_text[:-2] # Enlever le ');' à la fin
        data = json.loads(json_text)
        
        promotions = []
        instructors = []
        
        if 'table' in data and 'rows' in data['table']:
            for row in data['table']['rows']:
                if 'c' in row and len(row['c']) >= 5:
                    # Extraction des colonnes
                    id_val = str(row['c'][0]['v']) if row['c'][0] else ""
                    type_val = str(row['c'][1]['v']) if row['c'][1] else ""
                    name_val = str(row['c'][2]['v']) if row['c'][2] else ""
                    value_val = str(row['c'][3]['v']) if row['c'][3] else "0"
                    extra_val = str(row['c'][4]['v']) if row['c'][4] else ""
                    
                    if type_val == "promotion":
                        promotions.append({
                            "id": id_val,
                            "name": name_val,
                            "students": int(value_val) if value_val.isdigit() else 0,
                            "phase": extra_val
                        })
                    elif type_val == "instructor":
                        instructors.append({
                            "id": id_val,
                            "name": name_val,
                            "speciality": value_val
                        })
        return {"promotions": promotions, "instructors": instructors}
    except Exception as e:
        print("Erreur de lecture Google Sheets :", e)
        return {"promotions": [], "instructors": []}

def save_promotion(name, students, phase):
    # Pour l'instant, on ne fait rien car l'écriture nécessite une clé API.
    # Mais l'application va maintenant charger les données !
    return True
