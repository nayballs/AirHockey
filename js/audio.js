/**
 * Air Hockey - Audio Manager
 * Handles sound effects using Web Audio API with procedural generation
 */

const Audio = {
    context: null,
    enabled: true,
    masterVolume: 0.5,

    /**
     * Initialize the audio context
     */
    init() {
        // Create context on first user interaction (browser requirement)
        const initContext = () => {
            if (!this.context) {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
            }
            document.removeEventListener('click', initContext);
            document.removeEventListener('touchstart', initContext);
        };

        document.addEventListener('click', initContext);
        document.addEventListener('touchstart', initContext);
    },

    /**
     * Ensure audio context is ready
     */
    ensureContext() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        return this.context;
    },

    /**
     * Play a sound effect
     */
    play(sound) {
        if (!this.enabled) return;

        try {
            const ctx = this.ensureContext();

            switch (sound) {
                case 'hit':
                    this.playHit(ctx);
                    break;
                case 'wall':
                    this.playWall(ctx);
                    break;
                case 'goal':
                    this.playGoal(ctx);
                    break;
                case 'win':
                    this.playWin(ctx);
                    break;
                case 'lose':
                    this.playLose(ctx);
                    break;
            }
        } catch (e) {
            console.log('Audio error:', e);
        }
    },

    /**
     * Paddle hit sound - sharp, satisfying thwack
     */
    playHit(ctx) {
        const now = ctx.currentTime;

        // Create oscillator for the hit
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);

        gain.gain.setValueAtTime(this.masterVolume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.15);

        // Add noise burst for impact
        this.addNoiseBurst(ctx, now, 0.08, this.masterVolume * 0.3);
    },

    /**
     * Wall bounce sound - softer bump
     */
    playWall(ctx) {
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(this.masterVolume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    },

    /**
     * Goal scored sound - exciting arcade sound
     */
    playGoal(ctx) {
        const now = ctx.currentTime;

        // Arpeggio up
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.25);
        });

        // Add sparkle noise
        this.addNoiseBurst(ctx, now, 0.3, this.masterVolume * 0.15);
    },

    /**
     * Win sound - triumphant fanfare
     */
    playWin(ctx) {
        const now = ctx.currentTime;

        // Victory fanfare
        const melody = [
            { freq: 523.25, time: 0, duration: 0.15 },     // C5
            { freq: 659.25, time: 0.15, duration: 0.15 },  // E5
            { freq: 783.99, time: 0.3, duration: 0.15 },   // G5
            { freq: 1046.50, time: 0.45, duration: 0.4 },  // C6
        ];

        melody.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, now + note.time);

            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.35, now + note.time + 0.02);
            gain.gain.setValueAtTime(this.masterVolume * 0.35, now + note.time + note.duration * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

            osc.start(now + note.time);
            osc.stop(now + note.time + note.duration + 0.1);
        });

        // Add harmony
        const harmony = [
            { freq: 392.00, time: 0.45, duration: 0.4 },   // G4
            { freq: 659.25, time: 0.45, duration: 0.4 },   // E5
        ];

        harmony.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, now + note.time);

            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + note.time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

            osc.start(now + note.time);
            osc.stop(now + note.time + note.duration + 0.1);
        });
    },

    /**
     * Lose sound - sad descending tone
     */
    playLose(ctx) {
        const now = ctx.currentTime;

        // Descending sad tones
        const notes = [
            { freq: 392.00, time: 0, duration: 0.25 },     // G4
            { freq: 349.23, time: 0.25, duration: 0.25 },  // F4
            { freq: 293.66, time: 0.5, duration: 0.4 },    // D4
        ];

        notes.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, now + note.time);
            osc.frequency.exponentialRampToValueAtTime(note.freq * 0.95, now + note.time + note.duration);

            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + note.time + 0.02);
            gain.gain.setValueAtTime(this.masterVolume * 0.3, now + note.time + note.duration * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

            osc.start(now + note.time);
            osc.stop(now + note.time + note.duration + 0.1);
        });
    },

    /**
     * Add a noise burst for impact sounds
     */
    addNoiseBurst(ctx, startTime, duration, volume) {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, startTime);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        noise.start(startTime);
        noise.stop(startTime + duration);
    },

    /**
     * Toggle audio on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },

    /**
     * Set master volume (0-1)
     */
    setVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, vol));
    }
};

// Initialize audio on load
Audio.init();
