let visualizer = null;
let transcriptionService = null;
let isRunning = false;
let transcriptionEnabled = false;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const toggleTranscriptionBtn = document.getElementById('toggleTranscription');
const volumeLevel = document.getElementById('volumeLevel');
const statusText = document.getElementById('statusText');
const smoothingSlider = document.getElementById('smoothing');
const smoothingValue = document.getElementById('smoothingValue');
const fftSizeSelect = document.getElementById('fftSize');
const fftSizeValue = document.getElementById('fftSizeValue');
const showFreqLabelsCheckbox = document.getElementById('showFreqLabels');
const transcriptionOutput = document.getElementById('transcriptionOutput');
const connectionStatus = document.getElementById('connectionStatus');
const latencyInfo = document.getElementById('latencyInfo');

// Initialize
function init() {
    visualizer = new CircularAudioVisualizer('visualizer');
    transcriptionService = new TranscriptionService();
    
    setupEventListeners();
    updateStatus('Ready');
    updateConnectionStatus('disconnected');
}

// Setup event listeners
function setupEventListeners() {
    // Control buttons
    startBtn.addEventListener('click', handleStart);
    stopBtn.addEventListener('click', handleStop);
    toggleTranscriptionBtn.addEventListener('click', handleToggleTranscription);
    
    // Settings
    smoothingSlider.addEventListener('input', handleSmoothingChange);
    fftSizeSelect.addEventListener('change', handleFFTSizeChange);
    showFreqLabelsCheckbox.addEventListener('change', handleFreqLabelsChange);
    
    // Transcription service callbacks
    transcriptionService.onTranscription = handleTranscriptionResult;
    transcriptionService.onConnectionChange = updateConnectionStatus;
    transcriptionService.onError = handleTranscriptionError;
    
    // Update volume display periodically
    setInterval(updateVolumeDisplay, 100);
    setInterval(updateLatencyDisplay, 1000);
}

