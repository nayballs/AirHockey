/**
 * Air Hockey - UI Manager
 * Handles menu screens and UI updates
 */

const UI = {
    // Screen elements
    screens: {
        menu: null,
        create: null,
        join: null,
        game: null,
        gameover: null
    },

    // UI elements
    elements: {
        roomCode: null,
        codeInput: null,
        joinError: null,
        playerScore: null,
        opponentScore: null,
        goalAnnouncement: null,
        winnerText: null,
        finalScore: null,
        connectionLost: null
    },

    /**
     * Initialize UI
     */
    init() {
        // Get screen elements
        this.screens.menu = document.getElementById('menu-screen');
        this.screens.create = document.getElementById('create-screen');
        this.screens.join = document.getElementById('join-screen');
        this.screens.game = document.getElementById('game-screen');
        this.screens.gameover = document.getElementById('gameover-screen');

        // Get UI elements
        this.elements.roomCode = document.getElementById('room-code');
        this.elements.codeInput = document.getElementById('code-input');
        this.elements.joinError = document.getElementById('join-error');
        this.elements.playerScore = document.getElementById('player-score');
        this.elements.opponentScore = document.getElementById('opponent-score');
        this.elements.goalAnnouncement = document.getElementById('goal-announcement');
        this.elements.winnerText = document.getElementById('winner-text');
        this.elements.finalScore = document.getElementById('final-score');
        this.elements.connectionLost = document.getElementById('connection-lost');

        // Set up button handlers
        this.setupButtons();

        // Set up network callbacks
        this.setupNetworkCallbacks();
    },

    /**
     * Set up button click handlers
     */
    setupButtons() {
        // Main menu buttons
        document.getElementById('create-btn').addEventListener('click', () => {
            this.createGame();
        });

        document.getElementById('join-btn').addEventListener('click', () => {
            this.showScreen('join');
            this.elements.codeInput.value = '';
            this.elements.codeInput.focus();
        });

        // Create screen
        document.getElementById('cancel-create-btn').addEventListener('click', () => {
            Network.disconnect();
            this.showScreen('menu');
        });

        // Join screen
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.joinGame();
        });

        document.getElementById('cancel-join-btn').addEventListener('click', () => {
            this.showScreen('menu');
        });

        // Code input - auto-submit on 4 digits
        this.elements.codeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
            if (e.target.value.length === 4) {
                this.joinGame();
            }
        });

        // Enter key on code input
        this.elements.codeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.elements.codeInput.value.length === 4) {
                this.joinGame();
            }
        });

        // Game over buttons
        document.getElementById('play-again-btn').addEventListener('click', () => {
            if (Network.isConnected) {
                Network.sendPlayAgain();
                this.startGame(Network.isHost);
            } else {
                this.showScreen('menu');
            }
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            Network.disconnect();
            this.showScreen('menu');
        });

        // Connection lost
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            this.elements.connectionLost.classList.add('hidden');
            Network.disconnect();
            Game.stop();
            this.showScreen('menu');
        });
    },

    /**
     * Set up network callbacks
     */
    setupNetworkCallbacks() {
        Network.onConnected = () => {
            // Connection established, game will start when host sends signal
            console.log('Network connected!');
        };

        Network.onDisconnected = () => {
            console.log('Network disconnected');
            if (Game.isRunning) {
                this.showConnectionLost();
            }
        };

        Network.onError = (err) => {
            console.error('Network error:', err);
        };
    },

    /**
     * Show a specific screen
     */
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });

        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    },

    /**
     * Create a new game (host)
     */
    async createGame() {
        this.showScreen('create');
        this.elements.roomCode.textContent = '----';

        try {
            const code = await Network.createGame();
            this.elements.roomCode.textContent = code;
        } catch (err) {
            console.error('Failed to create game:', err);
            alert('Failed to create game. Please try again.');
            this.showScreen('menu');
        }
    },

    /**
     * Join an existing game (guest)
     */
    async joinGame() {
        const code = this.elements.codeInput.value;

        if (code.length !== 4) {
            this.showJoinError('Enter a 4-digit code');
            return;
        }

        this.elements.joinError.classList.add('hidden');
        document.getElementById('connect-btn').textContent = 'CONNECTING...';
        document.getElementById('connect-btn').disabled = true;

        try {
            await Network.joinGame(code);
        } catch (err) {
            console.error('Failed to join game:', err);
            this.showJoinError('Could not connect. Check the code.');
            document.getElementById('connect-btn').textContent = 'CONNECT';
            document.getElementById('connect-btn').disabled = false;
        }
    },

    /**
     * Show join error message
     */
    showJoinError(message) {
        this.elements.joinError.textContent = message;
        this.elements.joinError.classList.remove('hidden');
    },

    /**
     * Start the game
     */
    startGame(isHost) {
        this.showScreen('game');
        // Give the browser time to layout the canvas before starting
        requestAnimationFrame(() => {
            Game.resize();
            Game.start(isHost);
        });
    },

    /**
     * Update score display
     */
    updateScore(player, opponent) {
        this.elements.playerScore.textContent = player;
        this.elements.opponentScore.textContent = opponent;
    },

    /**
     * Show goal announcement
     */
    showGoalAnnouncement() {
        const el = this.elements.goalAnnouncement;
        el.classList.remove('hidden');

        // Remove and re-add to restart animation
        el.style.animation = 'none';
        el.offsetHeight; // Trigger reflow
        el.style.animation = null;

        // Hide after animation
        setTimeout(() => {
            el.classList.add('hidden');
        }, 1500);
    },

    /**
     * Show game over screen
     */
    showGameOver(playerWon, playerScore, opponentScore) {
        const winnerText = this.elements.winnerText;

        if (playerWon) {
            winnerText.textContent = 'YOU WIN!';
            winnerText.className = 'winner-text win';
        } else {
            winnerText.textContent = 'YOU LOSE';
            winnerText.className = 'winner-text lose';
        }

        this.elements.finalScore.textContent = `${playerScore} - ${opponentScore}`;

        // Delay showing game over screen for dramatic effect
        setTimeout(() => {
            this.showScreen('gameover');
            if (playerWon) {
                this.createVictoryParticles();
            }
        }, 1000);
    },

    /**
     * Show connection lost overlay
     */
    showConnectionLost() {
        this.elements.connectionLost.classList.remove('hidden');
        Game.stop();
    },

    /**
     * Create victory particle effect
     */
    createVictoryParticles() {
        const container = document.getElementById('gameover-screen');
        const colors = ['#00ffff', '#ff00ff', '#ffff00', '#ffffff'];

        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    border-radius: 50%;
                    left: ${Math.random() * 100}%;
                    top: -20px;
                    box-shadow: 0 0 10px currentColor;
                    pointer-events: none;
                    animation: particle-fall ${2 + Math.random() * 2}s linear forwards;
                `;
                container.appendChild(particle);

                // Remove particle after animation
                setTimeout(() => {
                    particle.remove();
                }, 4000);
            }, i * 50);
        }
    }
};

// Add particle animation to page
const style = document.createElement('style');
style.textContent = `
    @keyframes particle-fall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
