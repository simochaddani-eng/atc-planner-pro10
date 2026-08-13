# scheduler_ortools.py (Version Persistante)
import datetime
import os
import json
from sqlalchemy import create_engine, Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# --- CONFIGURATION DE LA BASE DE DONNÉES PERSISTANTE ---
# On stocke la base de données dans le dossier temporaire de Streamlit qui reste entre les redémarrages.
# Ce dossier est persistant tant que l'application n'est pas redéployée sur GitHub.
PERSISTENT_DIR = "/tmp"
DB_PATH = os.path.join(PERSISTENT_DIR, "atc_planner_persistent.db")

engine = create_engine(f'sqlite:///{DB_PATH}', echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# --- MODÈLES DE DONNÉES ---
class PromotionDB(Base):
    __tablename__ = 'promotions_db'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    students = Column(Integer, nullable=False)
    phase = Column(String, nullable=False)
    sessions = Column(Integer, nullable=False)
    sessionDuration = Column(Integer, nullable=False)
    startDate = Column(String, nullable=False)
    dayStart = Column(String, nullable=False)
    dayEnd = Column(String, nullable=False)
    selectedResources = Column(String, nullable=False) # Stocké comme chaîne JSON
    status = Column(String, default="Planifiée")

# Création de la table
Base.metadata.create_all(bind=engine)

class ATCSchedulerORTools:
    
    def create_phase_and_generate(self, promo_name, student_count, phase_type, sessions_per_student, 
                                  duration_min, start_date, available_positions, daily_hours):
        # 1. Sauvegarde dans la base de données
        db = SessionLocal()
        new_promo = PromotionDB(
            name=promo_name,
            students=student_count,
            phase=phase_type,
            sessions=sessions_per_student,
            sessionDuration=duration_min,
            startDate=start_date,
            dayStart='09:00',
            dayEnd='16:30',
            selectedResources='["radar1"]', # Exemple simplifié
            status="Planifiée"
        )
        db.add(new_promo)
        db.commit()
        db.refresh(new_promo)
        db.close()
        
        return {
            "status": "success",
            "phase_id": new_promo.id,
            "message": f"Planning généré pour {promo_name}."
        }

    def get_all_promotions(self):
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
            return True
        db.close()
        return False

    def update_promotion(self, promo_id, new_data):
        db = SessionLocal()
        promo = db.query(PromotionDB).filter(PromotionDB.id == promo_id).first()
        if promo:
            promo.name = new_data.get('name', promo.name)
            promo.students = new_data.get('students', promo.students)
            promo.phase = new_data.get('phase', promo.phase)
            promo.sessions = new_data.get('sessions', promo.sessions)
            promo.sessionDuration = new_data.get('sessionDuration', promo.sessionDuration)
            promo.startDate = new_data.get('startDate', promo.startDate)
            db.commit()
            db.close()
            return True
        db.close()
        return False
