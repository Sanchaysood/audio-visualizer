class TranscriptionService {
    constructor() {
        this.recognition = null;
        this.isConnected = false;
        this.isTranscribing = false;
        
        // Callbacks
        this.onTranscription = null;
        this.onConnectionChange = null;
        this.onError = null;
        
        // Performance tracking
        this.startTime = 0;
        this.latencySum = 0;
        this.latencyCount = 0;
        
        // Initialize Web Speech API
        this.initializeSpeechRecognition();
    }
    
    initializeSpeechRecognition() {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('Web Speech API not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        
        // Setup event handlers
        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.isConnected = true;
            this.isTranscribing = true;
            this.startTime = Date.now();
            if (this.onConnectionChange) {
                this.onConnectionChange('connected');
            }
        };
        
        this.recognition.onresult = (event) => {
            const latency = Date.now() - this.startTime;
            this.latencySum += latency;
            this.latencyCount++;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript;
                const isFinal = result.isFinal;
                const confidence = result[0].confidence;
                
                if (this.onTranscription) {
                    this.onTranscription({
                        text: text,
                        isFinal: isFinal,
                        confidence: confidence || 0.9,
                        latency: latency
                    });
                }
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (this.onError) {
                this.onError(event.error);
            }
            
            // Auto-restart on some errors
            if (event.error === 'no-speech' || event.error === 'audio-capture') {
                setTimeout(() => {
                    if (this.isTranscribing) {
                        try {
                            this.recognition.start();
                        } catch (e) {
                            console.log('Could not restart:', e);
                        }
                    }
                }, 1000);
            }
        };
        
        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            // Auto-restart if still transcribing
            if (this.isTranscribing) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.log('Could not restart:', e);
                }
            } else {
                this.isConnected = false;
                if (this.onConnectionChange) {
                    this.onConnectionChange('disconnected');
                }
            }
        };
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                if (!this.recognition) {
                    reject(new Error('Web Speech API not supported'));
                    return;
                }
                
                // Speech recognition will connect on start
                resolve();
                
            } catch (error) {
                console.error('Connection error:', error);
                reject(error);
            }
        });
    }

    disconnect() {
        this.stopTranscription();
        this.isConnected = false;
        console.log('Disconnected from transcription service');
    }

    async startTranscription(stream) {
        try {
            if (!this.recognition) {
                throw new Error('Web Speech API not supported');
            }
            
            this.isTranscribing = true;
            this.recognition.start();
            
            console.log('Transcription started');
            return true;
            
        } catch (error) {
            console.error('Error starting transcription:', error);
            throw error;
        }
    }

    stopTranscription() {
        this.isTranscribing = false;
        
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.log('Recognition already stopped');
            }
        }
        
        console.log('Transcription stopped');
    }

    getAverageLatency() {
        if (this.latencyCount === 0) return 0;
        return Math.round(this.latencySum / this.latencyCount);
    }

    resetLatency() {
        this.latencySum = 0;
        this.latencyCount = 0;
    }
    
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
}
