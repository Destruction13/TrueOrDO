// Global Chart Instance
let memoryChart = null;
let currentDataCache = null;

// Initial Fetch from Backend
async function fetchTokenData() {
    try {
        const response = await fetch('/api/tokens');
        if (!response.ok) throw new Error("Network response error");
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch real tokens (is the backend running?). Falling back to UI mock...", error);
        return null;
    }
}

// DOM Elements Mapping
const elements = {
    used: document.getElementById('val-used'),
    usedPercent: document.getElementById('val-used-percent'),
    barUsed: document.getElementById('bar-used'),
    cacheRead: document.getElementById('val-cache-read'),
    cacheSavings: document.getElementById('val-cache-savings'),
    input: document.getElementById('val-input'),
    inputAvg: document.getElementById('val-input-avg'),
    output: document.getElementById('val-output'),
    outputAvg: document.getElementById('val-output-avg'),
    remaining: document.getElementById('val-remaining'),
    window: document.getElementById('val-window'),
    cost: document.getElementById('val-cost'),
    turns: document.getElementById('val-turns'),
    cacheCreate: document.getElementById('val-cache-create'),
    time: document.getElementById('val-time'),
    latency: document.getElementById('val-latency'),
    tools: document.getElementById('tool-container')
};

// Initialization
let quotaTimerInterval = null;

function startQuotaCountdown(windowRemainingMin) {
    const timerEl = document.getElementById('quota-timer');
    const widget = document.getElementById('quota-countdown');
    if (!timerEl) return;

    let remainingMs = windowRemainingMin * 60 * 1000;

    if (quotaTimerInterval) clearInterval(quotaTimerInterval);

    function update() {
        if (remainingMs <= 0) {
            timerEl.innerText = 'Обновляется!';
            // Reload data when quota refreshes
            setTimeout(() => location.reload(), 3000);
            return;
        }
        const h = Math.floor(remainingMs / 3600000);
        const m = Math.floor((remainingMs % 3600000) / 60000);
        const s = Math.floor((remainingMs % 60000) / 1000);
        timerEl.innerText = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        // Change color when getting close
        widget.classList.remove('warning', 'critical');
        if (remainingMs < 30 * 60 * 1000) widget.classList.add('critical');
        else if (remainingMs < 60 * 60 * 1000) widget.classList.add('warning');

        remainingMs -= 1000;
    }

    update();
    quotaTimerInterval = setInterval(update, 1000);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch real data
    currentDataCache = await fetchTokenData();

    // Hide loader after smooth delay
    setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);

        // Initialize dashboard with first model
        updateDashboard('gemini');

        // Start quota countdown with Gemini window data
        if (currentDataCache?.gemini?.quota) {
            startQuotaCountdown(currentDataCache.gemini.quota.windowRemainingMin);
        }
    }, 800);

    // Attach Model Selector Events
    const modelBtns = document.querySelectorAll('.model-btn');
    modelBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modelBtns.forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            const modelKey = target.getAttribute('data-model');
            updateDashboardWithAnimation(modelKey);
        });
    });
});

// Animate numbers
function animateNumber(element, finalValue, duration = 800) {
    let startValue = parseFloat(element.innerText.replace(/[^0-9.-]+/g, "")) || 0;
    // Don't animate if difference is small or values are same
    if (Math.abs(startValue - finalValue) < 0.01) {
        element.innerText = finalValue % 1 !== 0 ? finalValue.toFixed(2) : finalValue;
        return;
    }

    const startTime = performance.now();

    function updateVal(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing (easeOutExpo)
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const currentVal = startValue + (finalValue - startValue) * ease;

        // Formatting
        if (finalValue % 1 !== 0) {
            element.innerText = currentVal.toFixed(2);
        } else {
            element.innerText = Math.round(currentVal);
        }

        if (progress < 1) {
            requestAnimationFrame(updateVal);
        } else {
            element.innerText = finalValue % 1 !== 0 ? finalValue.toFixed(2) : finalValue;
        }
    }

    requestAnimationFrame(updateVal);
}

