// static/script.js
import {secondsToMMSS} from './utils.js';

document.getElementById('data-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const tableRows = document.querySelectorAll('#input-table tbody tr');
    let points = [];

    tableRows.forEach(row => {
        const x = row.cells[0].querySelector('input').value;
        const y = x / row.cells[1].querySelector('input').value * 1609;
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
        // Create output table values from x
        const xVals = [100000, 20000, 9000, 8100, 7200, 6000, 3600, 3000, 2400, 1800, 900, 600, 240, 110];
        const xValNames = ["Easy Limit", "Fast Easy", "Steady State", "8100", "7200", "Long Run Finish", "Tempo 17min+",
            "Tempo 8-16min", "Tempo 1-7min", "CV", "5k", "3k", "Mile", "800"]
        const outputRows = xVals.map((x,i) => {
            const y = (data.a * Math.log(x)) + data.b;
            return `<tr><td>${xValNames[i]}</td><td>${secondsToMMSS(y)}</td></tr>`;
        }).join('');

        result.innerHTML = `
            <p><strong>Equation:</strong> y = ${data.a.toFixed(4)} * ln(x) + ${data.b.toFixed(4)}</p>
            <img src="${data.plot_url}" alt="Logarithmic Fit Plot" style="max-width: 100%; margin-top: 10px;">
            <h3>Suggested Training Paces:</h3>
            <table>
                <thead><tr><th>Pace Type</th><th>Pace per mile</th></tr></thead>
                <tbody>${outputRows}</tbody>
            </table>
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

// Remove row functionality
document.getElementById('remove-row').addEventListener('click', function () {
    const tableBody = document.querySelector('#input-table tbody');
    const rows = tableBody.querySelectorAll('tr');

    if (rows.length > 2) {
        tableBody.removeChild(rows[rows.length-1]);
    } else {
        alert("At least two performances are required")
    }

});

// Clear table functionality
document.getElementById('clear-table').addEventListener('click', function () {
    const tableBody = document.querySelector('#input-table tbody');    
    tableBody.innerHTML = `
        <tr><td><input type="number" step="any"></td><td><input type="number" step="any"></td></tr>
        <tr><td><input type="number" step="any"></td><td><input type="number" step="any"></td></tr>
    `;
});