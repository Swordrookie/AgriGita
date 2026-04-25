from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import random

detection_bp = Blueprint('detection', __name__)

DISEASE_DB = {
    'leaf_blight': {
        'advice': 'Apply copper-based fungicide. Remove infected leaves immediately.',
        'product': 'Blitox 50 WP'
    },
    'rust': {
        'advice': 'Use propiconazole spray. Ensure proper air circulation between plants.',
        'product': 'Tilt 250 EC'
    },
    'powdery_mildew': {
        'advice': 'Spray sulfur or neem-based solution. Avoid overhead watering.',
        'product': 'Sulphex WP'
    },
    'healthy': {
        'advice': 'No disease detected. Continue current irrigation practices.',
        'product': None
    }
}

@detection_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze():
    """Simulated YOLOv8 plant disease detection endpoint."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    # Simulated detection result (replace with real YOLOv8 in production)
    num_detections = random.randint(0, 2)
    detections = []
    diseases = list(DISEASE_DB.keys())

    for _ in range(num_detections):
        disease = random.choice(diseases[:-1])  # Exclude 'healthy' for detections
        info = DISEASE_DB[disease]
        detections.append({
            'class': disease.replace('_', ' ').title(),
            'confidence': round(random.uniform(0.65, 0.97), 3),
            'advice': info['advice'],
            'product': info['product']
        })

    return jsonify({'detections': detections}), 200
