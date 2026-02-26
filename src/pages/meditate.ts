document.addEventListener('DOMContentLoaded', () => {
    let isMeditationActive = false;
    let meditationInterval: number | undefined;
    let timeRemaining = 10 * 60;

    const displayEl = document.getElementById('meditation-timer-display');
    const buttonEl = document.getElementById('meditation-timer-btn');
    const historyEl = document.getElementById('meditation-history');
    const typeButtons = document.querySelectorAll<HTMLButtonElement>('.meditation-type');

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
            <div class="font-semibold">Meditation Session</div>
            <div class="text-gray-600">${new Date().toLocaleString()}</div>
            <div class="text-green-600">✅ Completed</div>
        `;

        if (history.querySelector('.text-gray-500')) {
            history.innerHTML = '';
        }
        history.insertBefore(sessionDiv, history.firstChild);
    }

    function stopMeditation() {
        isMeditationActive = false;
        const label = button.querySelector('h2');
        if (label) label.textContent = 'Start Meditation';
        button.style.background = '';
        if (meditationInterval !== undefined) {
            window.clearInterval(meditationInterval);
        }
    }

    function startMeditation() {
        isMeditationActive = true;
        const label = button.querySelector('h2');
        if (label) label.textContent = 'Stop Meditation';
        button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

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

    button.addEventListener('click', () => {
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
