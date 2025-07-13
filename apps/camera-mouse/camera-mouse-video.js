import { EVENTS } from './event-constants.js';

class CameraMouseVideo extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.lastHandLandmarks = null;
        this.mappingArea = null;
        this.cursorOffset = { x: 0, y: 0 };
        
        // Generate unique component ID for event targeting
        this.componentId = `camera-mouse-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    connectedCallback() {
        console.log('Video component connected with ID:', this.componentId);
        this.render();
        this.setupEventListeners();
        this.announceReady();
    }

    disconnectedCallback() {
        this.cleanup();
    }

    announceReady() {
        // Announce that this video component is ready
        console.log('Video component announcing ready:', this.componentId);
        document.dispatchEvent(new CustomEvent(EVENTS.VIDEO_COMPONENT_READY, {
            detail: {
                componentId: this.componentId,
                ready: true,
                element: this // For debugging purposes, remove in production
            }
        }));
    }

    cleanup() {
        // Remove document event listeners to prevent memory leaks
        document.removeEventListener(EVENTS.VIDEO_STREAM_SET, this.handleStreamSet.bind(this));
        document.removeEventListener(EVENTS.VIDEO_STREAM_CLEAR, this.handleStreamClear.bind(this));
        document.removeEventListener(EVENTS.VIDEO_HAND_LANDMARKS_UPDATE, this.handleLandmarksUpdate.bind(this));
        document.removeEventListener(EVENTS.VIDEO_MAPPING_SETTINGS_UPDATE, this.handleMappingUpdate.bind(this));
        document.removeEventListener(EVENTS.VIDEO_RESIZE_REQUEST, this.handleResizeRequest.bind(this));
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    width: 100%;
                    height: 300px;
                }

                .video-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
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
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .video-stream[style*="display: none"] + .video-overlay {
                    display: none;
                }

                @media (max-width: 768px) {
                    :host {
                        height: 250px;
                    }
                }
            </style>

            <div class="video-container" id="videoContainer">
                <div class="placeholder" id="placeholder">Camera feed will appear here</div>
                <video class="video-stream" id="videoStream" autoplay muted playsinline style="display: none;"></video>
                <canvas class="video-overlay" id="overlay"></canvas>
            </div>
        `;
    }

    setupEventListeners() {
        // Bind event handlers to preserve 'this' context
        this.handleStreamSet = this.handleStreamSet.bind(this);
        this.handleStreamClear = this.handleStreamClear.bind(this);
        this.handleLandmarksUpdate = this.handleLandmarksUpdate.bind(this);
        this.handleMappingUpdate = this.handleMappingUpdate.bind(this);
        this.handleResizeRequest = this.handleResizeRequest.bind(this);

        // Listen for document-level events (fully decoupled)
        document.addEventListener(EVENTS.VIDEO_STREAM_SET, this.handleStreamSet);
        document.addEventListener(EVENTS.VIDEO_STREAM_CLEAR, this.handleStreamClear);
        document.addEventListener(EVENTS.VIDEO_HAND_LANDMARKS_UPDATE, this.handleLandmarksUpdate);
        document.addEventListener(EVENTS.VIDEO_MAPPING_SETTINGS_UPDATE, this.handleMappingUpdate);
        document.addEventListener(EVENTS.VIDEO_RESIZE_REQUEST, this.handleResizeRequest);
        document.addEventListener(EVENTS.TRACKING_STARTED, this.startTracking.bind(this));
        


        // Handle video element events
        const videoElement = this.shadowRoot.getElementById('videoStream');
        videoElement.addEventListener('loadedmetadata', () => {
            // No longer dispatch local events - component is autonomous
            console.log(`Video component ${this.componentId} stream loaded`);
        });

        videoElement.addEventListener('error', (error) => {
            // Report errors via document events
            document.dispatchEvent(new CustomEvent(EVENTS.VIDEO_COMPONENT_ERROR, {
                detail: {
                    componentId: this.componentId,
                    error: error,
                    context: 'video-element-error'
                }
            }));
        });
    }

    // Document event handlers (check if event is targeted to this component)
    handleStreamSet(event) {
        const { targetId, stream, show } = event.detail;
        console.log('Video component received stream event:', { targetId, myId: this.componentId, stream, show });
        if (targetId === this.componentId || targetId === 'all') {
            console.log('Stream event matches this component, updating video');
            this.updateVideoStream({ stream, show });
        }
    }

    handleStreamClear(event) {
        const { targetId } = event.detail;
        if (targetId === this.componentId || targetId === 'all') {
            this.clearVideoStream();
        }
    }

    handleLandmarksUpdate(event) {
        const { targetId, landmarks, confidence, timestamp } = event.detail;
        if (targetId === this.componentId) {
            this.handleHandDetection({ landmarks, confidence, timestamp });
        }
    }

    handleMappingUpdate(event) {
        const { targetId, mappingArea, cursorOffset } = event.detail;
        if (targetId === this.componentId) {
            this.updateMappingSettings({ mappingArea, cursorOffset });
        }
    }

    handleResizeRequest(event) {
        const { targetId } = event.detail;
        if (targetId === this.componentId) {
            this.resize();
        }
    }

    updateVideoStream(detail) {
        const { stream, show } = detail;
        const videoElement = this.shadowRoot.getElementById('videoStream');
        const placeholder = this.shadowRoot.getElementById('placeholder');

        if (stream) {
            videoElement.srcObject = stream;
        }

        if (show) {
            videoElement.style.display = 'block';
            placeholder.style.display = 'none';
        } else {
            videoElement.style.display = 'none';
            placeholder.style.display = 'block';
        }
    }

    updateMappingSettings(detail) {
        const { mappingArea, cursorOffset } = detail;
        this.mappingArea = mappingArea;
        this.cursorOffset = cursorOffset;
        
        // Redraw overlay with new settings if we have landmarks
        if (this.lastHandLandmarks) {
            this.redrawOverlay();
        }
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

    redrawOverlay() {
        if (!this.lastHandLandmarks) return;

        const overlay = this.shadowRoot.getElementById('overlay');
        const ctx = overlay.getContext('2d');
        const videoContainer = this.shadowRoot.getElementById('videoContainer');
        
        overlay.width = videoContainer.clientWidth;
        overlay.height = videoContainer.clientHeight;
        
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        this.drawHandLandmarks(ctx, this.lastHandLandmarks, overlay.width, overlay.height);
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
        const adjustedX = (1.0 - ((wrist.x + middleMCP.x) / 2 + this.cursorOffset.x)) * width;
        const adjustedY = ((wrist.y + middleMCP.y) / 2 + this.cursorOffset.y) * height;
        
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
        
        // Draw desktop mapping area if available
        if (this.mappingArea) {
            this.drawDesktopMappingArea(ctx, width, height);
        }
    }

    drawDesktopMappingArea(ctx, width, height) {
        if (!this.mappingArea || !this.mappingArea.enabled) return;
        
        // Calculate rectangle coordinates (mirror X for display)
        const rectLeft = (1.0 - this.mappingArea.right) * width;
        const rectRight = (1.0 - this.mappingArea.x) * width;
        const rectTop = this.mappingArea.y * height;
        const rectBottom = this.mappingArea.bottom * height;
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
        if (this.lastHandLandmarks) {
            const wrist = this.lastHandLandmarks[0];
            const middleMCP = this.lastHandLandmarks[9];
            
            const palmCenter = {
                x: (wrist.x + middleMCP.x) / 2,
                y: (wrist.y + middleMCP.y) / 2
            };
            const adjustedCenter = {
                x: palmCenter.x + this.cursorOffset.x,
                y: palmCenter.y + this.cursorOffset.y
            };
            
            const isOutside = adjustedCenter.x < this.mappingArea.x || 
                             adjustedCenter.x > this.mappingArea.right ||
                             adjustedCenter.y < this.mappingArea.y || 
                             adjustedCenter.y > this.mappingArea.bottom;
            
            if (isOutside) {
                ctx.fillStyle = '#ff6600';
                ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Move hand into green area to control desktop', width/2, height - 20);
            }
        }
    }

    // Public method to clear the video stream
    clearVideoStream() {
        const videoElement = this.shadowRoot.getElementById('videoStream');
        const placeholder = this.shadowRoot.getElementById('placeholder');
        
        videoElement.srcObject = null;
        videoElement.style.display = 'none';
        placeholder.style.display = 'block';
        
        // Clear overlay
        const overlay = this.shadowRoot.getElementById('overlay');
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        
        this.lastHandLandmarks = null;
    }

    // Public method to get video element (for external access if needed)
    getVideoElement() {
        return this.shadowRoot.getElementById('videoStream');
    }

    // Public method to trigger overlay redraw (useful for window resize)
    resize() {
        if (this.lastHandLandmarks) {
            this.redrawOverlay();
        }
    }

    async startTracking(event) {
        // try {
            const cameraMouseService = event.detail.service 
            const videoElement = this.shadowRoot.getElementById('videoStream');
            videoElement.srcObject = cameraMouseService.getVideoStream();
            videoElement.style.display = 'block';
            this.shadowRoot.querySelector('.placeholder').style.display = 'none';
            
            // this.updateStatus('Starting hand tracking...');
            // await this.cameraMouseService.startTracking();
            
            this.isTracking = true;
            // this.updateControlsState();
            // this.updateStatus('Tracking active');
            // this.startPerformanceMonitoring();
        // } catch (error) {
        //     this.handleError(error, 'starting tracking');
        // }
    }
}

customElements.define('camera-mouse-video', CameraMouseVideo);