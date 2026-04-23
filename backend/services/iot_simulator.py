import random
import time
from datetime import datetime

def start_iot_simulator(app, socketio, db):
    def simulate():
        with app.app_context():
            while True:
                socketio.sleep(15)
                try:
                    from models.valve import Valve
                    from models.well import Well
                    from models.alert import Alert
                    from models.water_log import WaterLog
                    from models.user import User

                    active_valves = Valve.query.filter_by(status=True).all()
                    for valve in active_valves:
                        valve.flow_rate = round(random.uniform(5.0, 25.0), 2)
                        log = WaterLog(
                            valve_id=valve.id,
                            flow_rate=valve.flow_rate,
                            duration=15.0,
                            volume=round(valve.flow_rate * 0.25, 2)
                        )
                        db.session.add(log)
                        socketio.emit('valve_data', {
                            'valve_id': valve.id,
                            'flow_rate': valve.flow_rate,
                            'timestamp': datetime.utcnow().isoformat()
                        }, room=f'user_{valve.user_id}')

                    # Random fault simulation (2% chance per cycle)
                    all_valves = Valve.query.all()
                    for valve in all_valves:
                        if random.random() < 0.02 and valve.health != 'damaged':
                            fault_type = random.choice(['valve_failure', 'pipeline_damage', 'low_pressure'])
                            messages = {
                                'valve_failure': f'⚠️ Valve "{valve.name}" has experienced a mechanical failure.',
                                'pipeline_damage': f'🔴 Pipeline connected to "{valve.name}" shows signs of damage.',
                                'low_pressure': f'📉 Low water pressure detected at "{valve.name}".'
                            }
                            severity = 'critical' if fault_type == 'valve_failure' else 'warning'

                            if fault_type == 'valve_failure':
                                valve.health = 'damaged'
                                valve.status = False
                                valve.flow_rate = 0.0

                            alert = Alert(
                                user_id=valve.user_id,
                                type=fault_type,
                                severity=severity,
                                message=messages[fault_type],
                                metadata_json=f'{{"valve_id": {valve.id}, "valve_name": "{valve.name}"}}'
                            )
                            db.session.add(alert)
                            socketio.emit('new_alert', {
                                'alert': alert.to_dict()
                            }, room=f'user_{valve.user_id}')

                            # Requirement: Email notifications (Simulated)
                            user = User.query.filter_by(id=valve.user_id).first()
                            if user and user.email:
                                print(f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}] ✉️ SIMULATED EMAIL SENT")
                                print(f"To: {user.email}")
                                print(f"Subject: Farm Alert - {severity.upper()}")
                                print(f"Body: {messages[fault_type]}\n")

                    wells = Well.query.all()
                    for well in wells:
                        change = random.uniform(-0.5, 0.3)
                        well.water_level = max(0, min(well.depth, well.water_level + change))

                    db.session.commit()
                except Exception as e:
                    print(f'IoT Simulator error: {e}')
                    db.session.rollback()

    socketio.start_background_task(simulate)
