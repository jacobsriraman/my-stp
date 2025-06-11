# app.py
from flask import Flask, render_template, request, jsonify
from compute import compute_log_fit

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/compute', methods=['POST'])
def compute():
    data = request.get_json()
    return compute_log_fit(data)


if __name__ == '__main__':
    app.run(debug=True)
