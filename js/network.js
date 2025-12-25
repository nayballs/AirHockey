/**
 * Air Hockey - Network Manager
 * Handles PeerJS WebRTC connections for multiplayer
 */

const Network = {
    peer: null,
    connection: null,
    isConnected: false,
    isHost: false,
    roomCode: null,

    // Callbacks
    onConnected: null,
    onDisconnected: null,
    onError: null,

    // Throttling for game state updates
    lastStateSend: 0,
    stateSendInterval: 33, // ~30fps

    /**
     * Generate a random 4-digit room code
     */
    generateRoomCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    },

    /**
     * Create a game (host)
     */
    async createGame() {
        return new Promise((resolve, reject) => {
            this.roomCode = this.generateRoomCode();
            this.isHost = true;

            // Create peer with room code as ID
            const peerId = 'airhockey-' + this.roomCode;

            this.peer = new Peer(peerId, {
                debug: 1
            });

            this.peer.on('open', (id) => {
                console.log('Host peer opened:', id);
                resolve(this.roomCode);
            });

            this.peer.on('connection', (conn) => {
                console.log('Guest connected!');
                this.connection = conn;

                // Wait for connection to be fully open
                conn.on('open', () => {
                    console.log('Connection fully open (host side)');
                    this.setupConnection();
                });
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (err.type === 'unavailable-id') {
                    // Room code already in use, try another
                    this.peer.destroy();
                    this.roomCode = this.generateRoomCode();
                    this.createGame().then(resolve).catch(reject);
                } else {
                    reject(err);
                }
            });

            // Timeout after 60 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Timeout waiting for connection'));
                }
            }, 60000);
        });
    },

    /**
     * Join a game (guest)
     */
    async joinGame(roomCode) {
        return new Promise((resolve, reject) => {
            this.roomCode = roomCode;
            this.isHost = false;

            // Create peer with random ID
            this.peer = new Peer(undefined, {
                debug: 1
            });

            this.peer.on('open', () => {
                console.log('Guest peer opened, connecting to host...');

                // Connect to host
                const hostId = 'airhockey-' + roomCode;
                this.connection = this.peer.connect(hostId, {
                    reliable: true
                });

                this.connection.on('open', () => {
                    console.log('Connected to host!');
                    this.setupConnection();
                    resolve();
                });

                this.connection.on('error', (err) => {
                    console.error('Connection error:', err);
                    reject(err);
                });
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                reject(err);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Could not connect to room'));
                }
            }, 10000);
        });
    },

    /**
     * Set up connection handlers
     */
    setupConnection() {
        this.isConnected = true;

        this.connection.on('data', (data) => {
            this.handleMessage(data);
        });

        this.connection.on('close', () => {
            console.log('Connection closed');
            this.isConnected = false;
            if (this.onDisconnected) {
                this.onDisconnected();
            }
        });

        this.connection.on('error', (err) => {
            console.error('Connection error:', err);
            if (this.onError) {
                this.onError(err);
            }
        });

        // Notify connection established
        if (this.onConnected) {
            this.onConnected();
        }

        // If guest, tell host we are ready
        if (!this.isHost) {
            setTimeout(() => {
                this.send({ type: 'ready' });
            }, 500);
        }
    },

    /**
     * Handle incoming messages
     */
    handleMessage(data) {
        switch (data.type) {
            case 'ready':
                // Guest is ready, start the game!
                if (this.isHost) {
                    console.log('Guest is ready, starting game...');
                    this.send({ type: 'start' });
                    if (typeof UI !== 'undefined') {
                        UI.startGame(true);
                    }
                }
                break;

            case 'start':
                // Game is starting
                if (typeof UI !== 'undefined') {
                    UI.startGame(this.isHost);
                }
                break;

            case 'paddle':
                // Opponent paddle position
                if (typeof Game !== 'undefined') {
                    Game.updateOpponentPaddle(data.x, data.y);
                }
                break;

            case 'gameState':
                // Full game state from host (guest receives this)
                if (typeof Game !== 'undefined' && !this.isHost) {
                    Game.updateFromHost(data.state);
                }
                break;

            case 'playAgain':
                // Opponent wants to play again
                if (this.isHost) {
                    this.send({ type: 'start' });
                    if (typeof UI !== 'undefined') {
                        UI.startGame(true);
                    }
                } else {
                    // Forward intention to host if we are guest?
                    // Actually, existing logic for playAgain might need checking,
                    // but for now let's just match the old behavior or minimal fix.
                    if (typeof UI !== 'undefined') {
                        UI.startGame(this.isHost);
                    }
                }
                break;
        }
    },

    /**
     * Send data to peer
     */
    send(data) {
        if (this.connection && this.isConnected) {
            try {
                this.connection.send(data);
            } catch (e) {
                console.error('Send error:', e);
            }
        }
    },

    /**
     * Send paddle position
     */
    sendPaddlePosition(x, y) {
        this.send({
            type: 'paddle',
            x: x,
            y: y
        });
    },

    /**
     * Send game state (host only, throttled)
     */
    sendGameState(state) {
        const now = Date.now();
        if (now - this.lastStateSend >= this.stateSendInterval) {
            this.send({
                type: 'gameState',
                state: state
            });
            this.lastStateSend = now;
        }
    },

    /**
     * Send play again request
     */
    sendPlayAgain() {
        this.send({ type: 'playAgain' });
    },

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        this.isConnected = false;

        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }

        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        this.roomCode = null;
    }
};
