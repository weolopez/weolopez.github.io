import { CameraMouseService } from './camera-mouse-service.js';

class CameraMouseComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.cameraMouseService = new CameraMouseService(
            {
  "sensitivity": 2.1,
  "smoothing": 0.6,
  "cursorOffset": {
    "x": 0.05,
    "y": -0.08
  },
  "desktopMappingArea": {
    "enabled": true,
    "x": 0.25,
    "y": 0.25,
    "width": 0.75,
    "height": 0.75
  },
  "gestureSettings": {
    "confidenceThreshold": 0.7,
    "deadZoneRadius": 0.02,
    "doubleClickInterval": 300,
    "scrollSensitivity": 50,
    "gestureHoldTime": 150
  }
}
        );
        this.isTracking = false;
        this.isCalibrating = false;
        this.trackingQuality = 0;
        this.lastFrameTime = 0;
        this.frameRate = 0;
        this.lastHandLandmarks = null;
        
        // Desktop integration
        this.isDesktopEnvironment = false;
        this.desktopMouseService = null;
        this.desktopComponent = null;
    }

    connectedCallback() {
        this.detectDesktopEnvironment();
        this.render();
        this.setupEventListeners();
        this.initializeService();
    }

    disconnectedCallback() {
        this.stopTracking();
        this.cameraMouseService?.cleanup();
        
        // Clean up desktop integration
        if (this.desktopMouseService) {
            this.desktopMouseService.unregisterCameraController?.();
            this.desktopMouseService.cleanup?.();
            
            // Remove reference from desktop component
            if (this.desktopComponent) {
                this.desktopComponent.desktopMouseService = null;
            }
        }
    }

    async initializeService() {
        try {
            await this.cameraMouseService.initialize();
            
            // Auto-integrate with desktop if detected
            if (this.isDesktopEnvironment) {
                await this.integrateWithDesktop();
            }
            
            this.updateStatus('Ready');
            this.loadSettingsToUI();
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

                .gesture-display {
                    background: #f8f9fa;
                    border-radius: 6px;
                    padding: 12px;
                }

                .gesture-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .gesture-name {
                    font-weight: 600;
                    font-size: 16px;
                    color: #495057;
                }

                .gesture-confidence {
                    font-size: 14px;
                    color: #6c757d;
                }

                .gesture-indicators {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                }

                .indicator {
                    padding: 6px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    text-align: center;
                    background: #e9ecef;
                    color: #6c757d;
                    transition: all 0.2s ease;
                }

                .indicator.active {
                    background: #667eea;
                    color: white;
                    transform: scale(1.05);
                }

                .indicator.active.left-click {
                    background: #28a745;
                }

                .indicator.active.right-click {
                    background: #ffc107;
                    color: #333;
                }

                .indicator.active.scroll {
                    background: #17a2b8;
                }

                .indicator.active.drag {
                    background: #dc3545;
                }

                .desktop-status {
                    margin-top: 8px;
                    padding: 8px;
                    border-radius: 4px;
                    background: #e9ecef;
                    font-size: 12px;
                    text-align: center;
                    transition: all 0.3s ease;
                }

                .desktop-status.enabled {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }

                .desktop-status.disabled {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }

                .settings-info {
                    margin-top: 8px;
                    padding: 8px;
                    background: #f0f8ff;
                    border-radius: 4px;
                    border-left: 3px solid #667eea;
                }

                .settings-info small {
                    color: #495057;
                    font-size: 11px;
                    line-height: 1.3;
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
                        <h3>Desktop Control</h3>
                        <button class="button secondary" id="desktopModeBtn" 
                                aria-describedby="desktopHelp">Enable Desktop Mode</button>
                        <div id="desktopHelp" class="sr-only">Control desktop cursor with gestures</div>
                        <div class="desktop-status" id="desktopStatus">Desktop mode: Disabled</div>
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
                        <h3>Cursor Position</h3>
                        <div class="slider-group">
                            <label for="offsetX">Horizontal Offset: <span id="offsetXValue">+5%</span></label>
                            <input type="range" id="offsetX" class="slider" 
                                   min="-20" max="20" step="1" value="5"
                                   aria-describedby="offsetXHelp">
                            <div id="offsetXHelp" class="sr-only">Adjusts cursor position left/right relative to hand</div>
                        </div>
                        <div class="slider-group">
                            <label for="offsetY">Vertical Offset: <span id="offsetYValue">+8%</span></label>
                            <input type="range" id="offsetY" class="slider" 
                                   min="-20" max="20" step="1" value="8"
                                   aria-describedby="offsetYHelp">
                            <div id="offsetYHelp" class="sr-only">Adjusts cursor position up/down relative to hand</div>
                        </div>
                        <div class="slider-group">
                            <button class="button secondary" id="resetOffsetsBtn">Reset to Default</button>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <h3>Desktop Mapping Area</h3>
                        <div class="slider-group">
                            <label for="mappingEnabled">
                                <input type="checkbox" id="mappingEnabled" checked> Use Mapping Area
                            </label>
                        </div>
                        <div class="slider-group">
                            <label for="mappingSize">Size: <span id="mappingSizeValue">50%</span></label>
                            <input type="range" id="mappingSize" class="slider" 
                                   min="20" max="90" step="5" value="50"
                                   aria-describedby="mappingSizeHelp">
                            <div id="mappingSizeHelp" class="sr-only">Controls size of the desktop mapping area</div>
                        </div>
                        <div class="slider-group">
                            <label for="mappingX">Horizontal Position: <span id="mappingXValue">25%</span></label>
                            <input type="range" id="mappingX" class="slider" 
                                   min="0" max="50" step="5" value="25"
                                   aria-describedby="mappingXHelp">
                            <div id="mappingXHelp" class="sr-only">Moves mapping area left/right</div>
                        </div>
                        <div class="slider-group">
                            <label for="mappingY">Vertical Position: <span id="mappingYValue">25%</span></label>
                            <input type="range" id="mappingY" class="slider" 
                                   min="0" max="50" step="5" value="25"
                                   aria-describedby="mappingYHelp">
                            <div id="mappingYHelp" class="sr-only">Moves mapping area up/down</div>
                        </div>
                        <div class="slider-group">
                            <button class="button secondary" id="resetMappingBtn">Reset Mapping Area</button>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <h3>Settings Management</h3>
                        <div class="slider-group">
                            <button class="button primary" id="saveSettingsBtn">💾 Save Settings</button>
                        </div>
                        <div class="slider-group">
                            <button class="button secondary" id="exportSettingsBtn">📋 Copy Settings</button>
                        </div>
                        <div class="slider-group">
                            <button class="button danger" id="resetAllBtn">🔄 Reset All to Default</button>
                        </div>
                        <div class="settings-info">
                            <small>Settings auto-save when changed. Use Copy Settings to get code for permanent defaults.</small>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <h3>Current Gesture</h3>
                        <div class="gesture-display" id="gestureDisplay">
                            <div class="gesture-info">
                                <span class="gesture-name" id="gestureName">None</span>
                                <span class="gesture-confidence" id="gestureConfidence">0%</span>
                            </div>
                            <div class="gesture-indicators">
                                <div class="indicator" id="leftClickIndicator">Left Click</div>
                                <div class="indicator" id="rightClickIndicator">Right Click</div>
                                <div class="indicator" id="scrollIndicator">Scroll</div>
                                <div class="indicator" id="dragIndicator">Drag</div>
                            </div>
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
        const desktopModeBtn = this.shadowRoot.getElementById('desktopModeBtn');
        const sensitivitySlider = this.shadowRoot.getElementById('sensitivity');
        const smoothingSlider = this.shadowRoot.getElementById('smoothing');
        const offsetXSlider = this.shadowRoot.getElementById('offsetX');
        const offsetYSlider = this.shadowRoot.getElementById('offsetY');
        const resetOffsetsBtn = this.shadowRoot.getElementById('resetOffsetsBtn');
        const mappingEnabledCheckbox = this.shadowRoot.getElementById('mappingEnabled');
        const mappingSizeSlider = this.shadowRoot.getElementById('mappingSize');
        const mappingXSlider = this.shadowRoot.getElementById('mappingX');
        const mappingYSlider = this.shadowRoot.getElementById('mappingY');
        const resetMappingBtn = this.shadowRoot.getElementById('resetMappingBtn');
        const saveSettingsBtn = this.shadowRoot.getElementById('saveSettingsBtn');
        const exportSettingsBtn = this.shadowRoot.getElementById('exportSettingsBtn');
        const resetAllBtn = this.shadowRoot.getElementById('resetAllBtn');

        startBtn.addEventListener('click', () => this.startTracking());
        stopBtn.addEventListener('click', () => this.stopTracking());
        calibrateBtn.addEventListener('click', () => this.startCalibration());
        desktopModeBtn.addEventListener('click', () => this.toggleDesktopMode());
        
        sensitivitySlider.addEventListener('input', (e) => {
            this.cameraMouseService.setSensitivity(parseFloat(e.target.value));
        });
        
        smoothingSlider.addEventListener('input', (e) => {
            this.cameraMouseService.setSmoothing(parseFloat(e.target.value));
        });
        
        offsetXSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const offsetX = value / 100; // Convert percentage to decimal
            const currentOffset = this.cameraMouseService.getCursorOffset();
            this.cameraMouseService.setCursorOffset(offsetX, currentOffset.y);
            this.updateOffsetDisplay();
        });
        
        offsetYSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const offsetY = value / 100; // Convert percentage to decimal
            const currentOffset = this.cameraMouseService.getCursorOffset();
            this.cameraMouseService.setCursorOffset(currentOffset.x, offsetY);
            this.updateOffsetDisplay();
        });
        
        resetOffsetsBtn.addEventListener('click', () => {
            this.resetCursorOffsets();
        });
        
        mappingEnabledCheckbox.addEventListener('change', (e) => {
            this.cameraMouseService.setDesktopMappingEnabled(e.target.checked);
            this.announceToScreenReader(`Desktop mapping ${e.target.checked ? 'enabled' : 'disabled'}`);
        });
        
        mappingSizeSlider.addEventListener('input', (e) => {
            this.updateMappingArea();
            this.updateMappingDisplay();
        });
        
        mappingXSlider.addEventListener('input', (e) => {
            this.updateMappingArea();
            this.updateMappingDisplay();
        });
        
        mappingYSlider.addEventListener('input', (e) => {
            this.updateMappingArea();
            this.updateMappingDisplay();
        });
        
        resetMappingBtn.addEventListener('click', () => {
            this.resetMappingArea();
        });
        
        saveSettingsBtn.addEventListener('click', () => {
            this.cameraMouseService.saveSettings();
            this.showTemporaryMessage('Settings saved to browser storage! 💾');
        });
        
        exportSettingsBtn.addEventListener('click', () => {
            const settings = this.cameraMouseService.exportSettings();
            this.copyToClipboard(settings);
            this.showTemporaryMessage('Settings copied to clipboard! 📋');
        });
        
        resetAllBtn.addEventListener('click', () => {
            if (confirm('Reset all settings to default values? This cannot be undone.')) {
                this.cameraMouseService.resetAllSettings();
                this.loadSettingsToUI();
                this.showTemporaryMessage('All settings reset to defaults! 🔄');
            }
        });

        this.cameraMouseService.addEventListener('handDetected', (event) => {
            this.handleHandDetection(event.detail);
        });

        this.cameraMouseService.addEventListener('trackingQualityChanged', (event) => {
            this.updateTrackingQuality(event.detail.quality);
        });

        this.cameraMouseService.addEventListener('gestureDetected', (event) => {
            this.updateGestureDisplay(event.detail);
        });

        this.cameraMouseService.addEventListener('rightClick', (event) => {
            this.logEvent(`Right click at (${Math.round(event.detail.x)}, ${Math.round(event.detail.y)})`);
        });

        this.cameraMouseService.addEventListener('doubleClick', (event) => {
            this.logEvent(`Double click at (${Math.round(event.detail.x)}, ${Math.round(event.detail.y)})`);
        });

        this.cameraMouseService.addEventListener('scroll', (event) => {
            this.logEvent(`Scroll: deltaY=${Math.round(event.detail.deltaY)}`);
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
            this.lastHandLandmarks = handData.landmarks;
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
        });
        
        // Highlight the palm center (base tracking position)
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        const palmCenterX = (1.0 - ((wrist.x + middleMCP.x) / 2)) * width;
        const palmCenterY = ((wrist.y + middleMCP.y) / 2) * height;
        
        // Draw palm center as blue circle
        ctx.fillStyle = '#0080ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(palmCenterX, palmCenterY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Calculate and show adjusted cursor position in red
        const cursorOffset = this.cameraMouseService.getCursorOffset();
        const adjustedX = (1.0 - ((wrist.x + middleMCP.x) / 2 + cursorOffset.x)) * width;
        const adjustedY = ((wrist.y + middleMCP.y) / 2 + cursorOffset.y) * height;
        
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Add a crosshair for the cursor position
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(adjustedX - 12, adjustedY);
        ctx.lineTo(adjustedX + 12, adjustedY);
        ctx.moveTo(adjustedX, adjustedY - 12);
        ctx.lineTo(adjustedX, adjustedY + 12);
        ctx.stroke();
        
        // Draw a line connecting palm center to cursor position
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(palmCenterX, palmCenterY);
        ctx.lineTo(adjustedX, adjustedY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw desktop mapping area
        this.drawDesktopMappingArea(ctx, width, height);
    }

    drawDesktopMappingArea(ctx, width, height) {
        if (!this.cameraMouseService) return;
        
        const mappingArea = this.cameraMouseService.getDesktopMappingArea();
        if (!mappingArea.enabled) return;
        
        // Calculate rectangle coordinates (mirror X for display)
        const rectLeft = (1.0 - mappingArea.right) * width;
        const rectRight = (1.0 - mappingArea.x) * width;
        const rectTop = mappingArea.y * height;
        const rectBottom = mappingArea.bottom * height;
        const rectWidth = rectRight - rectLeft;
        const rectHeight = rectBottom - rectTop;
        
        // Draw outer frame (desktop mapping area)
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.rect(rectLeft, rectTop, rectWidth, rectHeight);
        ctx.stroke();
        
        // Draw semi-transparent fill
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fill();
        
        // Draw corner handles for resizing
        const handleSize = 8;
        ctx.fillStyle = '#00ff00';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Corner handles
        const corners = [
            [rectLeft, rectTop],                              // Top-left
            [rectRight, rectTop],                             // Top-right
            [rectLeft, rectBottom],                           // Bottom-left
            [rectRight, rectBottom]                           // Bottom-right
        ];
        
        corners.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.rect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
            ctx.fill();
            ctx.stroke();
        });
        
        // Draw label
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Desktop Area', rectLeft + rectWidth/2, rectTop - 10);
        
        // Draw instructions if cursor is outside
        const cursorOffset = this.cameraMouseService.getCursorOffset();
        const wrist = this.lastHandLandmarks?.[0];
        const middleMCP = this.lastHandLandmarks?.[9];
        
        if (wrist && middleMCP) {
            const palmCenter = {
                x: (wrist.x + middleMCP.x) / 2,
                y: (wrist.y + middleMCP.y) / 2
            };
            const adjustedCenter = {
                x: palmCenter.x + cursorOffset.x,
                y: palmCenter.y + cursorOffset.y
            };
            
            const isOutside = adjustedCenter.x < mappingArea.x || 
                             adjustedCenter.x > mappingArea.right ||
                             adjustedCenter.y < mappingArea.y || 
                             adjustedCenter.y > mappingArea.bottom;
            
            if (isOutside) {
                ctx.fillStyle = '#ff6600';
                ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Move hand into green area to control desktop', width/2, height - 20);
            }
        }
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

    updateGestureDisplay(gestureData) {
        const gestureName = this.shadowRoot.getElementById('gestureName');
        const gestureConfidence = this.shadowRoot.getElementById('gestureConfidence');
        const leftClickIndicator = this.shadowRoot.getElementById('leftClickIndicator');
        const rightClickIndicator = this.shadowRoot.getElementById('rightClickIndicator');
        const scrollIndicator = this.shadowRoot.getElementById('scrollIndicator');
        const dragIndicator = this.shadowRoot.getElementById('dragIndicator');

        if (gestureName) {
            gestureName.textContent = this.formatGestureName(gestureData.gesture);
        }

        if (gestureConfidence) {
            gestureConfidence.textContent = `${Math.round(gestureData.confidence * 100)}%`;
        }

        // Reset all indicators
        [leftClickIndicator, rightClickIndicator, scrollIndicator, dragIndicator].forEach(indicator => {
            if (indicator) {
                indicator.className = 'indicator';
            }
        });

        // Activate current gesture indicators
        if (gestureData.state.isClicking && leftClickIndicator) {
            leftClickIndicator.className = 'indicator active left-click';
        }

        if (gestureData.state.isRightClicking && rightClickIndicator) {
            rightClickIndicator.className = 'indicator active right-click';
        }

        if (gestureData.state.isScrolling && scrollIndicator) {
            scrollIndicator.className = 'indicator active scroll';
        }

        if (gestureData.state.isDragging && dragIndicator) {
            dragIndicator.className = 'indicator active drag';
        }
    }

    formatGestureName(gesture) {
        const gestureNames = {
            'leftClick': 'Peace Sign ✌️',
            'rightClick': 'Three Fingers 🖖',
            'scroll': 'Fist Scroll 👊',
            'point': 'Pointing 👆',
            'open': 'Open Hand 🖐️',
            'none': 'None'
        };
        return gestureNames[gesture] || gesture;
    }

    logEvent(message) {
        // Dispatch event for external logging (like in the demo page)
        this.dispatchEvent(new CustomEvent('gestureLog', {
            detail: { message },
            bubbles: true,
            composed: true
        }));
    }

    toggleDesktopMode() {
        if (this.cameraMouseService.isDesktopModeEnabled()) {
            this.cameraMouseService.disableDesktopMode();
            this.updateDesktopStatus(false);
            this.announceToScreenReader('Desktop mode disabled');
        } else {
            this.cameraMouseService.enableDesktopMode();
            this.updateDesktopStatus(true);
            this.announceToScreenReader('Desktop mode enabled - you can now control the desktop cursor');
        }
    }

    updateDesktopStatus(enabled) {
        const desktopModeBtn = this.shadowRoot.getElementById('desktopModeBtn');
        const desktopStatus = this.shadowRoot.getElementById('desktopStatus');

        if (enabled) {
            desktopModeBtn.textContent = 'Disable Desktop Mode';
            desktopModeBtn.className = 'button danger';
            desktopStatus.textContent = 'Desktop mode: Enabled 🖱️';
            desktopStatus.className = 'desktop-status enabled';
        } else {
            desktopModeBtn.textContent = 'Enable Desktop Mode';
            desktopModeBtn.className = 'button secondary';
            desktopStatus.textContent = 'Desktop mode: Disabled';
            desktopStatus.className = 'desktop-status disabled';
        }
    }

    updateOffsetDisplay() {
        const offsetXValue = this.shadowRoot.getElementById('offsetXValue');
        const offsetYValue = this.shadowRoot.getElementById('offsetYValue');
        const offsetXSlider = this.shadowRoot.getElementById('offsetX');
        const offsetYSlider = this.shadowRoot.getElementById('offsetY');

        if (offsetXValue && offsetXSlider) {
            const xValue = parseInt(offsetXSlider.value);
            offsetXValue.textContent = `${xValue > 0 ? '+' : ''}${xValue}%`;
        }

        if (offsetYValue && offsetYSlider) {
            const yValue = parseInt(offsetYSlider.value);
            offsetYValue.textContent = `${yValue > 0 ? '+' : ''}${yValue}%`;
        }
    }

    resetCursorOffsets() {
        const offsetXSlider = this.shadowRoot.getElementById('offsetX');
        const offsetYSlider = this.shadowRoot.getElementById('offsetY');

        if (offsetXSlider && offsetYSlider) {
            offsetXSlider.value = '5';  // Default: +5% right
            offsetYSlider.value = '8';  // Default: +8% down
            this.cameraMouseService.setCursorOffset(0.05, 0.08);
            this.updateOffsetDisplay();
            this.announceToScreenReader('Cursor offsets reset to default');
        }
    }

    updateMappingArea() {
        const mappingSizeSlider = this.shadowRoot.getElementById('mappingSize');
        const mappingXSlider = this.shadowRoot.getElementById('mappingX');
        const mappingYSlider = this.shadowRoot.getElementById('mappingY');

        if (mappingSizeSlider && mappingXSlider && mappingYSlider) {
            const size = parseInt(mappingSizeSlider.value) / 100;
            const x = parseInt(mappingXSlider.value) / 100;
            const y = parseInt(mappingYSlider.value) / 100;
            
            this.cameraMouseService.setDesktopMappingArea(x, y, size, size);
        }
    }

    updateMappingDisplay() {
        const mappingSizeValue = this.shadowRoot.getElementById('mappingSizeValue');
        const mappingXValue = this.shadowRoot.getElementById('mappingXValue');
        const mappingYValue = this.shadowRoot.getElementById('mappingYValue');
        const mappingSizeSlider = this.shadowRoot.getElementById('mappingSize');
        const mappingXSlider = this.shadowRoot.getElementById('mappingX');
        const mappingYSlider = this.shadowRoot.getElementById('mappingY');

        if (mappingSizeValue && mappingSizeSlider) {
            mappingSizeValue.textContent = `${mappingSizeSlider.value}%`;
        }

        if (mappingXValue && mappingXSlider) {
            mappingXValue.textContent = `${mappingXSlider.value}%`;
        }

        if (mappingYValue && mappingYSlider) {
            mappingYValue.textContent = `${mappingYSlider.value}%`;
        }
    }

    resetMappingArea() {
        const mappingSizeSlider = this.shadowRoot.getElementById('mappingSize');
        const mappingXSlider = this.shadowRoot.getElementById('mappingX');
        const mappingYSlider = this.shadowRoot.getElementById('mappingY');
        const mappingEnabledCheckbox = this.shadowRoot.getElementById('mappingEnabled');

        if (mappingSizeSlider && mappingXSlider && mappingYSlider && mappingEnabledCheckbox) {
            mappingSizeSlider.value = '50';  // 50% size
            mappingXSlider.value = '25';     // 25% from left
            mappingYSlider.value = '25';     // 25% from top
            mappingEnabledCheckbox.checked = true;
            
            this.cameraMouseService.setDesktopMappingArea(0.25, 0.25, 0.5, 0.5);
            this.cameraMouseService.setDesktopMappingEnabled(true);
            this.updateMappingDisplay();
            this.announceToScreenReader('Desktop mapping area reset to default');
        }
    }

    loadSettingsToUI() {
        // Load saved settings from service and update UI controls
        const sensitivitySlider = this.shadowRoot.getElementById('sensitivity');
        const smoothingSlider = this.shadowRoot.getElementById('smoothing');
        const offsetXSlider = this.shadowRoot.getElementById('offsetX');
        const offsetYSlider = this.shadowRoot.getElementById('offsetY');
        const mappingEnabledCheckbox = this.shadowRoot.getElementById('mappingEnabled');
        const mappingSizeSlider = this.shadowRoot.getElementById('mappingSize');
        const mappingXSlider = this.shadowRoot.getElementById('mappingX');
        const mappingYSlider = this.shadowRoot.getElementById('mappingY');

        if (sensitivitySlider) {
            sensitivitySlider.value = this.cameraMouseService.sensitivity;
        }
        if (smoothingSlider) {
            smoothingSlider.value = this.cameraMouseService.smoothing;
        }

        const cursorOffset = this.cameraMouseService.getCursorOffset();
        if (offsetXSlider) {
            offsetXSlider.value = Math.round(cursorOffset.x * 100);
        }
        if (offsetYSlider) {
            offsetYSlider.value = Math.round(cursorOffset.y * 100);
        }

        const mappingArea = this.cameraMouseService.getDesktopMappingArea();
        if (mappingEnabledCheckbox) {
            mappingEnabledCheckbox.checked = mappingArea.enabled;
        }
        if (mappingSizeSlider) {
            mappingSizeSlider.value = Math.round(mappingArea.width * 100);
        }
        if (mappingXSlider) {
            mappingXSlider.value = Math.round(mappingArea.x * 100);
        }
        if (mappingYSlider) {
            mappingYSlider.value = Math.round(mappingArea.y * 100);
        }

        // Update all display values
        this.updateOffsetDisplay();
        this.updateMappingDisplay();
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    }

    showTemporaryMessage(message) {
        const statusElement = this.shadowRoot.getElementById('status');
        if (statusElement) {
            const originalText = statusElement.textContent;
            const originalColor = statusElement.style.color;
            
            statusElement.textContent = message;
            statusElement.style.color = '#28a745';
            
            setTimeout(() => {
                statusElement.textContent = originalText;
                statusElement.style.color = originalColor;
            }, 2000);
        }
        
        this.announceToScreenReader(message);
    }
    
    /**
     * Toggle desktop mode on/off
     */
    toggleDesktopMode() {
        if (!this.cameraMouseService) {
            console.warn('Camera mouse service not initialized');
            return;
        }
        
        const isCurrentlyEnabled = this.cameraMouseService.isDesktopModeEnabled();
        
        if (isCurrentlyEnabled) {
            // Disable desktop mode
            this.cameraMouseService.setDesktopMode(false);
            this.updateDesktopModeButton(false);
            this.announceToScreenReader('Desktop mode disabled');
        } else {
            // Enable desktop mode
            if (this.isDesktopEnvironment) {
                this.cameraMouseService.setDesktopMode(true);
                this.updateDesktopModeButton(true);
                this.announceToScreenReader('Desktop mode enabled');
            } else {
                // Not in desktop environment, show warning
                this.announceToScreenReader('Desktop mode requires running in desktop environment');
                console.warn('Cannot enable desktop mode: not in desktop environment');
            }
        }
    }
    
    /**
     * Update desktop mode button and status display
     * @param {boolean} isEnabled - Whether desktop mode is enabled
     */
    updateDesktopModeButton(isEnabled) {
        const desktopModeBtn = this.shadowRoot.getElementById('desktopModeBtn');
        const desktopStatus = this.shadowRoot.getElementById('desktopStatus');
        
        if (desktopModeBtn) {
            if (isEnabled) {
                desktopModeBtn.textContent = 'Disable Desktop Mode';
                desktopModeBtn.className = 'button danger';
            } else {
                desktopModeBtn.textContent = 'Enable Desktop Mode';
                desktopModeBtn.className = 'button secondary';
            }
        }
        
        if (desktopStatus) {
            desktopStatus.textContent = `Desktop mode: ${isEnabled ? 'Enabled' : 'Disabled'}`;
            desktopStatus.style.color = isEnabled ? '#28a745' : '#6c757d';
        }
    }
    
    /**
     * Detect if component is running in desktop environment
     */
    detectDesktopEnvironment() {
        // Check for desktop-component in DOM
        this.desktopComponent = document.querySelector('desktop-component');
        
        // Check if this component is inside a window-component
        const windowComponent = this.closest('window-component');
        
        // Check for global desktop environment indicator
        const hasDesktopGlobal = window.desktopEnvironment || document.querySelector('desktop-component');
        
        this.isDesktopEnvironment = !!(this.desktopComponent || windowComponent || hasDesktopGlobal);
        
        console.log('Desktop environment detected:', this.isDesktopEnvironment);
        
        if (this.isDesktopEnvironment) {
            console.log('Camera mouse component running in desktop environment');
        }
    }
    
    /**
     * Integrate with desktop mouse service
     */
    async integrateWithDesktop() {
        if (!this.isDesktopEnvironment || !this.desktopComponent) {
            console.warn('Cannot integrate with desktop: environment not detected');
            return;
        }
        
        try {
            // Dynamically import and create desktop mouse service
            const { DesktopMouseService } = await import('/desktop/src/services/desktop-mouse-service.js');
            
            // Create and initialize the desktop mouse service
            this.desktopMouseService = new DesktopMouseService();
            this.desktopMouseService.init(this.desktopComponent);
            
            // Store reference on desktop component for other potential users
            this.desktopComponent.desktopMouseService = this.desktopMouseService;
            
            console.log('DesktopMouseService created and managed by camera-mouse component');
            
            // Register camera service with desktop mouse service
            if (typeof this.desktopMouseService.registerCameraController === 'function') {
                await this.desktopMouseService.registerCameraController(this.cameraMouseService);
                console.log('Camera controller registered with desktop mouse service');
            } else {
                console.warn('Desktop mouse service does not support camera controller registration');
            }
            
            // Enable desktop mode in camera service
            this.cameraMouseService.setDesktopMode(true);
            
            // Update UI to show desktop mode is active
            this.updateDesktopModeUI(true);
            this.updateDesktopModeButton(true);
            
        } catch (error) {
            console.error('Failed to integrate with desktop:', error);
        }
    }
    
    /**
     * Update UI to reflect desktop mode status
     * @param {boolean} isDesktopMode - Whether desktop mode is active
     */
    updateDesktopModeUI(isDesktopMode) {
        const statusElement = this.shadowRoot.querySelector('.status');
        if (statusElement && isDesktopMode) {
            const currentStatus = statusElement.textContent;
            statusElement.textContent = `${currentStatus} (Desktop Mode)`;
        }
        
        // Add desktop mode indicator to the header if not present
        const header = this.shadowRoot.querySelector('.header');
        if (header && isDesktopMode) {
            let desktopIndicator = header.querySelector('.desktop-mode-indicator');
            if (!desktopIndicator) {
                desktopIndicator = document.createElement('div');
                desktopIndicator.className = 'desktop-mode-indicator';
                desktopIndicator.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 20px;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                `;
                desktopIndicator.textContent = '🖥️ Desktop Mode';
                header.style.position = 'relative';
                header.appendChild(desktopIndicator);
            }
        }
    }
}

customElements.define('camera-mouse', CameraMouseComponent);
export { CameraMouseComponent };