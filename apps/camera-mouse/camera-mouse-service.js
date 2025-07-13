import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';

/**
 * Camera Mouse Message Types
 * These are added to the global MESSAGES object during service initialization
 */
const CAMERA_MOUSE_MESSAGES = {
    DESKTOP_MOUSE_MOVE: 'desktop-mouse-move',
    DESKTOP_MOUSE_CLICK: 'desktop-mouse-click',
    DESKTOP_MOUSE_RIGHT_CLICK: 'desktop-mouse-right-click',
    DESKTOP_MOUSE_DOUBLE_CLICK: 'desktop-mouse-double-click',
    DESKTOP_MOUSE_SCROLL: 'desktop-mouse-scroll',
    DESKTOP_MOUSE_DRAG_START: 'desktop-mouse-drag-start',
    DESKTOP_MOUSE_DRAG_END: 'desktop-mouse-drag-end',
    DESKTOP_MOUSE_ENABLED: 'desktop-mouse-enabled',
    DESKTOP_MOUSE_DISABLED: 'desktop-mouse-disabled',
    DESKTOP_MOUSE_CALIBRATED: 'desktop-mouse-calibrated'
};

/**
 * Camera Mouse Message Helper Functions
 */
function createDesktopMouseMoveMessage(payload) {
    return new CustomEvent(CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_MOVE, {
        detail: payload,
        bubbles: true,
        composed: true
    });
}

function createDesktopMouseClickMessage(payload) {
    return new CustomEvent(CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_CLICK, {
        detail: payload,
        bubbles: true,
        composed: true
    });
}

function createDesktopMouseRightClickMessage(payload) {
    return new CustomEvent(CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_RIGHT_CLICK, {
        detail: payload,
        bubbles: true,
        composed: true
    });
}

function createDesktopMouseScrollMessage(payload) {
    return new CustomEvent(CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_SCROLL, {
        detail: payload,
        bubbles: true,
        composed: true
    });
}

/**
 * Validate camera mouse message payload
 * @param {string} messageType - Type of message to validate
 * @param {Object} payload - Payload to validate
 * @returns {boolean} Whether payload is valid
 */
function validateCameraMousePayload(messageType, payload) {
    if (!payload || typeof payload !== 'object') {
        console.warn(`Invalid payload for camera mouse message type ${messageType}:`, payload);
        return false;
    }
    
    switch (messageType) {
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_MOVE:
            return typeof payload.x === 'number' && 
                   typeof payload.y === 'number' && 
                   typeof payload.sourceAppId === 'string';
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_CLICK:
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_RIGHT_CLICK:
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_DOUBLE_CLICK:
            return typeof payload.x === 'number' && 
                   typeof payload.y === 'number' && 
                   typeof payload.sourceAppId === 'string';
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_SCROLL:
            return typeof payload.x === 'number' && 
                   typeof payload.y === 'number' && 
                   typeof payload.deltaX === 'number' && 
                   typeof payload.deltaY === 'number' && 
                   typeof payload.sourceAppId === 'string';
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_DRAG_START:
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_DRAG_END:
            return typeof payload.x === 'number' && 
                   typeof payload.y === 'number' && 
                   typeof payload.sourceAppId === 'string';
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_ENABLED:
        case CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_DISABLED:
            return typeof payload.sourceAppId === 'string' && 
                   typeof payload.enabled === 'boolean';
        default:
            return true;
    }
}

/**
 * Register camera mouse message types with global message system
 * @param {Object} globalMessages - Global MESSAGES object to extend
 * @param {Function} globalValidateMessagePayload - Global validation function to extend
 */
function registerCameraMouseMessages(globalMessages, globalValidateMessagePayload) {
    // Add camera mouse message types to global MESSAGES
    Object.assign(globalMessages, CAMERA_MOUSE_MESSAGES);
    
    // Extend global validation function
    const originalValidate = globalValidateMessagePayload;
    const extendedValidate = function(messageType, payload) {
        // First try camera mouse validation
        if (Object.values(CAMERA_MOUSE_MESSAGES).includes(messageType)) {
            return validateCameraMousePayload(messageType, payload);
        }
        // Fall back to original validation
        return originalValidate(messageType, payload);
    };
    
    // Replace global validation function
    if (window.validateMessagePayload) {
        window.validateMessagePayload = extendedValidate;
    }
    
    console.log('Camera mouse message types registered with global system');
}

class CameraMouseService extends EventTarget {
    constructor(customSettings = null) {
        super();
        this.handLandmarker = null;
        this.videoStream = null;
        this.videoElement = null;
        this.isTracking = false;
        this.isCalibrating = false;
        this.animationFrameId = null;
        
        this.sensitivity = 1.0;
        this.smoothing = 0.3;
        this.lastMousePosition = { x: 0, y: 0 };
        this.calibrationBounds = null;
        this.lastDetectionTime = 0;
        this.trackingQuality = 0;
        
        this.gestureState = {
            isClicking: false,
            isRightClicking: false,
            isDragging: false,
            isScrolling: false,
            lastGestureTime: 0,
            lastClickTime: 0,
            clickCount: 0,
            lastScrollPosition: { x: 0, y: 0 },
            gestureHistory: []
        };
        
        // Enhanced gesture settings
        this.gestureSettings = {
            confidenceThreshold: 0.7,
            deadZoneRadius: 0.02,
            doubleClickInterval: 300,
            scrollSensitivity: 100, // Balanced sensitivity for smooth scrolling with normalized coordinates
            gestureHoldTime: 150
        };
        
        // Desktop integration mode
        this.desktopMode = {
            enabled: false,
            appId: 'camera-mouse',
            coordinateScale: 1.0
        };
        
        // Cursor offset for fine-tuning cursor position relative to hand
        this.cursorOffset = {
            x: 0.05,  // Move cursor right relative to palm (positive = right)
            y: 0.08   // Move cursor down relative to palm (positive = down)
        };
        
        // Desktop mapping area - rectangle within camera view that maps to full desktop
        this.desktopMappingArea = {
            enabled: true,
            x: 0.25,      // Left edge of mapping area (25% from left)
            y: 0.25,      // Top edge of mapping area (25% from top)
            width: 0.5,   // Width of mapping area (50% of camera view)
            height: 0.5,  // Height of mapping area (50% of camera view)
            // Derived properties (calculated automatically)
            right: 0.75,  // x + width
            bottom: 0.75  // y + height
        };
        
        // Load saved settings from localStorage
        this.loadSettings();
        
        // Apply custom settings if provided (for permanent defaults)
        if (customSettings) {
            this.applyCustomSettings(customSettings);
        }
    }
    
    /**
     * Register camera mouse message types with global message system (optional)
     */
    registerMessageTypes() {
        // Check if we're in a desktop environment before attempting desktop integration
        const isDesktopEnvironment = this.detectDesktopEnvironment();
        
        if (isDesktopEnvironment) {
            try {
                // Only attempt desktop integration if environment is detected
                import('/desktop/src/events/message-types.js').then(messageTypesModule => {
                    const { MESSAGES, validateMessagePayload } = messageTypesModule;
                    registerCameraMouseMessages(MESSAGES, validateMessagePayload);
                    console.log('Successfully registered with desktop message system');
                }).catch(error => {
                    console.warn('Desktop environment detected but message system unavailable:', error);
                    this.setupStandaloneMessageSystem();
                });
            } catch (error) {
                console.warn('Failed to load desktop message system:', error);
                this.setupStandaloneMessageSystem();
            }
        } else {
            // Not in desktop environment - use standalone mode
            this.setupStandaloneMessageSystem();
        }
    }

    /**
     * Detect if running in desktop environment
     * @returns {boolean} True if desktop environment detected
     */
    detectDesktopEnvironment() {
        // Check for desktop-component in DOM
        const hasDesktopComponent = document.querySelector('desktop-component');
        
        // Check if this service is inside a window-component
        const hasWindowComponent = document.querySelector('window-component');
        
        // Check for global desktop environment indicator
        const hasDesktopGlobal = window.desktopEnvironment;
        
        // Check if running in what looks like a desktop file path
        const hasDesktopPath = window.location.pathname.includes('/desktop/');
        
        return !!(hasDesktopComponent || hasWindowComponent || hasDesktopGlobal || hasDesktopPath);
    }

