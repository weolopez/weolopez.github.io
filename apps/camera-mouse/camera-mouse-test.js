class CameraMouseTest extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.eventCount = 0;
        this.maxEvents = 50;
        this.trackingEnabled = false;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.initializeMouseTracker();
        this.logEvent('Camera Mouse Test loaded. Start tracking to begin.');
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin-top: 40px;
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }

                h2 {
                    font-size: 1.5rem;
                    margin-bottom: 20px;
                    color: #333;
                    text-align: center;
                }

                .test-area {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 40px;
                    margin: 20px 0;
                    min-height: 200px;
                    border: 2px dashed #dee2e6;
                    text-align: center;
                    position: relative;
                    transition: all 0.3s ease;
                }

                .test-area:hover {
                    border-color: #667eea;
                    background: #f0f2ff;
                }

                .test-area h3 {
                    color: #495057;
                    margin-bottom: 15px;
                }

                .test-area p {
                    color: #6c757d;
                    line-height: 1.5;
                }

                .clickable-buttons {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }

                .test-button {
                    padding: 15px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: white;
                }

                .test-button.primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .test-button.success {
                    background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
                }

                .test-button.warning {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }

                .test-button.info {
                    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                }

                .test-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }

                .test-button:active {
                    transform: translateY(0);
                }

                .drag-drop-area {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 20px 0;
                }

                .drag-item {
                    background: #fff;
                    border: 2px solid #dee2e6;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    cursor: move;
                    transition: all 0.3s ease;
                    user-select: none;
                }

                .drag-item:hover {
                    border-color: #667eea;
                    transform: scale(1.02);
                }

                .drag-item.dragging {
                    opacity: 0.5;
                    transform: rotate(5deg);
                }

                .drop-zone {
                    background: #f8f9fa;
                    border: 2px dashed #dee2e6;
                    border-radius: 8px;
                    padding: 40px;
                    text-align: center;
                    min-height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .drop-zone.drag-over {
                    border-color: #28a745;
                    background: #d4edda;
                }

                .instructions {
                    background: #e7f3ff;
                    border: 1px solid #b3d9ff;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }

                .instructions h4 {
                    color: #0066cc;
                    margin-bottom: 10px;
                }

                .instructions ol {
                    color: #004499;
                    padding-left: 20px;
                }

                .instructions li {
                    margin-bottom: 8px;
                    line-height: 1.4;
                }

                .feedback-area {
                    background: #fff;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    min-height: 60px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.9rem;
                    color: #495057;
                    overflow-y: auto;
                    max-height: 200px;
                }

                .context-menu {
                    position: absolute;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    min-width: 120px;
                    display: none;
                }

                .menu-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }

                .menu-item:hover {
                    background: #f8f9fa;
                }

                .menu-item:first-child {
                    border-radius: 6px 6px 0 0;
                }

                .menu-item:last-child {
                    border-radius: 0 0 6px 6px;
                }

                .scrollable-area {
                    max-height: 200px;
                    overflow-y: auto;
                    position: relative;
                }

                .scroll-content {
                    padding: 10px;
                }

                .scroll-content p {
                    margin: 10px 0;
                    padding: 8px;
                    background: linear-gradient(90deg, #f8f9fa, #e9ecef);
                    border-radius: 4px;
                }

                .mouse-tracker {
                    position: fixed;
                    width: 12px;
                    height: 12px;
                    background: #ff4444;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 10000;
                    opacity: 0.8;
                    transform: translate(-50%, -50%);
                    transition: opacity 0.3s ease;
                }

                @media (max-width: 768px) {
                    .drag-drop-area {
                        grid-template-columns: 1fr;
                    }
                }
            </style>

            <h2>Test the Camera Mouse</h2>
            
            <div class="instructions">
                <h4>How to use:</h4>
                <ol>
                    <li>Click "Start Tracking" to begin camera and hand detection</li>
                    <li><strong>Point:</strong> Extend your index finger to control the mouse cursor 👆</li>
                    <li><strong>Left Click:</strong> Make a peace sign ✌️ (index and middle fingers)</li>
                    <li><strong>Right Click:</strong> Show three fingers 🖖 (index, middle, and ring fingers)</li>
                    <li><strong>Scroll:</strong> Make a fist 👊 and move vertically</li>
                    <li><strong>Double Click:</strong> Peace sign twice quickly ✌️✌️</li>
                    <li><strong>Drag:</strong> Hold peace sign while moving ✌️↔️</li>
                    <li>Use "Calibrate" to set up custom tracking boundaries</li>
                </ol>
            </div>

            <div class="test-area">
                <h3>Mouse Movement Test Area</h3>
                <p>Move your hand to see the red dot follow your index finger position</p>
            </div>

            <div class="clickable-buttons">
                <button class="test-button primary">Primary Button</button>
                <button class="test-button success">Success Button</button>
                <button class="test-button warning">Warning Button</button>
                <button class="test-button info">Info Button</button>
            </div>

            <div class="test-area" id="rightClickArea">
                <h3>Right-Click Test Area</h3>
                <p>Try the peace sign (✌️) gesture here to test right-click</p>
                <div id="contextMenu" class="context-menu">
                    <div class="menu-item">Option 1</div>
                    <div class="menu-item">Option 2</div>
                    <div class="menu-item">Option 3</div>
                </div>
            </div>

            <div class="test-area scrollable-area" id="scrollableArea">
                <h3>Scroll Test Area</h3>
                <p>Make a fist and move vertically to scroll</p>
                <div class="scroll-content">
                    <p>📜 This is scrollable content. Use the fist gesture to scroll up and down.</p>
                    <p>🔥 Line 2 of scrollable content</p>
                    <p>⭐ Line 3 of scrollable content</p>
                    <p>🚀 Line 4 of scrollable content</p>
                    <p>🎯 Line 5 of scrollable content</p>
                    <p>💎 Line 6 of scrollable content</p>
                    <p>🌟 Line 7 of scrollable content</p>
                    <p>🎨 Line 8 of scrollable content</p>
                    <p>🎵 Line 9 of scrollable content</p>
                    <p>🎊 Line 10 of scrollable content</p>
                    <p>🎁 End of scrollable content</p>
                </div>
            </div>

            <div class="drag-drop-area">
                <div class="drag-item" draggable="true">
                    📦 Drag me around!
                </div>
                <div class="drop-zone">
                    Drop items here
                </div>
            </div>

            <div class="feedback-area" id="feedbackArea">
                Event log will appear here...
            </div>

            <div class="mouse-tracker" id="mouseTracker"></div>
        `;
    }

    setupEventListeners() {
        // Button click handlers
        const buttons = this.shadowRoot.querySelectorAll('.test-button');
        buttons.forEach((button, index) => {
            const types = ['Primary', 'Success', 'Warning', 'Info'];
            button.addEventListener('click', () => this.handleButtonClick(button, types[index]));
        });

        // Drag and drop handlers
        const dragItem = this.shadowRoot.querySelector('.drag-item');
        const dropZone = this.shadowRoot.querySelector('.drop-zone');

        dragItem.addEventListener('dragstart', (e) => this.handleDragStart(e));
        dragItem.addEventListener('dragend', (e) => this.handleDragEnd(e));
        
        dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        dropZone.addEventListener('drop', (e) => this.handleDrop(e));

        // Right-click context menu
        const rightClickArea = this.shadowRoot.getElementById('rightClickArea');
        rightClickArea.addEventListener('contextmenu', (e) => this.handleRightClick(e));

        // Context menu items
        const menuItems = this.shadowRoot.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            item.addEventListener('click', () => this.selectMenuItem(`Option ${index + 1}`));
        });

        // Hide context menu on outside click
        document.addEventListener('click', () => this.hideContextMenu());

        // Mouse movement tracking
        document.addEventListener('mousemove', (e) => this.updateMouseTracker(e));
    }

    initializeMouseTracker() {
        // Listen for camera mouse component events
        const cameraMouseComponent = document.querySelector('camera-mouse');
        if (cameraMouseComponent) {
            // Listen for gesture log events
            cameraMouseComponent.addEventListener('gestureLog', (event) => {
                this.logEvent(event.detail.message);
            });

            // Listen for mouse events from camera mouse service
            if (cameraMouseComponent.cameraMouseService) {
                cameraMouseComponent.cameraMouseService.addEventListener('mouseMove', (event) => {
                    this.handleCameraMouseMove(event);
                });

                cameraMouseComponent.cameraMouseService.addEventListener('mouseDown', (event) => {
                    this.handleCameraMouseDown(event);
                });

                cameraMouseComponent.cameraMouseService.addEventListener('mouseUp', (event) => {
                    this.handleCameraMouseUp(event);
                });
            }

            // Monitor tracking state
            this.observeTrackingState(cameraMouseComponent);
        }
    }

    observeTrackingState(cameraMouseComponent) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const statusElement = cameraMouseComponent.shadowRoot?.getElementById('status');
                    if (statusElement) {
                        const status = statusElement.textContent;
                        this.trackingEnabled = status.includes('Tracking active');
                        
                        if (!this.trackingEnabled) {
                            const mouseTracker = this.shadowRoot.getElementById('mouseTracker');
                            mouseTracker.style.opacity = '0';
                        }
                        
                        this.logEvent(`Status: ${status}`);
                    }
                }
            });
        });

        if (cameraMouseComponent.shadowRoot) {
            observer.observe(cameraMouseComponent.shadowRoot, {
                childList: true,
                subtree: true
            });
        }
    }

    handleCameraMouseMove(event) {
        const { x, y } = event.detail;
        if (this.trackingEnabled) {
            const mouseTracker = this.shadowRoot.getElementById('mouseTracker');
            mouseTracker.style.left = x + 'px';
            mouseTracker.style.top = y + 'px';
            mouseTracker.style.opacity = '1';
            mouseTracker.style.background = '#00ff00';
        }
    }

    handleCameraMouseDown(event) {
        this.logEvent(`Mouse down at (${Math.round(event.detail.x)}, ${Math.round(event.detail.y)})`);
        if (this.trackingEnabled) {
            const mouseTracker = this.shadowRoot.getElementById('mouseTracker');
            mouseTracker.style.background = '#ff0000';
            mouseTracker.style.transform = 'translate(-50%, -50%) scale(1.5)';
        }
    }

    handleCameraMouseUp(event) {
        this.logEvent(`Mouse up at (${Math.round(event.detail.x)}, ${Math.round(event.detail.y)})`);
        if (this.trackingEnabled) {
            const mouseTracker = this.shadowRoot.getElementById('mouseTracker');
            mouseTracker.style.background = '#00ff00';
            mouseTracker.style.transform = 'translate(-50%, -50%) scale(1)';
        }
    }

    updateMouseTracker(event) {
        if (this.trackingEnabled) {
            const mouseTracker = this.shadowRoot.getElementById('mouseTracker');
            mouseTracker.style.left = event.clientX + 'px';
            mouseTracker.style.top = event.clientY + 'px';
            mouseTracker.style.opacity = '0.8';
        }
    }

    logEvent(message) {
        const feedbackArea = this.shadowRoot.getElementById('feedbackArea');
        const timestamp = new Date().toLocaleTimeString();
        const eventElement = document.createElement('div');
        eventElement.textContent = `[${timestamp}] ${message}`;
        
        feedbackArea.appendChild(eventElement);
        
        // Keep only the last maxEvents
        while (feedbackArea.children.length > this.maxEvents) {
            feedbackArea.removeChild(feedbackArea.firstChild);
        }
        
        feedbackArea.scrollTop = feedbackArea.scrollHeight;
    }

    handleButtonClick(button, type) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
        
        this.logEvent(`${type} button clicked!`);
    }

    handleDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.textContent);
        event.target.classList.add('dragging');
        this.logEvent('Drag started');
    }

    handleDragEnd(event) {
        event.target.classList.remove('dragging');
        this.logEvent('Drag ended');
    }

    handleDragOver(event) {
        event.preventDefault();
        event.target.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.target.classList.remove('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        const data = event.dataTransfer.getData('text/plain');
        event.target.classList.remove('drag-over');
        event.target.innerHTML = `<strong>Dropped:</strong> ${data}`;
        this.logEvent(`Item dropped: ${data}`);
    }

    handleRightClick(event) {
        event.preventDefault();
        const contextMenu = this.shadowRoot.getElementById('contextMenu');
        contextMenu.style.display = 'block';
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        
        this.logEvent('Right-click context menu opened');
    }

    hideContextMenu() {
        const contextMenu = this.shadowRoot.getElementById('contextMenu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }

    selectMenuItem(option) {
        this.logEvent(`Context menu item selected: ${option}`);
        this.hideContextMenu();
    }
}

customElements.define('camera-mouse-test', CameraMouseTest);