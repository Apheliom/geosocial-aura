class SoundEffects {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.muted = localStorage.getItem('sound_muted') === 'true';
        this.volume = 0.15; // Volumen agradable
        this.canvas = null;
        this.canvasCtx = null;
        this.animationFrameId = null;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // Crear Analizador de Frecuencias
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 64; // Tamaño de buffer pequeño para barras anchas
            this.analyser.connect(this.ctx.destination);
            
            if (this.canvas) {
                this.startDrawing();
            }
        } catch (e) {
            console.error("Web Audio API no está soportada en este navegador", e);
        }
    }

    setMuted(muted) {
        this.muted = muted;
        localStorage.setItem('sound_muted', muted ? 'true' : 'false');
        if (muted) {
            this.drawFlatline();
        }
    }

    toggleMuted() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    isMuted() {
        return this.muted;
    }

    playTone(freqStart, freqEnd, duration, type = 'sine', decayType = 'exponential') {
        if (this.muted) return;
        this.init();
        if (!this.ctx || !this.analyser) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, now);
        if (freqEnd && freqEnd !== freqStart) {
            if (decayType === 'exponential') {
                osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
            } else {
                osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);
            }
        }

        gain.gain.setValueAtTime(this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        // Conectar a través del Analizador para el efecto visual
        osc.connect(gain);
        gain.connect(this.analyser);

        osc.start(now);
        osc.stop(now + duration);
    }

    playClick() {
        this.playTone(800, 800, 0.05, 'sine');
    }

    playTransmit() {
        this.playTone(300, 1200, 0.25, 'sine');
    }

    playLike() {
        if (this.muted) return;
        this.init();
        this.playTone(523.25, 523.25, 0.15, 'sine');
        setTimeout(() => {
            this.playTone(783.99, 783.99, 0.25, 'sine');
        }, 60);
    }

    playComment() {
        if (this.muted) return;
        this.init();
        this.playTone(700, 500, 0.08, 'sine');
        setTimeout(() => {
            this.playTone(900, 700, 0.1, 'sine');
        }, 80);
    }

    playMessageSent() {
        this.playTone(900, 600, 0.12, 'sine');
    }

    playNotification() {
        if (this.muted) return;
        this.init();
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, freq, 0.15, 'sine');
            }, index * 90);
        });
    }

    playRadarTick(val) {
        const baseFreq = 650 - (val * 8);
        this.playTone(baseFreq, baseFreq - 80, 0.04, 'triangle');
    }

    playGlitchSound() {
        // Sonido ruidoso y parpadeante de estática electromagnética
        this.playTone(180, 80, 0.25, 'sawtooth');
    }

    playEmergencySiren() {
        if (this.muted) return;
        this.init();
        
        // Simular sirena: barrido lento de frecuencia arriba y abajo
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.35);
        osc.frequency.linearRampToValueAtTime(600, now + 0.7);
        
        gain.gain.setValueAtTime(this.volume * 1.5, now); // Un poco más fuerte
        gain.gain.setValueAtTime(this.volume * 1.5, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        
        osc.connect(gain);
        gain.connect(this.analyser);
        
        osc.start(now);
        osc.stop(now + 0.7);
    }

    // --- OSCILOSCOPIO Y DIBUJO ---
    setCanvas(canvasElement) {
        this.canvas = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');
        
        if (this.analyser) {
            this.startDrawing();
        } else {
            this.drawFlatline();
        }
    }

    startDrawing() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            this.animationFrameId = requestAnimationFrame(draw);
            
            const width = this.canvas.width;
            const height = this.canvas.height;
            this.canvasCtx.clearRect(0, 0, width, height);
            
            if (this.muted) {
                this.drawFlatline();
                return;
            }

            this.analyser.getByteFrequencyData(dataArray);
            
            // Dibujar ondas neón
            const barWidth = (width / bufferLength) * 1.8;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                // Escalar altura
                barHeight = (dataArray[i] / 255) * height * 0.95;
                
                if (barHeight < 2) barHeight = 2; // Mantener un mínimo brillo

                // Gradiente neón cian
                this.canvasCtx.fillStyle = `rgba(0, 242, 255, ${dataArray[i] / 255 + 0.25})`;
                this.canvasCtx.shadowBlur = 3;
                this.canvasCtx.shadowColor = '#00f2ff';
                
                // Dibujar barra centrada verticalmente para look de osciloscopio
                const y = (height - barHeight) / 2;
                this.canvasCtx.fillRect(x, y, barWidth - 1, barHeight);

                x += barWidth;
            }
        };

        draw();
    }

    drawFlatline() {
        if (!this.canvas || !this.canvasCtx) return;
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.canvasCtx.clearRect(0, 0, width, height);

        // Línea cian difusa en el centro
        this.canvasCtx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
        this.canvasCtx.lineWidth = 1.5;
        this.canvasCtx.shadowBlur = 0;
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(0, height / 2);
        this.canvasCtx.lineTo(width, height / 2);
        this.canvasCtx.stroke();
    }
}

// Instanciar globalmente
window.soundEffects = new SoundEffects();

// Inicializar al primer click
document.addEventListener('click', () => {
    window.soundEffects.init();
}, { once: true });