    /**
     * Setup standalone message system for non-desktop environments
     */
    setupStandaloneMessageSystem() {
        // Create minimal local message system for standalone use
        if (typeof window !== 'undefined') {
            window.CAMERA_MOUSE_MESSAGES = CAMERA_MOUSE_MESSAGES;
            
            // Add validation function if it doesn't exist
            if (!window.validateMessagePayload) {
                window.validateMessagePayload = validateCameraMousePayload;
            }
        }
        
        // Store message types locally for this service instance
        this.messageTypes = CAMERA_MOUSE_MESSAGES;
        
        console.log('Camera mouse running in standalone mode');
    }

    /**
     * Check browser compatibility for all required features
     * @throws {Error} If critical features are missing
     */
    checkBrowserCompatibility() {
        const errors = [];
        const warnings = [];

        // Check for required APIs
        if (!navigator.mediaDevices) {
            errors.push('MediaDevices API not supported');
        } else if (!navigator.mediaDevices.getUserMedia) {
            errors.push('getUserMedia not supported');
        }

        // Check for WebAssembly support (required for MediaPipe)
        if (typeof WebAssembly === 'undefined') {
            errors.push('WebAssembly not supported - required for MediaPipe hand tracking');
        }

        // Check for modern JavaScript features we use
        if (!window.customElements) {
            warnings.push('Custom Elements not supported - Web Component may not work');
        }

        if (!window.EventTarget) {
            errors.push('EventTarget not supported - service events will not work');
        }

        // Check for optional chaining support (we use it extensively)
        try {
            eval('const test = {}?.optionalChain');
        } catch (e) {
            warnings.push('Optional chaining not supported - may cause errors in older browsers');
        }

        // Check for required DOM APIs
        if (!document.querySelector) {
            errors.push('querySelector not supported');
        }

        // Check for localStorage (used for settings)
        try {
            const testKey = '__camera_mouse_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        } catch (e) {
            warnings.push('localStorage not available - settings will not persist');
        }

        // Check for Canvas API (used for hand landmark visualization)
        if (!document.createElement('canvas').getContext) {
            warnings.push('Canvas API not supported - hand visualization will not work');
        }

        // Log warnings
        if (warnings.length > 0) {
            console.warn('Camera Mouse compatibility warnings:', warnings);
        }

        // Throw error for critical missing features
        if (errors.length > 0) {
            const errorMessage = `Browser compatibility check failed: ${errors.join(', ')}`;
            throw new Error(errorMessage);
        }

        console.log('Browser compatibility check passed');
    }

    /**
     * Check if running in a secure context (required for camera access)
     * @returns {boolean} True if in secure context
     */
    isSecureContext() {
        // Check for secure context (HTTPS or localhost)
        return window.isSecureContext || 
               location.protocol === 'https:' || 
               location.hostname === 'localhost' || 
               location.hostname === '127.0.0.1' ||
               location.hostname === '[::1]';
    }

