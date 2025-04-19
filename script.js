let scores = {
    1: 0,
    2: 0
};

let teamNames = {
    1: "Equipo 1",
    2: "Equipo 2"
};

const WINNING_SCORE = 200;
let gameHistory = [];
let currentGame = {
    rounds: [],
    startTime: new Date()
};

let timerInterval;
let startTime;

function startTimer() {
    startTime = new Date();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimer() {
    const now = new Date();
    const diff = now - startTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('timer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function editTeamName(team) {
    const newName = prompt(`Ingrese el nuevo nombre para ${teamNames[team]}:`);
    if (newName && newName.trim()) {
        teamNames[team] = newName.trim();
        document.getElementById(`teamName${team}`).textContent = newName.trim();
    }
}

function addPoints(team) {
    // Crear y mostrar el panel de números
    const numbersPanel = document.createElement('div');
    numbersPanel.className = 'numbers-panel';
    numbersPanel.innerHTML = `
        <div class="numbers-title">Puntos para ${teamNames[team]}</div>
        <div class="display-value">0</div>
        <div class="numbers-grid">
            <button class="number-btn" data-value="1">1</button>
            <button class="number-btn" data-value="2">2</button>
            <button class="number-btn" data-value="3">3</button>
            <button class="number-btn" data-value="4">4</button>
            <button class="number-btn" data-value="5">5</button>
            <button class="number-btn" data-value="6">6</button>
            <button class="number-btn" data-value="7">7</button>
            <button class="number-btn" data-value="8">8</button>
            <button class="number-btn" data-value="9">9</button>
            <button class="number-btn" data-value="0">0</button>
            <button class="number-clear">C</button>
            <button class="number-submit">OK</button>
        </div>
    `;
    
    document.body.appendChild(numbersPanel);
    
    // Valor actual
    let currentValue = 0;
    const displayValue = numbersPanel.querySelector('.display-value');
    
    // Manejar clic en botones de números
    const numberButtons = numbersPanel.querySelectorAll('.number-btn');
    numberButtons.forEach(button => {
        button.addEventListener('click', () => {
            const digit = button.getAttribute('data-value');
            currentValue = currentValue * 10 + parseInt(digit);
            displayValue.textContent = currentValue;
        });
    });
    
    // Manejar botón de limpiar
    const clearButton = numbersPanel.querySelector('.number-clear');
    clearButton.addEventListener('click', () => {
        currentValue = 0;
        displayValue.textContent = '0';
    });
    
    // Manejar botón de enviar
    const submitButton = numbersPanel.querySelector('.number-submit');
    submitButton.addEventListener('click', () => {
        if (currentValue > 0) {
            applyPoints(team, currentValue);
            document.body.removeChild(numbersPanel);
        } else {
            alert('Por favor ingrese un valor mayor a 0');
        }
    });
    
    // Detener propagación de clics en el panel para evitar cierre accidental
    numbersPanel.addEventListener('click', function(event) {
        event.stopPropagation();
    });
    
    // Permitir cerrar el panel haciendo clic fuera
    setTimeout(() => {
        document.addEventListener('click', function closePanel(event) {
            if (!numbersPanel.contains(event.target)) {
                document.body.removeChild(numbersPanel);
                document.removeEventListener('click', closePanel);
            }
        });
    }, 100);
}

function applyPoints(team, points) {
    scores[team] += points;
    updateScore(team);
    
    // Registrar la ronda en el juego actual
    currentGame.rounds.push({
        team: team,
        teamName: teamNames[team],
        points: points,
        timestamp: new Date()
    });
    
    updateHistory();
    checkWinner();
}

function updateScore(team) {
    document.getElementById(`score${team}`).textContent = scores[team];
}

function checkWinner() {
    for (let team in scores) {
        if (scores[team] >= WINNING_SCORE) {
            const winner = document.getElementById('winner');
            winner.textContent = `¡${teamNames[team]} ha ganado!`;
            winner.classList.remove('hidden');
            disableButtons();
            stopTimer();
            
            // Finalizar el juego actual y guardarlo en el historial
            currentGame.winner = {
                team: team,
                teamName: teamNames[team],
                finalScore: scores[team]
            };
            currentGame.endTime = new Date();
            currentGame.duration = currentGame.endTime - currentGame.startTime;
            gameHistory.unshift(currentGame);
            updateHistory();
        }
    }
}

function updateHistory() {
    const historyContainer = document.getElementById('gameHistory');
    historyContainer.innerHTML = '';

    // Mostrar rondas del juego actual
    currentGame.rounds.forEach((round, index) => {
        const entry = document.createElement('div');
        entry.className = 'history-entry';
        const time = round.timestamp.toLocaleTimeString();
        entry.innerHTML = `
            <strong>${round.teamName}</strong> anotó ${round.points} puntos
            <span style="float: right; color: #666;">${time}</span>
        `;
        historyContainer.appendChild(entry);
    });

    // Mostrar juegos anteriores
    gameHistory.forEach((game, gameIndex) => {
        if (gameIndex > 0) { // No mostrar el juego actual de nuevo
            const entry = document.createElement('div');
            entry.className = 'history-entry winner-entry';
            const date = game.endTime.toLocaleDateString();
            const time = game.endTime.toLocaleTimeString();
            const duration = formatDuration(game.duration);
            entry.innerHTML = `
                <strong>Juego ${gameHistory.length - gameIndex}</strong> - 
                Ganador: ${game.winner.teamName} (${game.winner.finalScore} puntos)
                <br>
                <span style="color: #666;">Duración: ${duration}</span>
                <span style="float: right; color: #666;">${date} ${time}</span>
            `;
            historyContainer.appendChild(entry);
        }
    });
}

function disableButtons() {
    const buttons = document.querySelectorAll('.team button');
    buttons.forEach(button => {
        button.disabled = true;
        button.style.opacity = '0.5';
    });
}

function resetGame() {
    // Si hay un juego en curso con rondas, guardarlo en el historial
    if (currentGame.rounds.length > 0) {
        stopTimer();
        currentGame.endTime = new Date();
        currentGame.duration = currentGame.endTime - currentGame.startTime;
        gameHistory.unshift({...currentGame});
    }

    // Reiniciar el juego actual
    scores = {
        1: 0,
        2: 0
    };
    currentGame = {
        rounds: [],
        startTime: new Date()
    };
    
    // Reset scores display
    updateScore(1);
    updateScore(2);
    
    // Hide winner message
    const winner = document.getElementById('winner');
    winner.classList.add('hidden');
    
    // Re-enable buttons
    const buttons = document.querySelectorAll('.team button');
    buttons.forEach(button => {
        button.disabled = false;
        button.style.opacity = '1';
    });

    // Reiniciar el cronómetro
    stopTimer();
    startTimer();

    // Actualizar el historial
    updateHistory();
}

// Iniciar el cronómetro cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    startTimer();
    
    // Event listeners para abrir y cerrar el panel de historial
    const historyButton = document.getElementById('historyButton');
    const historyPanel = document.getElementById('historyPanel');
    const closeHistory = document.getElementById('closeHistory');
    
    // El botón ahora solo muestra el panel si estaba oculto
    historyButton.addEventListener('click', function() {
        if (historyPanel.classList.contains('hidden')) {
            historyPanel.classList.remove('hidden');
        }
    });
    
    // El botón de cerrar sigue funcionando
    closeHistory.addEventListener('click', function() {
        historyPanel.classList.add('hidden');
    });
    
    // Desactivamos el cierre al hacer clic fuera del panel
    /*
    document.addEventListener('click', function(event) {
        if (!historyPanel.contains(event.target) && 
            !historyButton.contains(event.target) && 
            !historyPanel.classList.contains('hidden')) {
            historyPanel.classList.add('hidden');
        }
    });
    */
}); 