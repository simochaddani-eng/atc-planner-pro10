# storage.py
import requests
import json
import time

SUPABASE_URL = "https://bwctfhuwpbkxnebqslpn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Y3RmaHV3cGJreG5lYnFzbHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzQ2NTQsImV4cCI6MjEwMjE1MDY1NH0.5zSMn62M-PMwwOurNsVGPMJeRnKyEbmBnA3-nZ7jtM0"

def load_all_data():
    try:
        url = f"{SUPABASE_URL}/rest/v1/shared_data?select=data&order=id.desc&limit=1"
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200 and response.json():
            return response.json()[0]['data']
        return {"promotions": [], "instructors": []}
    except Exception:
        return {"promotions": [], "instructors": []}

def save_all_data(data):
    try:
        url = f"{SUPABASE_URL}/rest/v1/shared_data"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        response = requests.post(url, headers=headers, json={"data": data}, timeout=5)
        return response.status_code in [200, 201, 204]
    except Exception:
        return False
