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
            scrollSensitivity: 50,
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
     * Register camera mouse message types with global message system
     */
    registerMessageTypes() {
        try {
            // Try to import and extend global message system
            import('/desktop/src/events/message-types.js').then(messageTypesModule => {
                const { MESSAGES, validateMessagePayload } = messageTypesModule;
                registerCameraMouseMessages(MESSAGES, validateMessagePayload);
            }).catch(error => {
                console.warn('Could not register with global message system:', error);
                // Create minimal local message system for standalone use
                window.CAMERA_MOUSE_MESSAGES = CAMERA_MOUSE_MESSAGES;
            });
        } catch (error) {
            console.warn('Message type registration failed:', error);
        }
    }

    async initialize() {
        // Register camera mouse message types with global system
        this.registerMessageTypes();
        try {
            // Check for required browser APIs
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Camera access not supported in this browser');
            }

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
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
            
            // Provide more specific error messages
            let userMessage = 'Failed to initialize hand tracking';
            if (error.message.includes('Camera access')) {
                userMessage = 'Camera access is not supported in this browser. Please use Chrome, Firefox, or Safari.';
            } else if (error.message.includes('network')) {
                userMessage = 'Network error loading hand tracking models. Please check your internet connection.';
            } else if (error.message.includes('GPU')) {
                userMessage = 'GPU acceleration not available. Performance may be reduced.';
            }
            
            this.dispatchEvent(new CustomEvent('initializationError', { 
                detail: { error: error.message, userMessage } 
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
        
        // Gesture classifications
        const isPointing = indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
        const isPeaceSign = indexExtended && middleExtended && !ringExtended && !pinkyExtended;
        const isThreeFingers = indexExtended && middleExtended && ringExtended && !pinkyExtended;
        const isFist = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
        const isOpenHand = indexExtended && middleExtended && ringExtended && pinkyExtended;
        
        // Determine primary gesture
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
            confidence = 0.7;
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
        const isScrollGesture = gestureAnalysis.primaryGesture === 'scroll' && 
                               gestureAnalysis.confidence > this.gestureSettings.confidenceThreshold;
        
        if (isScrollGesture) {
            const indexTip = landmarks[8];
            
            if (!this.gestureState.isScrolling) {
                this.gestureState.isScrolling = true;
                this.gestureState.lastScrollPosition = { x: indexTip.x, y: indexTip.y };
            } else {
                // Calculate scroll delta
                const deltaY = (this.gestureState.lastScrollPosition.y - indexTip.y) * this.gestureSettings.scrollSensitivity;
                
                if (Math.abs(deltaY) > 1) { // Minimum movement threshold
                    this.simulateScroll(0, deltaY);
                    this.gestureState.lastScrollPosition = { x: indexTip.x, y: indexTip.y };
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
            console.log(`Drag ${type} dispatched at (${this.lastMousePosition.x}, ${this.lastMousePosition.y})`);
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
            const event = new WheelEvent('wheel', {
                clientX: this.lastMousePosition.x,
                clientY: this.lastMousePosition.y,
                deltaX: deltaX,
                deltaY: deltaY,
                deltaMode: WheelEvent.DOM_DELTA_PIXEL,
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
            scrollSensitivity: 50,
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
        
        // Dispatch desktop mouse enabled event
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
        
        console.log(`Desktop mode enabled with scale: ${this.desktopMode.coordinateScale}`);
    }

    /**
     * Disable desktop integration mode
     */
    disableDesktopMode() {
        const wasEnabled = this.desktopMode.enabled;
        this.desktopMode.enabled = false;
        this.desktopMode.coordinateScale = 1.0;
        
        if (wasEnabled) {
            // Dispatch desktop mouse disabled event
            const disabledEvent = new CustomEvent('desktop-mouse-disabled', {
                detail: { 
                    sourceAppId: this.desktopMode.appId, 
                    enabled: false 
                },
                bubbles: true,
                composed: true
            });
            document.dispatchEvent(disabledEvent);
            
            console.log('Desktop mode disabled');
        }
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

export { CameraMouseService };