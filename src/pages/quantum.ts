document.addEventListener('DOMContentLoaded', () => {
    let isQuantumActive = false;
    let quantumInterval: number | undefined;
    let timeRemaining = 30 * 60;

    const displayEl = document.getElementById('quantum-timer-display');
    const buttonEl = document.getElementById('quantum-timer-btn');
    const historyEl = document.getElementById('session-history');

    if (!displayEl || !buttonEl || !historyEl) return;
    const display = displayEl as HTMLElement;
    const button = buttonEl as HTMLElement;
    const history = historyEl as HTMLElement;

    function formatTime(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateDisplay() {
        display.textContent = formatTime(timeRemaining);
    }

    function addSessionToHistory() {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'bg-gray-100 p-3 rounded-lg text-sm';
        sessionDiv.innerHTML = `
            <div class="font-semibold">Quantum Session</div>
            <div class="text-gray-600">${new Date().toLocaleString()}</div>
            <div class="text-green-600">✅ Completed</div>
        `;

        if (history.querySelector('.text-gray-500')) {
            history.innerHTML = '';
        }
        history.insertBefore(sessionDiv, history.firstChild);
    }

    function stopQuantumTimer() {
        isQuantumActive = false;
        const label = button.querySelector('h2');
        if (label) label.textContent = 'Start Quantum Session';
        button.style.background = '';
        if (quantumInterval !== undefined) {
            window.clearInterval(quantumInterval);
        }
        timeRemaining = 30 * 60;
        updateDisplay();
    }

    function startQuantumTimer() {
        isQuantumActive = true;
        const label = button.querySelector('h2');
        if (label) label.textContent = 'Stop Session';
        button.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

        quantumInterval = window.setInterval(() => {
            timeRemaining--;
            updateDisplay();

            if (timeRemaining <= 0) {
                stopQuantumTimer();
                addSessionToHistory();
                window.alert('🎉 Quantum session completed! Great focus!');
            }
        }, 1000);
    }

    button.addEventListener('click', () => {
        if (isQuantumActive) {
            stopQuantumTimer();
        } else {
            startQuantumTimer();
        }
    });

    updateDisplay();
});
