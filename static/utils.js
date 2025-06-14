export function secondsToMMSS(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);

  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');

  return `${formattedMinutes}:${formattedSeconds}`;
}

export function parseHHMMSSToSeconds(timeStr) {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours*3600) + (minutes*60) + seconds;
  }
  else if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return (minutes*60) + seconds;
  }
  else if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  else {
    return NaN
  }
}

export function getNewRowHTML() {
    return `
        <tr>
            <td><input type="text" class="duration-input" placeholder="HH:MM:SS"></td>
            <td><input type="number" step="any" class="value-input"></td>
        </tr>
    `;
}