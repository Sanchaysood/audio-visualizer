class CircularAudioVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.source = null;
        this.stream = null;
        this.animationId = null;
        this.isRunning = false;
        
        // Settings
        this.smoothingTimeConstant = 0.8;
        this.fftSize = 2048;
        this.showFrequencyLabels = true;
        
        // Visualization parameters
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;
        this.barWidth = 3;
        this.barSpacing = 1;
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Initialize canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight);
        
        this.canvas.width = size;
        this.canvas.height = size;
        
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.centerX, this.centerY) * 0.6;
        
        this.drawInitialState();
    }

    drawInitialState() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const gradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.radius
        );
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.3)');
        
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    async start() {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            
            // Configure analyser
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
            
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            // Connect microphone to analyser
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.analyser);
            
            this.isRunning = true;
            this.animate();
            
            return { success: true, stream: this.stream };
        } catch (error) {
            console.error('Error starting audio visualizer:', error);
            return { success: false, error: error.message };
        }
    }

    stop() {
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.drawInitialState();
    }

    animate(currentTime = 0) {
        if (!this.isRunning) return;

        // Calculate FPS
        if (currentTime - this.lastFpsUpdate > 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
        this.frameCount++;

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw circular visualizer
        this.drawCircularBars();
        
        // Draw center circle
        this.drawCenterCircle();

        // Draw frequency labels if enabled
        if (this.showFrequencyLabels) {
            this.drawFrequencyLabels();
        }

        // Request next frame at 60 FPS
        this.lastFrameTime = currentTime;
        this.animationId = requestAnimationFrame((time) => this.animate(time));
    }

    drawCircularBars() {
        const numBars = 180; // Number of bars in the circle
        const angleStep = (Math.PI * 2) / numBars;
        
        // Sample the frequency data at regular intervals
        const sampleStep = Math.floor(this.bufferLength / numBars);
        
        for (let i = 0; i < numBars; i++) {
            const angle = i * angleStep - Math.PI / 2; // Start from top
            const dataIndex = i * sampleStep;
            const value = this.dataArray[dataIndex];
            
            // Normalize the value (0-255 to 0-1)
            const normalizedValue = value / 255;
            
            // Calculate bar height based on frequency intensity
            const barHeight = normalizedValue * this.radius * 0.8;
            
            // Calculate positions
            const x1 = this.centerX + Math.cos(angle) * this.radius;
            const y1 = this.centerY + Math.sin(angle) * this.radius;
            const x2 = this.centerX + Math.cos(angle) * (this.radius + barHeight);
            const y2 = this.centerY + Math.sin(angle) * (this.radius + barHeight);
            
            // Color based on frequency (lower = red, mid = green, high = blue)
            const hue = (i / numBars) * 360;
            const saturation = 70 + normalizedValue * 30;
            const lightness = 40 + normalizedValue * 30;
            
            this.ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            this.ctx.lineWidth = this.barWidth;
            this.ctx.lineCap = 'round';
            
            // Add glow effect for higher values
            if (normalizedValue > 0.5) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = this.ctx.strokeStyle;
            } else {
                this.ctx.shadowBlur = 0;
            }
            
            // Draw the bar
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
        
        // Reset shadow
        this.ctx.shadowBlur = 0;
    }

    drawCenterCircle() {
        // Draw outer ring
        this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Draw inner circle with pulse effect based on average volume
        const average = this.getAverageVolume();
        const pulseRadius = 30 + (average / 255) * 20;
        
        const gradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, pulseRadius
        );
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, pulseRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawFrequencyLabels() {
        const labels = [
            { freq: 'Bass', angle: -90 },
            { freq: 'Mid', angle: 0 },
            { freq: 'High', angle: 90 },
            { freq: 'Treble', angle: 180 }
        ];
        
        this.ctx.font = '12px sans-serif';
        this.ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        labels.forEach(({ freq, angle }) => {
            const rad = (angle * Math.PI) / 180 - Math.PI / 2;
            const x = this.centerX + Math.cos(rad) * (this.radius + 50);
            const y = this.centerY + Math.sin(rad) * (this.radius + 50);
            
            this.ctx.fillText(freq, x, y);
        });
    }

    getAverageVolume() {
        if (!this.dataArray) return 0;
        
        const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
        return sum / this.dataArray.length;
    }

    getVolumeLevel() {
        const average = this.getAverageVolume();
        return Math.round(average);
    }

    updateSettings(settings) {
        if (settings.smoothingTimeConstant !== undefined) {
            this.smoothingTimeConstant = settings.smoothingTimeConstant;
            if (this.analyser) {
                this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
            }
        }
        
        if (settings.fftSize !== undefined) {
            this.fftSize = settings.fftSize;
            if (this.analyser) {
                this.analyser.fftSize = this.fftSize;
                this.bufferLength = this.analyser.frequencyBinCount;
                this.dataArray = new Uint8Array(this.bufferLength);
            }
        }
        
        if (settings.showFrequencyLabels !== undefined) {
            this.showFrequencyLabels = settings.showFrequencyLabels;
        }
    }

    getFrequencyData() {
        return this.dataArray;
    }

    getAnalyserNode() {
        return this.analyser;
    }

    getAudioContext() {
        return this.audioContext;
    }

    getFPS() {
        return this.fps;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CircularAudioVisualizer;
}