// Update UI
function updateDashboard(modelKey) {
    if (!currentDataCache) return;
    const data = currentDataCache[modelKey];
    if (!data) return;

    const quotaPct = data.tokens.quotaPct ?? 0;
    const quotaK = data.tokens.quotaK ?? 417;
    const remainingK = data.tokens.remaining ?? 0;

    // Used tokens + percent of 5h window quota
    animateNumber(elements.used, data.tokens.used);
    elements.usedPercent.innerText = `${quotaPct}% от квоты 5ч`;
    elements.barUsed.style.width = `${Math.min(quotaPct, 100)}%`;

    // Change bar color as quota depletes
    const bar = elements.barUsed;
    if (quotaPct >= 90) bar.style.background = '#f43f5e';
    else if (quotaPct >= 70) bar.style.background = '#f59e0b';
    else bar.style.background = '';

    animateNumber(elements.cacheRead, data.tokens.cacheRead);
    animateNumber(elements.input, data.tokens.input);
    animateNumber(elements.inputAvg, data.tokens.inputAvg);
    animateNumber(elements.output, data.tokens.output);
    animateNumber(elements.outputAvg, data.tokens.outputAvg);

    // Quota Remaining card — shows real remaining k tokens in current 5h window
    animateNumber(elements.remaining, remainingK);
    elements.window.innerText = quotaK;

    animateNumber(elements.cost, data.financials.cost);
    elements.cacheSavings.innerText = `-$${data.financials.cacheSavings.toFixed(2)}`;

    // Details Panel
    animateNumber(elements.turns, data.session.turns);
    animateNumber(elements.cacheCreate, data.tokens.cacheCreate);
    animateNumber(elements.time, data.session.time);
    animateNumber(elements.latency, data.session.latency);

    // Data source badge
    const toolContainer = elements.tools;
    toolContainer.innerHTML = '';
    const isReal = data.session.dataSource && !data.session.dataSource.includes('mock');
    const badge = document.createElement('div');
    badge.className = `data-source-badge${isReal ? '' : ' mock'}`;
    badge.innerText = `📡 ${data.session.dataSource || 'unknown'}`;
    toolContainer.appendChild(badge);

    // Tool tags
    data.session.tools.forEach((tool, index) => {
        setTimeout(() => {
            const tag = document.createElement('div');
            tag.className = 'tool-tag';
            tag.innerHTML = `<div class="dot"></div>${tool}`;
            tag.style.opacity = '0';
            tag.style.transform = 'translateY(10px)';
            tag.style.transition = 'all 0.4s ease';
            toolContainer.appendChild(tag);
            requestAnimationFrame(() => {
                tag.style.opacity = '1';
                tag.style.transform = 'translateY(0)';
            });
        }, index * 100 + 100);
    });

    // Chart update
    updateChart(data.chartData, modelKey);
}

function updateDashboardWithAnimation(modelKey) {
    // Add brief fade to cards
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach(c => {
        c.style.transform = 'scale(0.98)';
        c.style.opacity = '0.7';
    });

    setTimeout(() => {
        updateDashboard(modelKey);
        cards.forEach(c => {
            c.style.transform = 'scale(1)';
            c.style.opacity = '1';
        });
    }, 150);
}

// Chart.js Setup
function updateChart(chartData, modelKey) {
    const ctx = document.getElementById('memoryChart').getContext('2d');

    // Model specific accent colors
    const colors = {
        gemini: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.1)', secondary: 'rgba(139, 92, 246, 0.5)' },
        claude: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.1)', secondary: 'rgba(244, 63, 94, 0.5)' },
        codex: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.1)', secondary: 'rgba(59, 130, 246, 0.5)' }
    };

    const theme = colors[modelKey];

    // Create gradient for primary line
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, theme.fill);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    if (memoryChart) {
        memoryChart.destroy();
    }

    // Modern dark theme config for Chart.js
    Chart.defaults.color = '#a0a0b0';
    Chart.defaults.font.family = 'Inter';

    memoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'Cumulative Memory (k tokens)',
                    data: chartData.dataMemory,
                    borderColor: theme.stroke,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#050505',
                    pointBorderColor: theme.stroke,
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 // Smooth curves
                },
                {
                    type: 'bar',
                    label: 'Tokens per Turn (k)',
                    data: chartData.dataTokens,
                    backgroundColor: theme.secondary,
                    borderRadius: 4,
                    barPercentage: 0.5,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 20, 25, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Cumulative Memory',
                        color: '#64748b'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Turn Tokens',
                        color: '#64748b'
                    },
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                        drawBorder: false
                    }
                }
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            }
        }
    });
}
