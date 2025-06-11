# app.py
from flask import Flask, render_template, request, jsonify
import numpy as np

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/compute', methods=['POST'])
def compute():
    data = request.get_json()
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

if __name__ == '__main__':
    app.run(debug=True)
