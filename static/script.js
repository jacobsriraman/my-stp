// static/script.js
document.getElementById('data-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const tableRows = document.querySelectorAll('#input-table tbody tr');
    let points = [];

    tableRows.forEach(row => {
        const x = row.cells[0].querySelector('input').value;
        const y = row.cells[1].querySelector('input').value;
        if (x !== '' && y !== '') {
            points.push(`${x},${y}`);
        }
    });

    const response = await fetch('/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: points.join('\n') })
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

// Add row functionality
document.getElementById('add-row').addEventListener('click', function () {
    const tableBody = document.querySelector('#input-table tbody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = '<td><input type="number" step="any"></td><td><input type="number" step="any"></td>';
    tableBody.appendChild(newRow);
});

// Clear table functionality
document.getElementById('clear-table').addEventListener('click', function () {
    const tableBody = document.querySelector('#input-table tbody');
    tableBody.innerHTML = '<tr><td><input type="number" step="any"></td><td><input type="number" step="any"></td></tr>';
});
