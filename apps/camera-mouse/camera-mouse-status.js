/**
 * Camera Mouse Status Web Component
 * 
 * Provides a consistent UI/UX for camera mouse functionality across all pages.
 * Auto-imports camera-mouse-service.js and handles all service interactions.
 * 
 * Usage:
 * <camera-mouse-status></camera-mouse-status>
 * 
 * Attributes:
 * - show-cursor="true|false" - Show virtual cursor (default: true)
 * - show-debug="true|false" - Show debug panel (default: false)
 * - position="top|bottom" - Status bar position (default: top)
 * - theme="dark|light" - Status bar theme (default: dark)
 */ 

class CameraMouseStatus extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Component state
        this.cameraService = null;
        this.isTracking = false;
        
        // Configuration from attributes
        this.config = {
            showCursor: true,
            showDebug: false,
            position: 'top',
            theme: 'dark'
        };
        
        // Initialize component
        this.init();
    }

    static get observedAttributes() {
        return ['show-cursor', 'show-debug', 'position', 'theme'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.updateConfig();
            this.render();
        }
    }

    updateConfig() {
        this.config.showCursor = this.getAttribute('show-cursor') !== 'false';
        this.config.showDebug = this.getAttribute('show-debug') === 'true';
        this.config.position = this.getAttribute('position') || 'top';
        this.config.theme = this.getAttribute('theme') || 'dark';
    }

    async init() {
        this.updateConfig();
        this.render();
        await this.loadCameraService();
        this.setupEventListeners();
    }

    async loadCameraService() {
        try {
            // Dynamic import of the camera mouse service
            const serviceModule = await import('./camera-mouse-service.js');
            const { CameraMouseService } = serviceModule;
            this.cameraService = new CameraMouseService();
            this.setupServiceEventListeners();
            console.log('Camera Mouse Status: Service loaded successfully');
        } catch (error) {
            console.error('Camera Mouse Status: Failed to load service:', error);
            this.updateStatus('Failed to load camera service', 'error');
        }
    }

    render() {
        const theme = this.config.theme === 'light' ? 'light-theme' : 'dark-theme';
        const position = this.config.position === 'bottom' ? 'bottom: 0;' : 'top: 0;';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    z-index: 9999;
                }

                /* Virtual Mouse Cursor */
                .virtual-cursor {
                    position: fixed;
                    width: 20px;
                    height: 20px;
                    background: radial-gradient(circle, #ff4444 0%, #cc0000 70%);
                    border: 2px solid white;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 10000;
                    transform: translate(-50%, -50%);
                    transition: all 0.1s ease;
                    opacity: 0;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                }

                .virtual-cursor.active {
                    opacity: 0.9;
                }

                .virtual-cursor.clicking {
                    background: radial-gradient(circle, #00ff44 0%, #00cc00 70%);
                    transform: translate(-50%, -50%) scale(1.3);
                    box-shadow: 0 0 20px rgba(0,255,68,0.6);
                }

                .virtual-cursor.right-clicking {
                    background: radial-gradient(circle, #ffaa00 0%, #cc8800 70%);
                    transform: translate(-50%, -50%) scale(1.2);
                    box-shadow: 0 0 15px rgba(255,170,0,0.6);
                }

                .virtual-cursor.scrolling {
                    background: radial-gradient(circle, #4488ff 0%, #0066cc 70%);
                    transform: translate(-50%, -50%) scale(1.2);
                    box-shadow: 0 0 15px rgba(68,136,255,0.6);
                }

                .virtual-cursor.dragging {
                    background: radial-gradient(circle, #ff88ff 0%, #cc00cc 70%);
                    transform: translate(-50%, -50%) scale(1.1);
                    box-shadow: 0 0 25px rgba(255,136,255,0.6);
                }

                /* Status Bar */
                .status-bar {
                    position: fixed;
                    ${position}
                    left: 0;
                    right: 0;
                    padding: 10px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 14px;
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }

                .status-bar.dark-theme {
                    background: rgba(0,0,0,0.8);
                    color: white;
                }

                .status-bar.light-theme {
                    background: rgba(255,255,255,0.9);
                    color: #333;
                    border-bottom: 1px solid rgba(0,0,0,0.1);
                }

                .status-info {
                    display: flex;
                    gap: 20px;
                    align-items: center;
                }

                .status-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ff4444;
                    transition: all 0.3s ease;
                }

                .status-indicator.active {
                    background: #44ff44;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .gesture-display {
                    background: rgba(255,255,255,0.1);
                    padding: 5px 10px;
                    border-radius: 15px;
                    font-weight: bold;
                    min-width: 80px;
                    text-align: center;
                    transition: all 0.3s ease;
                }

                .light-theme .gesture-display {
                    background: rgba(0,0,0,0.1);
                }

                /* Toggle Button */
                .toggle-button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-left: 15px;
                    background: #667eea;
                    color: white;
                }

                .toggle-button:hover {
                    background: #5a6fd8;
                    transform: translateY(-1px);
                }

                .toggle-button.active {
                    background: #dc3545;
                }

                .toggle-button.active:hover {
                    background: #c82333;
                }

                .toggle-button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                    transform: none;
                }

                /* Debug Panel */
                .debug-panel {
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    background: rgba(0,0,0,0.9);
                    color: #00ff00;
                    padding: 15px;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 11px;
                    max-width: 400px;
                    max-height: 300px;
                    overflow-y: auto;
                    z-index: 9998;
                    display: none;
                }

                .debug-panel.visible {
                    display: block;
                }

                .debug-panel h4 {
                    color: #ffff00;
                    margin-bottom: 10px;
                    font-size: 12px;
                }

                .debug-log {
                    line-height: 1.4;
                }

                .debug-entry {
                    margin-bottom: 2px;
                    word-wrap: break-word;
                }

                /* Status Message Styling */
                .status-message {
                    font-weight: 500;
                    max-width: 300px;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    white-space: nowrap;
                }

                .status-message.error {
                    color: #ff6b6b;
                }

                .status-message.success {
                    color: #51cf66;
                }

                .status-message.warning {
                    color: #ffd43b;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .status-bar {
                        padding: 8px 15px;
                        font-size: 12px;
                    }
                    
                    .status-info {
                        gap: 15px;
                    }
                    
                    .toggle-button {
                        font-size: 10px;
                        padding: 6px 12px;
                    }
                    
                    .debug-panel {
                        right: 10px;
                        max-width: calc(100vw - 20px);
                    }
                }

                /* Hidden elements */
                .hidden {
                    display: none !important;
                }
            </style>

            <!-- Virtual Cursor -->
            <div class="virtual-cursor ${this.config.showCursor ? '' : 'hidden'}" id="virtualCursor"></div>

            <!-- Status Bar -->
            <div class="status-bar ${theme}" id="statusBar">
                <div class="status-info">
                    <div class="status-item">
                        <div class="status-indicator" id="trackingIndicator"></div>
                        <span>Tracking</span>
                    </div>
                    <div class="status-item">
                        <span>Gesture:</span>
                        <div class="gesture-display" id="currentGesture">None</div>
                    </div>
                </div>
                <div class="status-info">
                    <span class="status-message" id="statusMessage">Camera Mouse Ready</span>
                    <button class="toggle-button" id="toggleBtn">START TRACKING</button>
                </div>
            </div>

            <!-- Debug Panel -->
            <div class="debug-panel ${this.config.showDebug ? 'visible' : ''}" id="debugPanel">
                <h4>🔍 Camera Mouse Debug</h4>
                <div class="debug-log" id="debugLog">
                    <div class="debug-entry">Component initialized</div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const toggleBtn = this.shadowRoot.getElementById('toggleBtn');
        toggleBtn.addEventListener('click', () => this.toggleTracking());
    }

    setupServiceEventListeners() {
        if (!this.cameraService) return;

        const virtualCursor = this.shadowRoot.getElementById('virtualCursor');
        const statusMessage = this.shadowRoot.getElementById('statusMessage');
        const currentGesture = this.shadowRoot.getElementById('currentGesture');
        const trackingIndicator = this.shadowRoot.getElementById('trackingIndicator');

        // Virtual cursor movement
        this.cameraService.addEventListener('mouseMove', (event) => {
            const { x, y } = event.detail;
            if (virtualCursor) {
                virtualCursor.style.left = x + 'px';
                virtualCursor.style.top = y + 'px';
            }
        });

        // Mouse events
        this.cameraService.addEventListener('mouseDown', (event) => {
            if (virtualCursor) virtualCursor.classList.add('clicking');
            this.addDebugLog(`Mouse down at (${Math.round(event.detail.x)}, ${Math.round(event.detail.y)})`);
        });

        this.cameraService.addEventListener('mouseUp', (event) => {
            if (virtualCursor) virtualCursor.classList.remove('clicking');
            this.addDebugLog('Mouse up');
        });

        this.cameraService.addEventListener('rightClick', (event) => {
            if (virtualCursor) {
                virtualCursor.classList.add('right-clicking');
                setTimeout(() => virtualCursor.classList.remove('right-clicking'), 300);
            }
            this.addDebugLog(`Right click at (${Math.round(event.detail.x)}, ${Math.round(event.detail.y)})`);
        });

        this.cameraService.addEventListener('scroll', (event) => {
            if (virtualCursor) {
                virtualCursor.classList.add('scrolling');
                setTimeout(() => virtualCursor.classList.remove('scrolling'), 200);
            }
            this.addDebugLog(`Scroll: deltaY=${event.detail.deltaY.toFixed(1)}`);
        });

        // Gesture detection
        this.cameraService.addEventListener('gestureDetected', (event) => {
            const { gesture, confidence, state } = event.detail;
            
            // Update gesture display
            const gestureNames = {
                'leftClick': 'Peace Sign ✌️',
                'rightClick': 'Three Fingers 🖖',
                'scroll': 'Fist 👊',
                'point': 'Pointing 👆',
                'open': 'Open Hand 🖐️',
                'none': 'None'
            };
            
            if (currentGesture) {
                currentGesture.textContent = gestureNames[gesture] || gesture;
            }
            
            // Update cursor appearance
            if (virtualCursor) {
                virtualCursor.classList.toggle('clicking', state.isClicking);
                virtualCursor.classList.toggle('right-clicking', state.isRightClicking);
                virtualCursor.classList.toggle('scrolling', state.isScrolling);
                virtualCursor.classList.toggle('dragging', state.isDragging);
            }
        });

        // Drag events
        this.cameraService.addEventListener('dragStart', (event) => {
            if (virtualCursor) virtualCursor.classList.add('dragging');
            this.addDebugLog(`Drag start at (${Math.round(event.detail.x)}, ${Math.round(event.detail.y)})`);
        });

        this.cameraService.addEventListener('dragEnd', (event) => {
            if (virtualCursor) virtualCursor.classList.remove('dragging');
            this.addDebugLog(`Drag end at (${Math.round(event.detail.x)}, ${Math.round(event.detail.y)})`);
        });

        // Progress and status events
        this.cameraService.addEventListener('trackingProgress', (event) => {
            this.updateStatus(event.detail.message, 'info');
            this.addDebugLog(`Progress: ${event.detail.message}`);
        });

        this.cameraService.addEventListener('trackingReady', (event) => {
            this.updateStatus(event.detail.message, 'success');
            this.addDebugLog(`✓ ${event.detail.message}`);
            if (virtualCursor) virtualCursor.classList.add('active');
            if (trackingIndicator) trackingIndicator.classList.add('active');
        });

        this.cameraService.addEventListener('trackingStopped', (event) => {
            this.updateStatus(event.detail.message, 'info');
            this.addDebugLog(`✓ ${event.detail.message}`);
            if (virtualCursor) virtualCursor.classList.remove('active');
            if (trackingIndicator) trackingIndicator.classList.remove('active');
        });

        this.cameraService.addEventListener('trackingError', (event) => {
            this.updateStatus(`Error: ${event.detail.error}`, 'error');
            this.addDebugLog(`✗ Error: ${event.detail.error}`);
        });

        // Error handling
        this.cameraService.addEventListener('initializationError', (event) => {
            this.updateStatus(`Init error: ${event.detail.userMessage}`, 'error');
            this.addDebugLog(`✗ Init error: ${event.detail.userMessage}`);
        });

        this.cameraService.addEventListener('cameraError', (event) => {
            this.updateStatus(`Camera error: ${event.detail.userMessage}`, 'error');
            this.addDebugLog(`✗ Camera error: ${event.detail.userMessage}`);
        });
    }

    async toggleTracking() {
        if (this.isTracking) {
            await this.stopTracking();
        } else {
            await this.startTracking();
        }
    }

    async startTracking() {
        const toggleBtn = this.shadowRoot.getElementById('toggleBtn');
        
        try {
            if (toggleBtn) toggleBtn.disabled = true;
            this.updateStatus('Starting camera mouse tracking...', 'info');
            this.addDebugLog('🚀 Starting tracking...');
            
            if (!this.cameraService) {
                throw new Error('Camera service not loaded');
            }
            
            await this.cameraService.initializeStandalone();
            await this.cameraService.startFullTracking();
            
            this.isTracking = true;
            if (toggleBtn) {
                toggleBtn.textContent = 'STOP TRACKING';
                toggleBtn.classList.add('active');
                toggleBtn.disabled = false;
            }
            
            this.updateStatus('Hand tracking active! Use gestures to control the page.', 'success');
            this.addDebugLog('✅ Tracking started successfully');
            
            // Dispatch custom event for parent page
            this.dispatchEvent(new CustomEvent('tracking-started', {
                detail: { service: this.cameraService },
                bubbles: true
            }));
            
        } catch (error) {
            this.updateStatus(`Tracking failed: ${error.message}`, 'error');
            this.addDebugLog(`❌ Tracking failed: ${error.message}`);
            console.error('Camera Mouse Status: Tracking start failed:', error);
            if (toggleBtn) toggleBtn.disabled = false;
        }
    }

    async stopTracking() {
        const toggleBtn = this.shadowRoot.getElementById('toggleBtn');
        const currentGesture = this.shadowRoot.getElementById('currentGesture');
        
        try {
            if (toggleBtn) toggleBtn.disabled = true;
            this.updateStatus('Stopping camera mouse...', 'info');
            this.addDebugLog('🛑 Stopping tracking...');
            
            if (this.cameraService) {
                await this.cameraService.stopFullTracking();
            }
            
            this.isTracking = false;
            if (toggleBtn) {
                toggleBtn.textContent = 'START TRACKING';
                toggleBtn.classList.remove('active');
                toggleBtn.disabled = false;
            }
            
            if (currentGesture) currentGesture.textContent = 'None';
            
            this.updateStatus('Camera mouse stopped.', 'info');
            this.addDebugLog('✅ Tracking stopped');
            
            // Dispatch custom event for parent page
            this.dispatchEvent(new CustomEvent('tracking-stopped', {
                bubbles: true
            }));
            
        } catch (error) {
            this.updateStatus(`Stop failed: ${error.message}`, 'error');
            this.addDebugLog(`❌ Stop failed: ${error.message}`);
            console.error('Camera Mouse Status: Stop failed:', error);
            if (toggleBtn) toggleBtn.disabled = false;
        }
    }

    updateStatus(message, type = 'info') {
        const statusMessage = this.shadowRoot.getElementById('statusMessage');
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`;
        }
    }

    addDebugLog(message) {
        if (!this.config.showDebug) return;
        
        const debugLog = this.shadowRoot.getElementById('debugLog');
        if (debugLog) {
            const timestamp = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.className = 'debug-entry';
            entry.textContent = `[${timestamp}] ${message}`;
            debugLog.appendChild(entry);
            debugLog.scrollTop = debugLog.scrollHeight;
            
            // Keep only last 50 entries
            const entries = debugLog.querySelectorAll('.debug-entry');
            if (entries.length > 50) {
                entries[0].remove();
            }
        }
        
        console.log(`[Camera Mouse Status] ${message}`);
    }

    // Public API methods
    getService() {
        return this.cameraService;
    }

    getTrackingState() {
        return this.isTracking;
    }

    async hardRefresh() {
        if (this.cameraService && typeof this.cameraService.hardRefresh === 'function') {
            this.addDebugLog('🔄 Hard refresh requested');
            await this.cameraService.hardRefresh();
            this.addDebugLog('✅ Hard refresh complete');
        }
    }
}

// Register the custom element
customElements.define('camera-mouse-status', CameraMouseStatus);
