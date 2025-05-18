from flask import Flask, render_template, request
from compute import compute_paces

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    result = None
    if request.method == 'POST':
        distance = request.form.get('distance', type=float)
        duration = request.form.get('duration', type=float)

        result = compute_paces(distance, duration)  # Updated to accept two params

    return render_template('index.html', result=result)


if __name__ == '__main__':
    app.run(debug = True)