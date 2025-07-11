import { CameraMouseService } from './camera-mouse-service.js';

class CameraMouseComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.cameraMouseService = new CameraMouseService();
        this.isTracking = false;
        this.isCalibrating = false;
        this.trackingQuality = 0;
        this.lastFrameTime = 0;
        this.frameRate = 0;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.initializeService();
    }

    disconnectedCallback() {
        this.stopTracking();
        this.cameraMouseService?.cleanup();
    }

    async initializeService() {
        try {
            await this.cameraMouseService.initialize();
            this.updateStatus('Ready');
            this.announceToScreenReader('Camera mouse controller is ready');
        } catch (error) {
            console.error('Failed to initialize camera mouse service:', error);
            this.updateStatus(`Initialization failed: ${error.message}`);
            this.announceToScreenReader(`Failed to initialize: ${error.message}`);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    max-width: 800px;
                    margin: 0 auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #ffffff;
                    border-radius: 12px;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }

                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }

                .header h1 {
                    margin: 0 0 8px 0;
                    font-size: 24px;
                    font-weight: 600;
                }

                .status {
                    font-size: 14px;
                    opacity: 0.9;
                }

                .content {
                    padding: 20px;
                    display: grid;
                    grid-template-columns: 1fr 300px;
                    gap: 20px;
                }

                .video-section {
                    position: relative;
                }

                .video-container {
                    position: relative;
                    width: 100%;
                    height: 300px;
                    background: #f5f5f5;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 2px dashed #ddd;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .video-stream {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 6px;
                    transform: scaleX(-1);
                }

                /* Screen reader only content */
                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }

                /* Focus indicators */
                .button:focus,
                .slider:focus {
                    outline: 2px solid #667eea;
                    outline-offset: 2px;
                }

                /* High contrast mode support */
                @media (prefers-contrast: high) {
                    .button.primary {
                        background: #000;
                        border: 2px solid #fff;
                    }
                    
                    .video-container {
                        border-color: #000;
                    }
                }

                .video-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }

                .placeholder {
                    color: #999;
                    font-size: 16px;
                    text-align: center;
                }

                .controls {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .control-group {
                    background: #f8f9fa;
                    padding: 16px;
                    border-radius: 8px;
                }

                .control-group h3 {
                    margin: 0 0 12px 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #333;
                }

                .button {
                    width: 100%;
                    padding: 12px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-bottom: 8px;
                }

                .button:last-child {
                    margin-bottom: 0;
                }

                .button.primary {
                    background: #667eea;
                    color: white;
                }

                .button.primary:hover {
                    background: #5a6fd8;
                }

                .button.primary:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }

                .button.secondary {
                    background: #e9ecef;
                    color: #495057;
                }

                .button.secondary:hover {
                    background: #dee2e6;
                }

                .button.danger {
                    background: #dc3545;
                    color: white;
                }

                .button.danger:hover {
                    background: #c82333;
                }

                .slider-group {
                    margin-bottom: 12px;
                }

                .slider-group label {
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 4px;
                    color: #555;
                }

                .slider {
                    width: 100%;
                    height: 4px;
                    border-radius: 2px;
                    background: #ddd;
                    outline: none;
                    -webkit-appearance: none;
                }

                .slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #667eea;
                    cursor: pointer;
                }

                .slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #667eea;
                    cursor: pointer;
                    border: none;
                }

                .metrics {
                    font-size: 12px;
                    color: #666;
                    margin-top: 8px;
                }

                .metric {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                }

                @media (max-width: 768px) {
                    .content {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                    
                    .video-container {
                        height: 250px;
                    }
                }
            </style>
            
            <div class="header">
                <h1>Camera Mouse Controller</h1>
                <div class="status" id="status">Initializing...</div>
            </div>
            
            <div class="content">
                <div class="video-section">
                    <div class="video-container" id="videoContainer">
                        <div class="placeholder">Camera feed will appear here</div>
                        <video class="video-stream" id="videoStream" autoplay muted playsinline style="display: none;"></video>
                        <canvas class="video-overlay" id="overlay"></canvas>
                    </div>
                </div>
                
                <div class="controls">
                    <div class="control-group">
                        <h3>Tracking Controls</h3>
                        <button class="button primary" id="startBtn" 
                                aria-describedby="startHelp">Start Tracking</button>
                        <div id="startHelp" class="sr-only">Begins camera capture and hand tracking</div>
                        
                        <button class="button danger" id="stopBtn" disabled 
                                aria-describedby="stopHelp">Stop Tracking</button>
                        <div id="stopHelp" class="sr-only">Stops tracking and releases camera</div>
                        
                        <button class="button secondary" id="calibrateBtn" 
                                aria-describedby="calibrateHelp">Calibrate</button>
                        <div id="calibrateHelp" class="sr-only">Calibrates tracking area boundaries</div>
                    </div>
                    
                    <div class="control-group">
                        <h3>Settings</h3>
                        <div class="slider-group">
                            <label for="sensitivity">Mouse Sensitivity</label>
                            <input type="range" id="sensitivity" class="slider" 
                                   min="0.1" max="3" step="0.1" value="1"
                                   aria-describedby="sensitivityHelp">
                            <div id="sensitivityHelp" class="sr-only">Controls how much mouse movement per hand movement</div>
                        </div>
                        <div class="slider-group">
                            <label for="smoothing">Smoothing</label>
                            <input type="range" id="smoothing" class="slider" 
                                   min="0" max="0.9" step="0.1" value="0.3"
                                   aria-describedby="smoothingHelp">
                            <div id="smoothingHelp" class="sr-only">Reduces jitter in mouse movement</div>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <h3>Performance</h3>
                        <div class="metrics" id="metrics">
                            <div class="metric">
                                <span>Frame Rate:</span>
                                <span id="frameRate">0 fps</span>
                            </div>
                            <div class="metric">
                                <span>Tracking Quality:</span>
                                <span id="trackingQuality">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const startBtn = this.shadowRoot.getElementById('startBtn');
        const stopBtn = this.shadowRoot.getElementById('stopBtn');
        const calibrateBtn = this.shadowRoot.getElementById('calibrateBtn');
        const sensitivitySlider = this.shadowRoot.getElementById('sensitivity');
        const smoothingSlider = this.shadowRoot.getElementById('smoothing');

        startBtn.addEventListener('click', () => this.startTracking());
        stopBtn.addEventListener('click', () => this.stopTracking());
        calibrateBtn.addEventListener('click', () => this.startCalibration());
        
        sensitivitySlider.addEventListener('input', (e) => {
            this.cameraMouseService.setSensitivity(parseFloat(e.target.value));
        });
        
        smoothingSlider.addEventListener('input', (e) => {
            this.cameraMouseService.setSmoothing(parseFloat(e.target.value));
        });

        this.cameraMouseService.addEventListener('handDetected', (event) => {
            this.handleHandDetection(event.detail);
        });

        this.cameraMouseService.addEventListener('trackingQualityChanged', (event) => {
            this.updateTrackingQuality(event.detail.quality);
        });

        // Add keyboard navigation
        this.shadowRoot.addEventListener('keydown', (event) => {
            this.handleKeyboardNavigation(event);
        });

        // Listen for service events for accessibility feedback
        this.cameraMouseService.addEventListener('cameraError', (event) => {
            this.announceToScreenReader(`Camera error: ${event.detail.userMessage}`);
        });

        this.cameraMouseService.addEventListener('initializationError', (event) => {
            this.announceToScreenReader(`Initialization error: ${event.detail.userMessage}`);
        });
    }

    async startTracking() {
        try {
            this.updateStatus('Starting camera...');
            await this.cameraMouseService.startCamera();
            
            const videoElement = this.shadowRoot.getElementById('videoStream');
            videoElement.srcObject = this.cameraMouseService.getVideoStream();
            videoElement.style.display = 'block';
            this.shadowRoot.querySelector('.placeholder').style.display = 'none';
            
            this.updateStatus('Starting hand tracking...');
            await this.cameraMouseService.startTracking();
            
            this.isTracking = true;
            this.updateControlsState();
            this.updateStatus('Tracking active');
            this.startPerformanceMonitoring();
        } catch (error) {
            this.handleError(error, 'starting tracking');
        }
    }

    async stopTracking() {
        try {
            await this.cameraMouseService.stopTracking();
            await this.cameraMouseService.stopCamera();
            
            const videoElement = this.shadowRoot.getElementById('videoStream');
            videoElement.style.display = 'none';
            this.shadowRoot.querySelector('.placeholder').style.display = 'block';
            
            this.isTracking = false;
            this.updateControlsState();
            this.updateStatus('Tracking stopped');
            this.stopPerformanceMonitoring();
            this.announceToScreenReader('Tracking stopped successfully');
        } catch (error) {
            this.handleError(error, 'stopping tracking');
        }
    }

    startCalibration() {
        if (!this.isTracking) {
            this.updateStatus('Start tracking first');
            return;
        }
        
        this.isCalibrating = true;
        this.updateStatus('Calibrating - move your hand around the tracking area');
        this.cameraMouseService.startCalibration();
        
        setTimeout(() => {
            this.isCalibrating = false;
            this.updateStatus('Calibration complete');
            this.cameraMouseService.finishCalibration();
        }, 5000);
    }

    handleHandDetection(handData) {
        const overlay = this.shadowRoot.getElementById('overlay');
        const ctx = overlay.getContext('2d');
        const videoContainer = this.shadowRoot.getElementById('videoContainer');
        
        overlay.width = videoContainer.clientWidth;
        overlay.height = videoContainer.clientHeight;
        
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        
        if (handData.landmarks && handData.landmarks.length > 0) {
            this.drawHandLandmarks(ctx, handData.landmarks, overlay.width, overlay.height);
        }
    }

    drawHandLandmarks(ctx, landmarks, width, height) {
        ctx.fillStyle = '#00ff00';
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        
        landmarks.forEach((landmark, index) => {
            // Mirror the X coordinate to match the corrected mouse movement
            const x = (1.0 - landmark.x) * width;
            const y = landmark.y * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
            
            // Highlight the index finger tip (landmark 8)
            if (index === 8) {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = '#00ff00';
            }
        });
    }

    updateControlsState() {
        const startBtn = this.shadowRoot.getElementById('startBtn');
        const stopBtn = this.shadowRoot.getElementById('stopBtn');
        const calibrateBtn = this.shadowRoot.getElementById('calibrateBtn');
        
        startBtn.disabled = this.isTracking;
        stopBtn.disabled = !this.isTracking;
        calibrateBtn.disabled = !this.isTracking;
    }

    updateStatus(message) {
        const statusElement = this.shadowRoot.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    updateTrackingQuality(quality) {
        this.trackingQuality = quality;
        const qualityElement = this.shadowRoot.getElementById('trackingQuality');
        if (qualityElement) {
            qualityElement.textContent = `${Math.round(quality * 100)}%`;
        }
    }

    startPerformanceMonitoring() {
        this.performanceInterval = setInterval(() => {
            const now = performance.now();
            if (this.lastFrameTime > 0) {
                this.frameRate = 1000 / (now - this.lastFrameTime);
                const frameRateElement = this.shadowRoot.getElementById('frameRate');
                if (frameRateElement) {
                    frameRateElement.textContent = `${Math.round(this.frameRate)} fps`;
                }
            }
            this.lastFrameTime = now;
        }, 1000);
    }

    stopPerformanceMonitoring() {
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = null;
        }
    }

    handleKeyboardNavigation(event) {
        switch (event.key) {
            case 'Enter':
            case ' ':
                if (event.target.tagName === 'BUTTON') {
                    event.preventDefault();
                    event.target.click();
                }
                break;
            case 'Escape':
                if (this.isTracking) {
                    this.stopTracking();
                    this.announceToScreenReader('Tracking stopped');
                }
                break;
            case 's':
            case 'S':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (!this.isTracking) {
                        this.startTracking();
                    } else {
                        this.stopTracking();
                    }
                }
                break;
            case 'c':
            case 'C':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.startCalibration();
                }
                break;
        }
    }

    announceToScreenReader(message) {
        // Create a live region for screen reader announcements
        let liveRegion = this.shadowRoot.querySelector('[aria-live="polite"]');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            this.shadowRoot.appendChild(liveRegion);
        }
        
        // Clear and set new message
        liveRegion.textContent = '';
        setTimeout(() => {
            liveRegion.textContent = message;
        }, 100);
    }

    // Enhanced error handling with user feedback
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        let userMessage = 'An error occurred';
        if (context) {
            userMessage = `Error in ${context}`;
        }
        
        this.updateStatus(`${userMessage}: ${error.message}`);
        this.announceToScreenReader(`${userMessage}: ${error.message}`);
        
        // Show visual error indicator
        const statusElement = this.shadowRoot.getElementById('status');
        if (statusElement) {
            statusElement.style.color = '#dc3545';
            setTimeout(() => {
                statusElement.style.color = '';
            }, 5000);
        }
    }
}

customElements.define('camera-mouse', CameraMouseComponent);
export { CameraMouseComponent };