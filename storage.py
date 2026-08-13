# storage.py
import requests
import json
import time

SUPABASE_URL = "https://bwctfhuwpbkxnebqslpn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Y3RmaHV3cGJreG5lYnFzbHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzQ2NTQsImV4cCI6MjEwMjE1MDY1NH0.5zSMn62M-PMwwOurNsVGPMJeRnKyEbmBnA3-nZ7jtM0"

def load_all_data():
    """Lit les données depuis Supabase."""
    try:
        url = f"{SUPABASE_URL}/rest/v1/shared_data?select=data,created_at&order=created_at.desc&limit=1"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
        response = requests.get(url, headers=headers)
        if response.status_code == 200 and response.json():
            record = response.json()[0]
            # On retourne les données ET le timestamp
            return {
                "data": record['data'],
                "updated_at": record['created_at']
            }
    except:
        pass
    return {"data": {"promotions": [], "instructors": []}, "updated_at": None}

def save_promotion(name, students, phase):
    try:
        current = load_all_data()
        new_promo = {
            "id": str(int(time.time())),
            "name": name,
            "students": students,
            "phase": phase
        }
        current["data"]["promotions"].append(new_promo)
        
        url = f"{SUPABASE_URL}/rest/v1/shared_data"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        requests.post(url, headers=headers, json={"data": current["data"]})
        return True
    except:
        return False