    /**
     * Get detailed error information for troubleshooting
     * @param {Error} error - The error to analyze
     * @returns {Object} Detailed error information
     */
    getDetailedErrorInfo(error) {
        const errorInfo = {
            message: error.message,
            type: error.constructor.name,
            browser: this.getBrowserInfo(),
            secureContext: this.isSecureContext(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        // Add specific checks based on error type
        if (error.message.includes('camera') || error.message.includes('getUserMedia')) {
            errorInfo.cameraSupport = !!navigator.mediaDevices?.getUserMedia;
            errorInfo.mediaDevices = !!navigator.mediaDevices;
        }

        if (error.message.includes('MediaPipe') || error.message.includes('WebAssembly')) {
            errorInfo.webAssemblySupport = typeof WebAssembly !== 'undefined';
            errorInfo.gpuAvailable = this.checkGPUSupport();
        }

        return errorInfo;
    }

    /**
     * Get basic browser information
     * @returns {Object} Browser info
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return { name: 'Chrome', version: ua.match(/Chrome\/(\d+)/)?.[1] };
        if (ua.includes('Firefox')) return { name: 'Firefox', version: ua.match(/Firefox\/(\d+)/)?.[1] };
        if (ua.includes('Safari')) return { name: 'Safari', version: ua.match(/Version\/(\d+)/)?.[1] };
        if (ua.includes('Edge')) return { name: 'Edge', version: ua.match(/Edge\/(\d+)/)?.[1] };
        return { name: 'Unknown', version: 'Unknown' };
    }

    /**
     * Check for GPU support
     * @returns {boolean} True if GPU appears to be available
     */
    checkGPUSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get troubleshooting steps for common errors
     * @param {Error} error - The error to provide troubleshooting for
     * @returns {Array} Array of troubleshooting steps
     */
    getTroubleshootingSteps(error) {
        const steps = [];
        
        if (error.message.includes('camera') || error.message.includes('getUserMedia')) {
            steps.push('Check that your camera is connected and not being used by another application');
            steps.push('Grant camera permission when prompted by the browser');
            if (!this.isSecureContext()) {
                steps.push('Serve your page over HTTPS (camera access requires secure context)');
            }
            steps.push('Try refreshing the page');
        }
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            steps.push('Check your internet connection');
            steps.push('Ensure you\'re not behind a firewall blocking CDN requests');
            steps.push('Try serving the page over HTTPS');
            steps.push('Check if your browser blocks third-party resources');
        }
        
        if (error.message.includes('WebAssembly')) {
            steps.push('Update to a modern browser (Chrome 57+, Firefox 53+, Safari 11+)');
            steps.push('Enable WebAssembly if disabled in browser settings');
        }
        
        if (error.message.includes('GPU')) {
            steps.push('Update your graphics drivers');
            steps.push('Try enabling hardware acceleration in browser settings');
            steps.push('Close other GPU-intensive applications');
        }
        
        // General troubleshooting
        steps.push('Try using a different browser');
        steps.push('Check browser console for additional error details');
        
        return steps;
    }

    /**
     * Initialize the camera mouse service (full initialization)
     */
    async initialize() {
        // Register camera mouse message types with global system
        this.registerMessageTypes();
        
        return this.initializeMediaPipe();
    }

    /**
     * Standalone initialization - minimal setup for embedding
     * This method can be used when you just want basic camera mouse functionality
     * without desktop integration or global message system dependencies
     */
    async initializeStandalone() {
        // Setup standalone message system only
        this.setupStandaloneMessageSystem();
        
        return this.initializeMediaPipe();
    }

    /**
     * Initialize MediaPipe hand tracking (core functionality)
     * @private
     */
    async initializeMediaPipe() {
        try {
            // Comprehensive browser compatibility check
            this.checkBrowserCompatibility();

            // Feature detection for optional APIs
            if (!window.MediaRecorder) {
                console.warn('MediaRecorder not available, some features may be limited');
            }

            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
            );
            
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 1,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            console.log('MediaPipe HandLandmarker initialized successfully');
            this.dispatchEvent(new CustomEvent('initialized', { detail: { success: true } }));
            
            return true;
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
            
            // Get detailed error information for debugging
            const errorInfo = this.getDetailedErrorInfo(error);
            console.error('Detailed error info:', errorInfo);
            
            // Provide more specific error messages
            let userMessage = 'Failed to initialize hand tracking';
            
            if (error.message.includes('Camera access') || error.message.includes('getUserMedia')) {
                if (!this.isSecureContext()) {
                    userMessage = 'Camera access requires HTTPS. Please serve your page over HTTPS or use localhost.';
                } else {
                    userMessage = 'Camera access is not supported in this browser. Please use Chrome, Firefox, or Safari.';
                }
            } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
                if (!this.isSecureContext()) {
                    userMessage = 'Network error loading hand tracking models. Please ensure you\'re serving over HTTPS and have an internet connection.';
                } else {
                    userMessage = 'Network error loading hand tracking models. Please check your internet connection.';
                }
            } else if (error.message.includes('GPU')) {
                userMessage = 'GPU acceleration not available. Performance may be reduced. Try updating your browser or graphics drivers.';
            } else if (error.message.includes('WebAssembly')) {
                userMessage = 'WebAssembly not supported. Please use a modern browser (Chrome 57+, Firefox 53+, Safari 11+).';
            } else if (error.message.includes('compatibility')) {
                userMessage = error.message; // Use the specific compatibility error message
            }
            
            // Add browser-specific advice
            const browserInfo = this.getBrowserInfo();
            if (browserInfo.name === 'Safari' && error.message.includes('network')) {
                userMessage += ' Note: Safari may block some network requests in private browsing mode.';
            }
            
            this.dispatchEvent(new CustomEvent('initializationError', { 
                detail: { 
                    error: error.message, 
                    userMessage,
                    errorInfo,
                    troubleshooting: this.getTroubleshootingSteps(error)
                } 
            }));
            
            throw new Error(userMessage);
        }
    }

    async startCamera() {
        try {
            // Check for camera permission
            const permissionStatus = await navigator.permissions?.query({ name: 'camera' });
            if (permissionStatus?.state === 'denied') {
                throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
            }

            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30, max: 60 },
                    facingMode: 'user' // Prefer front-facing camera
                },
                audio: false
            };

            try {
                this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (error) {
                // Fallback to basic constraints if advanced features not supported
                console.warn('Advanced camera constraints failed, trying basic constraints:', error);
                const basicConstraints = { video: true, audio: false };
                this.videoStream = await navigator.mediaDevices.getUserMedia(basicConstraints);
            }
            
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.videoStream;
            this.videoElement.autoplay = true;
            this.videoElement.muted = true;
            this.videoElement.playsInline = true;
            
            // Add accessibility attributes
            this.videoElement.setAttribute('aria-label', 'Camera feed for hand tracking');
            this.videoElement.setAttribute('role', 'img');
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Camera initialization timeout'));
                }, 10000);
                
                this.videoElement.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    this.videoElement.play()
                        .then(() => {
                            console.log('Camera started successfully');
                            this.dispatchEvent(new CustomEvent('cameraStarted', { 
                                detail: { 
                                    width: this.videoElement.videoWidth, 
                                    height: this.videoElement.videoHeight 
                                } 
                            }));
                            resolve();
                        })
                        .catch(reject);
                };
                
                this.videoElement.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Failed to start camera:', error);
            
            let userMessage = 'Failed to access camera';
            if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
                userMessage = 'Camera permission denied. Please allow camera access and try again.';
            } else if (error.message.includes('NotFoundError')) {
                userMessage = 'No camera found. Please connect a camera and try again.';
            } else if (error.message.includes('NotReadableError')) {
                userMessage = 'Camera is already in use by another application.';
            }
            
            this.dispatchEvent(new CustomEvent('cameraError', { 
                detail: { error: error.message, userMessage } 
            }));
            
            throw new Error(userMessage);
        }
    }

    async stopCamera() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }
        
        console.log('Camera stopped');
    }

    getVideoStream() {
        return this.videoStream;
    }

    async startTracking() {
        if (!this.handLandmarker || !this.videoElement) {
            throw new Error('Service not properly initialized');
        }
        
        this.isTracking = true;
        this.trackingLoop();
        console.log('Hand tracking started');
    }

    /**
     * Combined method: Initialize + Start Camera + Start Tracking
     * Single method to go from zero to fully operational
     */
    async startFullTracking() {
        try {
            // Step 1: Initialize if not already done
            if (!this.handLandmarker) {
                this.dispatchEvent(new CustomEvent('trackingProgress', {
                    detail: { step: 'initialize', message: 'Initializing service...' }
                }));
                await this.initializeStandalone();
            }

            // Step 2: Start camera if not already running
            if (!this.videoStream) {
                this.dispatchEvent(new CustomEvent('trackingProgress', {
                    detail: { step: 'camera', message: 'Starting camera...' }
                }));
                await this.startCamera();
            }

            // Step 3: Start tracking if not already tracking
            if (!this.isTracking) {
                this.dispatchEvent(new CustomEvent('trackingProgress', {
                    detail: { step: 'tracking', message: 'Starting hand tracking...' }
                }));
                await this.startTracking();
            }

            // Success event
            this.dispatchEvent(new CustomEvent('trackingReady', {
                detail: { message: 'Camera mouse is fully operational!' }
            }));

            return true;

        } catch (error) {
            this.dispatchEvent(new CustomEvent('trackingError', {
                detail: { 
                    error: error.message,
                    step: 'full_tracking'
                }
            }));
            throw error;
        }
    }

    /**
     * Hard refresh - completely reset everything
     */
    async hardRefresh() {
        try {
            this.dispatchEvent(new CustomEvent('trackingProgress', {
                detail: { step: 'hard_refresh', message: 'Hard resetting camera mouse...' }
            }));

            // Force stop everything
            this.isTracking = false;
            
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }

            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
                this.videoStream = null;
            }

            if (this.videoElement) {
                this.videoElement.srcObject = null;
                this.videoElement = null;
            }

            if (this.handLandmarker) {
                this.handLandmarker.close();
                this.handLandmarker = null;
            }

            // Reset all state
            this.gestureState = {
                isClicking: false,
                isRightClicking: false,
                isDragging: false,
                isScrolling: false,
                lastGestureTime: 0,
                lastClickTime: 0,
                clickCount: 0,
                lastScrollPosition: { x: 0, y: 0 },
                gestureHistory: []
            };

            this.lastMousePosition = { x: 0, y: 0 };
            this.calibrationBounds = null;
            this.trackingQuality = 0;

            // Disable desktop mode
            this.disableDesktopMode();

            this.dispatchEvent(new CustomEvent('hardRefreshComplete', {
                detail: { message: 'Hard refresh complete - ready to restart' }
            }));

            return true;

        } catch (error) {
            this.dispatchEvent(new CustomEvent('trackingError', {
                detail: { 
                    error: error.message,
                    step: 'hard_refresh'
                }
            }));
            throw error;
        }
    }

    /**
     * Stop all tracking and cleanup
     */
    async stopFullTracking() {
        try {
            this.dispatchEvent(new CustomEvent('trackingProgress', {
                detail: { step: 'stopping', message: 'Stopping camera mouse...' }
            }));

            if (this.isTracking) {
                await this.stopTracking();
            }

            if (this.videoStream) {
                await this.stopCamera();
            }

            this.cleanup();

            this.dispatchEvent(new CustomEvent('trackingStopped', {
                detail: { message: 'Camera mouse stopped' }
            }));

            return true;

        } catch (error) {
            this.dispatchEvent(new CustomEvent('trackingError', {
                detail: { 
                    error: error.message,
                    step: 'stopping'
                }
            }));
            throw error;
        }
    }

    async stopTracking() {
        this.isTracking = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        console.log('Hand tracking stopped');
    }

    trackingLoop() {
        if (!this.isTracking) return;
        
        try {
            const currentTime = performance.now();
            
            if (this.videoElement.readyState >= 2) {
                const results = this.handLandmarker.detectForVideo(this.videoElement, currentTime);
                this.processTrackingResults(results);
            }
        } catch (error) {
            console.error('Tracking error:', error);
        }
        
        this.animationFrameId = requestAnimationFrame(() => this.trackingLoop());
    }

    processTrackingResults(results) {
        const currentTime = performance.now();
        
        if (results.landmarks && results.landmarks.length > 0) {
            const handLandmarks = results.landmarks[0];
            this.lastDetectionTime = currentTime;
            
            this.calculateTrackingQuality(handLandmarks);
            
            this.dispatchEvent(new CustomEvent('handDetected', {
                detail: {
                    landmarks: handLandmarks,
                    worldLandmarks: results.worldLandmarks?.[0],
                    handedness: results.handednesses?.[0]
                }
            }));
            
            if (!this.isCalibrating) {
                this.processMouseMovement(handLandmarks);
                this.processGestures(handLandmarks);
            } else {
                this.updateCalibrationBounds(handLandmarks);
            }
        } else {
            if (currentTime - this.lastDetectionTime > 500) {
                this.trackingQuality = 0;
                this.dispatchEvent(new CustomEvent('trackingQualityChanged', {
                    detail: { quality: this.trackingQuality }
                }));
            }
        }
    }

    calculateTrackingQuality(landmarks) {
        let quality = 0;
        
        if (landmarks && landmarks.length >= 21) {
            quality += 0.5;
            
            const handBounds = this.getHandBounds(landmarks);
            const handSize = Math.max(handBounds.width, handBounds.height);
            
            if (handSize > 0.1) quality += 0.3;
            if (handSize < 0.8) quality += 0.2;
            
            const indexTip = landmarks[8];
            if (indexTip.z > -0.1) quality += 0.1;
        }
        
        this.trackingQuality = Math.min(1.0, quality);
        this.dispatchEvent(new CustomEvent('trackingQualityChanged', {
            detail: { quality: this.trackingQuality }
        }));
    }

    processMouseMovement(landmarks) {
        // Use palm center (wrist landmark 0) for more stable tracking
        // Calculate palm center from wrist and middle finger MCP
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        
        // Palm center is approximately between wrist and middle finger MCP
        const palmCenter = {
            x: (wrist.x + middleMCP.x) / 2,
            y: (wrist.y + middleMCP.y) / 2,
            z: (wrist.z + middleMCP.z) / 2
        };
        
        // Apply cursor offset for better hand-cursor alignment
        const adjustedCenter = {
            x: palmCenter.x + this.cursorOffset.x,
            y: palmCenter.y + this.cursorOffset.y
        };
        
        let screenX, screenY;
        
        // Mirror the X coordinate to fix left-right mirroring
        const mirroredX = 1.0 - adjustedCenter.x;
        
        // Apply dead zone to reduce micro-movements
        const normalizedPosition = { x: mirroredX, y: adjustedCenter.y };
        if (!this.isOutsideDeadZone(normalizedPosition)) {
            return; // Don't move mouse if within dead zone
        }
        
        if (this.desktopMappingArea.enabled) {
            // Map to desktop using the defined mapping area
            // Update derived properties
            this.desktopMappingArea.right = this.desktopMappingArea.x + this.desktopMappingArea.width;
            this.desktopMappingArea.bottom = this.desktopMappingArea.y + this.desktopMappingArea.height;
            
            // Clamp position to within mapping area
            const clampedX = Math.max(this.desktopMappingArea.x, 
                              Math.min(this.desktopMappingArea.right, mirroredX));
            const clampedY = Math.max(this.desktopMappingArea.y, 
                              Math.min(this.desktopMappingArea.bottom, adjustedCenter.y));
            
            // Map from mapping area to full screen (normalize to 0-1 first, then scale)
            const normalizedX = (clampedX - this.desktopMappingArea.x) / this.desktopMappingArea.width;
            const normalizedY = (clampedY - this.desktopMappingArea.y) / this.desktopMappingArea.height;
            
            screenX = normalizedX * window.screen.width;
            screenY = normalizedY * window.screen.height;
            
        } else if (this.calibrationBounds) {
            // Use mirrored bounds for calibration
            const mirroredBounds = {
                minX: 1.0 - this.calibrationBounds.maxX,
                maxX: 1.0 - this.calibrationBounds.minX,
                minY: this.calibrationBounds.minY,
                maxY: this.calibrationBounds.maxY
            };
            
            screenX = this.mapToScreen(
                mirroredX, 
                mirroredBounds.minX, 
                mirroredBounds.maxX, 
                window.screen.width
            );
            screenY = this.mapToScreen(
                adjustedCenter.y, 
                this.calibrationBounds.minY, 
                this.calibrationBounds.maxY, 
                window.screen.height
            );
        } else {
            screenX = mirroredX * window.screen.width * this.sensitivity;
            screenY = adjustedCenter.y * window.screen.height * this.sensitivity;
        }
        
        screenX = this.applySmoothing(screenX, this.lastMousePosition.x);
        screenY = this.applySmoothing(screenY, this.lastMousePosition.y);
        
        screenX = Math.max(0, Math.min(window.screen.width - 1, screenX));
        screenY = Math.max(0, Math.min(window.screen.height - 1, screenY));
        
        this.lastMousePosition = { x: screenX, y: screenY };
        
        this.simulateMouseMove(screenX, screenY);
    }
    
    isOutsideDeadZone(currentPosition) {
        if (!this.lastHandPosition) {
            this.lastHandPosition = currentPosition;
            return true;
        }
        
        const distance = Math.sqrt(
            Math.pow(currentPosition.x - this.lastHandPosition.x, 2) + 
            Math.pow(currentPosition.y - this.lastHandPosition.y, 2)
        );
        
        if (distance > this.gestureSettings.deadZoneRadius) {
            this.lastHandPosition = currentPosition;
            return true;
        }
        
        return false;
    }

    processGestures(landmarks) {
        const currentTime = performance.now();
        
        // Get key landmarks
        const indexTip = landmarks[8];
        const indexMCP = landmarks[5];
        const middleTip = landmarks[12];
        const middleMCP = landmarks[9];
        const thumbTip = landmarks[4];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];
        
        // Detect various gestures
        const gestureAnalysis = this.analyzeGestures(landmarks);
        
        // Handle left click (pinch with pointing)
        this.processLeftClick(gestureAnalysis, currentTime);
        
        // Handle right click (peace sign)
        this.processRightClick(gestureAnalysis, currentTime);
        
        // Handle scrolling (closed fist movement)
        this.processScrolling(gestureAnalysis, currentTime, landmarks);
        
        // Update gesture state
        this.updateGestureState(gestureAnalysis, currentTime);
        
        // Emit gesture events for UI feedback
        const gestureEvent = new CustomEvent('gestureDetected', {
            detail: {
                gesture: gestureAnalysis.primaryGesture,
                confidence: gestureAnalysis.confidence,
                state: this.gestureState
            },
            bubbles: true,
            composed: true
        });
        
        // Dispatch to component
        this.dispatchEvent(gestureEvent);
        
        // Dispatch globally for desktop mouse service
        if (this.desktopMode.enabled) {
            document.dispatchEvent(gestureEvent);
        }
    }
    
    analyzeGestures(landmarks) {
        const indexTip = landmarks[8];
        const indexPIP = landmarks[6];
        const middleTip = landmarks[12];
        const middlePIP = landmarks[10];
        const thumbTip = landmarks[4];
        const thumbIP = landmarks[3];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];
        
        // Calculate finger extensions
        const indexExtended = this.isFingerExtended(landmarks, 'index');
        const middleExtended = this.isFingerExtended(landmarks, 'middle');
        const ringExtended = this.isFingerExtended(landmarks, 'ring');
        const pinkyExtended = this.isFingerExtended(landmarks, 'pinky');
        const thumbExtended = this.isFingerExtended(landmarks, 'thumb');
        
        // Calculate distances for gesture analysis
        const indexMiddleDistance = this.calculateDistance(indexTip, middleTip);
        
        // Gesture classifications with more lenient fist detection
        const isPointing = indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
        const isPeaceSign = indexExtended && middleExtended && !ringExtended && !pinkyExtended;
        const isThreeFingers = indexExtended && middleExtended && ringExtended && !pinkyExtended;
        
        // Strict fist detection - require all fingers to be closed for reliable scroll gesture
        const extendedFingers = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
        const isFist = extendedFingers === 0; // Require all fingers closed for fist gesture
        
        const isOpenHand = indexExtended && middleExtended && ringExtended && pinkyExtended;
        
        // Determine primary gesture with improved confidence for fist
        let primaryGesture = 'none';
        let confidence = 0;
        
        if (isPeaceSign) {
            primaryGesture = 'leftClick';
            confidence = 0.85;
        } else if (isThreeFingers) {
            primaryGesture = 'rightClick';
            confidence = 0.8;
        } else if (isFist) {
            primaryGesture = 'scroll';
            // Higher confidence for fist with fewer extended fingers
            confidence = 0.8 - (extendedFingers * 0.1);
        } else if (isPointing) {
            primaryGesture = 'point';
            confidence = 0.6;
        } else if (isOpenHand) {
            primaryGesture = 'open';
            confidence = 0.5;
        }
        
        return {
            primaryGesture,
            confidence: Math.max(0, Math.min(1, confidence)),
            isPointing,
            isPeaceSign,
            isThreeFingers,
            isFist,
            isOpenHand,
            fingerStates: {
                index: indexExtended,
                middle: middleExtended,
                ring: ringExtended,
                pinky: pinkyExtended,
                thumb: thumbExtended
            },
            distances: {
                indexMiddle: indexMiddleDistance
            }
        };
    }
    
    
    isFingerExtended(landmarks, finger) {
        const fingerMaps = {
            thumb: { tip: 4, pip: 3, mcp: 2 },
            index: { tip: 8, pip: 6, mcp: 5 },
            middle: { tip: 12, pip: 10, mcp: 9 },
            ring: { tip: 16, pip: 14, mcp: 13 },
            pinky: { tip: 20, pip: 18, mcp: 17 }
        };
        
        const fingerMap = fingerMaps[finger];
        if (!fingerMap) return false;
        
        const tip = landmarks[fingerMap.tip];
        const pip = landmarks[fingerMap.pip];
        const mcp = landmarks[fingerMap.mcp];
        
        // For thumb, check different axis due to thumb orientation
        if (finger === 'thumb') {
            return tip.x > pip.x; // Thumb extends horizontally
        }
        
        // For other fingers, check if tip is above pip and pip is above mcp
        return tip.y < pip.y && pip.y < mcp.y;
    }
    
    processLeftClick(gestureAnalysis, currentTime) {
        const isLeftClickGesture = gestureAnalysis.primaryGesture === 'leftClick' && 
                                  gestureAnalysis.confidence > this.gestureSettings.confidenceThreshold;
        
        if (isLeftClickGesture && !this.gestureState.isClicking) {
            this.gestureState.isClicking = true;
            this.gestureState.lastGestureTime = currentTime;
            
            // Add a small delay to prevent accidental clicks when transitioning from pointing
            setTimeout(() => {
                if (this.gestureState.isClicking) {
                    this.simulateMouseDown();
                }
            }, 100);
            
            // Check for double click
            if (currentTime - this.gestureState.lastClickTime < this.gestureSettings.doubleClickInterval) {
                this.gestureState.clickCount++;
                if (this.gestureState.clickCount === 2) {
                    this.simulateDoubleClick();
                    this.gestureState.clickCount = 0;
                }
            } else {
                this.gestureState.clickCount = 1;
            }
            this.gestureState.lastClickTime = currentTime;
            
        } else if (!isLeftClickGesture && this.gestureState.isClicking) {
            this.gestureState.isClicking = false;
            this.simulateMouseUp();
        }
        
        // Update drag state - peace sign held for dragging
        const wasDragging = this.gestureState.isDragging;
        
        if (this.gestureState.isClicking && 
            currentTime - this.gestureState.lastGestureTime > this.gestureSettings.gestureHoldTime) {
            if (!this.gestureState.isDragging) {
                this.gestureState.isDragging = true;
                this.dispatchDragEvent('start');
            }
        }
        
        if (!this.gestureState.isClicking && wasDragging) {
            this.gestureState.isDragging = false;
            this.dispatchDragEvent('end');
        }
    }
    
    processRightClick(gestureAnalysis, currentTime) {
        const isRightClickGesture = gestureAnalysis.primaryGesture === 'rightClick' && 
                                   gestureAnalysis.confidence > this.gestureSettings.confidenceThreshold;
        
        if (isRightClickGesture && !this.gestureState.isRightClicking) {
            this.gestureState.isRightClicking = true;
            this.gestureState.lastGestureTime = currentTime;
            
            // Trigger right click after short delay to prevent accidental clicks
            setTimeout(() => {
                if (this.gestureState.isRightClicking) {
                    this.simulateRightClick();
                }
            }, this.gestureSettings.gestureHoldTime);
            
        } else if (!isRightClickGesture && this.gestureState.isRightClicking) {
            this.gestureState.isRightClicking = false;
        }
    }
    
    processScrolling(gestureAnalysis, currentTime, landmarks) {
        // Lower confidence threshold specifically for scrolling
        const scrollConfidenceThreshold = 0.5; // Lower than general threshold
        const isScrollGesture = gestureAnalysis.primaryGesture === 'scroll' && 
                               gestureAnalysis.confidence > scrollConfidenceThreshold;
        
        // Enhanced logging for scroll gesture detection
        if (isScrollGesture && !this.gestureState.isScrolling) {
            console.log(`[SCROLL] Fist gesture detected (${Math.round(gestureAnalysis.confidence * 100)}%) - fingers extended: ${[gestureAnalysis.fingerStates.index, gestureAnalysis.fingerStates.middle, gestureAnalysis.fingerStates.ring, gestureAnalysis.fingerStates.pinky].filter(Boolean).length}`);
        }
        
        // Log gesture analysis for debugging
        if (gestureAnalysis.primaryGesture !== 'none' && gestureAnalysis.primaryGesture !== 'point') {
            console.log(`[GESTURE] Detected: ${gestureAnalysis.primaryGesture} (${Math.round(gestureAnalysis.confidence * 100)}%)`);
        }
        
        
        if (isScrollGesture) {
            // Use palm center for more stable scroll tracking
            const wrist = landmarks[0];
            const middleMCP = landmarks[9];
            const palmCenter = {
                x: (wrist.x + middleMCP.x) / 2,
                y: (wrist.y + middleMCP.y) / 2
            };
            
            if (!this.gestureState.isScrolling) {
                this.gestureState.isScrolling = true;
                this.gestureState.lastScrollPosition = { x: palmCenter.x, y: palmCenter.y };
            } else {
                // Calculate scroll delta - inverted Y for natural scrolling
                const deltaY = (this.gestureState.lastScrollPosition.y - palmCenter.y) * this.gestureSettings.scrollSensitivity;
                const deltaX = (palmCenter.x - this.gestureState.lastScrollPosition.x) * this.gestureSettings.scrollSensitivity;
                
                // Responsive threshold for balanced sensitivity scrolling
                if (Math.abs(deltaY) > 1 || Math.abs(deltaX) > 1) {
                    console.log(`[SCROLL] Scrolling: deltaY=${deltaY.toFixed(1)}`);
                    this.simulateScroll(deltaX, deltaY);
                    this.gestureState.lastScrollPosition = { x: palmCenter.x, y: palmCenter.y };
                }
            }
        } else {
            this.gestureState.isScrolling = false;
        }
    }
    
    updateGestureState(gestureAnalysis, currentTime) {
        // Add to gesture history for smoothing
        this.gestureState.gestureHistory.push({
            gesture: gestureAnalysis.primaryGesture,
            confidence: gestureAnalysis.confidence,
            timestamp: currentTime
        });
        
        // Keep only recent history
        const historyLimit = 10;
        if (this.gestureState.gestureHistory.length > historyLimit) {
            this.gestureState.gestureHistory = this.gestureState.gestureHistory.slice(-historyLimit);
        }
    }

    calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const dz = (point1.z || 0) - (point2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    dispatchDragEvent(type) {
        // Always dispatch drag events for browser mode
        const eventName = type === 'start' ? 'dragStart' : 'dragEnd';
        
        // Dispatch service event (always)
        this.dispatchEvent(new CustomEvent(eventName, {
            detail: { 
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y
            }
        }));
        
        // Dispatch desktop event if in desktop mode
        if (this.desktopMode.enabled) {
            const eventType = type === 'start' ? CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_DRAG_START : CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_DRAG_END;
            const dragEvent = new CustomEvent(eventType, {
                detail: { 
                    x: this.lastMousePosition.x, 
                    y: this.lastMousePosition.y, 
                    sourceAppId: this.desktopMode.appId
                },
                bubbles: true,
                composed: true
            });
            document.dispatchEvent(dragEvent);
        }
    }

    mapToScreen(value, minInput, maxInput, maxOutput) {
        const normalizedValue = (value - minInput) / (maxInput - minInput);
        return Math.max(0, Math.min(maxOutput, normalizedValue * maxOutput));
    }

    applySmoothing(newValue, oldValue) {
        return oldValue + (newValue - oldValue) * (1 - this.smoothing);
    }

    simulateMouseMove(x, y) {
        if (this.desktopMode.enabled) {
            // Desktop mode: dispatch desktop mouse move event (no additional scaling needed)
            const desktopEvent = createDesktopMouseMoveMessage({
                x: x, 
                y: y, 
                sourceAppId: this.desktopMode.appId 
            });
            document.dispatchEvent(desktopEvent);
        } else {
            // Browser mode: simulate browser mouse events
            const event = new MouseEvent('mousemove', {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true
            });
            
            const elementAtPoint = document.elementFromPoint(x, y);
            if (elementAtPoint) {
                elementAtPoint.dispatchEvent(event);
            }
        }
        
        this.dispatchEvent(new CustomEvent('mouseMove', {
            detail: { x, y, element: null }
        }));
    }

    simulateMouseDown() {
        if (this.desktopMode.enabled) {
            // Desktop mode: dispatch desktop click event
            const desktopEvent = createDesktopMouseClickMessage({
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                sourceAppId: this.desktopMode.appId,
                button: 'left'
            });
            document.dispatchEvent(desktopEvent);
        } else {
            // Browser mode: simulate browser mouse events
            const event = new MouseEvent('mousedown', {
                clientX: this.lastMousePosition.x,
                clientY: this.lastMousePosition.y,
                button: 0,
                bubbles: true,
                cancelable: true
            });
            
            const elementAtPoint = document.elementFromPoint(
                this.lastMousePosition.x, 
                this.lastMousePosition.y
            );
            
            if (elementAtPoint) {
                elementAtPoint.dispatchEvent(event);
            }
        }
        
        this.dispatchEvent(new CustomEvent('mouseDown', {
            detail: { 
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                element: null 
            }
        }));
    }

    simulateMouseUp() {
        if (this.desktopMode.enabled) {
            // Desktop mode handled by mouseDown event
            return;
        }
        
        const event = new MouseEvent('mouseup', {
            clientX: this.lastMousePosition.x,
            clientY: this.lastMousePosition.y,
            button: 0,
            bubbles: true,
            cancelable: true
        });
        
        const elementAtPoint = document.elementFromPoint(
            this.lastMousePosition.x, 
            this.lastMousePosition.y
        );
        
        if (elementAtPoint) {
            elementAtPoint.dispatchEvent(event);
            
            const clickEvent = new MouseEvent('click', {
                clientX: this.lastMousePosition.x,
                clientY: this.lastMousePosition.y,
                button: 0,
                bubbles: true,
                cancelable: true
            });
            elementAtPoint.dispatchEvent(clickEvent);
        }
        
        this.dispatchEvent(new CustomEvent('mouseUp', {
            detail: { 
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                element: elementAtPoint 
            }
        }));
    }

    simulateRightClick() {
        if (this.desktopMode.enabled) {
            // Desktop mode: dispatch desktop right click event
            const desktopEvent = createDesktopMouseRightClickMessage({
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                sourceAppId: this.desktopMode.appId,
                button: 'right'
            });
            document.dispatchEvent(desktopEvent);
        } else {
            // Browser mode: simulate browser right click
            const event = new MouseEvent('contextmenu', {
                clientX: this.lastMousePosition.x,
                clientY: this.lastMousePosition.y,
                button: 2,
                bubbles: true,
                cancelable: true
            });
            
            const elementAtPoint = document.elementFromPoint(
                this.lastMousePosition.x, 
                this.lastMousePosition.y
            );
            
            if (elementAtPoint) {
                elementAtPoint.dispatchEvent(event);
            }
        }
        
        this.dispatchEvent(new CustomEvent('rightClick', {
            detail: { 
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                element: null 
            }
        }));
    }

    simulateDoubleClick() {
        if (this.desktopMode.enabled) {
            // Desktop mode: dispatch desktop double click event
            const desktopEvent = new CustomEvent(CAMERA_MOUSE_MESSAGES.DESKTOP_MOUSE_DOUBLE_CLICK, {
                detail: { 
                    x: this.lastMousePosition.x, 
                    y: this.lastMousePosition.y, 
                    sourceAppId: this.desktopMode.appId,
                    button: 'left'
                },
                bubbles: true,
                composed: true
            });
            document.dispatchEvent(desktopEvent);
        } else {
            // Browser mode: simulate browser double click
            const event = new MouseEvent('dblclick', {
                clientX: this.lastMousePosition.x,
                clientY: this.lastMousePosition.y,
                button: 0,
                bubbles: true,
                cancelable: true
            });
            
            const elementAtPoint = document.elementFromPoint(
                this.lastMousePosition.x, 
                this.lastMousePosition.y
            );
            
            if (elementAtPoint) {
                elementAtPoint.dispatchEvent(event);
            }
        }
        
        this.dispatchEvent(new CustomEvent('doubleClick', {
            detail: { 
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                element: null 
            }
        }));
    }

    simulateScroll(deltaX, deltaY) {
        if (this.desktopMode.enabled) {
            // Desktop mode: dispatch desktop scroll event
            const desktopEvent = createDesktopMouseScrollMessage({
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                deltaX: deltaX,
                deltaY: deltaY,
                sourceAppId: this.desktopMode.appId
            });
            document.dispatchEvent(desktopEvent);
        } else {
            // Browser mode: simulate browser scroll
            this.performBrowserScroll(deltaX, deltaY);
        }
        
        // The event should show the ACTUAL scroll deltas, not the raw gesture deltas
        this.dispatchEvent(new CustomEvent('scroll', {
            detail: { 
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                deltaX: deltaX,
                deltaY: deltaY,
                element: null 
            }
        }));
    }

    /**
     * Perform actual browser scrolling using multiple methods
     * @param {number} deltaX - Horizontal scroll amount
     * @param {number} deltaY - Vertical scroll amount
     */
    performBrowserScroll(deltaX, deltaY) {
        console.log(`[SCROLL DEBUG] performBrowserScroll called - deltaX: ${deltaX}, deltaY: ${deltaY}`);
        
        // Method 1: Direct window scrolling (most reliable)
        this.performDirectScroll(deltaX, deltaY);
        
        // Method 2: Try wheel event at cursor position for scrollable containers
        const wheelEvent = new WheelEvent('wheel', {
            clientX: this.lastMousePosition.x,
            clientY: this.lastMousePosition.y,
            deltaX: deltaX,
            deltaY: deltaY,
            deltaMode: WheelEvent.DOM_DELTA_PIXEL,
            bubbles: true,
            cancelable: true
        });
        
        // Try to find scrollable element at cursor position
        const elementAtPoint = document.elementFromPoint(
            this.lastMousePosition.x, 
            this.lastMousePosition.y
        );
        
        if (elementAtPoint) {
            // Find scrollable parent element
            const scrollableElement = this.findScrollableParent(elementAtPoint);
            if (scrollableElement && scrollableElement !== document.documentElement) {
                console.log(`[SCROLL DEBUG] Scrolling container element:`, scrollableElement.tagName, scrollableElement.className);
                scrollableElement.dispatchEvent(wheelEvent);
            }
        }
        
        // Method 3: Dispatch wheel event on document as well
        document.dispatchEvent(wheelEvent);
    }

    /**
     * Find the nearest scrollable parent element
     * @param {Element} element - Starting element
     * @returns {Element|null} Scrollable element or null
     */
    findScrollableParent(element) {
        while (element && element !== document.body && element !== document.documentElement) {
            const style = window.getComputedStyle(element);
            const overflowY = style.overflowY;
            const overflowX = style.overflowX;
            
            // Check if element is scrollable
            if ((overflowY === 'scroll' || overflowY === 'auto' || overflowX === 'scroll' || overflowX === 'auto') &&
                (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)) {
                return element;
            }
            
            element = element.parentElement;
        }
        
        // Return document element if no scrollable parent found
        return document.documentElement;
    }

    /**
     * Perform direct scroll manipulation on window and document
     * @param {number} deltaX - Horizontal scroll amount
     * @param {number} deltaY - Vertical scroll amount
     */
    performDirectScroll(deltaX, deltaY) {
        console.log(`[SCROLL DEBUG] performDirectScroll called - deltaX: ${deltaX}, deltaY: ${deltaY}`);
        // Try multiple scroll methods for maximum compatibility
        
        // Method 1: window.scrollBy (most reliable)
        if (window.scrollBy) {
            console.log(`[SCROLL DEBUG] Using window.scrollBy(${deltaX}, ${deltaY})`);
            window.scrollBy(deltaX, deltaY);
        }
        
        // Method 2: document.documentElement.scrollTop/scrollLeft
        if (document.documentElement) {
            const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const currentScrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
            
            const newScrollTop = Math.max(0, currentScrollTop + deltaY);
            const newScrollLeft = Math.max(0, currentScrollLeft + deltaX);
            
            if (document.documentElement.scrollTo) {
                document.documentElement.scrollTo(newScrollLeft, newScrollTop);
            } else {
                document.documentElement.scrollTop = newScrollTop;
                document.documentElement.scrollLeft = newScrollLeft;
            }
        }
        
        // Method 3: document.body fallback
        if (document.body) {
            const currentScrollTop = document.body.scrollTop;
            const currentScrollLeft = document.body.scrollLeft;
            
            document.body.scrollTop = Math.max(0, currentScrollTop + deltaY);
            document.body.scrollLeft = Math.max(0, currentScrollLeft + deltaX);
        }
    }

    startCalibration() {
        this.isCalibrating = true;
        this.calibrationBounds = {
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity
        };
        console.log('Calibration started');
    }

    updateCalibrationBounds(landmarks) {
        // Use palm center for calibration (same as tracking)
        const wrist = landmarks[0];
        const middleMCP = landmarks[9];
        const palmCenter = {
            x: (wrist.x + middleMCP.x) / 2,
            y: (wrist.y + middleMCP.y) / 2
        };
        
        // Store original (non-mirrored) bounds for proper calibration
        this.calibrationBounds.minX = Math.min(this.calibrationBounds.minX, palmCenter.x);
        this.calibrationBounds.maxX = Math.max(this.calibrationBounds.maxX, palmCenter.x);
        this.calibrationBounds.minY = Math.min(this.calibrationBounds.minY, palmCenter.y);
        this.calibrationBounds.maxY = Math.max(this.calibrationBounds.maxY, palmCenter.y);
    }

    finishCalibration() {
        this.isCalibrating = false;
        
        if (this.calibrationBounds) {
            const padding = 0.05;
            const rangeX = this.calibrationBounds.maxX - this.calibrationBounds.minX;
            const rangeY = this.calibrationBounds.maxY - this.calibrationBounds.minY;
            
            this.calibrationBounds.minX -= rangeX * padding;
            this.calibrationBounds.maxX += rangeX * padding;
            this.calibrationBounds.minY -= rangeY * padding;
            this.calibrationBounds.maxY += rangeY * padding;
            
            console.log('Calibration completed:', this.calibrationBounds);
        }
    }

    getHandBounds(landmarks) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        landmarks.forEach(landmark => {
            minX = Math.min(minX, landmark.x);
            maxX = Math.max(maxX, landmark.x);
            minY = Math.min(minY, landmark.y);
            maxY = Math.max(maxY, landmark.y);
        });
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    setSensitivity(value) {
        this.sensitivity = Math.max(0.1, Math.min(3.0, value));
        this.saveSettings();
        console.log('Sensitivity set to:', this.sensitivity);
    }

    setSmoothing(value) {
        this.smoothing = Math.max(0, Math.min(0.9, value));
        this.saveSettings();
        console.log('Smoothing set to:', this.smoothing);
    }

    /**
     * Set cursor offset for fine-tuning cursor position relative to hand
     * @param {number} x - Horizontal offset (-0.2 to 0.2, positive = right)
     * @param {number} y - Vertical offset (-0.2 to 0.2, positive = down)
     */
    setCursorOffset(x, y) {
        this.cursorOffset.x = Math.max(-0.2, Math.min(0.2, x));
        this.cursorOffset.y = Math.max(-0.2, Math.min(0.2, y));
        this.saveSettings();
        console.log('Cursor offset set to:', this.cursorOffset);
    }

    /**
     * Get current cursor offset
     * @returns {Object} Current cursor offset {x, y}
     */
    getCursorOffset() {
        return { ...this.cursorOffset };
    }

    /**
     * Set desktop mapping area size and position
     * @param {number} x - Left edge (0.0 to 1.0)
     * @param {number} y - Top edge (0.0 to 1.0)
     * @param {number} width - Width (0.1 to 1.0)
     * @param {number} height - Height (0.1 to 1.0)
     */
    setDesktopMappingArea(x, y, width, height) {
        this.desktopMappingArea.x = Math.max(0, Math.min(1 - width, x));
        this.desktopMappingArea.y = Math.max(0, Math.min(1 - height, y));
        this.desktopMappingArea.width = Math.max(0.1, Math.min(1, width));
        this.desktopMappingArea.height = Math.max(0.1, Math.min(1, height));
        
        // Update derived properties
        this.desktopMappingArea.right = this.desktopMappingArea.x + this.desktopMappingArea.width;
        this.desktopMappingArea.bottom = this.desktopMappingArea.y + this.desktopMappingArea.height;
        
        this.saveSettings();
        console.log('Desktop mapping area updated:', this.desktopMappingArea);
    }

    /**
     * Enable/disable desktop mapping area
     * @param {boolean} enabled - Whether to use mapping area
     */
    setDesktopMappingEnabled(enabled) {
        this.desktopMappingArea.enabled = enabled;
        this.saveSettings();
        console.log('Desktop mapping area enabled:', enabled);
    }

    /**
     * Get current desktop mapping area
     * @returns {Object} Current mapping area configuration
     */
    getDesktopMappingArea() {
        return { ...this.desktopMappingArea };
    }

    /**
     * Save current settings to localStorage
     */
    saveSettings() {
        const settings = {
            sensitivity: this.sensitivity,
            smoothing: this.smoothing,
            cursorOffset: { ...this.cursorOffset },
            desktopMappingArea: {
                enabled: this.desktopMappingArea.enabled,
                x: this.desktopMappingArea.x,
                y: this.desktopMappingArea.y,
                width: this.desktopMappingArea.width,
                height: this.desktopMappingArea.height
            },
            gestureSettings: { ...this.gestureSettings }
        };
        
        try {
            localStorage.setItem('camera-mouse-settings', JSON.stringify(settings));
            console.log('Settings saved:', settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('camera-mouse-settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                // Apply saved settings
                if (typeof settings.sensitivity === 'number') {
                    this.sensitivity = settings.sensitivity;
                }
                if (typeof settings.smoothing === 'number') {
                    this.smoothing = settings.smoothing;
                }
                if (settings.cursorOffset) {
                    this.cursorOffset = { ...this.cursorOffset, ...settings.cursorOffset };
                }
                if (settings.desktopMappingArea) {
                    this.desktopMappingArea = { 
                        ...this.desktopMappingArea, 
                        ...settings.desktopMappingArea 
                    };
                    // Update derived properties
                    this.desktopMappingArea.right = this.desktopMappingArea.x + this.desktopMappingArea.width;
                    this.desktopMappingArea.bottom = this.desktopMappingArea.y + this.desktopMappingArea.height;
                }
                if (settings.gestureSettings) {
                    this.gestureSettings = { ...this.gestureSettings, ...settings.gestureSettings };
                }
                
                console.log('Settings loaded:', settings);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * Reset all settings to defaults
     */
    resetAllSettings() {
        this.sensitivity = 1.0;
        this.smoothing = 0.3;
        this.cursorOffset = { x: 0.05, y: 0.08 };
        this.desktopMappingArea = {
            enabled: true,
            x: 0.25,
            y: 0.25,
            width: 0.5,
            height: 0.5,
            right: 0.75,
            bottom: 0.75
        };
        this.gestureSettings = {
            confidenceThreshold: 0.7,
            deadZoneRadius: 0.02,
            doubleClickInterval: 300,
            scrollSensitivity: 100,
            gestureHoldTime: 150
        };
        
        this.saveSettings();
        console.log('All settings reset to defaults');
    }

    /**
     * Get current settings as JSON for copying to source code
     * @returns {string} JSON string of current settings
     */
    exportSettings() {
        const settings = {
            sensitivity: this.sensitivity,
            smoothing: this.smoothing,
            cursorOffset: { ...this.cursorOffset },
            desktopMappingArea: {
                enabled: this.desktopMappingArea.enabled,
                x: this.desktopMappingArea.x,
                y: this.desktopMappingArea.y,
                width: this.desktopMappingArea.width,
                height: this.desktopMappingArea.height
            },
            gestureSettings: { ...this.gestureSettings }
        };
        
        const exportString = JSON.stringify(settings, null, 2);
        console.log('Current settings for source code:');
        console.log(exportString);
        return exportString;
    }

    /**
     * Apply custom settings (used for constructor defaults)
     * @param {Object} customSettings - Settings object to apply
     */
    applyCustomSettings(customSettings) {
        if (typeof customSettings.sensitivity === 'number') {
            this.sensitivity = customSettings.sensitivity;
        }
        if (typeof customSettings.smoothing === 'number') {
            this.smoothing = customSettings.smoothing;
        }
        if (customSettings.cursorOffset) {
            this.cursorOffset = { ...this.cursorOffset, ...customSettings.cursorOffset };
        }
        if (customSettings.desktopMappingArea) {
            this.desktopMappingArea = { 
                ...this.desktopMappingArea, 
                ...customSettings.desktopMappingArea 
            };
            this.desktopMappingArea.right = this.desktopMappingArea.x + this.desktopMappingArea.width;
            this.desktopMappingArea.bottom = this.desktopMappingArea.y + this.desktopMappingArea.height;
        }
        if (customSettings.gestureSettings) {
            this.gestureSettings = { ...this.gestureSettings, ...customSettings.gestureSettings };
        }
        console.log('Custom settings applied:', customSettings);
    }

    /**
     * Enable desktop integration mode
     * @param {number} screenWidth - Desktop screen width
     * @param {number} screenHeight - Desktop screen height
     */
    enableDesktopMode(screenWidth = window.screen.width, screenHeight = window.screen.height) {
        this.desktopMode.enabled = true;
        
        // Calculate coordinate scaling factor
        const videoWidth = this.videoElement?.videoWidth || 640;
        const videoHeight = this.videoElement?.videoHeight || 480;
        this.desktopMode.coordinateScale = Math.min(
            screenWidth / videoWidth,
            screenHeight / videoHeight
        );
        
        // Only dispatch desktop events if we have the message types available
        if (this.hasDesktopMessageSupport()) {
            const enabledEvent = new CustomEvent('desktop-mouse-enabled', {
                detail: { 
                    sourceAppId: this.desktopMode.appId, 
                    enabled: true,
                    screenWidth,
                    screenHeight
                },
                bubbles: true,
                composed: true
            });
            document.dispatchEvent(enabledEvent);
        }
        
        console.log(`Desktop mode enabled with scale: ${this.desktopMode.coordinateScale}`);
        
        // Emit service event for listeners
        this.dispatchEvent(new CustomEvent('desktopModeEnabled', {
            detail: { enabled: true, screenWidth, screenHeight }
        }));
    }

    /**
     * Disable desktop integration mode
     */
    disableDesktopMode() {
        const wasEnabled = this.desktopMode.enabled;
        this.desktopMode.enabled = false;
        this.desktopMode.coordinateScale = 1.0;
        
        if (wasEnabled) {
            // Only dispatch desktop events if we have the message types available
            if (this.hasDesktopMessageSupport()) {
                const disabledEvent = new CustomEvent('desktop-mouse-disabled', {
                    detail: { 
                        sourceAppId: this.desktopMode.appId, 
                        enabled: false 
                    },
                    bubbles: true,
                    composed: true
                });
                document.dispatchEvent(disabledEvent);
            }
            
            console.log('Desktop mode disabled');
            
            // Emit service event for listeners
            this.dispatchEvent(new CustomEvent('desktopModeDisabled', {
                detail: { enabled: false }
            }));
        }
    }

    /**
     * Check if desktop message support is available
     * @returns {boolean} True if desktop messaging is supported
     */
    hasDesktopMessageSupport() {
        return !!(this.messageTypes || window.CAMERA_MOUSE_MESSAGES);
    }

    /**
     * Check if desktop mode is enabled
     * @returns {boolean} Whether desktop mode is active
     */
    isDesktopModeEnabled() {
        return this.desktopMode.enabled;
    }

    /**
     * Get desktop mode configuration
     * @returns {Object} Desktop mode configuration
     */
    getDesktopModeConfig() {
        return { ...this.desktopMode };
    }
    
    /**
     * Set desktop mode enabled/disabled
     * @param {boolean} enabled - Whether to enable desktop mode
     */
    setDesktopMode(enabled) {
        if (enabled) {
            this.enableDesktopMode();
        } else {
            this.disableDesktopMode();
        }
    }

    cleanup() {
        this.disableDesktopMode();
        this.stopTracking();
        this.stopCamera();
        
        if (this.handLandmarker) {
            this.handLandmarker.close();
            this.handLandmarker = null;
        }
        
        console.log('CameraMouseService cleaned up');
    }
}

// Auto-initialization and event-driven service management
let globalCameraMouseService = null;

/**
 * Initialize the global camera mouse service
 */
async function initializeGlobalService() {
    if (globalCameraMouseService) {
        console.log('Global camera mouse service already exists');
        return globalCameraMouseService;
    }
    
    try {
        globalCameraMouseService = new CameraMouseService();
        await globalCameraMouseService.initializeStandalone();
        
        // Emit global event that service is ready
        document.dispatchEvent(new CustomEvent('cameraMouseServiceReady', {
            detail: { message: 'Camera mouse service initialized and ready' },
            bubbles: true
        }));
        
        console.log('Global camera mouse service initialized');
        return globalCameraMouseService;
        
    } catch (error) {
        console.error('Failed to initialize global camera mouse service:', error);
        document.dispatchEvent(new CustomEvent('cameraMouseServiceError', {
            detail: { error: error.message },
            bubbles: true
        }));
        throw error;
    }
}

/**
 * Handle global START_TRACKING event
 */
async function handleStartTracking(event) {
    try {
        if (!globalCameraMouseService) {
            await initializeGlobalService();
        }
        
        // Emit progress events to document
        const emitProgress = (step, message) => {
            document.dispatchEvent(new CustomEvent('cameraMouseProgress', {
                detail: { step, message },
                bubbles: true
            }));
        };
        
        emitProgress('starting', 'Starting camera mouse tracking...');
        await globalCameraMouseService.startFullTracking();
        
        document.dispatchEvent(new CustomEvent('cameraMouseTrackingStarted', {
            detail: { message: 'Camera mouse tracking active' },
            bubbles: true
        }));
        
    } catch (error) {
        console.error('Failed to start tracking:', error);
        document.dispatchEvent(new CustomEvent('cameraMouseTrackingError', {
            detail: { error: error.message },
            bubbles: true
        }));
    }
}

/**
 * Handle global STOP_TRACKING event
 */
async function handleStopTracking(event) {
    try {
        if (globalCameraMouseService) {
            await globalCameraMouseService.stopFullTracking();
            
            document.dispatchEvent(new CustomEvent('cameraMouseTrackingStopped', {
                detail: { message: 'Camera mouse tracking stopped' },
                bubbles: true
            }));
        }
    } catch (error) {
        console.error('Failed to stop tracking:', error);
        document.dispatchEvent(new CustomEvent('cameraMouseTrackingError', {
            detail: { error: error.message },
            bubbles: true
        }));
    }
}

/**
 * Handle global HARD_REFRESH event
 */
async function handleHardRefresh(event) {
    try {
        if (globalCameraMouseService) {
            document.dispatchEvent(new CustomEvent('cameraMouseProgress', {
                detail: { step: 'hard_refresh', message: 'Hard refreshing camera mouse...' },
                bubbles: true
            }));
            
            await globalCameraMouseService.hardRefresh();
            globalCameraMouseService = null; // Clear the global reference
            
            document.dispatchEvent(new CustomEvent('cameraMouseHardRefreshComplete', {
                detail: { message: 'Hard refresh complete - ready to restart' },
                bubbles: true
            }));
        }
    } catch (error) {
        console.error('Failed to hard refresh:', error);
        document.dispatchEvent(new CustomEvent('cameraMouseTrackingError', {
            detail: { error: error.message },
            bubbles: true
        }));
    }
}

/**
 * Forward service events to document level
 */
function forwardServiceEvents() {
    if (!globalCameraMouseService) return;
    
    // Forward all important events to document level
    const eventsToForward = [
        'mouseMove', 'mouseDown', 'mouseUp', 'rightClick', 'scroll',
        'gestureDetected', 'dragStart', 'dragEnd',
        'trackingProgress', 'trackingReady', 'trackingStopped', 'trackingError'
    ];
    
    eventsToForward.forEach(eventType => {
        globalCameraMouseService.addEventListener(eventType, (event) => {
            document.dispatchEvent(new CustomEvent(`cameraMouseService${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
                detail: event.detail,
                bubbles: true
            }));
        });
    });
}

// Auto-setup global event listeners when service is imported
document.addEventListener('START_TRACKING', handleStartTracking);
document.addEventListener('STOP_TRACKING', handleStopTracking);
document.addEventListener('HARD_REFRESH', handleHardRefresh);

// Forward events when service becomes available
document.addEventListener('cameraMouseServiceReady', forwardServiceEvents);

export { CameraMouseService };