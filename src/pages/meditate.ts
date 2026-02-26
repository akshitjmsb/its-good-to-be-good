document.addEventListener('DOMContentLoaded', () => {
    let isMeditationActive = false;
    let meditationInterval: number | undefined;
    let timeRemaining = 10 * 60;

    const displayEl = document.getElementById('meditation-timer-display');
    const buttonEl = document.getElementById('meditation-timer-btn');
    const historyEl = document.getElementById('meditation-history');
    const typeButtons = document.querySelectorAll<HTMLButtonElement>('.meditation-type');

    if (!displayEl || !buttonEl || !historyEl) return;

    function formatTime(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateDisplay() {
        displayEl.textContent = formatTime(timeRemaining);
    }

    function addSessionToHistory() {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'bg-gray-100 p-3 rounded-lg text-sm';
        sessionDiv.innerHTML = `
            <div class="font-semibold">Meditation Session</div>
            <div class="text-gray-600">${new Date().toLocaleString()}</div>
            <div class="text-green-600">✅ Completed</div>
        `;

        if (historyEl.querySelector('.text-gray-500')) {
            historyEl.innerHTML = '';
        }
        historyEl.insertBefore(sessionDiv, historyEl.firstChild);
    }

    function stopMeditation() {
        isMeditationActive = false;
        const label = buttonEl.querySelector('h2');
        if (label) label.textContent = 'Start Meditation';
        (buttonEl as HTMLElement).style.background = '';
        if (meditationInterval !== undefined) {
            window.clearInterval(meditationInterval);
        }
    }

    function startMeditation() {
        isMeditationActive = true;
        const label = buttonEl.querySelector('h2');
        if (label) label.textContent = 'Stop Meditation';
        (buttonEl as HTMLElement).style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

        meditationInterval = window.setInterval(() => {
            timeRemaining--;
            updateDisplay();

            if (timeRemaining <= 0) {
                stopMeditation();
                addSessionToHistory();
                window.alert('🧘 Meditation session completed! You feel more centered.');
            }
        }, 1000);
    }

    function setDuration(minutes: number) {
        timeRemaining = minutes * 60;
        updateDisplay();
    }

    buttonEl.addEventListener('click', () => {
        if (isMeditationActive) {
            stopMeditation();
        } else {
            startMeditation();
        }
    });

    typeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const duration = Number(button.dataset.duration);
            if (!Number.isFinite(duration) || duration <= 0) return;
            setDuration(duration);
            button.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
            window.setTimeout(() => {
                button.style.background = '';
            }, 200);
        });
    });

    updateDisplay();
});
