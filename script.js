'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const defaultState = {
        players: [],
        scores: {},
        displayNames: {}
    };

    let gameState = JSON.parse(localStorage.getItem('skyjoGameState')) || defaultState;

    function saveGameState() {
        localStorage.setItem('skyjoGameState', JSON.stringify(gameState));
    }

    // --- DOM ELEMENTS ---
    const playersGrid = document.getElementById('playersGrid');
    const gameOverMessageDiv = document.getElementById('gameOverMessage');
    const gameOverText = document.getElementById('gameOverText');
    const addPlayerModal = document.getElementById('addPlayerModal');
    const newPlayerNameInput = document.getElementById('newPlayerNameInput');

    // --- RENDER FUNCTIONS ---
    function renderAllPlayers() {
        playersGrid.innerHTML = '';
        gameState.players.forEach(player => {
            playersGrid.appendChild(createPlayerCard(player));
            updateDisplay(player);
        });
        checkGameOver(); // Check game state after rendering
    }

    function createPlayerCard(playerId) {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.id = `card-${playerId}`;
        const displayName = gameState.displayNames[playerId];
        const canRemove = gameState.players.length > 2;

        card.innerHTML = `
            ${canRemove ? `<button class="remove-player-btn" data-player-id="${playerId}">×</button>` : ''}
            <h2>🎮 ${displayName}</h2>
            
            <div id="${playerId}Total" class="total-score normal">
                <p>Total Score</p>
                <p class="score normal">0</p>
            </div>

            <div class="input-section">
                <label>Add New Score</label>
                <div class="input-group">
                    <input type="number" class="score-input" data-player-id="${playerId}" placeholder="Enter score">
                    <button class="add-btn" data-player-id="${playerId}">
                        <span style="font-size: 1.2rem;">+</span> Add
                    </button>
                </div>
            </div>

            <button class="remove-btn hidden" data-player-id="${playerId}">
                <span>🗑️</span> Remove Last Score
            </button>

            <div class="history-section">
                <h3>📊 Score History</h3>
                <div class="history-list" id="${playerId}History">
                    <p class="history-empty">No scores yet</p>
                </div>
            </div>
        `;
        return card;
    }

    function updateDisplay(playerId) {
        const total = getTotalScore(playerId);
        const totalDiv = document.getElementById(`${playerId}Total`);
        const scoreElement = totalDiv.querySelector('.score');

        scoreElement.textContent = total;

        if (total >= 100) {
            totalDiv.classList.add('danger');
            totalDiv.classList.remove('normal');
            scoreElement.classList.add('danger');
            scoreElement.classList.remove('normal');
        } else {
            totalDiv.classList.add('normal');
            totalDiv.classList.remove('danger');
            scoreElement.classList.add('normal');
            scoreElement.classList.remove('danger');
        }

        updateHistory(playerId);

        const removeBtn = document.querySelector(`.remove-btn[data-player-id="${playerId}"]`);
        if (removeBtn) {
            if (gameState.scores[playerId].length > 0) {
                removeBtn.classList.remove('hidden');
            } else {
                removeBtn.classList.add('hidden');
            }
        }
    }

    function updateHistory(playerId) {
        const historyDiv = document.getElementById(`${playerId}History`);
        const scores = gameState.scores[playerId];

        if (scores.length === 0) {
            historyDiv.innerHTML = '<p class="history-empty">No scores yet</p>';
        } else {
            historyDiv.innerHTML = scores.map((score, index) => `
                <div class="history-item">
                    <span class="round">Round ${index + 1}</span>
                    <span class="score">${score}</span>
                </div>
            `).join('');
            historyDiv.scrollTop = historyDiv.scrollHeight; // Auto-scroll to bottom
        }
    }

    // --- GAME LOGIC FUNCTIONS ---
    function getTotalScore(playerId) {
        return gameState.scores[playerId]?.reduce((sum, score) => sum + score, 0) || 0;
    }

    function addScore(playerId) {
        const input = document.querySelector(`.score-input[data-player-id="${playerId}"]`);
        if (!input) return;

        const score = parseInt(input.value, 10);
        if (!isNaN(score)) {
            gameState.scores[playerId].push(score);
            input.value = '';
            updateDisplay(playerId);
            checkGameOver();
            saveGameState();
        }
    }

    function removeLastScore(playerId) {
        if (gameState.scores[playerId] && gameState.scores[playerId].length > 0) {
            gameState.scores[playerId].pop();
            updateDisplay(playerId);
            checkGameOver();
            saveGameState();
        }
    }

    function checkGameOver() {
        const losers = [];
        let isGameOver = false;

        gameState.players.forEach(player => {
            if (getTotalScore(player) >= 100) {
                losers.push(gameState.displayNames[player]);
                isGameOver = true;
            }
        });

        if (isGameOver) {
            gameOverMessageDiv.classList.remove('hidden');
            
            if (losers.length === 1) {
                gameOverText.innerHTML = `💥 ${losers[0]} Loses! 💥`;
            } else {
                gameOverText.innerHTML = `💥 ${losers.join(' & ')} Lose! 💥`;
            }

            // Find and declare the winner
            const nonLosers = gameState.players
                .filter(p => getTotalScore(p) < 100)
                .map(p => ({ name: gameState.displayNames[p], score: getTotalScore(p) }))
                .sort((a, b) => a.score - b.score);

            if (nonLosers.length > 0) {
                const winner = nonLosers[0];
                gameOverText.innerHTML += `<br>🏆 ${winner.name} Wins with ${winner.score} points! 🏆`;
            }

            document.querySelectorAll('.score-input, .add-btn').forEach(el => el.disabled = true);
        } else {
            gameOverMessageDiv.classList.add('hidden');
            document.querySelectorAll('.score-input, .add-btn').forEach(el => el.disabled = false);
        }
    }

    function resetGame() {
        if (confirm('Are you sure you want to reset the entire game?')) {
            gameState.players.forEach(player => {
                gameState.scores[player] = [];
            });
            renderAllPlayers();
            gameOverMessageDiv.classList.add('hidden');
            saveGameState();
        }
    }

    // --- PLAYER MANAGEMENT ---
    function confirmAddPlayer() {
        const name = newPlayerNameInput.value.trim();
        if (name) {
            const playerId = name.toLowerCase().replace(/\s+/g, '-');
            if (gameState.players.includes(playerId)) {
                alert('A player with this name already exists.');
                return;
            }
            gameState.players.push(playerId);
            gameState.scores[playerId] = [];
            gameState.displayNames[playerId] = name;
            
            renderAllPlayers();
            saveGameState();
            hideAddPlayerModal();
        }
    }

    function removePlayer(playerId) {
        if (gameState.players.length <= 2) {
            alert('You must have at least 2 players.');
            return;
        }
        const playerName = gameState.displayNames[playerId];
        if (confirm(`Are you sure you want to remove ${playerName}?`)) {
            gameState.players = gameState.players.filter(p => p !== playerId);
            delete gameState.scores[playerId];
            delete gameState.displayNames[playerId];
            
            renderAllPlayers();
            saveGameState();
        }
    }

    // --- MODAL FUNCTIONS ---
    function showAddPlayerModal() {
        addPlayerModal.classList.add('show');
        newPlayerNameInput.focus();
    }

    function hideAddPlayerModal() {
        addPlayerModal.classList.remove('show');
        newPlayerNameInput.value = '';
    }

    // --- EVENT LISTENERS ---
    document.querySelector('.reset-btn').addEventListener('click', resetGame);
    document.querySelector('.add-player-btn').addEventListener('click', showAddPlayerModal);
    document.getElementById('confirmAddPlayerBtn').addEventListener('click', confirmAddPlayer);
    document.getElementById('cancelAddPlayerBtn').addEventListener('click', hideAddPlayerModal);
    
    newPlayerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmAddPlayer();
    });

    playersGrid.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const playerId = target.dataset.playerId;
        if (target.classList.contains('add-btn')) addScore(playerId);
        if (target.classList.contains('remove-btn')) removeLastScore(playerId);
        if (target.classList.contains('remove-player-btn')) removePlayer(playerId);
    });

    playersGrid.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('score-input')) {
            addScore(e.target.dataset.playerId);
        }
    });

    // --- INITIALIZATION ---
    renderAllPlayers();
});