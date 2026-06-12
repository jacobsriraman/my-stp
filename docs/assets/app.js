(function () {
    const STORAGE_KEY = "pace-lab-draft-v1";
    const MILES_PER_KILOMETER = 0.621371;
    const METERS_PER_MILE = 1609.34;
    const TRAINING_TARGETS = [
        { name: "Easy Limit", durationSeconds: 100000, descriptor: "best-fit pace for a 100000 second effort" },
        { name: "Fast Easy", durationSeconds: 20000, descriptor: "best-fit pace for a 20000 second effort" },
        { name: "Steady-State", durationSeconds: 9000, descriptor: "best-fit pace for a 9000 second effort" },
        { name: "Long Run Finish", durationSeconds: 6000, descriptor: "best-fit pace for a 6000 second effort" },
        { name: "Tempo", durationSeconds: 3600, descriptor: "best-fit pace for a 3600 second effort" },
        { name: "CV", durationSeconds: 1800, descriptor: "best-fit pace for a 1800 second effort" },
        { name: "5K", durationSeconds: 900, descriptor: "best-fit pace for a 900 second effort" },
        { name: "3K", durationSeconds: 600, descriptor: "best-fit pace for a 600 second effort" },
        { name: "Mile", durationSeconds: 240, descriptor: "best-fit pace for a 240 second effort" },
    ];
    const DEMO_ENTRIES = [
        { label: "Recent 5K", distanceValue: "5", distanceUnit: "km", hours: "0", minutes: "18", seconds: "00", raceDate: "" },
        { label: "Recent 10K", distanceValue: "10", distanceUnit: "km", hours: "0", minutes: "37", seconds: "30", raceDate: "" },
    ];

    const refs = {
        entriesList: document.getElementById("entries-list"),
        addEntryButton: document.getElementById("add-entry-button"),
        clearEntriesButton: document.getElementById("clear-entries-button"),
        draftNote: document.getElementById("draft-note"),
        calcError: document.getElementById("calc-error"),
        resultsEmpty: document.getElementById("results-empty"),
        resultsPanel: document.getElementById("results-panel"),
        trainingPaceGrid: document.getElementById("training-pace-grid"),
        derivedTable: document.getElementById("derived-table"),
        fitMeta: document.getElementById("fit-meta"),
        fitChart: document.getElementById("fit-chart"),
    };

    const state = {
        entries: [],
        results: null,
        calcError: "",
    };

    let calcTimer = null;

    function uid() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function mean(values) {
        return values.reduce(function (sum, value) {
            return sum + value;
        }, 0) / values.length;
    }

    function convertDistanceToMiles(distanceValue, distanceUnit) {
        if (distanceUnit === "mi") {
            return distanceValue;
        }
        if (distanceUnit === "km") {
            return distanceValue * MILES_PER_KILOMETER;
        }
        return distanceValue / METERS_PER_MILE;
    }

    function formatDistanceValue(value) {
        if (Number.isInteger(value)) {
            return String(value);
        }
        return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    }

    function formatDuration(totalSeconds) {
        const safeSeconds = Math.max(0, Math.round(totalSeconds));
        const hours = Math.floor(safeSeconds / 3600);
        const minutes = Math.floor((safeSeconds % 3600) / 60);
        const seconds = safeSeconds % 60;
        if (hours) {
            return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }

    function formatPace(secondsPerUnit, suffix) {
        const safeSeconds = Math.max(1, Math.round(secondsPerUnit));
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${minutes}:${String(seconds).padStart(2, "0")} / ${suffix}`;
    }

    function splitDuration(totalSeconds) {
        const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
        return {
            hours: Math.floor(safeSeconds / 3600),
            minutes: Math.floor((safeSeconds % 3600) / 60),
            seconds: Math.floor(safeSeconds % 60),
        };
    }

    function makeEntry(overrides) {
        const source = overrides || {};
        const durationBits = typeof source.durationSeconds !== "undefined"
            ? splitDuration(source.durationSeconds)
            : { hours: 0, minutes: 0, seconds: 0 };

        return {
            id: source.id || uid(),
            label: source.label || "",
            distanceValue: `${source.distanceValue ?? ""}`,
            distanceUnit: source.distanceUnit || "km",
            hours: `${source.hours ?? durationBits.hours}`,
            minutes: `${source.minutes ?? durationBits.minutes}`,
            seconds: `${source.seconds ?? durationBits.seconds}`,
            raceDate: source.raceDate || "",
        };
    }

    function loadLocalDraft() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
        } catch (_error) {
            return null;
        }
    }

    function saveLocalDraft() {
        const payload = state.entries.map(function (entry) {
            return {
                id: entry.id,
                label: entry.label,
                distanceValue: entry.distanceValue,
                distanceUnit: entry.distanceUnit,
                hours: entry.hours,
                minutes: entry.minutes,
                seconds: entry.seconds,
                raceDate: entry.raceDate,
            };
        });
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    function initializeEntries() {
        const localDraft = loadLocalDraft();
        if (localDraft && localDraft.length) {
            return localDraft.map(makeEntry);
        }
        return DEMO_ENTRIES.map(makeEntry);
    }

    function parsePositiveNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }

    function parseWholeNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
    }

    function durationSecondsFromEntry(entry) {
        return (parseWholeNumber(entry.hours) * 3600) +
            (parseWholeNumber(entry.minutes) * 60) +
            parseWholeNumber(entry.seconds);
    }

    function isBlankEntry(entry) {
        return !entry.label.trim() &&
            !`${entry.distanceValue}`.trim() &&
            !`${entry.hours}`.trim() &&
            !`${entry.minutes}`.trim() &&
            !`${entry.seconds}`.trim() &&
            !entry.raceDate.trim();
    }

    function isCompleteEntry(entry) {
        return parsePositiveNumber(entry.distanceValue) > 0 && durationSecondsFromEntry(entry) > 0;
    }

    function getCompleteEntries() {
        return state.entries
            .filter(isCompleteEntry)
            .map(function (entry) {
                return {
                    id: entry.id,
                    label: entry.label.trim(),
                    distanceValue: parsePositiveNumber(entry.distanceValue),
                    distanceUnit: entry.distanceUnit,
                    durationSeconds: durationSecondsFromEntry(entry),
                    raceDate: entry.raceDate,
                };
            });
    }

    function countIncompleteEntries() {
        return state.entries.filter(function (entry) {
            return !isBlankEntry(entry) && !isCompleteEntry(entry);
        }).length;
    }

    function hasAnyDraftData() {
        return state.entries.some(function (entry) {
            return !isBlankEntry(entry);
        });
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function setCalcError(message) {
        state.calcError = message;
        refs.calcError.textContent = message;
        refs.calcError.hidden = !message;
    }

    function parseEntry(rawEntry, index) {
        const distanceValue = Number(rawEntry.distanceValue);
        const durationSeconds = Number(rawEntry.durationSeconds);
        const distanceUnit = String(rawEntry.distanceUnit || "").trim().toLowerCase();
        const label = String(rawEntry.label || "").trim().slice(0, 80);
        const raceDate = String(rawEntry.raceDate || "").trim();

        if (!Number.isFinite(distanceValue) || distanceValue <= 0) {
            throw new Error(`Entry ${index + 1} must use a positive distance.`);
        }
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
            throw new Error(`Entry ${index + 1} must use a positive duration.`);
        }
        if (!["m", "km", "mi"].includes(distanceUnit)) {
            throw new Error(`Entry ${index + 1} uses an unsupported distance unit.`);
        }

        const distanceMiles = convertDistanceToMiles(distanceValue, distanceUnit);
        if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) {
            throw new Error(`Entry ${index + 1} must convert to a positive mile distance.`);
        }

        const paceSecondsPerMile = durationSeconds / distanceMiles;
        const defaultLabel = `${formatDistanceValue(distanceValue)} ${distanceUnit}`;

        return {
            id: rawEntry.id,
            label: label,
            displayLabel: label || defaultLabel,
            distanceValue: distanceValue,
            distanceUnit: distanceUnit,
            distanceDisplay: `${formatDistanceValue(distanceValue)} ${distanceUnit}`,
            durationSeconds: durationSeconds,
            durationDisplay: formatDuration(durationSeconds),
            raceDate: raceDate,
            paceSecondsPerMile: paceSecondsPerMile,
            paceDisplay: formatPace(paceSecondsPerMile, "mi"),
            pacePerKmSeconds: paceSecondsPerMile * MILES_PER_KILOMETER,
            pacePerKmDisplay: formatPace(paceSecondsPerMile * MILES_PER_KILOMETER, "km"),
        };
    }

    function buildFitPayload(rawEntries) {
        const entries = rawEntries.map(parseEntry);
        if (entries.length < 2) {
            throw new Error("Add at least two performances to compute a logarithmic fit.");
        }

        entries.sort(function (left, right) {
            return left.durationSeconds - right.durationSeconds;
        });

        const durations = entries.map(function (entry) { return entry.durationSeconds; });
        const paces = entries.map(function (entry) { return entry.paceSecondsPerMile; });
        const logDurations = durations.map(function (duration) { return Math.log(duration); });
        const meanLog = mean(logDurations);
        const meanPace = mean(paces);

        let covariance = 0;
        let variance = 0;
        for (let index = 0; index < entries.length; index += 1) {
            covariance += (logDurations[index] - meanLog) * (paces[index] - meanPace);
            variance += (logDurations[index] - meanLog) ** 2;
        }

        const slope = variance === 0 ? 0 : covariance / variance;
        const intercept = meanPace - (slope * meanLog);
        const fittedPaces = logDurations.map(function (value) {
            return (slope * value) + intercept;
        });

        let ssRes = 0;
        let ssTot = 0;
        for (let index = 0; index < entries.length; index += 1) {
            ssRes += (paces[index] - fittedPaces[index]) ** 2;
            ssTot += (paces[index] - meanPace) ** 2;
        }

        const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
        const chartMin = Math.max(60, Math.min.apply(null, durations) * 0.9);
        const chartMax = Math.max.apply(null, durations) * 1.15;
        const fitLine = [];
        for (let index = 0; index < 120; index += 1) {
            const xValue = chartMin + ((chartMax - chartMin) * index) / 119;
            fitLine.push({ x: xValue, y: (slope * Math.log(xValue)) + intercept });
        }

        const trainingPaces = TRAINING_TARGETS.map(function (target) {
            const targetPace = (slope * Math.log(target.durationSeconds)) + intercept;
            return {
                name: target.name,
                descriptor: target.descriptor,
                targetDurationSeconds: target.durationSeconds,
                targetDurationDisplay: formatDuration(target.durationSeconds),
                paceSecondsPerMile: targetPace,
                paceDisplay: formatPace(targetPace, "mi"),
                pacePerKmDisplay: formatPace(targetPace * MILES_PER_KILOMETER, "km"),
            };
        });

        return {
            entries: entries,
            fit: {
                slope: slope,
                intercept: intercept,
                rSquared: rSquared,
                equation: `pace = ${slope.toFixed(2)} * ln(duration) + ${intercept.toFixed(2)}`,
            },
            trainingPaces: trainingPaces,
            chart: {
                points: entries.map(function (entry) {
                    return { x: entry.durationSeconds, y: entry.paceSecondsPerMile };
                }),
                fitLine: fitLine,
            },
        };
    }

    function renderEntries() {
        refs.entriesList.innerHTML = state.entries.map(function (entry, index) {
            return `
                <div class="entry-row" data-index="${index}">
                    <div class="field-group">
                        <span class="mini-label">Race label</span>
                        <input type="text" data-field="label" value="${escapeHtml(entry.label)}" placeholder="Recent 5K or State Meet">
                    </div>
                    <div class="field-group">
                        <span class="mini-label">Distance</span>
                        <div class="field-inline">
                            <input type="number" min="0" step="0.01" data-field="distanceValue" value="${escapeHtml(entry.distanceValue)}" placeholder="5">
                            <select data-field="distanceUnit">
                                <option value="m" ${entry.distanceUnit === "m" ? "selected" : ""}>m</option>
                                <option value="km" ${entry.distanceUnit === "km" ? "selected" : ""}>km</option>
                                <option value="mi" ${entry.distanceUnit === "mi" ? "selected" : ""}>mi</option>
                            </select>
                        </div>
                    </div>
                    <div class="time-group">
                        <span class="mini-label">Finish time</span>
                        <div class="time-grid">
                            <input type="number" min="0" data-field="hours" value="${escapeHtml(entry.hours)}" placeholder="hh">
                            <input type="number" min="0" data-field="minutes" value="${escapeHtml(entry.minutes)}" placeholder="mm">
                            <input type="number" min="0" data-field="seconds" value="${escapeHtml(entry.seconds)}" placeholder="ss">
                        </div>
                    </div>
                    <div class="field-group">
                        <span class="mini-label">Race date</span>
                        <input type="date" data-field="raceDate" value="${escapeHtml(entry.raceDate)}">
                    </div>
                    <button class="icon-button" data-action="remove" type="button" aria-label="Remove entry">×</button>
                </div>
            `;
        }).join("");
    }

    function renderDraftNote() {
        const incompleteCount = countIncompleteEntries();
        let note = "Guest mode is active. This board is stored locally in this browser.";

        if (incompleteCount === 1) {
            note += " One incomplete row is still saved locally until it has both a distance and a finish time.";
        } else if (incompleteCount > 1) {
            note += ` ${incompleteCount} incomplete rows are still saved locally until they have both a distance and a finish time.`;
        }

        refs.draftNote.textContent = note;
    }

    function renderTrainingPaces(trainingPaces) {
        refs.trainingPaceGrid.innerHTML = trainingPaces.map(function (pace) {
            return `
                <article class="pace-card">
                    <h3>${escapeHtml(pace.name)}</h3>
                    <p>${escapeHtml(pace.descriptor)}</p>
                    <strong>${escapeHtml(pace.paceDisplay)}</strong>
                    <p class="pace-secondary">${escapeHtml(pace.pacePerKmDisplay)}</p>
                </article>
            `;
        }).join("");
    }

    function renderDerivedTable(entries) {
        refs.derivedTable.innerHTML = `
            <div class="derived-head">
                <span>Race</span>
                <span>Distance</span>
                <span>Duration</span>
                <span>Pace / mi</span>
                <span>Pace / km</span>
            </div>
            ${entries.map(function (entry) {
                return `
                    <div class="derived-row">
                        <span>${escapeHtml(entry.displayLabel)}</span>
                        <span>${escapeHtml(entry.distanceDisplay)}</span>
                        <span>${escapeHtml(entry.durationDisplay)}</span>
                        <span>${escapeHtml(entry.paceDisplay)}</span>
                        <span>${escapeHtml(entry.pacePerKmDisplay)}</span>
                    </div>
                `;
            }).join("")}
        `;
    }

    function renderChart(chartData) {
        if (!chartData || !chartData.points || !chartData.fitLine) {
            refs.fitChart.innerHTML = "";
            return;
        }

        const width = 720;
        const height = 360;
        const padding = { top: 20, right: 26, bottom: 42, left: 58 };
        const allX = chartData.fitLine.map(function (point) { return point.x; });
        const allY = chartData.fitLine.map(function (point) { return point.y; });
        const pointX = chartData.points.map(function (point) { return point.x; });
        const pointY = chartData.points.map(function (point) { return point.y; });
        let minX = Math.min.apply(null, allX.concat(pointX));
        let maxX = Math.max.apply(null, allX.concat(pointX));
        let minY = Math.min.apply(null, allY.concat(pointY));
        let maxY = Math.max.apply(null, allY.concat(pointY));

        if (minX === maxX) {
            minX -= 60;
            maxX += 60;
        }
        if (minY === maxY) {
            minY -= 10;
            maxY += 10;
        }

        const xSpan = maxX - minX;
        const ySpan = maxY - minY;
        const scaleX = function (value) {
            return padding.left + ((value - minX) / xSpan) * (width - padding.left - padding.right);
        };
        const scaleY = function (value) {
            return height - padding.bottom - ((value - minY) / ySpan) * (height - padding.top - padding.bottom);
        };

        const xTicks = Array.from({ length: 5 }, function (_value, index) {
            return minX + (xSpan * index) / 4;
        });
        const yTicks = Array.from({ length: 5 }, function (_value, index) {
            return minY + (ySpan * index) / 4;
        });

        const fitPath = chartData.fitLine.map(function (point, index) {
            return `${index === 0 ? "M" : "L"} ${scaleX(point.x).toFixed(2)} ${scaleY(point.y).toFixed(2)}`;
        }).join(" ");

        const gridLines = [
            ...xTicks.map(function (tick) {
                return `
                    <g>
                        <line class="chart-grid" x1="${scaleX(tick)}" y1="${padding.top}" x2="${scaleX(tick)}" y2="${height - padding.bottom}"></line>
                        <text class="chart-label" x="${scaleX(tick)}" y="${height - 14}" text-anchor="middle">${escapeHtml(formatDuration(tick))}</text>
                    </g>
                `;
            }),
            ...yTicks.map(function (tick) {
                return `
                    <g>
                        <line class="chart-grid" x1="${padding.left}" y1="${scaleY(tick)}" x2="${width - padding.right}" y2="${scaleY(tick)}"></line>
                        <text class="chart-label" x="${padding.left - 10}" y="${scaleY(tick) + 4}" text-anchor="end">${escapeHtml(formatDuration(tick))}</text>
                    </g>
                `;
            }),
        ].join("");

        const points = chartData.points.map(function (point) {
            return `<circle class="chart-point" cx="${scaleX(point.x)}" cy="${scaleY(point.y)}" r="5"></circle>`;
        }).join("");

        refs.fitChart.innerHTML = `
            <line class="chart-axis" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"></line>
            <line class="chart-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"></line>
            ${gridLines}
            <path class="chart-line" d="${fitPath}"></path>
            ${points}
            <text class="chart-label" x="${width / 2}" y="${height - 4}" text-anchor="middle">Duration</text>
            <text class="chart-label" x="16" y="${height / 2}" text-anchor="middle" transform="rotate(-90 16 ${height / 2})">Pace per mile</text>
        `;
    }

    function renderResults() {
        if (!state.results) {
            refs.resultsEmpty.hidden = false;
            refs.resultsPanel.hidden = true;
            refs.fitMeta.textContent = state.calcError || "Add at least two performances to unlock the model.";
            refs.fitChart.innerHTML = "";
            refs.trainingPaceGrid.innerHTML = "";
            refs.derivedTable.innerHTML = "";
            return;
        }

        refs.resultsEmpty.hidden = true;
        refs.resultsPanel.hidden = false;
        refs.fitMeta.textContent = `${state.results.fit.equation} • R² ${state.results.fit.rSquared.toFixed(3)}`;
        renderTrainingPaces(state.results.trainingPaces);
        renderDerivedTable(state.results.entries);
        renderChart(state.results.chart);
    }

    function render() {
        renderEntries();
        renderDraftNote();
        renderResults();
        setCalcError(state.calcError);
    }

    function calculateNow() {
        const completeEntries = getCompleteEntries();

        if (completeEntries.length < 2) {
            state.results = null;
            if (completeEntries.length === 1) {
                setCalcError("Add one more performance to fit the logarithmic curve.");
            } else if (hasAnyDraftData()) {
                setCalcError("Add at least two complete performances to compute training paces.");
            } else {
                setCalcError("");
            }
            renderResults();
            return;
        }

        try {
            state.results = buildFitPayload(completeEntries);
            state.calcError = "";
            renderResults();
            setCalcError("");
        } catch (error) {
            state.results = null;
            setCalcError(error.message);
            renderResults();
        }
    }

    function queueCalculate() {
        window.clearTimeout(calcTimer);
        calcTimer = window.setTimeout(calculateNow, 180);
    }

    function persistAndRefresh(options) {
        const settings = options || {};
        saveLocalDraft();
        if (settings.rerenderEntries) {
            renderEntries();
        }
        renderDraftNote();
        queueCalculate();
    }

    function wireEvents() {
        const handleEntryMutation = function (event) {
            const row = event.target.closest(".entry-row");
            if (!row) {
                return;
            }
            const index = Number(row.dataset.index);
            const field = event.target.dataset.field;
            if (!Number.isInteger(index) || !field) {
                return;
            }
            state.entries[index][field] = event.target.value;
            persistAndRefresh();
        };

        refs.addEntryButton.addEventListener("click", function () {
            state.entries.push(makeEntry());
            persistAndRefresh({ rerenderEntries: true });
        });

        refs.clearEntriesButton.addEventListener("click", function () {
            state.entries = [makeEntry()];
            state.results = null;
            state.calcError = "";
            saveLocalDraft();
            render();
            queueCalculate();
        });

        refs.entriesList.addEventListener("input", handleEntryMutation);
        refs.entriesList.addEventListener("change", handleEntryMutation);

        refs.entriesList.addEventListener("click", function (event) {
            const button = event.target.closest("[data-action='remove']");
            if (!button) {
                return;
            }
            const row = button.closest(".entry-row");
            const index = Number(row.dataset.index);
            if (!Number.isInteger(index)) {
                return;
            }
            state.entries.splice(index, 1);
            if (!state.entries.length) {
                state.entries.push(makeEntry());
            }
            persistAndRefresh({ rerenderEntries: true });
        });
    }

    function init() {
        state.entries = initializeEntries();
        if (!state.entries.length) {
            state.entries = [makeEntry()];
        }

        render();
        wireEvents();
        queueCalculate();
    }

    init();
}());
