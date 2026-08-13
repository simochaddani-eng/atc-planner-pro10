# storage.py - Version sans librairie externe
import streamlit as st
import json
import os

# Le fichier de données persistant sur le serveur Streamlit
DATA_FILE = "/tmp/atc_planner_shared_data.json"

def load_all_data():
    """Lit les données depuis le fichier partagé sur le serveur."""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {"promotions": [], "instructors": []}
    return {"promotions": [], "instructors": []}

def save_promotion(name, students, phase):
    """Écrit une promotion dans le fichier partagé sur le serveur."""
    # On charge les données actuelles
    data = load_all_data()
    
    # On crée la nouvelle promotion
    import time
    new_promo = {
        "id": str(int(time.time())),
        "name": name,
        "students": students,
        "phase": phase
    }
    
    # On l'ajoute à la liste
    data["promotions"].append(new_promo)
    
    # On sauvegarde le fichier sur le serveur
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # On vide le cache pour que le téléphone recharge les données
    st.cache_data.clear()
    
    return True
