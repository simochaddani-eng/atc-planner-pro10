# scheduler_ortools.py
import datetime
import os
import json
import streamlit as st
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- CONFIGURATION DE LA BASE DE DONNÉES (PERSISTANTE STREAMLIT) ---
# /tmp est un dossier partagé par tous les utilisateurs qui se connectent à votre app.
PERSISTENT_DIR = "/tmp"
DB_PATH = os.path.join(PERSISTENT_DIR, "atc_planner_global.db")

engine = create_engine(f'sqlite:///{DB_PATH}', echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class PromotionDB(Base):
    __tablename__ = 'promotions_db'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    students = Column(Integer, nullable=False)
    phase = Column(String, nullable=False)
    sessions = Column(Integer, nullable=False)
    sessionDuration = Column(Integer, nullable=False)
    startDate = Column(String, nullable=False)
    selectedResources = Column(String, nullable=False)

Base.metadata.create_all(bind=engine)

class ATCSchedulerORTools:
    
    def create_phase_and_generate(self, promo_name, student_count, phase_type, sessions_per_student, 
                                  duration_min, start_date, available_positions, daily_hours):
        db = SessionLocal()
        new_promo = PromotionDB(
            name=promo_name,
            students=student_count,
            phase=phase_type,
            sessions=sessions_per_student,
            sessionDuration=duration_min,
            startDate=start_date,
            selectedResources='["radar1"]'
        )
        db.add(new_promo)
        db.commit()
        db.refresh(new_promo)
        db.close()
        return {"status": "success", "phase_id": new_promo.id, "message": "Planning enregistré."}

    # UTILISATION DU CACHE DE STREAMLIT POUR PARTAGER LES DONNÉES
    @st.cache_data(ttl=10) # Rafraîchit toutes les 10 secondes
    def get_all_promotions(_self):
        db = SessionLocal()
        promos = db.query(PromotionDB).all()
        db.close()
        return promos

    def delete_promotion(self, promo_id):
        db = SessionLocal()
        promo = db.query(PromotionDB).filter(PromotionDB.id == promo_id).first()
        if promo:
            db.delete(promo)
            db.commit()
            db.close()
            # On vide le cache pour que les autres utilisateurs voient le changement
            st.cache_data.clear()
            return True
        db.close()
        return False
