import numpy as np
import matplotlib.pyplot as plt
from flask import jsonify
import uuid
import os

PLOT_FOLDER = 'static/plots'

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

        #  Create plot
        x_fit = np.linspace(min(x), max(x), 100)
        y_fit = a * np.log(x_fit) + b

        plt.figure()
        plt.scatter(x, y, color='blue', label='Race Performances')
        plt.plot(x_fit, y_fit, color='red', label=f'Logarithmic Fit')
        plt.xlabel('Duration (s)')
        plt.ylabel('Mile Pace (s/mile)')
        plt.title('Logarithmic Fit')
        plt.legend()

        # Save to static/plots
        if not os.path.exists(PLOT_FOLDER):
            os.makedirs(PLOT_FOLDER)
        filename = f"{uuid.uuid4().hex}.png"
        filepath = os.path.join(PLOT_FOLDER, filename)
        plt.savefig(filepath)
        plt.close()

        return jsonify({'a': a, 'b': b, 'plot_url': f'/static/plots/{filename}'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
