# scheduler_ortools.py
import json
from supabase import create_client, Client

# --- VOTRE CLÉ ET URL DIRECTEMENT INTÉGRÉES ---
SUPABASE_URL = "https://bwctfhuwpbkxnebqslpn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Y3RmaHV3cGJreG5lYnFzbHBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzQ2NTQsImV4cCI6MjEwMjE1MDY1NH0.5zSMn62M-PMwwOurNsVGPMJeRnKyEbmBnA3-nZ7jtM0"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class ATCSchedulerORTools:
    
    def create_phase_and_generate(self, promo_name, student_count, phase_type, sessions_per_student, 
                                  duration_min, start_date, available_positions, daily_hours):
        data = {
            "name": promo_name,
            "students": student_count,
            "phase": phase_type,
            "sessions": sessions_per_student,
            "sessionDuration": duration_min,
            "startDate": start_date,
            "selectedResources": '["radar1"]',
            "status": "Planifiée"
        }
        response = supabase.table('promotions_db').insert(data).execute()
        
        if response.data:
            return {
                "status": "success",
                "phase_id": response.data[0]['id'],
                "message": f"Planning généré pour {promo_name}."
            }
        return {"status": "failure", "message": "Erreur de sauvegarde Supabase"}

    def get_all_promotions(self):
        response = supabase.table('promotions_db').select("*").execute()
        return response.data

    def delete_promotion(self, promo_id):
        supabase.table('promotions_db').delete().eq('id', promo_id).execute()
        return True
