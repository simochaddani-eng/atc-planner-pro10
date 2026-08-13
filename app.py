import streamlit as st
import json
import pandas as pd
from constraint import Problem, AllDifferentConstraint
from datetime import datetime, timedelta

# --- CONFIGURATION DES RESSOURCES ---
RESOURCES = [
    {"id": "twr", "name": "TWR 1–4", "positions": 4, "type": "TWR", "phases": ["Aérodrome"]},
    {"id": "radar1", "name": "RADAR 1", "positions": 4, "type": "APP", "phases": ["Approche Procédure", "Approche Radar"]},
    {"id": "radar2", "name": "RADAR 2", "positions": 2, "type": "ENR", "phases": ["En-route Procédure", "En-route Radar"]}
]

PHASE_LABELS = {
    "Aérodrome": "Aérodrome",
    "Approche Procédure": "Approche Procédure",
    "En-route Procédure": "En-route Procédure",
    "Approche Radar": "Approche Radar",
    "En-route Radar": "En-route Radar"
}

# --- LE SOLVEUR DE CONTRAINTES (MOTEUR DE PLANIFICATION) ---
def solve_planning(data):
    students = data.get('students', 30)
    sessions = data.get('sessions', 8)
    duration = data.get('duration', 45)
    phase = data.get('phase')
    start_date_str = data.get('start_date')
    day_start = data.get('day_start', '09:00')
    day_end = data.get('day_end', '16:30')
    pause = data.get('break_duration', 45)
    
    day_start_h, day_start_m = map(int, day_start.split(':'))
    day_end_h, day_end_m = map(int, day_end.split(':'))
    
    compatible_resources = [r for r in RESOURCES if phase in r["phases"]]
    if not compatible_resources:
        return {"status": "error", "message": f"Aucune ressource compatible pour la phase {phase}"}
    
    total_positions = sum(r["positions"] for r in compatible_resources)
    groups = max(1, round(students / total_positions))
    total_rotations = groups * sessions
    available_minutes = ((day_end_h * 60 + day_end_m) - (day_start_h * 60 + day_start_m)) - pause
    slots_per_day = max(1, int(available_minutes / duration))

    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    all_slots = []
    current_date = start_date
    
    while len(all_slots) < total_rotations * 3:
        if current_date.weekday() < 5: # Lun-Ven
            for i in range(slots_per_day):
                current_minutes = (day_start_h * 60 + day_start_m) + (i * duration)
                if i >= slots_per_day // 2:
                    current_minutes += pause
                h, m = divmod(current_minutes, 60)
                slot_time = current_date.replace(hour=h, minute=m)
                if h < day_end_h or (h == day_end_h and m <= day_end_m):
                    all_slots.append(slot_time)
        current_date += timedelta(days=1)

    problem = Problem()
    variables = [f"G{g}-S{s}" for g in range(1, groups + 1) for s in range(1, sessions + 1)]
    problem.addVariables(variables, all_slots[:len(variables) * 2])

    def check_capacity(*slots):
        from collections import Counter
        return all(count <= total_positions for count in Counter(slots).values())
    
    problem.addConstraint(AllDifferentConstraint(), variables)
    problem.addConstraint(check_capacity, variables)
    solutions = problem.getSolutions()
    
    if not solutions:
        return {"status": "error", "message": "Impossible de trouver un planning. Augmentez les ressources ou les horaires."}
    
    best = solutions[0]
    events = []
    for var_name, slot_time in best.items():
        parts = var_name.split('-')
        group = int(parts[0][1:])
        session = int(parts[1][1:])
        start = slot_time
        end = start + timedelta(minutes=duration)
        resource_index = (group - 1) % len(compatible_resources)
        resource_name = compatible_resources[resource_index]["name"]
        events.append({
            "group": group,
            "session": session,
            "date": start.strftime("%Y-%m-%d"),
            "start": start.strftime("%H:%M"),
            "end": end.strftime("%H:%M"),
            "resource": resource_name,
            "color": ["blue", "green", "purple", "amber"][(group - 1) % 4]
        })
    return {"status": "success", "events": events, "groups": groups, "total_positions": total_positions}

# --- INTERFACE STREAMLIT ---
st.set_page_config(page_title="ATC Planner", layout="wide")
st.title("✈️ ATC Planner - Planification automatique")

if 'planning_data' not in st.session_state:
    st.session_state['planning_data'] = None

