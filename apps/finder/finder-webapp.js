import { FinderService } from './finder-service.js';

class FinderWebApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.finderService = new FinderService();
        this.currentPath = '/';
        this.selectedItems = new Set();
        this.viewMode = 'icon'; // 'icon', 'list', 'column'
        this.contextMenuVisible = false;
        this.infoModalVisible = false;
        this.renameMode = false;
        this.draggedItems = new Set();
        this.dropZone = null;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadDirectory(this.currentPath);
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #f6f6f6;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }

                .finder-window {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: white;
                }

                .toolbar {
                    display: flex;
                    align-items: center;
                    padding: 8px 16px;
                    background: linear-gradient(180deg, #f7f7f7 0%, #e8e8e8 100%);
                    border-bottom: 1px solid #d0d0d0;
                    min-height: 40px;
                }

                .nav-buttons {
                    display: flex;
                    gap: 8px;
                    margin-right: 12px;
                }

                .nav-btn {
                    width: 24px;
                    height: 24px;
                    border: none;
                    border-radius: 4px;
                    background: #e0e0e0;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    transition: background 0.2s;
                }

                .nav-btn:hover {
                    background: #d0d0d0;
                }

                .nav-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .view-controls {
                    display: flex;
                    gap: 4px;
                    margin-left: auto;
                    margin-right: 12px;
                }

                .view-btn {
                    width: 28px;
                    height: 28px;
                    border: none;
                    border-radius: 4px;
                    background: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }

                .view-btn:hover {
                    background: rgba(0, 0, 0, 0.1);
                }

                .view-btn.active {
                    background: #007AFF;
                    color: white;
                }

                .search-box {
                    padding: 4px 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    background: white;
                    min-width: 160px;
                }

                .sidebar {
                    width: 180px;
                    background: #f6f6f6;
                    border-right: 1px solid #d0d0d0;
                    padding: 8px 0;
                    overflow-y: auto;
                }

                .main-content {
                    display: flex;
                    flex: 1;
                    overflow: hidden;
                }

                .content-area {
                    flex: 1;
                    padding: 16px;
                    overflow-y: auto;
                    background: white;
                }

                .sidebar-item {
                    padding: 6px 16px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #333;
                    border-radius: 4px;
                    margin: 0 8px;
                    transition: background 0.2s;
                }

                .sidebar-item:hover {
                    background: rgba(0, 122, 255, 0.1);
                }

                .sidebar-item.selected {
                    background: #007AFF;
                    color: white;
                }

                .path-bar {
                    display: flex;
                    align-items: center;
                    padding: 8px 16px;
                    background: #f0f0f0;
                    border-bottom: 1px solid #d0d0d0;
                    font-size: 12px;
                    color: #666;
                }

                .path-segment {
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 3px;
                    transition: background 0.2s;
                }

                .path-segment:hover {
                    background: rgba(0, 122, 255, 0.1);
                }

                .path-separator {
                    margin: 0 4px;
                    color: #999;
                }

                .file-grid {
                    display: grid;
                    gap: 16px;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                }

                .file-list {
                    display: flex;
                    flex-direction: column;
                }

                .file-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                    user-select: none;
                }

                .file-item:hover {
                    background: rgba(0, 122, 255, 0.1);
                }

                .file-item.selected {
                    background: #007AFF;
                    color: white;
                }

                .file-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    margin-bottom: 4px;
                }

                .file-name {
                    font-size: 11px;
                    text-align: center;
                    max-width: 100%;
                    word-wrap: break-word;
                    line-height: 1.2;
                }

                .list-item {
                    display: flex;
                    align-items: center;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .list-item:hover {
                    background: rgba(0, 122, 255, 0.1);
                }

                .list-item.selected {
                    background: #007AFF;
                    color: white;
                }

                .list-icon {
                    width: 16px;
                    height: 16px;
                    margin-right: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                }

                .list-name {
                    flex: 1;
                    font-size: 13px;
                }

                .list-size {
                    font-size: 11px;
                    color: #666;
                    margin-left: 8px;
                }

                .status-bar {
                    padding: 4px 16px;
                    background: #f0f0f0;
                    border-top: 1px solid #d0d0d0;
                    font-size: 11px;
                    color: #666;
                    display: flex;
                    justify-content: space-between;
                }

                @media (max-width: 768px) {
                    .sidebar {
                        display: none;
                    }
                    
                    .toolbar {
                        flex-wrap: wrap;
                        gap: 8px;
                    }
                    
                    .search-box {
                        min-width: 120px;
                    }
                }

                .context-menu {
                    position: absolute;
                    background: white;
                    border: 1px solid #d0d0d0;
                    border-radius: 6px;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                    min-width: 180px;
                    font-size: 13px;
                    overflow: hidden;
                }

                .context-menu-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: background 0.2s;
                }

                .context-menu-item:hover {
                    background: #007AFF;
                    color: white;
                }

                .context-menu-item.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .context-menu-item.disabled:hover {
                    background: none;
                    color: inherit;
                }

                .context-menu-separator {
                    height: 1px;
                    background: #e0e0e0;
                    margin: 4px 0;
                }

                .info-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                }

                .info-modal-content {
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    width: 400px;
                    max-width: 90vw;
                    max-height: 80vh;
                    overflow-y: auto;
                }

                .info-modal-header {
                    padding: 20px 20px 10px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .info-modal-icon {
                    font-size: 48px;
                }

                .info-modal-title {
                    flex: 1;
                }

                .info-modal-title h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }

                .info-modal-title p {
                    margin: 4px 0 0;
                    font-size: 12px;
                    color: #666;
                }

                .info-modal-body {
                    padding: 20px;
                }

                .info-row {
                    display: flex;
                    margin-bottom: 12px;
                    align-items: flex-start;
                }

                .info-label {
                    font-weight: 600;
                    width: 80px;
                    font-size: 13px;
                    color: #666;
                    flex-shrink: 0;
                }

                .info-value {
                    flex: 1;
                    font-size: 13px;
                }

                .info-value input {
                    width: 100%;
                    padding: 4px 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 13px;
                }

                .info-modal-footer {
                    padding: 12px 20px 20px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                }

                .btn {
                    padding: 6px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: background 0.2s;
                }

                .btn-primary {
                    background: #007AFF;
                    color: white;
                }

                .btn-primary:hover {
                    background: #0056CC;
                }

                .btn-secondary {
                    background: #f0f0f0;
                    color: #333;
                }

                .btn-secondary:hover {
                    background: #e0e0e0;
                }

                .file-name.editing {
                    background: white;
                    border: 2px solid #007AFF;
                    border-radius: 4px;
                    padding: 2px 4px;
                    outline: none;
                }

                .hidden {
                    display: none !important;
                }

                .file-item.dragging {
                    opacity: 0.5;
                    transform: scale(0.95);
                }

                .file-item.drag-over {
                    background: rgba(0, 122, 255, 0.2);
                    border: 2px dashed #007AFF;
                }

                .list-item.dragging {
                    opacity: 0.5;
                }

                .list-item.drag-over {
                    background: rgba(0, 122, 255, 0.2);
                    border-left: 3px solid #007AFF;
                }

                .drag-ghost {
                    position: fixed;
                    pointer-events: none;
                    z-index: 1000;
                    background: rgba(0, 122, 255, 0.8);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }
                    
                    .file-grid {
                        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                        gap: 12px;
                    }
                    
                    .file-icon {
                        width: 36px;
                        height: 36px;
                        font-size: 18px;
                    }
                }

                @media (max-width: 480px) {
                    .nav-buttons {
                        display: none;
                    }
                    
                    .path-bar {
                        display: none;
                    }
                    
                    .content-area {
                        padding: 8px;
                    }
                }
            </style>

            <div class="finder-window">
                <div class="toolbar">
                    <div class="nav-buttons">
                        <button class="nav-btn" id="back-btn" title="Back">‹</button>
                        <button class="nav-btn" id="forward-btn" title="Forward">›</button>
                    </div>
                    
                    <div class="view-controls">
                        <button class="view-btn" id="icon-view" title="Icon View">⊞</button>
                        <button class="view-btn" id="list-view" title="List View">☰</button>
                        <button class="view-btn" id="column-view" title="Column View">|||</button>
                    </div>
                    
                    <input type="text" class="search-box" placeholder="Search" id="search-input">
                </div>

                <div class="path-bar" id="path-bar"></div>

                <div class="main-content">
                    <div class="sidebar">
                        <div class="sidebar-item selected" data-path="/">Home</div>
                        <div class="sidebar-item" data-path="/Desktop">Desktop</div>
                        <div class="sidebar-item" data-path="/Documents">Documents</div>
                        <div class="sidebar-item" data-path="/Downloads">Downloads</div>
                        <div class="sidebar-item" data-path="/Pictures">Pictures</div>
                        <div class="sidebar-item" data-path="/Music">Music</div>
                        <div class="sidebar-item" data-path="/Movies">Movies</div>
                    </div>

                    <div class="content-area" id="content-area"></div>
                </div>

                <div class="status-bar">
                    <span id="item-count">0 items</span>
                    <span id="selection-info"></span>
                </div>
            </div>

            <div class="context-menu hidden" id="context-menu">
                <div class="context-menu-item" data-action="open">
                    <span>📂</span>
                    <span>Open</span>
                </div>
                <div class="context-menu-item" data-action="get-info">
                    <span>ℹ️</span>
                    <span>Get Info</span>
                </div>
                <div class="context-menu-separator"></div>
                <div class="context-menu-item" data-action="duplicate">
                    <span>📋</span>
                    <span>Duplicate</span>
                </div>
                <div class="context-menu-item" data-action="rename">
                    <span>✏️</span>
                    <span>Rename</span>
                </div>
                <div class="context-menu-separator"></div>
                <div class="context-menu-item" data-action="move-to-trash">
                    <span>🗑️</span>
                    <span>Move to Trash</span>
                </div>
            </div>

            <div class="info-modal hidden" id="info-modal">
                <div class="info-modal-content">
                    <div class="info-modal-header">
                        <div class="info-modal-icon" id="info-icon">📄</div>
                        <div class="info-modal-title">
                            <h3 id="info-title">Document</h3>
                            <p id="info-subtitle">Get Info</p>
                        </div>
                    </div>
                    <div class="info-modal-body">
                        <div class="info-row">
                            <div class="info-label">Name:</div>
                            <div class="info-value">
                                <input type="text" id="info-name" />
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Size:</div>
                            <div class="info-value" id="info-size">--</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Kind:</div>
                            <div class="info-value" id="info-kind">--</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Created:</div>
                            <div class="info-value" id="info-created">--</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Modified:</div>
                            <div class="info-value" id="info-modified">--</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Where:</div>
                            <div class="info-value" id="info-location">--</div>
                        </div>
                    </div>
                    <div class="info-modal-footer">
                        <button class="btn btn-secondary" id="info-cancel">Cancel</button>
                        <button class="btn btn-primary" id="info-save">Save</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const backBtn = this.shadowRoot.getElementById('back-btn');
        const forwardBtn = this.shadowRoot.getElementById('forward-btn');
        const iconViewBtn = this.shadowRoot.getElementById('icon-view');
        const listViewBtn = this.shadowRoot.getElementById('list-view');
        const columnViewBtn = this.shadowRoot.getElementById('column-view');
        const searchInput = this.shadowRoot.getElementById('search-input');
        const contentArea = this.shadowRoot.getElementById('content-area');
        const contextMenu = this.shadowRoot.getElementById('context-menu');
        const infoModal = this.shadowRoot.getElementById('info-modal');

        backBtn.addEventListener('click', () => this.goBack());
        forwardBtn.addEventListener('click', () => this.goForward());
        iconViewBtn.addEventListener('click', () => this.setViewMode('icon'));
        listViewBtn.addEventListener('click', () => this.setViewMode('list'));
        columnViewBtn.addEventListener('click', () => this.setViewMode('column'));
        
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        this.shadowRoot.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                this.shadowRoot.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.loadDirectory(item.dataset.path);
            });
        });

        contentArea.addEventListener('click', (e) => this.handleContentClick(e));
        contentArea.addEventListener('dblclick', (e) => this.handleContentDoubleClick(e));
        contentArea.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        
        // Drag and drop events
        contentArea.addEventListener('dragstart', (e) => this.handleDragStart(e));
        contentArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        contentArea.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        contentArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        contentArea.addEventListener('drop', (e) => this.handleDrop(e));
        contentArea.addEventListener('dragend', (e) => this.handleDragEnd(e));
        
        // Context menu events
        contextMenu.addEventListener('click', (e) => this.handleContextMenuClick(e));
        
        // Info modal events
        this.shadowRoot.getElementById('info-cancel').addEventListener('click', () => this.hideInfoModal());
        this.shadowRoot.getElementById('info-save').addEventListener('click', () => this.saveFileInfo());
        
        // Global click to hide menus
        document.addEventListener('click', (e) => {
            if (!contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
            if (!infoModal.contains(e.target) && e.target !== infoModal) {
                // Don't auto-hide info modal on outside click for better UX
            }
        });
        
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    async loadDirectory(path) {
        try {
            const items = await this.finderService.getDirectoryContents(path);
            this.currentPath = path;
            this.updatePathBar();
            this.renderContent(items);
            this.updateStatusBar(items);
            
            this.dispatchEvent(new CustomEvent('directory-changed', {
                detail: { path, items },
                bubbles: true
            }));
        } catch (error) {
            console.error('Failed to load directory:', error);
        }
    }

    updatePathBar() {
        const pathBar = this.shadowRoot.getElementById('path-bar');
        const segments = this.currentPath.split('/').filter(Boolean);
        
        let html = '<span class="path-segment" data-path="/">Home</span>';
        let currentPath = '';
        
        segments.forEach(segment => {
            currentPath += '/' + segment;
            html += '<span class="path-separator">›</span>';
            html += `<span class="path-segment" data-path="${currentPath}">${segment}</span>`;
        });
        
        pathBar.innerHTML = html;
        
        pathBar.querySelectorAll('.path-segment').forEach(segment => {
            segment.addEventListener('click', () => {
                this.loadDirectory(segment.dataset.path);
            });
        });
    }

    renderContent(items) {
        const contentArea = this.shadowRoot.getElementById('content-area');
        
        if (this.viewMode === 'icon') {
            contentArea.innerHTML = `<div class="file-grid">${items.map(item => this.renderIconItem(item)).join('')}</div>`;
        } else {
            contentArea.innerHTML = `<div class="file-list">${items.map(item => this.renderListItem(item)).join('')}</div>`;
        }
    }

    renderIconItem(item) {
        const icon = item.type === 'folder' ? '📁' : this.getFileIcon(item.name);
        return `
            <div class="file-item" data-path="${item.path}" data-type="${item.type}" draggable="true">
                <div class="file-icon">${icon}</div>
                <div class="file-name">${item.name}</div>
            </div>
        `;
    }

    renderListItem(item) {
        const icon = item.type === 'folder' ? '📁' : this.getFileIcon(item.name);
        const size = item.type === 'folder' ? '--' : this.formatFileSize(item.size);
        return `
            <div class="list-item" data-path="${item.path}" data-type="${item.type}" draggable="true">
                <div class="list-icon">${icon}</div>
                <div class="list-name">${item.name}</div>
                <div class="list-size">${size}</div>
            </div>
        `;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'txt': '📄', 'doc': '📝', 'docx': '📝', 'pdf': '📕',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
            'mp3': '🎵', 'wav': '🎵', 'mp4': '🎬', 'mov': '🎬',
            'zip': '📦', 'rar': '📦', 'js': '📄', 'html': '📄',
            'css': '📄', 'json': '📄'
        };
        return iconMap[ext] || '📄';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.shadowRoot.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        this.shadowRoot.getElementById(mode + '-view').classList.add('active');
        
        if (mode === 'column') {
            // Column view implementation would go here
            console.log('Column view not fully implemented yet');
            return;
        }
        this.loadDirectory(this.currentPath);
        
        this.dispatchEvent(new CustomEvent('view-mode-changed', {
            detail: { mode },
            bubbles: true
        }));
    }

    handleContentClick(e) {
        const item = e.target.closest('.file-item, .list-item');
        if (!item) {
            this.selectedItems.clear();
            this.updateSelection();
            return;
        }

        if (e.ctrlKey || e.metaKey) {
            if (this.selectedItems.has(item.dataset.path)) {
                this.selectedItems.delete(item.dataset.path);
            } else {
                this.selectedItems.add(item.dataset.path);
            }
        } else {
            this.selectedItems.clear();
            this.selectedItems.add(item.dataset.path);
        }
        
        this.updateSelection();
        
        this.dispatchEvent(new CustomEvent('selection-changed', {
            detail: { selectedItems: Array.from(this.selectedItems) },
            bubbles: true
        }));
    }

    handleContentDoubleClick(e) {
        const item = e.target.closest('.file-item, .list-item');
        if (!item) return;

        if (item.dataset.type === 'folder') {
            this.loadDirectory(item.dataset.path);
        } else {
            this.dispatchEvent(new CustomEvent('file-opened', {
                detail: { path: item.dataset.path, name: item.querySelector('.file-name, .list-name').textContent },
                bubbles: true
            }));
        }
    }

    updateSelection() {
        this.shadowRoot.querySelectorAll('.file-item, .list-item').forEach(item => {
            if (this.selectedItems.has(item.dataset.path)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        const selectionInfo = this.shadowRoot.getElementById('selection-info');
        if (this.selectedItems.size > 0) {
            selectionInfo.textContent = `${this.selectedItems.size} selected`;
        } else {
            selectionInfo.textContent = '';
        }
    }

    updateStatusBar(items) {
        const itemCount = this.shadowRoot.getElementById('item-count');
        itemCount.textContent = `${items.length} items`;
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.loadDirectory(this.currentPath);
            return;
        }
        
        this.finderService.searchFiles(query, this.currentPath).then(results => {
            this.renderContent(results);
            this.updateStatusBar(results);
        });
    }

    handleKeydown(e) {
        if (e.key === 'Escape') {
            this.selectedItems.clear();
            this.updateSelection();
            this.hideContextMenu();
            this.hideInfoModal();
        }
        
        // macOS-style keyboard shortcuts
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'i':
                    e.preventDefault();
                    this.showGetInfo();
                    break;
                case 'd':
                    e.preventDefault();
                    this.duplicateSelected();
                    break;
                case 'backspace':
                case 'delete':
                    e.preventDefault();
                    this.moveToTrash();
                    break;
            }
        }
        
        // File operations
        if (e.key === 'Delete' || e.key === 'Backspace') {
            this.moveToTrash();
        }
        
        if (e.key === 'Enter') {
            if (this.selectedItems.size === 1) {
                const selectedPath = Array.from(this.selectedItems)[0];
                const item = this.shadowRoot.querySelector(`[data-path="${selectedPath}"]`);
                if (item) {
                    if (item.dataset.type === 'folder') {
                        this.loadDirectory(selectedPath);
                    } else {
                        this.openFile(selectedPath);
                    }
                }
            }
        }
        
        if (e.key === 'F2') {
            this.renameSelected();
        }
    }

    goBack() {
        // Implementation for navigation history
    }

    goForward() {
        // Implementation for navigation history
    }

    handleContextMenu(e) {
        e.preventDefault();
        
        const item = e.target.closest('.file-item, .list-item');
        if (item && !this.selectedItems.has(item.dataset.path)) {
            this.selectedItems.clear();
            this.selectedItems.add(item.dataset.path);
            this.updateSelection();
        }
        
        this.showContextMenu(e.clientX, e.clientY);
    }

    showContextMenu(x, y) {
        const contextMenu = this.shadowRoot.getElementById('context-menu');
        const hasSelection = this.selectedItems.size > 0;
        
        // Enable/disable menu items based on selection
        contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            const action = item.dataset.action;
            if (['open', 'get-info', 'duplicate', 'rename', 'move-to-trash'].includes(action)) {
                item.classList.toggle('disabled', !hasSelection);
            }
        });
        
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.remove('hidden');
        this.contextMenuVisible = true;
    }

    hideContextMenu() {
        const contextMenu = this.shadowRoot.getElementById('context-menu');
        contextMenu.classList.add('hidden');
        this.contextMenuVisible = false;
    }

    handleContextMenuClick(e) {
        const item = e.target.closest('.context-menu-item');
        if (!item || item.classList.contains('disabled')) return;
        
        const action = item.dataset.action;
        this.hideContextMenu();
        
        switch (action) {
            case 'open':
                this.openSelected();
                break;
            case 'get-info':
                this.showGetInfo();
                break;
            case 'duplicate':
                this.duplicateSelected();
                break;
            case 'rename':
                this.renameSelected();
                break;
            case 'move-to-trash':
                this.moveToTrash();
                break;
        }
    }

    openSelected() {
        if (this.selectedItems.size !== 1) return;
        
        const selectedPath = Array.from(this.selectedItems)[0];
        const item = this.shadowRoot.querySelector(`[data-path="${selectedPath}"]`);
        if (!item) return;
        
        if (item.dataset.type === 'folder') {
            this.loadDirectory(selectedPath);
        } else {
            this.openFile(selectedPath);
        }
    }

    openFile(path) {
        const nameElement = this.shadowRoot.querySelector(`[data-path="${path}"] .file-name, [data-path="${path}"] .list-name`);
        const name = nameElement ? nameElement.textContent : '';
        
        this.dispatchEvent(new CustomEvent('file-opened', {
            detail: { path, name },
            bubbles: true
        }));
    }

    async showGetInfo() {
        if (this.selectedItems.size !== 1) return;
        
        const selectedPath = Array.from(this.selectedItems)[0];
        try {
            const itemInfo = await this.finderService.getItemInfo(selectedPath);
            this.displayInfoModal(itemInfo);
        } catch (error) {
            console.error('Failed to get item info:', error);
        }
    }

    displayInfoModal(itemInfo) {
        const modal = this.shadowRoot.getElementById('info-modal');
        const icon = this.shadowRoot.getElementById('info-icon');
        const title = this.shadowRoot.getElementById('info-title');
        const subtitle = this.shadowRoot.getElementById('info-subtitle');
        const name = this.shadowRoot.getElementById('info-name');
        const size = this.shadowRoot.getElementById('info-size');
        const kind = this.shadowRoot.getElementById('info-kind');
        const created = this.shadowRoot.getElementById('info-created');
        const modified = this.shadowRoot.getElementById('info-modified');
        const location = this.shadowRoot.getElementById('info-location');
        
        icon.textContent = itemInfo.type === 'folder' ? '📁' : this.getFileIcon(itemInfo.name);
        title.textContent = itemInfo.name;
        subtitle.textContent = `${itemInfo.name} Info`;
        name.value = itemInfo.name;
        size.textContent = itemInfo.type === 'folder' ? '--' : this.formatFileSize(itemInfo.size);
        kind.textContent = itemInfo.type === 'folder' ? 'Folder' : this.getFileKind(itemInfo.name);
        created.textContent = itemInfo.created ? itemInfo.created.toLocaleString() : '--';
        modified.textContent = itemInfo.modified ? itemInfo.modified.toLocaleString() : '--';
        location.textContent = itemInfo.path.substring(0, itemInfo.path.lastIndexOf('/')) || '/';
        
        console.log('itemInfo in displayInfoModal:', itemInfo); // Debug log

        const infoModalBody = modal.querySelector('.info-modal-body');
        let urlRow = infoModalBody.querySelector('#url-info-row');

        if (itemInfo.type === 'file') {
            if (!urlRow) {
                urlRow = document.createElement('div');
                urlRow.id = 'url-info-row';
                urlRow.classList.add('info-row');
                urlRow.innerHTML = `
                    <span class="info-label">URL:</span>
                    <span class="info-value">
                        <input type="text" id="info-url" />
                    </span>
                `;
                infoModalBody.appendChild(urlRow);
            }
            const urlInput = urlRow.querySelector('#info-url');
            urlInput.value = itemInfo.url || '';
            urlRow.style.display = 'flex'; // Ensure it's visible
        } else {
            if (urlRow) {
                urlRow.style.display = 'none'; // Hide for folders
            }
        }

        modal.classList.remove('hidden');
        this.infoModalVisible = true;
        this.currentInfoItem = itemInfo;
    }

    hideInfoModal() {
        const modal = this.shadowRoot.getElementById('info-modal');
        modal.classList.add('hidden');
        this.infoModalVisible = false;
        this.currentInfoItem = null;
    }

    async saveFileInfo() {
        if (!this.currentInfoItem) return;
        
        const nameInput = this.shadowRoot.getElementById('info-name');
        const urlInput = this.shadowRoot.getElementById('info-url');
        
        const newName = nameInput.value.trim();
        const oldName = this.currentInfoItem.name;
        const oldUrl = this.currentInfoItem.url || '';
        const newUrl = urlInput ? urlInput.value : '';

        let changesMade = false;

        if (newName && newName !== oldName) {
            try {
                await this.finderService.renameItem(this.currentInfoItem.path, newName);
                this.dispatchEvent(new CustomEvent('item-renamed', {
                    detail: { oldPath: this.currentInfoItem.path, newName },
                    bubbles: true
                }));
                changesMade = true;
            } catch (error) {
                alert(`Failed to rename item: ${error.message}`);
            }
        }

        if (this.currentInfoItem.type === 'file' && newUrl !== oldUrl) {
            try {
                await this.finderService.updateItemUrl(this.currentInfoItem.path, newUrl);
                changesMade = true;
            } catch (error) {
                alert(`Failed to update URL: ${error.message}`);
            }
        }

        if (changesMade) {
            this.loadDirectory(this.currentPath);
        }
        this.hideInfoModal();
    }

    getFileKind(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const kindMap = {
            'txt': 'Plain Text Document',
            'doc': 'Microsoft Word Document',
            'docx': 'Microsoft Word Document',
            'pdf': 'Portable Document Format',
            'jpg': 'JPEG Image',
            'jpeg': 'JPEG Image',
            'png': 'PNG Image',
            'gif': 'GIF Image',
            'mp3': 'MP3 Audio',
            'wav': 'WAV Audio',
            'mp4': 'MPEG-4 Video',
            'mov': 'QuickTime Movie',
            'zip': 'ZIP Archive',
            'rar': 'RAR Archive',
            'js': 'JavaScript Source',
            'html': 'HTML Document',
            'css': 'Cascading Style Sheet',
            'json': 'JSON Document'
        };
        return kindMap[ext] || 'Document';
    }

    async duplicateSelected() {
        if (this.selectedItems.size !== 1) return;
        
        const selectedPath = Array.from(this.selectedItems)[0];
        try {
            const itemInfo = await this.finderService.getItemInfo(selectedPath);
            const baseName = itemInfo.name;
            const extension = baseName.includes('.') ? '.' + baseName.split('.').pop() : '';
            const nameWithoutExt = extension ? baseName.slice(0, -extension.length) : baseName;
            const newName = `${nameWithoutExt} copy${extension}`;
            
            await this.finderService.duplicateItem(selectedPath, newName);
            this.loadDirectory(this.currentPath);
            
            this.dispatchEvent(new CustomEvent('item-duplicated', {
                detail: { originalPath: selectedPath, newName },
                bubbles: true
            }));
        } catch (error) {
            alert(`Failed to duplicate item: ${error.message}`);
        }
    }

    renameSelected() {
        if (this.selectedItems.size !== 1) return;
        
        const selectedPath = Array.from(this.selectedItems)[0];
        const item = this.shadowRoot.querySelector(`[data-path="${selectedPath}"]`);
        if (!item) return;
        
        const nameElement = item.querySelector('.file-name, .list-name');
        if (!nameElement) return;
        
        const currentName = nameElement.textContent;
        nameElement.setAttribute('contenteditable', 'true');
        nameElement.classList.add('editing');
        nameElement.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(nameElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const finishRename = async () => {
            const newName = nameElement.textContent.trim();
            nameElement.setAttribute('contenteditable', 'false');
            nameElement.classList.remove('editing');
            
            if (newName && newName !== currentName) {
                try {
                    await this.finderService.renameItem(selectedPath, newName);
                    this.loadDirectory(this.currentPath);
                    
                    this.dispatchEvent(new CustomEvent('item-renamed', {
                        detail: { oldPath: selectedPath, newName },
                        bubbles: true
                    }));
                } catch (error) {
                    alert(`Failed to rename item: ${error.message}`);
                    nameElement.textContent = currentName;
                }
            } else {
                nameElement.textContent = currentName;
            }
        };
        
        const keyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishRename();
                nameElement.removeEventListener('keydown', keyHandler);
                nameElement.removeEventListener('blur', finishRename);
            } else if (e.key === 'Escape') {
                nameElement.textContent = currentName;
                nameElement.setAttribute('contenteditable', 'false');
                nameElement.classList.remove('editing');
                nameElement.removeEventListener('keydown', keyHandler);
                nameElement.removeEventListener('blur', finishRename);
            }
        };
        
        nameElement.addEventListener('keydown', keyHandler);
        nameElement.addEventListener('blur', finishRename);
    }

    async moveToTrash() {
        if (this.selectedItems.size === 0) return;
        
        const selectedPaths = Array.from(this.selectedItems);
        const itemNames = selectedPaths.map(path => {
            const nameElement = this.shadowRoot.querySelector(`[data-path="${path}"] .file-name, [data-path="${path}"] .list-name`);
            return nameElement ? nameElement.textContent : path.split('/').pop();
        });
        
        const message = selectedPaths.length === 1 
            ? `Are you sure you want to move "${itemNames[0]}" to the Trash?`
            : `Are you sure you want to move ${selectedPaths.length} items to the Trash?`;
        
        if (!confirm(message)) return;
        
        try {
            for (const path of selectedPaths) {
                await this.finderService.deleteItem(path);
            }
            
            this.selectedItems.clear();
            this.loadDirectory(this.currentPath);
            
            this.dispatchEvent(new CustomEvent('items-trashed', {
                detail: { paths: selectedPaths, names: itemNames },
                bubbles: true
            }));
        } catch (error) {
            alert(`Failed to move items to trash: ${error.message}`);
        }
    }

    handleDragStart(e) {
        const item = e.target.closest('.file-item, .list-item');
        if (!item) return;

        const itemPath = item.dataset.path;
        
        // If the dragged item isn't selected, select it
        if (!this.selectedItems.has(itemPath)) {
            this.selectedItems.clear();
            this.selectedItems.add(itemPath);
            this.updateSelection();
        }

        // Set drag data
        this.draggedItems = new Set(this.selectedItems);
        const dragData = {
            paths: Array.from(this.draggedItems),
            source: 'finder'
        };
        
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'move';
        
        // Create drag ghost
        this.createDragGhost(e);
        
        // Add dragging class
        this.shadowRoot.querySelectorAll('.file-item, .list-item').forEach(el => {
            if (this.draggedItems.has(el.dataset.path)) {
                el.classList.add('dragging');
            }
        });
        
        this.dispatchEvent(new CustomEvent('drag-started', {
            detail: { items: Array.from(this.draggedItems) },
            bubbles: true
        }));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        const item = e.target.closest('.file-item, .list-item');
        
        if (item && item.dataset.type === 'folder' && !this.draggedItems.has(item.dataset.path)) {
            item.classList.add('drag-over');
            this.dropZone = item;
        }
    }

    handleDragLeave(e) {
        const item = e.target.closest('.file-item, .list-item');
        if (item) {
            item.classList.remove('drag-over');
        }
        
        // Check if we're leaving the drop zone
        if (this.dropZone && !this.dropZone.contains(e.relatedTarget)) {
            this.dropZone.classList.remove('drag-over');
            this.dropZone = null;
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        
        const item = e.target.closest('.file-item, .list-item');
        let targetPath = this.currentPath;
        
        if (item && item.dataset.type === 'folder' && !this.draggedItems.has(item.dataset.path)) {
            targetPath = item.dataset.path;
        }
        
        // Clean up drag states
        this.shadowRoot.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        try {
            const dragDataStr = e.dataTransfer.getData('application/json');
            if (!dragDataStr) return;
            
            const dragData = JSON.parse(dragDataStr);
            if (dragData.source !== 'finder') return;
            
            // Move items
            for (const sourcePath of dragData.paths) {
                if (sourcePath === targetPath) continue; // Can't move to itself
                
                const itemInfo = await this.finderService.getItemInfo(sourcePath);
                const newPath = targetPath === '/' ? `/${itemInfo.name}` : `${targetPath}/${itemInfo.name}`;
                
                // Check if target already exists
                try {
                    await this.finderService.getItemInfo(newPath);
                    alert(`Item already exists: ${itemInfo.name}`);
                    continue;
                } catch (error) {
                    // Item doesn't exist, proceed with move
                }
                
                await this.finderService.moveItem(sourcePath, newPath);
            }
            
            // Refresh current directory
            this.selectedItems.clear();
            this.loadDirectory(this.currentPath);
            
            this.dispatchEvent(new CustomEvent('items-moved', {
                detail: { 
                    items: dragData.paths, 
                    targetPath: targetPath 
                },
                bubbles: true
            }));
            
        } catch (error) {
            console.error('Drop failed:', error);
            alert(`Failed to move items: ${error.message}`);
        }
    }

    handleDragEnd(e) {
        // Clean up all drag states
        this.shadowRoot.querySelectorAll('.dragging, .drag-over').forEach(el => {
            el.classList.remove('dragging', 'drag-over');
        });
        
        this.removeDragGhost();
        this.draggedItems.clear();
        this.dropZone = null;
        
        this.dispatchEvent(new CustomEvent('drag-ended', {
            bubbles: true
        }));
    }

    createDragGhost(e) {
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.id = 'drag-ghost';
        
        const count = this.draggedItems.size;
        ghost.textContent = count === 1 ? '1 item' : `${count} items`;
        
        document.body.appendChild(ghost);
        
        const moveDragGhost = (e) => {
            ghost.style.left = `${e.clientX + 10}px`;
            ghost.style.top = `${e.clientY - 10}px`;
        };
        
        document.addEventListener('dragover', moveDragGhost);
        
        // Store the event listener for cleanup
        this.dragGhostMoveListener = moveDragGhost;
        
        // Position initially
        moveDragGhost(e);
    }

    removeDragGhost() {
        const ghost = document.getElementById('drag-ghost');
        if (ghost) {
            ghost.remove();
        }
        
        if (this.dragGhostMoveListener) {
            document.removeEventListener('dragover', this.dragGhostMoveListener);
            this.dragGhostMoveListener = null;
        }
    }
}

customElements.define('finder-webapp', FinderWebApp);