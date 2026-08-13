# storage.py - Version Supabase Partagée
import requests
import json

# --- CONFIGURATION SUPABASE ---
# Remplacez ces deux lignes par vos vraies valeurs
SUPABASE_URL = "https://bwctfhuwpbkxnebqslpn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Y3RmaHV3cGJreG5lYnFzbHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzQ2NTQsImV4cCI6MjEwMjE1MDY1NH0.5zSMn62M-PMwwOurNsVGPMJeRnKyEbmBnA3-nZ7jtM0"

# --- FONCTIONS SUPABASE ---
def load_all_data():
    """Lit les données depuis Supabase."""
    try:
        url = f"{SUPABASE_URL}/rest/v1/shared_data?select=data&order=created_at.desc&limit=1"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]['data']
    except:
        pass
    # Si aucune donnée, on retourne une structure vide
    return {"promotions": [], "instructors": []}

def save_promotion(name, students, phase):
    """Écrit une promotion dans Supabase."""
    try:
        # 1. On lit les données actuelles
        current_data = load_all_data()
        import time
        new_promo = {
            "id": str(int(time.time())),
            "name": name,
            "students": students,
            "phase": phase
        }
        current_data["promotions"].append(new_promo)
        
        # 2. On sauvegarde tout dans Supabase
        url = f"{SUPABASE_URL}/rest/v1/shared_data"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        payload = {"data": current_data}
        response = requests.post(url, headers=headers, json=payload)
        
        return response.status_code in [200, 201, 204]
    except Exception as e:
        print("Erreur Supabase:", e)
        return False
