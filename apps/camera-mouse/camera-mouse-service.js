import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';

class CameraMouseService extends EventTarget {
    constructor() {
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
            isDragging: false,
            lastGestureTime: 0
        };
    }

    async initialize() {
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
        const indexTip = landmarks[8];
        let screenX, screenY;
        
        // Mirror the X coordinate to fix left-right mirroring
        const mirroredX = 1.0 - indexTip.x;
        
        if (this.calibrationBounds) {
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
                indexTip.y, 
                this.calibrationBounds.minY, 
                this.calibrationBounds.maxY, 
                window.screen.height
            );
        } else {
            screenX = mirroredX * window.screen.width * this.sensitivity;
            screenY = indexTip.y * window.screen.height * this.sensitivity;
        }
        
        screenX = this.applySmoothing(screenX, this.lastMousePosition.x);
        screenY = this.applySmoothing(screenY, this.lastMousePosition.y);
        
        screenX = Math.max(0, Math.min(window.screen.width - 1, screenX));
        screenY = Math.max(0, Math.min(window.screen.height - 1, screenY));
        
        this.lastMousePosition = { x: screenX, y: screenY };
        
        this.simulateMouseMove(screenX, screenY);
    }

    processGestures(landmarks) {
        const currentTime = performance.now();
        
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const middleTip = landmarks[12];
        
        const pinchDistance = this.calculateDistance(indexTip, thumbTip);
        const isPinching = pinchDistance < 0.05;
        
        const indexMidDistance = this.calculateDistance(indexTip, middleTip);
        const isPointing = indexMidDistance > 0.08;
        
        if (isPinching && !this.gestureState.isClicking && isPointing) {
            this.gestureState.isClicking = true;
            this.gestureState.lastGestureTime = currentTime;
            this.simulateMouseDown();
        } else if (!isPinching && this.gestureState.isClicking) {
            this.gestureState.isClicking = false;
            this.simulateMouseUp();
        }
        
        if (this.gestureState.isClicking && currentTime - this.gestureState.lastGestureTime > 100) {
            this.gestureState.isDragging = true;
        }
        
        if (!this.gestureState.isClicking) {
            this.gestureState.isDragging = false;
        }
    }

    calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        const dz = (point1.z || 0) - (point2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    mapToScreen(value, minInput, maxInput, maxOutput) {
        const normalizedValue = (value - minInput) / (maxInput - minInput);
        return Math.max(0, Math.min(maxOutput, normalizedValue * maxOutput));
    }

    applySmoothing(newValue, oldValue) {
        return oldValue + (newValue - oldValue) * (1 - this.smoothing);
    }

    simulateMouseMove(x, y) {
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
        
        this.dispatchEvent(new CustomEvent('mouseMove', {
            detail: { x, y, element: elementAtPoint }
        }));
    }

    simulateMouseDown() {
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
        
        this.dispatchEvent(new CustomEvent('mouseDown', {
            detail: { 
                x: this.lastMousePosition.x, 
                y: this.lastMousePosition.y, 
                element: elementAtPoint 
            }
        }));
    }

    simulateMouseUp() {
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
        const indexTip = landmarks[8];
        
        // Store original (non-mirrored) bounds for proper calibration
        this.calibrationBounds.minX = Math.min(this.calibrationBounds.minX, indexTip.x);
        this.calibrationBounds.maxX = Math.max(this.calibrationBounds.maxX, indexTip.x);
        this.calibrationBounds.minY = Math.min(this.calibrationBounds.minY, indexTip.y);
        this.calibrationBounds.maxY = Math.max(this.calibrationBounds.maxY, indexTip.y);
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
        console.log('Sensitivity set to:', this.sensitivity);
    }

    setSmoothing(value) {
        this.smoothing = Math.max(0, Math.min(0.9, value));
        console.log('Smoothing set to:', this.smoothing);
    }

    cleanup() {
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