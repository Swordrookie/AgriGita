from flask import Flask, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from config import Config
from extensions import db, jwt, bcrypt, cors, socketio
from flask_socketio import join_room
from datetime import datetime

admin_stats = {'total_messages': 0}

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    socketio.init_app(app)

    from routes.auth import auth_bp
    from routes.valves import valves_bp
    from routes.wells import wells_bp
    from routes.pipelines import pipelines_bp
    from routes.alerts import alerts_bp
    from routes.dashboard import dashboard_bp
    from routes.ai import ai_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(valves_bp, url_prefix='/api/valves')
    app.register_blueprint(wells_bp, url_prefix='/api/wells')
    app.register_blueprint(pipelines_bp, url_prefix='/api/pipelines')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    @app.route('/api/health', methods=['GET'])
    def health():
        return {'status': 'ok', 'message': 'AgriGita API is running'}, 200

    @socketio.on('connect')
    def handle_connect():
        print('Client connected')

    @socketio.on('join')
    def handle_join(data):
        if data and data.get('user_id'):
            room = f'user_{data["user_id"]}'
            join_room(room)
            print(f'User {data["user_id"]} joined room {room}')

    @socketio.on('disconnect')
    def handle_disconnect():
        print('Client disconnected')

    @socketio.on('send_message')
    def handle_message(data):
        from flask_socketio import emit
        
        global admin_stats
        admin_stats['total_messages'] += 1
        
        emit('receive_message', data, broadcast=True)
        
        # Live AI Chatbot Simulation
        text = data.get('text', '').lower()
        response = ""
        if 'hello' in text or 'hi ' in text or text == 'hi':
            response = "Greetings! I am your AgriGita Assistant 🌱. How can I help monitor your fields today?"
        elif 'valve' in text:
            response = "Your smart valves can be controlled from the Valves tab. Should I run a diagnostic on them?"
        elif 'status' in text or 'how are' in text:
            import json, os
            weights_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model_weights.json')
            trained_info = ""
            if os.path.exists(weights_path):
                try:
                    with open(weights_path, 'r') as f:
                        w = json.load(f)
                        trained_info = f" Our AI model was last optimized on {w['trained_at'][:10]}. Daily usage baseline is {w['daily_avg_usage']}L."
                except: pass
            response = f"The system is OPERATIONAL.{trained_info} All sensors are reporting within normal parameters."
        elif 'water' in text or 'weather' in text:
            response = "Sensors show good soil moisture. The current water schedule is running optimally!"
        elif '?' in text:
            response = "That's a good question. All structural metrics look normal. Check the Insights tab for more details."
        elif 'help' in text:
            response = "I can help with monitoring wells, controlling valves, and giving AI suggestions! What do you need?"
        else:
            response = "Noted! I'll keep an eye on things."

        def send_ai_reply(app_ctx):
            with app_ctx:
                socketio.sleep(1.5)
                ai_data = {
                    'text': response,
                    'sender': 'AgriGita Assistant 🌱',
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }
                admin_stats['total_messages'] += 1
                socketio.emit('receive_message', ai_data)
            
        # Pass the app context to the background task
        app_ctx = app.app_context()
        socketio.start_background_task(send_ai_reply, app_ctx)

    @app.route('/api/admin/stats', methods=['GET'])
    def get_admin_stats():
        from models.user import User
        users = User.query.all()
        user_list = [{'id': u.id, 'username': u.username, 'email': u.email, 'created': u.created_at.isoformat()} for u in users]
        return {
            'total_users': len(users),
            'total_chat_messages': admin_stats['total_messages'],
            'users': user_list
        }, 200

    @app.route('/api/admin/train', methods=['POST'])
    @jwt_required()
    def train_model():
        from services.model_trainer import ModelTrainer
        trainer = ModelTrainer(app, db)
        try:
            results = trainer.run()
            return jsonify({
                'message': 'Model trained successfully',
                'results': results
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    with app.app_context():
        # Enforce foreign keys for SQLite
        from sqlalchemy import event
        @event.listens_for(db.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            if app.config['SQLALCHEMY_DATABASE_URI'].startswith("sqlite"):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()
        
        db.create_all()
        print('✅ Database tables ready (SQLite with Foreign Keys Enforced)')

    return app

app = create_app()

if __name__ == '__main__':
    from services.iot_simulator import start_iot_simulator
    start_iot_simulator(app, socketio, db)
    print('🚀 AgriGita API running on http://localhost:5000')
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
