import math

def calculate_phase_metrics(effectif, nb_seances, duree_min, positions_dispo, heures_par_jour=6.5):
    """
    Calcule automatiquement la charge, les rotations et la durée estimée.
    """
    total_seances_cumulees = effectif * nb_seances
    total_heures_position = (total_seances_cumulees * duree_min) / 60.0
    
    # Nombre d'étudiants par groupe (max 4 par position)
    taille_groupe = min(4, max(1, positions_dispo))
    nb_groupes = math.ceil(effectif / taille_groupe)
    
    rotations = math.ceil(total_seances_cumulees / max(1, positions_dispo))
    
    # Heures de simulation par jour (ex: 09h00-16h30 moins pause = ~6.5h)
    heures_dispo_jour = heures_par_jour * positions_dispo
    jours_estimes = round(total_heures_position / heures_dispo_jour, 1) if heures_dispo_jour > 0 else 0
    semaines_estimees = round(jours_estimes / 5.0, 1)
    
    return {
        "total_seances": total_seances_cumulees,
        "total_heures": total_heures_position,
        "nb_groupes": nb_groupes,
        "rotations": rotations,
        "jours_estimes": jours_estimes,
        "semaines_estimees": semaines_estimees
    }

def generate_groups(effectif, max_per_group=4):
    """
    Découpe automatique de l'effectif en groupes.
    """
    groupes = []
    current_student = 1
    group_num = 1
    
    while current_student <= effectif:
        end_student = min(current_student + max_per_group - 1, effectif)
        count = end_student - current_student + 1
        groupes.append({
            "Groupe": f"Groupe {group_num}",
            "Étudiants": f"{current_student} - {end_student}",
            "Effectif": count,
            "Séances": 8,
            "Durée estimée": f"{count * 1.5:.0f}h 00"
        })
        current_student = end_student + 1
        group_num += 1
        
    return groupes
