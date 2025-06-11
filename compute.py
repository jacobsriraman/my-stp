import numpy as np
from flask import jsonify

def compute_log_fit(data):
    try:
        points = [tuple(map(float, pair.split(','))) for pair in data['points'].strip().split('\n')]
        x = np.array([p[0] for p in points])
        y = np.array([p[1] for p in points])

        # Compute log fit: y = a * ln(x) + b
        if any(x <= 0):
            return jsonify({'error': 'All x values must be > 0 for log fitting.'}), 400

        A = np.vstack([np.log(x), np.ones(len(x))]).T
        coeffs, _, _, _ = np.linalg.lstsq(A, y, rcond=None)
        a, b = coeffs

        return jsonify({'a': a, 'b': b})
    except Exception as e:
        return jsonify({'error': str(e)}), 500