// Handle start button
async function handleStart() {
    try {
        startBtn.disabled = true;
        updateStatus('Starting...');
        
        const result = await visualizer.start();
        
        if (result.success) {
            isRunning = true;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            toggleTranscriptionBtn.disabled = false;
            updateStatus('Listening');
            
            // Show success notification
            showNotification('Microphone access granted!', 'success');
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error starting:', error);
        updateStatus('Error');
        showNotification('Failed to access microphone: ' + error.message, 'error');
        startBtn.disabled = false;
    }
}

// Handle stop button
function handleStop() {
    if (transcriptionEnabled) {
        handleToggleTranscription();
    }
    
    visualizer.stop();
    isRunning = false;
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    toggleTranscriptionBtn.disabled = true;
    
    updateStatus('Stopped');
    volumeLevel.textContent = '0';
    showNotification('Audio visualizer stopped', 'info');
}

// Handle transcription toggle
async function handleToggleTranscription() {
    if (!transcriptionEnabled) {
        try {
            toggleTranscriptionBtn.disabled = true;
            updateConnectionStatus('connecting');
            
            // Connect to server
            await transcriptionService.connect();
            
            // Get audio stream from visualizer
            const stream = visualizer.stream;
            if (!stream) {
                throw new Error('No audio stream available');
            }
            
            // Start transcription
            const started = await transcriptionService.startTranscription(stream);
            
            if (started) {
                transcriptionEnabled = true;
                toggleTranscriptionBtn.innerHTML = '<span class="icon">⏸️</span> Disable Transcription';
                toggleTranscriptionBtn.classList.remove('btn-accent');
                toggleTranscriptionBtn.classList.add('btn-secondary');
                transcriptionOutput.textContent = 'Listening for speech...';
                showNotification('Transcription enabled', 'success');
            } else {
                throw new Error('Failed to start transcription');
            }
            
        } catch (error) {
            console.error('Error enabling transcription:', error);
            showNotification('Failed to connect to transcription service: ' + error.message, 'error');
            updateConnectionStatus('disconnected');
        } finally {
            toggleTranscriptionBtn.disabled = false;
        }
    } else {
        // Disable transcription
        transcriptionService.disconnect();
        transcriptionEnabled = false;
        toggleTranscriptionBtn.innerHTML = '<span class="icon">📝</span> Enable Transcription';
        toggleTranscriptionBtn.classList.add('btn-accent');
        toggleTranscriptionBtn.classList.remove('btn-secondary');
        transcriptionOutput.textContent = 'Transcription disabled';
        showNotification('Transcription disabled', 'info');
    }
}

// Handle transcription results
function handleTranscriptionResult(result) {
    const { text, isFinal, confidence, latency } = result;
    
    if (text && text.trim()) {
        if (isFinal) {
            // Final transcription - remove any partial text and append final result
            let currentText = transcriptionOutput.textContent;
            
            // Remove the [Partial] line if it exists
            const lines = currentText.split('\n').filter(line => !line.startsWith('[Partial]'));
            currentText = lines.join('\n').trim();
            
            if (currentText === 'Listening for speech...' || currentText === 'Transcription disabled' || currentText === '') {
                transcriptionOutput.textContent = text;
            } else {
                transcriptionOutput.textContent = currentText + ' ' + text;
            }
            transcriptionOutput.classList.remove('partial');
        } else {
            // Partial transcription - show as temporary
            let currentText = transcriptionOutput.textContent;
            const lines = currentText.split('\n').filter(line => !line.startsWith('[Partial]'));
            const baseText = lines.join('\n').trim();
            
            if (baseText === 'Listening for speech...' || baseText === 'Transcription disabled') {
                transcriptionOutput.textContent = `[Partial] ${text}`;
            } else {
                transcriptionOutput.textContent = baseText + '\n' + `[Partial] ${text}`;
            }
            transcriptionOutput.classList.add('partial');
        }
        
        // Auto-scroll to bottom
        transcriptionOutput.parentElement.scrollTop = transcriptionOutput.parentElement.scrollHeight;
    }
}

// Handle transcription errors
function handleTranscriptionError(error) {
    showNotification('Transcription error: ' + error, 'error');
}

// Handle smoothing change
function handleSmoothingChange(e) {
    const value = parseFloat(e.target.value);
    smoothingValue.textContent = value.toFixed(1);
    visualizer.updateSettings({ smoothingTimeConstant: value });
}

// Handle FFT size change
function handleFFTSizeChange(e) {
    const value = parseInt(e.target.value);
    fftSizeValue.textContent = value;
    visualizer.updateSettings({ fftSize: value });
}

// Handle frequency labels toggle
function handleFreqLabelsChange(e) {
    visualizer.updateSettings({ showFrequencyLabels: e.target.checked });
}

// Update volume display
function updateVolumeDisplay() {
    if (isRunning && visualizer) {
        const volume = visualizer.getVolumeLevel();
        volumeLevel.textContent = volume;
        
        // Add pulse animation for high volume
        if (volume > 150) {
            volumeLevel.style.transform = 'scale(1.1)';
        } else {
            volumeLevel.style.transform = 'scale(1)';
        }
    }
}

// Update latency display
function updateLatencyDisplay() {
    if (transcriptionEnabled && transcriptionService) {
        const avgLatency = transcriptionService.getAverageLatency();
        if (avgLatency > 0) {
            latencyInfo.textContent = `Latency: ${avgLatency}ms`;
        }
    } else {
        latencyInfo.textContent = 'Latency: --';
    }
}

// Update status text
function updateStatus(status) {
    statusText.textContent = status;
}

// Update connection status
function updateConnectionStatus(status) {
    connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    connectionStatus.className = status;
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // You can implement a toast notification system here
    // For now, we'll just log to console
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (isRunning) {
        visualizer.stop();
    }
    if (transcriptionEnabled) {
        transcriptionService.disconnect();
    }
});
