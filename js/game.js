/**
 * Air Hockey - Core Game Engine
 * Handles canvas rendering, physics, and game state
 */

const Game = {
    // Canvas and context
    canvas: null,
    ctx: null,

    // Game dimensions (will be set on resize)
    width: 0,
    height: 0,

    // Game objects
    puck: null,
    playerPaddle: null,
    opponentPaddle: null,

    // Game state
    isRunning: false,
    isHost: false,
    score: { player: 0, opponent: 0 },
    winningScore: 11,

    // Physics constants
    friction: 0.995,
    maxPuckSpeed: 25,
    paddleRadius: 0,
    puckRadius: 0,
    goalWidth: 0,

    // Trail effect
    puckTrail: [],
    maxTrailLength: 15,

    // Animation
    lastTime: 0,
    animationId: null,

    // Colors
    colors: {
        background: '#0a0014',
        table: '#1a0a2e',
        border: '#3d1a5c',
        centerLine: 'rgba(255, 255, 255, 0.15)',
        goalCyan: 'rgba(0, 255, 255, 0.3)',
        goalMagenta: 'rgba(255, 0, 255, 0.3)',
        cyan: '#00ffff',
        magenta: '#ff00ff',
        puck: '#ffff00',
        puckGlow: 'rgba(255, 255, 0, 0.6)'
    },

    /**
     * Initialize the game
     */
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.setupInput();
    },

    /**
     * Handle canvas resize
     */
    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.width = rect.width;
        this.height = rect.height;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);

        // Calculate sizes based on screen
        const minDim = Math.min(this.width, this.height);
        this.paddleRadius = minDim * 0.08;
        this.puckRadius = minDim * 0.05;
        this.goalWidth = this.width * 0.4;
        this.wallThickness = minDim * 0.02;

        // Reset positions if game objects exist
        if (this.puck) {
            this.resetPositions();
        }
    },

    /**
     * Set up touch/mouse input
     */
    setupInput() {
        let lastTouch = { x: 0, y: 0 };

        const handleMove = (clientX, clientY) => {
            if (!this.isRunning || !this.playerPaddle) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            // Calculate velocity for paddle (used in physics)
            this.playerPaddle.vx = (x - this.playerPaddle.x) * 0.3;
            this.playerPaddle.vy = (y - this.playerPaddle.y) * 0.3;

            // Constrain to player's half (bottom half)
            const halfHeight = this.height / 2;
            const minY = halfHeight + this.paddleRadius + 10;
            const maxY = this.height - this.paddleRadius - this.wallThickness;

            this.playerPaddle.x = Math.max(
                this.paddleRadius + this.wallThickness,
                Math.min(this.width - this.paddleRadius - this.wallThickness, x)
            );
            this.playerPaddle.y = Math.max(minY, Math.min(maxY, y));

            // Send position to opponent
            if (Network.isConnected) {
                Network.sendPaddlePosition(this.playerPaddle.x, this.playerPaddle.y);
            }
        };

        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        // Touch events
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        }, { passive: false });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        }, { passive: false });
    },

    /**
     * Start a new game
     */
    start(isHost) {
        this.isHost = isHost;
        this.score = { player: 0, opponent: 0 };
        this.isRunning = true;

        // Initialize game objects
        this.puck = {
            x: this.width / 2,
            y: this.height / 2,
            vx: 0,
            vy: 0,
            radius: this.puckRadius
        };

        this.playerPaddle = {
            x: this.width / 2,
            y: this.height - this.paddleRadius - this.wallThickness - 20,
            vx: 0,
            vy: 0,
            radius: this.paddleRadius
        };

        this.opponentPaddle = {
            x: this.width / 2,
            y: this.paddleRadius + this.wallThickness + 20,
            vx: 0,
            vy: 0,
            radius: this.paddleRadius
        };

        this.puckTrail = [];

        // Give puck initial velocity toward a random player
        if (this.isHost) {
            const angle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4 + Math.random() * Math.PI / 4);
            const speed = 8;
            this.puck.vx = Math.sin(angle) * speed;
            this.puck.vy = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
        }

        // Update UI
        UI.updateScore(this.score.player, this.score.opponent);

        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    },

    /**
     * Main game loop
     */
    gameLoop(currentTime = performance.now()) {
        if (!this.isRunning) return;

        const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2); // Cap at 2x speed
        this.lastTime = currentTime;

        // Only host runs physics
        if (this.isHost) {
            this.updatePhysics(deltaTime);
        }

        this.render();

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    },

    /**
     * Update physics (host only)
     */
    updatePhysics(dt) {
        const puck = this.puck;

        // Add to trail
        this.puckTrail.unshift({ x: puck.x, y: puck.y });
        if (this.puckTrail.length > this.maxTrailLength) {
            this.puckTrail.pop();
        }

        // Update puck position
        puck.x += puck.vx * dt;
        puck.y += puck.vy * dt;

        // Apply friction
        puck.vx *= Math.pow(this.friction, dt);
        puck.vy *= Math.pow(this.friction, dt);

        // Clamp speed
        const speed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
        if (speed > this.maxPuckSpeed) {
            puck.vx = (puck.vx / speed) * this.maxPuckSpeed;
            puck.vy = (puck.vy / speed) * this.maxPuckSpeed;
        }

        // Wall collisions
        const wallLeft = this.wallThickness + puck.radius;
        const wallRight = this.width - this.wallThickness - puck.radius;
        const wallTop = this.wallThickness + puck.radius;
        const wallBottom = this.height - this.wallThickness - puck.radius;

        // Goal zones
        const goalLeft = (this.width - this.goalWidth) / 2;
        const goalRight = (this.width + this.goalWidth) / 2;

        // Left/right walls
        if (puck.x < wallLeft) {
            puck.x = wallLeft;
            puck.vx = -puck.vx * 0.9;
            Audio.play('wall');
        } else if (puck.x > wallRight) {
            puck.x = wallRight;
            puck.vx = -puck.vx * 0.9;
            Audio.play('wall');
        }

        // Top wall (opponent's side) - check for goal
        if (puck.y < wallTop) {
            if (puck.x > goalLeft && puck.x < goalRight) {
                // Goal for player!
                this.goalScored('player');
                return;
            } else {
                puck.y = wallTop;
                puck.vy = -puck.vy * 0.9;
                Audio.play('wall');
            }
        }

        // Bottom wall (player's side) - check for goal
        if (puck.y > wallBottom) {
            if (puck.x > goalLeft && puck.x < goalRight) {
                // Goal for opponent!
                this.goalScored('opponent');
                return;
            } else {
                puck.y = wallBottom;
                puck.vy = -puck.vy * 0.9;
                Audio.play('wall');
            }
        }

        // Paddle collisions
        this.checkPaddleCollision(this.playerPaddle);
        this.checkPaddleCollision(this.opponentPaddle);

        // Send puck state to opponent
        if (Network.isConnected) {
            Network.sendGameState({
                puck: { x: puck.x, y: puck.y, vx: puck.vx, vy: puck.vy },
                score: this.score
            });
        }
    },

    /**
     * Check collision between puck and paddle
     */
    checkPaddleCollision(paddle) {
        const dx = this.puck.x - paddle.x;
        const dy = this.puck.y - paddle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = this.puck.radius + paddle.radius;

        if (dist < minDist && dist > 0) {
            // Collision! Calculate response
            const nx = dx / dist;
            const ny = dy / dist;

            // Separate objects
            const overlap = minDist - dist;
            this.puck.x += nx * overlap;
            this.puck.y += ny * overlap;

            // Calculate relative velocity
            const relVx = this.puck.vx - paddle.vx;
            const relVy = this.puck.vy - paddle.vy;

            // Relative velocity along collision normal
            const relVelNormal = relVx * nx + relVy * ny;

            // Only resolve if objects are moving toward each other
            if (relVelNormal < 0) {
                // Coefficient of restitution (bounciness)
                const restitution = 1.1;

                // New velocity
                this.puck.vx -= (1 + restitution) * relVelNormal * nx;
                this.puck.vy -= (1 + restitution) * relVelNormal * ny;

                // Add some of paddle velocity
                this.puck.vx += paddle.vx * 0.5;
                this.puck.vy += paddle.vy * 0.5;

                Audio.play('hit');
            }
        }
    },

    /**
     * Handle goal scored
     */
    goalScored(scorer) {
        this.score[scorer]++;

        Audio.play('goal');
        UI.showGoalAnnouncement();
        UI.updateScore(this.score.player, this.score.opponent);

        // Check for win
        if (this.score[scorer] >= this.winningScore) {
            this.gameOver(scorer === 'player');
            return;
        }

        // Reset puck after delay
        setTimeout(() => {
            if (this.isRunning) {
                this.resetPuck(scorer === 'opponent');
            }
        }, 1500);
    },

    /**
     * Reset puck to center
     */
    resetPuck(towardPlayer) {
        this.puck.x = this.width / 2;
        this.puck.y = this.height / 2;
        this.puckTrail = [];

        // Give initial velocity toward the player who was scored on
        const angle = (Math.random() - 0.5) * Math.PI / 2;
        const speed = 8;
        this.puck.vx = Math.sin(angle) * speed;
        this.puck.vy = Math.cos(angle) * speed * (towardPlayer ? 1 : -1);

        // Sync with opponent
        if (Network.isConnected) {
            Network.sendGameState({
                puck: { x: this.puck.x, y: this.puck.y, vx: this.puck.vx, vy: this.puck.vy },
                score: this.score
            });
        }
    },

    /**
     * Reset all positions
     */
    resetPositions() {
        if (this.puck) {
            this.puck.x = this.width / 2;
            this.puck.y = this.height / 2;
        }
        if (this.playerPaddle) {
            this.playerPaddle.x = this.width / 2;
            this.playerPaddle.y = this.height - this.paddleRadius - this.wallThickness - 20;
        }
        if (this.opponentPaddle) {
            this.opponentPaddle.x = this.width / 2;
            this.opponentPaddle.y = this.paddleRadius + this.wallThickness + 20;
        }
    },

    /**
     * Update opponent paddle position (called from network)
     */
    updateOpponentPaddle(x, y) {
        if (!this.opponentPaddle) return;

        // Mirror the position (opponent sees things flipped)
        this.opponentPaddle.x = this.width - x;
        this.opponentPaddle.y = this.height - y;

        // Calculate velocity for physics
        this.opponentPaddle.vx = (this.opponentPaddle.x - (this.opponentPaddle.lastX || this.opponentPaddle.x)) * 0.3;
        this.opponentPaddle.vy = (this.opponentPaddle.y - (this.opponentPaddle.lastY || this.opponentPaddle.y)) * 0.3;
        this.opponentPaddle.lastX = this.opponentPaddle.x;
        this.opponentPaddle.lastY = this.opponentPaddle.y;
    },

    /**
     * Update game state from host (guest only)
     */
    updateFromHost(state) {
        if (this.isHost) return;

        // Mirror puck position
        this.puck.x = this.width - state.puck.x;
        this.puck.y = this.height - state.puck.y;
        this.puck.vx = -state.puck.vx;
        this.puck.vy = -state.puck.vy;

        // Update trail
        this.puckTrail.unshift({ x: this.puck.x, y: this.puck.y });
        if (this.puckTrail.length > this.maxTrailLength) {
            this.puckTrail.pop();
        }

        // Mirror score (opponent's player score is our opponent score)
        const prevPlayerScore = this.score.player;
        const prevOpponentScore = this.score.opponent;

        this.score.player = state.score.opponent;
        this.score.opponent = state.score.player;

        // Check for goal
        if (this.score.player > prevPlayerScore) {
            Audio.play('goal');
            UI.showGoalAnnouncement();
        } else if (this.score.opponent > prevOpponentScore) {
            Audio.play('goal');
            UI.showGoalAnnouncement();
        }

        UI.updateScore(this.score.player, this.score.opponent);

        // Check for game over
        if (this.score.player >= this.winningScore) {
            this.gameOver(true);
        } else if (this.score.opponent >= this.winningScore) {
            this.gameOver(false);
        }
    },

    /**
     * Game over
     */
    gameOver(playerWon) {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        Audio.play(playerWon ? 'win' : 'lose');
        UI.showGameOver(playerWon, this.score.player, this.score.opponent);
    },

    /**
     * Stop the game
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    },

    /**
     * Render the game
     */
    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear and draw background
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, w, h);

        // Draw table
        ctx.fillStyle = this.colors.table;
        ctx.fillRect(this.wallThickness, this.wallThickness,
                     w - this.wallThickness * 2, h - this.wallThickness * 2);

        // Draw border with glow
        ctx.strokeStyle = this.colors.border;
        ctx.lineWidth = this.wallThickness;
        ctx.shadowColor = '#8b00ff';
        ctx.shadowBlur = 20;
        ctx.strokeRect(this.wallThickness / 2, this.wallThickness / 2,
                       w - this.wallThickness, h - this.wallThickness);
        ctx.shadowBlur = 0;

        // Draw center line
        ctx.strokeStyle = this.colors.centerLine;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(this.wallThickness, h / 2);
        ctx.lineTo(w - this.wallThickness, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw center circle
        ctx.strokeStyle = this.colors.centerLine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.15, 0, Math.PI * 2);
        ctx.stroke();

        // Draw goals
        const goalLeft = (w - this.goalWidth) / 2;
        const goalRight = (w + this.goalWidth) / 2;

        // Opponent's goal (top - cyan glow since they're the opponent)
        ctx.fillStyle = this.colors.goalMagenta;
        ctx.shadowColor = this.colors.magenta;
        ctx.shadowBlur = 30;
        ctx.fillRect(goalLeft, 0, this.goalWidth, this.wallThickness + 5);

        // Player's goal (bottom - magenta glow since we're cyan)
        ctx.fillStyle = this.colors.goalCyan;
        ctx.shadowColor = this.colors.cyan;
        ctx.shadowBlur = 30;
        ctx.fillRect(goalLeft, h - this.wallThickness - 5, this.goalWidth, this.wallThickness + 5);
        ctx.shadowBlur = 0;

        // Draw puck trail
        for (let i = 0; i < this.puckTrail.length; i++) {
            const t = this.puckTrail[i];
            const alpha = (1 - i / this.maxTrailLength) * 0.5;
            const radius = this.puck.radius * (1 - i / this.maxTrailLength * 0.5);

            ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw puck
        if (this.puck) {
            ctx.shadowColor = this.colors.puck;
            ctx.shadowBlur = 25;

            // Outer glow
            ctx.fillStyle = this.colors.puckGlow;
            ctx.beginPath();
            ctx.arc(this.puck.x, this.puck.y, this.puck.radius * 1.3, 0, Math.PI * 2);
            ctx.fill();

            // Main puck
            ctx.fillStyle = this.colors.puck;
            ctx.beginPath();
            ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.puck.x - this.puck.radius * 0.3,
                    this.puck.y - this.puck.radius * 0.3,
                    this.puck.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
        }

        // Draw opponent paddle (magenta - at top)
        if (this.opponentPaddle) {
            this.drawPaddle(this.opponentPaddle, this.colors.magenta);
        }

        // Draw player paddle (cyan - at bottom)
        if (this.playerPaddle) {
            this.drawPaddle(this.playerPaddle, this.colors.cyan);
        }
    },

    /**
     * Draw a paddle with glow effect
     */
    drawPaddle(paddle, color) {
        const ctx = this.ctx;

        ctx.shadowColor = color;
        ctx.shadowBlur = 30;

        // Outer glow
        ctx.fillStyle = color.replace(')', ', 0.3)').replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.arc(paddle.x, paddle.y, paddle.radius * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Main paddle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(paddle.x, paddle.y, paddle.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(paddle.x, paddle.y, paddle.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(paddle.x - paddle.radius * 0.25,
                paddle.y - paddle.radius * 0.25,
                paddle.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }
};

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});
