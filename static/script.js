// static/script.js
document.getElementById('data-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const input = document.getElementById('points').value;

    const response = await fetch('/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: input })
    });

    const result = document.getElementById('result');
    const data = await response.json();

    if (response.ok) {
        result.innerHTML = `
            <p><strong>Equation:</strong> y = ${data.a.toFixed(4)} * ln(x) + ${data.b.toFixed(4)}</p>
            <img src="${data.plot_url}" alt="Logarithmic Fit Plot" style="max-width: 100%; margin-top: 10px;">
        `;
    } else {
        result.innerHTML = `Error: ${data.error}`;
    }
});
