import random
import time
from datetime import datetime
import urllib.request
import json

def start_iot_simulator(app, socketio, db):
    def simulate():
        last_weather_check = 0
        last_weather_state = 'normal'
        virtual_soil_moisture = {}

        with app.app_context():
            while True:
                socketio.sleep(15)
                try:
                    from models.valve import Valve
                    from models.well import Well
                    from models.alert import Alert
                    from models.water_log import WaterLog
                    from models.user import User

                    all_valves = Valve.query.all()
                    total_water_used_cycle = 0.0

                    for valve in all_valves:
                        # 1. Biological Soil Moisture & Flow Simulation
                        if valve.status == True:
                            valve.flow_rate = round(random.uniform(5.0, 25.0), 2)
                            volume = round(valve.flow_rate * 0.25, 2)
                            log = WaterLog(valve_id=valve.id, flow_rate=valve.flow_rate, duration=15.0, volume=volume)
                            db.session.add(log)
                            total_water_used_cycle += volume

                            # Rehydrating Soil
                            sm = virtual_soil_moisture.get(valve.id, 50.0)
                            virtual_soil_moisture[valve.id] = min(100.0, sm + (valve.flow_rate * 0.2))
                        else:
                            valve.flow_rate = 0.0
                            # Dehydrating Soil
                            decay = 1.3 if last_weather_state == 'hot' else 0.4
                            if last_weather_state == 'raining': decay = -1.2 # Rain rehydrates
                            sm = virtual_soil_moisture.get(valve.id, 50.0)
                            virtual_soil_moisture[valve.id] = max(0.0, min(100.0, sm - decay))

                            # Urgent biological alert trigger
                            if virtual_soil_moisture[valve.id] < 15.0 and sm >= 15.0 and last_weather_state == 'hot':
                                alert = Alert(user_id=valve.user_id, type='critical_health', severity='critical',
                                    message=f'☠️ Soil moisture critically low (15%) at "{valve.name}". Crop dehydration imminent!',
                                    metadata_json=f'{{"valve_id": {valve.id}}}',
                                    created_at=datetime.utcnow())
                                db.session.add(alert)
                                db.session.flush()
                                socketio.emit('new_alert', {'alert': alert.to_dict()}, room=f'user_{valve.user_id}')

                        # Emit live data bundle to React UI
                        socketio.emit('valve_data', {
                            'valve_id': valve.id,
                            'flow_rate': valve.flow_rate,
                            'soil_moisture': round(virtual_soil_moisture[valve.id], 1),
                            'timestamp': datetime.utcnow().isoformat()
                        }, room=f'user_{valve.user_id}')

                        # 2. Random Mechanical Fault Simulation (2% chance)
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
                                metadata_json=f'{{"valve_id": {valve.id}, "valve_name": "{valve.name}"}}',
                                created_at=datetime.utcnow()
                            )
                            db.session.add(alert)
                            db.session.flush()
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

                    # 3. Closed-Loop Water Scarcity Engine
                    wells = Well.query.all()
                    for well in wells:
                        random_variance = random.uniform(-0.1, 0.1) if last_weather_state != 'raining' else random.uniform(0.1, 0.5)
                        physical_drain = (total_water_used_cycle / 1000.0) # Mapping total L used to generic depth drops
                        new_level = well.water_level + random_variance - physical_drain
                        well.water_level = max(0.0, min(well.depth, new_level))

                        if well.water_level <= 0.0:
                            # 🚨 System Failsafe: Shut down all valves to prevent burnout
                            for v in all_valves:
                                if v.user_id == well.user_id and v.status == True:
                                    v.status = False
                                    v.flow_rate = 0.0
                                    alert = Alert(user_id=v.user_id, type='empty_well', severity='critical',
                                        message=f'🛑 {well.name} ran completely dry! Emergency pump isolation triggered for "{v.name}" to prevent motor burnout.',
                                        metadata_json=f'{{"well_id": {well.id}}}',
                                        created_at=datetime.utcnow())
                                    db.session.add(alert)
                                    db.session.flush()
                                    socketio.emit('new_alert', {'alert': alert.to_dict()}, room=f'user_{v.user_id}')

                    # Weather-based Smart Notification Logic
                    current_time = time.time()
                    if current_time - last_weather_check > 60:
                        last_weather_check = current_time
                        try:
                            # Using a default static coordinate for the farm (or first valve)
                            farm_lat, farm_lng = 20.5937, 78.9629
                            first_valve = Valve.query.first()
                            if first_valve:
                                farm_lat, farm_lng = first_valve.latitude, first_valve.longitude
                                
                            req = urllib.request.urlopen(f"https://api.open-meteo.com/v1/forecast?latitude={farm_lat}&longitude={farm_lng}&current_weather=true", timeout=5)
                            data = json.loads(req.read().decode('utf-8'))
                            current = data.get('current_weather', {})
                            temp = current.get('temperature', 20)
                            code = current.get('weathercode', 0)

                            current_state = 'normal'
                            if code >= 50: current_state = 'raining'
                            elif temp > 35: current_state = 'hot'

                            if current_state != last_weather_state:
                                # Weather state changed, assess all users and valves
                                users_needing_alerts = set()
                                for v in Valve.query.all():
                                    if current_state == 'raining' and v.status == True:
                                        users_needing_alerts.add(v.user_id)
                                    elif current_state == 'hot' and v.status == False and v.health != 'damaged':
                                        users_needing_alerts.add(v.user_id)

                                for uid in users_needing_alerts:
                                    if current_state == 'raining':
                                        msg = "🌧️ Heavy rain detected on the farm! Consider closing all active valves to conserve water and prevent over-saturation."
                                        severity = 'info'
                                    else:
                                        msg = f"🔥 Extreme heat warning ({temp}°C). Consider opening valves to prevent rapid crop dehydration."
                                        severity = 'warning'
                                        
                                    w_alert = Alert(
                                        user_id=uid,
                                        type='weather_system',
                                        severity=severity,
                                        message=msg,
                                        metadata_json='{"source": "Open-Meteo Autonomous"}',
                                        created_at=datetime.utcnow()
                                    )
                                    db.session.add(w_alert)
                                    db.session.flush()
                                    socketio.emit('new_alert', {'alert': w_alert.to_dict()}, room=f'user_{uid}')

                                last_weather_state = current_state

                        except Exception as w_e:
                            print(f'Weather check failed: {w_e}')

                    db.session.commit()
                except Exception as e:
                    print(f'IoT Simulator error: {e}')
                    db.session.rollback()

    socketio.start_background_task(simulate)
