# scheduler_ortools.py
import datetime
from ortools.sat.python import cp_model
from database import SessionLocal, Promotion, Phase, TimeSlot, InstructorAssign

class ATCSchedulerORTools:
    
    def calculate_metrics(self, student_count, sessions_per_student, duration_min, available_positions):
        groups = (student_count + available_positions - 1) // available_positions
        total_sessions = student_count * sessions_per_student
        total_hours = (total_sessions * duration_min) / 60
        return groups, total_sessions, total_hours

    def get_instructors_list(self):
        """Récupère les instructeurs depuis la base de données."""
        db = SessionLocal()
        instructors = db.query(InstructorAssign).all()
        # Fallback si vide
        if not instructors:
            fallback = [{"id": "1", "name": "Instructeur par défaut", "available": True}]
            db.close()
            return fallback
        db.close()
        return [{"id": i.id, "name": i.instructor_name} for i in instructors]

    def create_phase_and_generate(self, promo_name, student_count, phase_type, sessions_per_student, 
                                  duration_min, start_date, available_positions, daily_hours, maintenance_slots=None):
        
        db = SessionLocal()
        
        # 1. Création de la Promotion / Phase
        promo = db.query(Promotion).filter(Promotion.name == promo_name).first()
        if not promo:
            promo = Promotion(name=promo_name, student_count=student_count)
            db.add(promo)
            db.commit()
            db.refresh(promo)

        groups_count, _, _ = self.calculate_metrics(
            student_count, sessions_per_student, duration_min, available_positions
        )
        
        # Estimation de la date de fin
        slots_per_day = len(daily_hours) if len(daily_hours) > 0 else 1
        days_needed = (groups_count * sessions_per_student) / (available_positions * slots_per_day)
        end_date = start_date + datetime.timedelta(days=int(days_needed) + 2)

        new_phase = Phase(
            promotion_id=promo.id,
            phase_type=phase_type,
            sessions_per_student=sessions_per_student,
            duration_min=duration_min,
            available_positions=available_positions,
            start_date=start_date,
            end_date_estimated=end_date,
            status="Planifiée"
        )
        db.add(new_phase)
        db.commit()
        db.refresh(new_phase)

        # 2. Algorithme de remplissage des créneaux (simplifié pour la démo)
        candidate_slots = []
        current_day = start_date
        for day in range(40): 
            for hour in daily_hours:
                for minute in [0, 15, 30, 45]:
                    start_dt = datetime.datetime.combine(current_day, datetime.time(hour, minute))
                    candidate_slots.append(start_dt)
            current_day += datetime.timedelta(days=1)

        # 3. Assignation des créneaux (Greedy simple)
        schedule = {}
        current_group_index = 0
        for g in range(1, groups_count + 1):
            for s in range(1, sessions_per_student + 1):
                schedule[f"G{g}_S{s}"] = candidate_slots[current_group_index]
                current_group_index += 1

        # 4. Sauvegarde en base
        plan_slots = []
        for g in range(1, groups_count + 1):
            for s in range(1, sessions_per_student + 1):
                key = f"G{g}_S{s}"
                start_time = schedule[key]
                end_time = start_time + datetime.timedelta(minutes=duration_min)
                
                slot = TimeSlot(
                    phase_id=new_phase.id,
                    group_name=f"Groupe {g}",
                    session_number=s,
                    start_time=start_time,
                    end_time=end_time,
                    simulator="TWR" if "Aérodrome" in phase_type else "RADAR",
                    instructor_name="Automatique"
                )
                db.add(slot)
                plan_slots.append(slot)
        
        db.commit()
        
        phase_id_final = new_phase.id
        groups_count_final = groups_count
        total_hours_final = round((groups_count * sessions_per_student * duration_min) / 60, 1)
        end_date_final = end_date.strftime("%d/%m/%Y")
        message_final = f"Planning généré pour {promo_name}."
        
        db.close()
        
        return {
            "status": "success",
            "phase_id": phase_id_final,
            "groups_count": groups_count_final,
            "total_hours": total_hours_final,
            "end_date": end_date_final,
            "message": message_final
        }