with st.sidebar:
    st.header("Configuration")
    promo_name = st.text_input("Nom de la promotion", "P2026-A")
    phase = st.selectbox("Phase de formation", list(PHASE_LABELS.keys()))
    st.divider()
    students = st.number_input("Étudiants", 30, step=1)
    sessions = st.number_input("Séances", 8, step=1)
    duration = st.number_input("Durée (min)", 45, step=5)
    st.divider()
    start_date = st.date_input("Date de début")
    day_start = st.time_input("Début journée", datetime.strptime("09:00", "%H:%M"))
    day_end = st.time_input("Fin journée", datetime.strptime("16:30", "%H:%M"))
    pause = st.number_input("Pause déjeuner (min)", 45, step=15)
    if st.button("🚀 Générer le planning", type="primary"):
        input_data = {
            "students": students, "sessions": sessions, "duration": duration,
            "phase": phase, "start_date": str(start_date),
            "day_start": str(day_start)[:5], "day_end": str(day_end)[:5],
            "break_duration": pause
        }
        with st.spinner("Calcul du planning optimal..."):
            result = solve_planning(input_data)
            st.session_state['planning_data'] = result

if st.session_state['planning_data']:
    result = st.session_state['planning_data']
    if result["status"] == "error":
        st.error(result["message"])
    else:
        st.success(f"✅ {len(result['events'])} créneaux générés pour {result['groups']} groupes.")
        
        # On prépare les données pour le JS
        events_json = json.dumps(result['events'])
        # On utilise la fonctionnalité HTML de Streamlit pour injecter le Gantt
        st.components.v1.html(f"""
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="styles.css">
            <style>
                body {{ font-family: sans-serif; padding: 10px; }}
                .gantt-grid {{ display: grid; grid-template-columns: 130px repeat(5, 1fr); gap: 4px; margin-top: 10px; }}
                .gantt-header {{ font-weight: bold; padding: 8px; background: #f0f2f6; border-radius: 4px; }}
                .gantt-row {{ display: contents; }}
                .gantt-label {{ padding: 8px; font-weight: bold; }}
                .gantt-cell {{ background: #fff; min-height: 40px; border-radius: 4px; padding: 4px; position: relative; }}
                .gantt-event {{ background: #e0e7ff; border-radius: 4px; padding: 4px 8px; margin-bottom: 4px; font-size: 12px; }}
                .blue {{ background: #dbeafe; border-left: 4px solid #3b82f6; }}
                .green {{ background: #dcfce7; border-left: 4px solid #22c55e; }}
                .purple {{ background: #f3e8ff; border-left: 4px solid #a855f7; }}
                .amber {{ background: #fef3c7; border-left: 4px solid #f59e0b; }}
            </style>
        </head>
        <body>
            <h3>Planning visuel pour {promo_name}</h3>
            <div id="app"></div>
            <script>
                const events = {events_json};
                const app = document.getElementById('app');
                
                // Extraire les dates uniques
                const dates = [...new Set(events.map(e => e.date))].slice(0, 5);
                
                // Construction du tableau HTML
                let html = `<div class="gantt-grid"><div class="gantt-header">Ressource / Groupe</div>`;
                dates.forEach(d => html += `<div class="gantt-header">${d}</div>`);
                
                // Regrouper par ressource
                const resources = [...new Set(events.map(e => e.resource))];
                resources.forEach(res => {{
                    html += `<div class="gantt-row"><div class="gantt-label">${res}</div>`;
                    dates.forEach(date => {{
                        const dayEvents = events.filter(e => e.resource === res && e.date === date);
                        let cellHtml = `<div class="gantt-cell">`;
                        dayEvents.forEach(e => {{
                            cellHtml += `<div class="gantt-event ${e.color}"><b>G{e.group}</b><br/><small>{e.start} - {e.end}</small></div>`;
                        }});
                        cellHtml += `</div>`;
                        html += cellHtml;
                    }});
                    html += `</div>`;
                }});
                html += `</div>`;
                app.innerHTML = html;
            </script>
        </body>
        </html>
        """, height=600)
        
        # Option tableau CSV
        df = pd.DataFrame(result['events'])
        csv = df.to_csv(index=False).encode('utf-8')
        st.download_button("📥 Télécharger le CSV", csv, f"planning_{promo_name}.csv", "text/csv")
