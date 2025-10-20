'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const defaultState = {
        players: [],
        scores: {}, // scores[playerId] = [score1, score2, ...]
        displayNames: {},
        firstToFinish: {} // firstToFinish[roundIndex] = playerId or null
    };

    let gameState = JSON.parse(localStorage.getItem('skyjoGameState')) || defaultState;
    
    // Migrate old state to include firstToFinish if missing
    if (!gameState.firstToFinish) {
        gameState.firstToFinish = {};
    }

    function saveGameState() {
        localStorage.setItem('skyjoGameState', JSON.stringify(gameState));
    }

    // --- DOM ELEMENTS ---
    const playersGrid = document.getElementById('playersGrid');
    const gameOverMessageDiv = document.getElementById('gameOverMessage');
    const gameOverText = document.getElementById('gameOverText');
    const addPlayerModal = document.getElementById('addPlayerModal');
    const newPlayerNameInput = document.getElementById('newPlayerNameInput');

    // --- GAME LOGIC HELPERS ---
    function getCurrentRound() {
        // The current round is the minimum number of scores any player has
        if (gameState.players.length === 0) return 0;
        return Math.min(...gameState.players.map(p => gameState.scores[p]?.length || 0));
    }

    function canAddScore(playerId) {
        const currentRound = getCurrentRound();
        const playerScores = gameState.scores[playerId]?.length || 0;
        // Can only add if player has exactly currentRound scores (not ahead)
        return playerScores === currentRound;
    }

    function isRoundComplete() {
        if (gameState.players.length === 0) return true;
        const roundCounts = gameState.players.map(p => gameState.scores[p]?.length || 0);
        // Round is complete when all players have the same number of scores
        return roundCounts.every(count => count === roundCounts[0]);
    }

    function getScoreForRound(playerId, roundIndex) {
        return gameState.scores[playerId]?.[roundIndex] || 0;
    }

    function getEffectiveScoreForRound(playerId, roundIndex) {
        const score = getScoreForRound(playerId, roundIndex);
        const finisherId = gameState.firstToFinish[roundIndex];
        
        // If this player was first to finish
        if (finisherId === playerId) {
            const finisherScore = score;
            // Check if any other player beat the finisher's score
            const wasBeat = gameState.players.some(p => {
                if (p === playerId) return false;
                return getScoreForRound(p, roundIndex) < finisherScore;
            });
            return wasBeat ? score * 2 : score;
        }
        
        return score;
    }

    function getTotalScore(playerId) {
        const scores = gameState.scores[playerId] || [];
        let total = 0;
        for (let i = 0; i < scores.length; i++) {
            total += getEffectiveScoreForRound(playerId, i);
        }
        return total;
    }

    // --- RENDER FUNCTIONS ---
    function renderAllPlayers() {
        playersGrid.innerHTML = '';
        gameState.players.forEach(player => {
            playersGrid.appendChild(createPlayerCard(player));
            updateDisplay(player);
        });
        checkGameOver();
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
                <label>Add New Score (Round <span id="${playerId}RoundNum">1</span>)</label>
                <div class="input-group">
                    <input type="number" class="score-input" data-player-id="${playerId}" placeholder="Enter score">
                    <button class="add-btn" data-player-id="${playerId}">
                        <span style="font-size: 1.2rem;">+</span> Add
                    </button>
                </div>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" class="first-finish-checkbox" data-player-id="${playerId}">
                        First to Finish (doubles if beaten)
                    </label>
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
        updateRoundNumber(playerId);
        updateInputState(playerId);

        const removeBtn = document.querySelector(`.remove-btn[data-player-id="${playerId}"]`);
        if (removeBtn) {
            const canRemove = gameState.scores[playerId]?.length > 0;
            const isLastRound = gameState.scores[playerId]?.length === getCurrentRound() + 1;
            if (canRemove && isLastRound) {
                removeBtn.classList.remove('hidden');
            } else {
                removeBtn.classList.add('hidden');
            }
        }
    }

    function updateRoundNumber(playerId) {
        const roundNumSpan = document.getElementById(`${playerId}RoundNum`);
        if (roundNumSpan) {
            const nextRound = (gameState.scores[playerId]?.length || 0) + 1;
            roundNumSpan.textContent = nextRound;
        }
    }

    function updateInputState(playerId) {
        const input = document.querySelector(`.score-input[data-player-id="${playerId}"]`);
        const addBtn = document.querySelector(`.add-btn[data-player-id="${playerId}"]`);
        const checkbox = document.querySelector(`.first-finish-checkbox[data-player-id="${playerId}"]`);
        
        const canAdd = canAddScore(playerId);
        
        if (input) input.disabled = !canAdd;
        if (addBtn) addBtn.disabled = !canAdd;
        if (checkbox) {
            checkbox.disabled = !canAdd;
            // Update checkbox state for current round
            const currentRound = gameState.scores[playerId]?.length || 0;
            checkbox.checked = gameState.firstToFinish[currentRound] === playerId;
        }
    }

    function updateHistory(playerId) {
        const historyDiv = document.getElementById(`${playerId}History`);
        const scores = gameState.scores[playerId] || [];

        if (scores.length === 0) {
            historyDiv.innerHTML = '<p class="history-empty">No scores yet</p>';
        } else {
            historyDiv.innerHTML = scores.map((score, index) => {
                const effectiveScore = getEffectiveScoreForRound(playerId, index);
                const isDoubled = effectiveScore !== score;
                const isFirstToFinish = gameState.firstToFinish[index] === playerId;
                
                return `
                    <div class="history-item ${isDoubled ? 'doubled' : ''}">
                        <span class="round">Round ${index + 1} ${isFirstToFinish ? '🏁' : ''}</span>
                        <span class="score">
                            ${score}${isDoubled ? ` (×2 = ${effectiveScore})` : ''}
                        </span>
                    </div>
                `;
            }).join('');
            historyDiv.scrollTop = historyDiv.scrollHeight;
        }
    }

    // --- GAME LOGIC FUNCTIONS ---
    function addScore(playerId) {
        if (!canAddScore(playerId)) {
            alert('You must wait for all players to complete the current round before adding a new score.');
            return;
        }

        const input = document.querySelector(`.score-input[data-player-id="${playerId}"]`);
        const checkbox = document.querySelector(`.first-finish-checkbox[data-player-id="${playerId}"]`);
        if (!input) return;

        const score = parseInt(input.value, 10);
        if (isNaN(score)) {
            alert('Please enter a valid score.');
            return;
        }

        const roundIndex = gameState.scores[playerId]?.length || 0;

        // Handle first to finish checkbox
        if (checkbox && checkbox.checked) {
            // Check if someone else already claimed first to finish for this round
            if (gameState.firstToFinish[roundIndex] && gameState.firstToFinish[roundIndex] !== playerId) {
                const otherPlayer = gameState.displayNames[gameState.firstToFinish[roundIndex]];
                alert(`${otherPlayer} already claimed First to Finish for this round.`);
                return;
            }
            gameState.firstToFinish[roundIndex] = playerId;
        } else {
            // If unchecking, remove the first to finish marker
            if (gameState.firstToFinish[roundIndex] === playerId) {
                delete gameState.firstToFinish[roundIndex];
            }
        }

        gameState.scores[playerId].push(score);
        input.value = '';
        if (checkbox) checkbox.checked = false;
        
        // Update all players since round state changed
        gameState.players.forEach(p => updateDisplay(p));
        
        // Only check game over if round is complete
        if (isRoundComplete()) {
            checkGameOver();
        }
        
        saveGameState();
    }

    function removeLastScore(playerId) {
        const playerScores = gameState.scores[playerId] || [];
        if (playerScores.length === 0) return;

        const currentRound = getCurrentRound();
        // Can only remove if this player has scores in the most recent incomplete round
        if (playerScores.length !== currentRound + 1) {
            alert('You can only remove scores from the current round.');
            return;
        }

        const removedRoundIndex = playerScores.length - 1;
        gameState.scores[playerId].pop();
        
        // Remove first to finish marker if this player had it
        if (gameState.firstToFinish[removedRoundIndex] === playerId) {
            delete gameState.firstToFinish[removedRoundIndex];
        }

        // Update all players
        gameState.players.forEach(p => updateDisplay(p));
        checkGameOver();
        saveGameState();
    }

    function checkGameOver() {
        // Only check for game over if the current round is complete
        if (!isRoundComplete()) {
            gameOverMessageDiv.classList.add('hidden');
            return;
        }

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

            document.querySelectorAll('.score-input, .add-btn, .first-finish-checkbox').forEach(el => el.disabled = true);
        } else {
            gameOverMessageDiv.classList.add('hidden');
        }
    }

    function resetGame() {
        if (confirm('Are you sure you want to reset the entire game?')) {
            gameState.players.forEach(player => {
                gameState.scores[player] = [];
            });
            gameState.firstToFinish = {};
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
            
            // Clean up firstToFinish references
            Object.keys(gameState.firstToFinish).forEach(roundIndex => {
                if (gameState.firstToFinish[roundIndex] === playerId) {
                    delete gameState.firstToFinish[roundIndex];
                }
            });
            
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