from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import random

orders_bp = Blueprint('orders', __name__)

SAMPLE_PRODUCTS = ['Blitox 50 WP', 'Tilt 250 EC', 'Sulphex WP', 'Ridomil Gold', 'Confidor 200 SL']
STATUSES = ['Delivered', 'In Transit', 'Processing']

@orders_bp.route('/history', methods=['GET'])
@jwt_required()
def get_orders():
    """Returns simulated order history for the current user."""
    user_id = get_jwt_identity()
    orders = []
    for i in range(random.randint(2, 5)):
        orders.append({
            'id': f'ORD-{1000 + i}',
            'product': random.choice(SAMPLE_PRODUCTS),
            'status': random.choice(STATUSES),
            'price': round(random.uniform(120, 850), 2),
            'timestamp': (datetime.utcnow() - timedelta(days=i*3)).isoformat(),
            'location': {
                'lat': round(20.5937 + random.uniform(-0.05, 0.05), 4),
                'lng': round(78.9629 + random.uniform(-0.05, 0.05), 4)
            }
        })
    return jsonify(orders), 200
