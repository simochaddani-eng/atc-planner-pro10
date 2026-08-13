# storage.py - Version avec promotion de démonstration
import streamlit as st
import json
import os
import time

DATA_FILE = "/tmp/atc_planner_shared_data.json"

def load_all_data():
    """Lit les données depuis le fichier partagé."""
    # On vérifie si le fichier existe déjà
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
            
    # Si le fichier n'existe pas (premier démarrage), on crée une promotion de démonstration
    demo_data = {
        "promotions": [
            {
                "id": "demo-1",
                "name": "ICNA 09 (Démo)",
                "students": 30,
                "phase": "approach-radar"
            }
        ],
        "instructors": []
    }
    
    # On sauvegarde ce fichier pour que le téléphone puisse le lire
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(demo_data, f)
        
    return demo_data

def save_promotion(name, students, phase):
    """Écrit une promotion dans le fichier partagé."""
    data = load_all_data()
    new_promo = {
        "id": str(int(time.time())),
        "name": name,
        "students": students,
        "phase": phase
    }
    data["promotions"].append(new_promo)
    
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    st.cache_data.clear()
    return True
