import { FileSystemServiceFactory } from '/apps/finder/git-filesystem-service.js';

class RepositoryManager {
    constructor() {
        this.repositories = new Map();
        this.currentRepoId = null;
        this.loadRepositories();
    }

    loadRepositories() {
        try {
            const stored = localStorage.getItem('finder-repositories');
            console.log('📥 Loading repositories from localStorage:', stored ? 'found' : 'not found');
            console.log('📄 Raw localStorage content:', stored);
            
            if (stored) {
                const repoData = JSON.parse(stored);
                console.log('📊 Parsed repository data:', repoData);
                console.log('📋 Available repositories in data:', Object.keys(repoData.repositories || {}));
                
                this.repositories = new Map(Object.entries(repoData.repositories || {}));
                this.currentRepoId = repoData.currentRepoId || null;
                
                console.log('✅ Loaded repositories:', this.repositories.size);
                console.log('📋 Repository keys:', Array.from(this.repositories.keys()));
                console.log('📊 Full repository Map:', this.repositories);
            } else {
                console.log('💫 No stored repositories found, starting fresh');
                this.repositories = new Map();
                this.currentRepoId = null;
            }
        } catch (error) {
            console.warn('❌ Failed to load repositories:', error);
            this.repositories = new Map();
            this.currentRepoId = null;
        }
    }

    saveRepositories() {
        const data = {
            repositories: Object.fromEntries(this.repositories),
            currentRepoId: this.currentRepoId
        };
        
        console.log('💾 Saving repositories to localStorage:');
        console.log('   📊 Repository count:', this.repositories.size);
        console.log('   📋 Repository data:', data);
        console.log('   🎯 Current repo ID:', this.currentRepoId);
        
        localStorage.setItem('finder-repositories', JSON.stringify(data));
        
        // Verify it was saved
        const saved = localStorage.getItem('finder-repositories');
        console.log('✅ Verification - saved to localStorage:', saved ? 'success' : 'failed');
    }

    addRepository(config) {
        console.log('🔍 Adding repository:', config);
        console.log('📊 Current repositories before add:', Array.from(this.repositories.keys()));
        console.log('📊 Repository Map size before add:', this.repositories.size);
        
        // Check if repository already exists
        const existingRepo = this.findRepositoryByUrlAndBranch(config.url, config.branch || 'main');
        if (existingRepo) {
            console.log('⚠️ Repository already exists:', existingRepo.id);
            return existingRepo;
        }
        
        // Always create a new repository entry with timestamp to ensure uniqueness
        const timestamp = Date.now();
        let id = this.generateRepoId(config.url, config.branch, timestamp);
        
        // Ensure ID is unique - if collision, generate new one
        let attempts = 0;
        while (this.repositories.has(id) && attempts < 10) {
            console.log(`🔄 ID collision detected for ${id}, generating new one...`);
            id = this.generateRepoId(config.url, config.branch, Date.now() + attempts);
            attempts++;
        }
        
        if (this.repositories.has(id)) {
            console.error('❌ Failed to generate unique ID after 10 attempts');
            throw new Error('Failed to generate unique repository ID');
        }
        
        const displayName = this.generateDisplayName(config.url, config.branch || 'main');
        
        console.log('🆔 Generated ID:', id);
        
        const repository = {
            id,
            name: config.name || displayName,
            url: config.url,
            token: config.token || '',
            branch: config.branch || 'main',
            addedAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            status: 'disconnected' // 'connected', 'disconnected', 'error'
        };
        
        console.log('📝 About to add repository object:', repository);
        this.repositories.set(id, repository);
        console.log('📊 Repository Map size after add:', this.repositories.size);
        console.log('📊 Current repositories after add:', Array.from(this.repositories.keys()));
        
        this.saveRepositories();
        
        console.log('✅ Repository added with ID:', id);
        console.log('💾 Saved to localStorage:', this.repositories.size, 'repositories');
        
        return repository;
    }

    findRepositoryByUrlAndBranch(url, branch) {
        for (const repo of this.repositories.values()) {
            if (repo.url === url && repo.branch === branch) {
                return repo;
            }
        }
        return null;
    }

    generateDisplayName(url, branch) {
        const baseName = this.extractRepoName(url);
        if (branch !== 'main' && branch !== 'master') {
            return `${baseName} (${branch})`;
        }
        return baseName;
    }

    removeRepository(id) {
        if (this.repositories.has(id)) {
            this.repositories.delete(id);
            if (this.currentRepoId === id) {
                this.currentRepoId = null;
            }
            this.saveRepositories();
            return true;
        }
        return false;
    }

    updateRepository(id, updates) {
        if (this.repositories.has(id)) {
            const repo = this.repositories.get(id);
            Object.assign(repo, updates, { lastAccessed: new Date().toISOString() });
            this.repositories.set(id, repo);
            this.saveRepositories();
            return repo;
        }
        return null;
    }

    getCurrentRepository() {
        return this.currentRepoId ? this.repositories.get(this.currentRepoId) : null;
    }

    setCurrentRepository(id) {
        if (this.repositories.has(id)) {
            this.currentRepoId = id;
            this.updateRepository(id, { lastAccessed: new Date().toISOString() });
            return this.repositories.get(id);
        }
        return null;
    }

    getAllRepositories() {
        return Array.from(this.repositories.values()).sort((a, b) => 
            new Date(b.lastAccessed) - new Date(a.lastAccessed)
        );
    }

    generateRepoId(url, branch = 'main', timestamp = Date.now()) {
        // Create a unique ID from URL, branch, and timestamp to ensure uniqueness
        const combined = `${url}#${branch}#${timestamp}`;
        const encoded = btoa(combined).replace(/[^a-zA-Z0-9]/g, '');
        
        // Use a longer substring to reduce collision probability, 
        // and add a random component for extra uniqueness
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        return encoded.substring(0, 16) + randomSuffix;
    }

    extractRepoName(url) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname.replace(/^\/+|\/+$/g, '');
            const parts = path.split('/');
            return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : path || url;
        } catch {
            return url;
        }
    }
}

class FinderWebApp extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.finderService = null; // Will be initialized async
        this.currentPath = '/';
        this.selectedItems = new Set();
        this.viewMode = 'icon'; // 'icon', 'list', 'column'
        this.contextMenuVisible = false;
        this.infoModalVisible = false;
        this.renameMode = false;
        this.draggedItems = new Set();
        this.dropZone = null;
        
        // Repository management
        this.repoManager = new RepositoryManager();
        
        // Restore persistent state before initialization
        this.restoreState();
        
        // Debug method for console access
        window.debugFinder = () => {
            console.log('🔍 Finder Debug Info:');
            console.log('📊 Repository Manager:', this.repoManager);
            console.log('📋 All Repositories:', this.repoManager.getAllRepositories());
            console.log('🎯 Current Repository:', this.repoManager.getCurrentRepository());
            console.log('📊 Repository Map size:', this.repoManager.repositories.size);
            console.log('📋 Repository Map keys:', Array.from(this.repoManager.repositories.keys()));
            console.log('💾 Repository Storage:', localStorage.getItem('finder-repositories'));
            console.log('🎨 Finder State:', localStorage.getItem('finder-state'));
            console.log('📁 Current Path:', this.currentPath);
            console.log('👁️ View Mode:', this.viewMode);
        };
        
        // Debug method to clear finder state
        window.clearFinderState = () => {
            this.clearState();
        };
        
        // Test method to manually add repositories
        window.testAddRepo = (url, name) => {
            console.log('🧪 Test adding repository:', url, name);
            const repo = this.repoManager.addRepository({
                url: url || 'https://github.com/test/repo1',
                name: name || 'Test Repo',
                branch: 'main'
            });
            this.updateSidebar();
            console.log('✅ Added:', repo);
            return repo;
        };
        
        // Initialize event system support
        this.initEventSystem();
    }
    
    async initEventSystem() {
        try {
            const eventTypes = await import('/desktop/src/events/message-types.js');
            this.MESSAGES = eventTypes.MESSAGES;
            this.createLaunchAppMessage = eventTypes.createLaunchAppMessage;
        } catch (error) {
            console.warn('Desktop event system not available, using fallback');
            // Fallback for when desktop event system is not available
            this.MESSAGES = {
                LAUNCH_APP: 'LAUNCH_APP'
            };
            this.createLaunchAppMessage = (detail) => new CustomEvent('LAUNCH_APP', { detail, bubbles: true, composed: true });
        }
    }

    async connectedCallback() {
        // Migrate old single repository config if it exists
        this.migrateOldConfig();

        // Get current repository configuration
        const currentRepo = this.repoManager.getCurrentRepository();
        let repoConfig = null;
        
        if (currentRepo) {
            repoConfig = {
                url: currentRepo.url,
                token: currentRepo.token,
                branch: currentRepo.branch
            };
        }

        // Initialize filesystem service first
        try {
            this.finderService = await FileSystemServiceFactory.createService(repoConfig);
            if (currentRepo) {
                this.repoManager.updateRepository(currentRepo.id, { status: 'connected' });
            }
        } catch (error) {
            console.error('Failed to initialize filesystem service:', error);
            if (currentRepo) {
                this.repoManager.updateRepository(currentRepo.id, { status: 'error' });
            }
            // Show error in UI
            this.shadowRoot.innerHTML = `
                <div style="padding: 20px; color: red; font-family: monospace;">
                    <h3>⚠️ Filesystem Error</h3>
                    <p>Failed to initialize filesystem: ${error.message}</p>
                    <p>Please refresh the page to try again.</p>
                    <button onclick="window.location.reload()">Retry</button>
                </div>
            `;
            return;
        }

        this.render();
        this.setupEventListeners();
        this.updateSidebar();
        
        // Apply view mode restoration from saved state
        this.applyViewModeRestore();
        
        // Apply repository restoration from saved state (if any)
        this.applyRepositoryRestore();
        
        // Show git controls if we have a remote repository configured
        if (repoConfig && repoConfig.url) {
            this.showGitControls();
        }
        
        // Try to load directory, but handle the case where it might not exist yet
        try {
            await this.loadDirectory(this.currentPath);
        } catch (error) {
            console.warn('Initial directory load failed, this is normal for new repositories:', error);
            // Show empty state for now
            this.renderContent([]);
        }
    }

    migrateOldConfig() {
        const oldConfig = localStorage.getItem('finder-repo-config');
        if (oldConfig) {
            console.log('🔄 Migrating old repository config...');
            try {
                const config = JSON.parse(oldConfig);
                if (config.url) {
                    const repo = this.repoManager.addRepository(config);
                    this.repoManager.setCurrentRepository(repo.id);
                    console.log('✅ Migrated old repository config:', config.url);
                }
                localStorage.removeItem('finder-repo-config');
            } catch (error) {
                console.warn('❌ Failed to migrate old config:', error);
                localStorage.removeItem('finder-repo-config');
            }
        } else {
            console.log('🆕 No old config to migrate');
        }
    }

    isServiceReady() {
        if (!this.finderService) {
            console.warn('Filesystem service not initialized yet');
            return false;
        }
        return true;
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

                .git-controls {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-right: 10px;
                }

                .git-btn {
                    width: 28px;
                    height: 24px;
                    border: none;
                    border-radius: 4px;
                    background: #e0e0e0;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background 0.2s;
                }

                .git-btn:hover {
                    background: #d0d0d0;
                }

                .git-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
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
                    width: 220px;
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

                .sidebar-section {
                    margin-bottom: 16px;
                }

                .sidebar-section-title {
                    padding: 4px 16px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }

                .sidebar-item {
                    padding: 6px 16px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #333;
                    border-radius: 4px;
                    margin: 0 8px 2px 8px;
                    transition: background 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    position: relative;
                }

                .sidebar-item:hover {
                    background: rgba(0, 122, 255, 0.1);
                }

                .sidebar-item.selected {
                    background: #007AFF;
                    color: white;
                }

                .repo-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    font-size: 12px;
                    color: #333;
                    border-radius: 4px;
                    margin: 0 8px 2px 8px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    position: relative;
                    border: 1px solid transparent;
                }

                .repo-item:hover {
                    background: rgba(0, 122, 255, 0.1);
                    border-color: rgba(0, 122, 255, 0.2);
                }

                .repo-item.selected {
                    background: #007AFF;
                    color: white;
                    border-color: #0056CC;
                }

                .repo-item.error {
                    border-color: #FF3B30;
                    background: rgba(255, 59, 48, 0.05);
                }

                .repo-status {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .repo-status.connected {
                    background: #34C759;
                }

                .repo-status.disconnected {
                    background: #8E8E93;
                }

                .repo-status.error {
                    background: #FF3B30;
                }

                .repo-name {
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .repo-actions {
                    opacity: 0;
                    display: flex;
                    gap: 4px;
                    transition: opacity 0.2s;
                }

                .repo-item:hover .repo-actions {
                    opacity: 1;
                }

                .repo-action {
                    width: 16px;
                    height: 16px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    border-radius: 2px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    transition: background 0.2s;
                }

                .repo-action:hover {
                    background: rgba(0, 0, 0, 0.1);
                }

                .repo-item.selected .repo-action:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .add-repo-btn {
                    padding: 6px 16px;
                    margin: 4px 8px;
                    background: rgba(0, 122, 255, 0.1);
                    border: 1px dashed #007AFF;
                    border-radius: 4px;
                    color: #007AFF;
                    cursor: pointer;
                    font-size: 12px;
                    text-align: center;
                    transition: all 0.2s;
                }

                .add-repo-btn:hover {
                    background: rgba(0, 122, 255, 0.2);
                    border-style: solid;
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
                    align-items: center;
                    min-height: 24px;
                }

                .status-message {
                    font-weight: 500;
                    padding: 2px 8px;
                    border-radius: 3px;
                    margin-right: 8px;
                    transition: opacity 0.3s ease;
                }

                .status-loading {
                    background: rgba(0, 122, 255, 0.1);
                    color: #007AFF;
                    border: 1px solid rgba(0, 122, 255, 0.2);
                }

                .status-success {
                    background: rgba(52, 199, 89, 0.1);
                    color: #34C759;
                    border: 1px solid rgba(52, 199, 89, 0.2);
                }

                .status-error {
                    background: rgba(255, 59, 48, 0.1);
                    color: #FF3B30;
                    border: 1px solid rgba(255, 59, 48, 0.2);
                }

                .status-info {
                    background: rgba(142, 142, 147, 0.1);
                    color: #8E8E93;
                    border: 1px solid rgba(142, 142, 147, 0.2);
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

                .repo-config-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2001;
                }

                .repo-config-content {
                    background: white;
                    padding: 24px;
                    border-radius: 8px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    width: 480px;
                    max-width: 90vw;
                }

                .repo-config-content h3 {
                    margin: 0 0 20px 0;
                    color: #333;
                    font-size: 18px;
                }

                .repo-config-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .repo-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .repo-form-group label {
                    font-weight: 500;
                    color: #555;
                    font-size: 14px;
                }

                .repo-form-group input {
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .repo-form-group input:focus {
                    outline: none;
                    border-color: #007AFF;
                    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
                }

                .repo-form-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 8px;
                }

                .repo-form-buttons button {
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                }

                .repo-form-buttons .primary {
                    background: #007AFF;
                    color: white;
                    border-color: #007AFF;
                }

                .repo-form-buttons .primary:hover {
                    background: #0056CC;
                }

                .repo-form-buttons .secondary {
                    background: white;
                    color: #333;
                }

                .repo-form-buttons .secondary:hover {
                    background: #f5f5f5;
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
                    
                    <div class="git-controls">
                        <button class="git-btn" id="repo-config-btn" title="Configure Repository">🔗</button>
                        <button class="git-btn" id="sync-btn" title="Sync Repository" style="display: none;">🔄</button>
                        <button class="git-btn" id="commit-btn" title="Commit Changes" style="display: none;">📝</button>
                    </div>
                    
                    <input type="text" class="search-box" placeholder="Search" id="search-input">
                </div>

                <div class="path-bar" id="path-bar"></div>

                <div class="main-content">
                    <div class="sidebar" id="sidebar">
                        <!-- Content will be populated by updateSidebar() -->
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

            <div class="repo-config-modal hidden" id="repo-config-modal">
                <div class="repo-config-content">
                    <h3>🔗 Add Git Repository</h3>
                    <form class="repo-config-form" id="repo-config-form">
                        <div class="repo-form-group">
                            <label for="repo-name">Display Name (optional):</label>
                            <input type="text" id="repo-name" name="repoName" 
                                   placeholder="My Project">
                            <small style="color: #666; font-size: 12px;">
                                Custom name for this repository in the sidebar
                            </small>
                        </div>
                        <div class="repo-form-group">
                            <label for="repo-url">Repository URL:</label>
                            <input type="url" id="repo-url" name="repoUrl" 
                                   placeholder="https://github.com/username/repository" required>
                            <small style="color: #666; font-size: 12px;">
                                Enter GitHub repository URL (without .git suffix)
                            </small>
                        </div>
                        <div class="repo-form-group">
                            <label for="repo-token">GitHub Token (optional):</label>
                            <input type="password" id="repo-token" name="token" 
                                   placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                            <small style="color: #666; font-size: 12px;">
                                Required for private repositories. Create at: Settings → Developer settings → Personal access tokens
                            </small>
                        </div>
                        <div class="repo-form-group">
                            <label for="repo-branch">Branch:</label>
                            <input type="text" id="repo-branch" name="branch" value="main">
                        </div>
                        <div class="repo-form-buttons">
                            <button type="button" class="secondary" id="repo-cancel">Cancel</button>
                            <button type="submit" class="primary">Connect Repository</button>
                        </div>
                    </form>
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

        // Git control event listeners
        const repoConfigBtn = this.shadowRoot.getElementById('repo-config-btn');
        const syncBtn = this.shadowRoot.getElementById('sync-btn');
        const commitBtn = this.shadowRoot.getElementById('commit-btn');

        repoConfigBtn.addEventListener('click', () => this.showRepositoryConfig());
        syncBtn.addEventListener('click', () => this.syncRepository());
        commitBtn.addEventListener('click', () => this.commitChanges());
        
        // Sidebar events will be handled by updateSidebar method

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

        // Repository configuration modal event listeners
        const repoConfigModal = this.shadowRoot.getElementById('repo-config-modal');
        const repoConfigForm = this.shadowRoot.getElementById('repo-config-form');
        const repoCancelBtn = this.shadowRoot.getElementById('repo-cancel');

        repoConfigForm.addEventListener('submit', (e) => this.handleRepositoryConfig(e));
        repoCancelBtn.addEventListener('click', () => this.hideRepositoryConfig());
        
        // Close modal when clicking outside
        repoConfigModal.addEventListener('click', (e) => {
            if (e.target === repoConfigModal) {
                this.hideRepositoryConfig();
            }
        });
    }

    updateSidebar() {
        const sidebar = this.shadowRoot.getElementById('sidebar');
        const repositories = this.repoManager.getAllRepositories();
        const currentRepo = this.repoManager.getCurrentRepository();
        
        console.log('🔄 Updating sidebar with repositories:', repositories.length);
        console.log('📋 Repository list:', repositories.map(r => ({ id: r.id, name: r.name, url: r.url })));
        
        let html = `
            <div class="sidebar-section">
                <div class="sidebar-section-title">Quick Access</div>
                <div class="sidebar-item ${!currentRepo ? 'selected' : ''}" data-type="local" data-path="/">
                    <span>🏠</span>
                    <span>Local Files</span>
                </div>
            </div>

            <div class="sidebar-section">
                <div class="sidebar-section-title">Repositories</div>
                <div class="add-repo-btn" data-action="add-repository">
                    + Add Repository
                </div>
        `;

        repositories.forEach(repo => {
            const isSelected = currentRepo && currentRepo.id === repo.id;
            const statusClass = repo.status || 'disconnected';
            const errorClass = repo.status === 'error' ? ' error' : '';
            
            html += `
                <div class="repo-item ${isSelected ? 'selected' : ''}${errorClass}" 
                     data-repo-id="${repo.id}" 
                     data-type="repository"
                     title="${repo.url}">
                    <div class="repo-status ${statusClass}"></div>
                    <div class="repo-name">${repo.name}</div>
                    <div class="repo-actions">
                        <button class="repo-action" data-action="remove-repo" data-repo-id="${repo.id}" title="Remove">✕</button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;

        if (currentRepo) {
            html += `
                <div class="sidebar-section">
                    <div class="sidebar-section-title">Folders</div>
                    <div class="sidebar-item" data-type="folder" data-path="/">
                        <span>📁</span>
                        <span>Root</span>
                    </div>
                </div>
            `;
        }

        sidebar.innerHTML = html;
        
        // Ensure DOM is ready before attaching event listeners
        setTimeout(() => {
            this.setupSidebarEventListeners();
        }, 0);
    }

    setupSidebarEventListeners() {
        const sidebar = this.shadowRoot.getElementById('sidebar');
        const repoItems = sidebar.querySelectorAll('.repo-item');
        
        console.log('🎯 Setting up sidebar event listeners for', repoItems.length, 'repository items');
        
        // Handle repository clicks
        repoItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('repo-action')) return; // Don't handle if clicking action button
                
                const repoId = item.dataset.repoId;
                const repo = this.repoManager.repositories.get(repoId);
                console.log('📋 Clicked on repository:', {
                    id: repoId,
                    name: repo?.name,
                    url: repo?.url,
                    branch: repo?.branch
                });
                
                this.switchToRepository(repoId);
            });
        });

        // Handle folder clicks
        sidebar.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.type === 'local') {
                    this.switchToLocal();
                } else if (item.dataset.type === 'folder') {
                    this.selectSidebarItem(item);
                    this.loadDirectory(item.dataset.path);
                }
            });
        });

        // Handle add repository button
        sidebar.querySelector('.add-repo-btn')?.addEventListener('click', () => {
            this.showRepositoryConfig();
        });

        // Handle repository actions
        sidebar.querySelectorAll('.repo-action').forEach(action => {
            action.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionType = action.dataset.action;
                const repoId = action.dataset.repoId;
                
                if (actionType === 'remove-repo') {
                    this.removeRepository(repoId);
                }
            });
        });
    }

    selectSidebarItem(selectedItem) {
        this.shadowRoot.querySelectorAll('.sidebar-item, .repo-item').forEach(item => {
            item.classList.remove('selected');
        });
        selectedItem.classList.add('selected');
    }

    async switchToRepository(repoId) {
        const repo = this.repoManager.setCurrentRepository(repoId);
        if (!repo) return;

        try {
            console.log('🔄 Switching to repository:', {
                id: repo.id,
                name: repo.name,
                url: repo.url,
                branch: repo.branch
            });
            
            this.showLoadingMessage('Switching to repository...');
            
            const repoConfig = {
                url: repo.url,
                token: repo.token,
                branch: repo.branch
            };

            this.finderService = await FileSystemServiceFactory.createService(repoConfig);
            this.repoManager.updateRepository(repo.id, { status: 'connected' });
            
            // Save state when repository changes
            this.saveState();
            
            this.updateSidebar();
            this.showGitControls();
            
            // Reset to root directory
            this.currentPath = '/';
            await this.loadDirectory('/');
            
            this.showSuccessMessage(`Switched to ${repo.name}`);
        } catch (error) {
            console.error('Failed to switch repository:', error);
            this.repoManager.updateRepository(repo.id, { status: 'error' });
            this.updateSidebar();
            this.showErrorMessage(`Failed to switch to ${repo.name}: ${error.message}`);
        }
    }

    async switchToLocal() {
        this.repoManager.currentRepoId = null;
        this.repoManager.saveRepositories();
        
        try {
            this.showLoadingMessage('Switching to local files...');
            this.finderService = await FileSystemServiceFactory.createService(null);
            
            this.updateSidebar();
            this.hideGitControls();
            
            // Reset to root directory
            this.currentPath = '/';
            await this.loadDirectory('/');
            
            this.showSuccessMessage('Switched to local files');
        } catch (error) {
            console.error('Failed to switch to local:', error);
            this.showErrorMessage(`Failed to switch to local files: ${error.message}`);
        }
    }

    removeRepository(repoId) {
        const repo = this.repoManager.repositories.get(repoId);
        if (!repo) return;
        
        const confirmMessage = `Are you sure you want to remove "${repo.name}" repository?\n\nThis will only remove it from the sidebar. Your repository data will not be deleted.`;
        
        if (confirm(confirmMessage)) {
            this.repoManager.removeRepository(repoId);
            
            // If we're removing the current repository, switch to local
            if (this.repoManager.currentRepoId === repoId) {
                this.switchToLocal();
            } else {
                this.updateSidebar();
            }
            
            this.showSuccessMessage(`Removed ${repo.name} from sidebar`);
        }
    }

    showRepositoryConfig() {
        const repoConfigModal = this.shadowRoot.getElementById('repo-config-modal');
        
        // Clear form for new repository
        this.shadowRoot.getElementById('repo-name').value = '';
        this.shadowRoot.getElementById('repo-url').value = '';
        this.shadowRoot.getElementById('repo-token').value = '';
        this.shadowRoot.getElementById('repo-branch').value = 'main';
        
        repoConfigModal.classList.remove('hidden');
    }

    hideRepositoryConfig() {
        const repoConfigModal = this.shadowRoot.getElementById('repo-config-modal');
        repoConfigModal.classList.add('hidden');
    }

    async handleRepositoryConfig(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        let repoUrl = formData.get('repoUrl');
        
        // Convert .git URLs to HTTPS format
        if (repoUrl.endsWith('.git')) {
            // Convert git@github.com:user/repo.git to https://github.com/user/repo
            if (repoUrl.startsWith('git@')) {
                repoUrl = repoUrl
                    .replace('git@github.com:', 'https://github.com/')
                    .replace('.git', '');
            }
            // Remove .git from https URLs
            else if (repoUrl.startsWith('https://')) {
                repoUrl = repoUrl.replace('.git', '');
            }
        }
        
        const repoConfig = {
            name: formData.get('repoName'),
            url: repoUrl,
            token: formData.get('token'),
            branch: formData.get('branch') || 'main'
        };

        try {
            // Show loading message
            this.showLoadingMessage('Adding repository...');
            
            // Add repository to manager
            const repository = this.repoManager.addRepository(repoConfig);
            
            // Update sidebar to show the new repository
            this.updateSidebar();
            
            // Hide modal
            this.hideRepositoryConfig();
            
            // Ask user if they want to switch to the new repository
            const shouldSwitch = confirm(`Repository "${repository.name}" added successfully!\n\nWould you like to switch to it now?`);
            
            if (shouldSwitch) {
                await this.switchToRepository(repository.id);
            } else {
                this.showSuccessMessage(`Repository "${repository.name}" added to sidebar. Click on it to switch when ready.`);
            }
            
        } catch (error) {
            console.error('Failed to add repository:', error);
            this.showErrorMessage(`Failed to add repository: ${error.message}`);
        }
    }

    showGitControls() {
        const syncBtn = this.shadowRoot.getElementById('sync-btn');
        const commitBtn = this.shadowRoot.getElementById('commit-btn');
        syncBtn.style.display = 'block';
        commitBtn.style.display = 'block';
    }

    hideGitControls() {
        const syncBtn = this.shadowRoot.getElementById('sync-btn');
        const commitBtn = this.shadowRoot.getElementById('commit-btn');
        syncBtn.style.display = 'none';
        commitBtn.style.display = 'none';
    }

    async syncRepository() {
        if (!this.isServiceReady()) return;
        
        try {
            this.showLoadingMessage('Syncing with remote repository...');
            await this.finderService.fetchRemote();
            this.loadDirectory(this.currentPath);
            this.showSuccessMessage('Repository synced successfully!');
        } catch (error) {
            console.error('Failed to sync repository:', error);
            this.showErrorMessage(`Sync failed: ${error.message}`);
        }
    }

    async commitChanges() {
        if (!this.isServiceReady()) return;
        
        const message = prompt('Enter commit message:', 'Update from Finder');
        if (!message) return;
        
        try {
            this.showLoadingMessage('Committing and pushing changes...');
            const sha = await this.finderService.commitAndPush(message);
            
            if (sha) {
                this.showSuccessMessage(`Changes committed successfully! (${sha.slice(0, 8)})`);
            } else {
                this.showInfoMessage('No changes to commit');
            }
        } catch (error) {
            console.error('Failed to commit changes:', error);
            this.showErrorMessage(`Commit failed: ${error.message}`);
        }
    }

    showLoadingMessage(message) {
        console.log('⏳ Loading:', message);
        this.updateStatusMessage(message, 'loading');
    }

    showSuccessMessage(message) {
        console.log('✅ Success:', message);
        this.updateStatusMessage(message, 'success');
        // Auto-clear success messages after 3 seconds
        setTimeout(() => this.clearStatusMessage(), 3000);
    }

    showErrorMessage(message) {
        console.error('❌ Error:', message);
        this.updateStatusMessage(message, 'error');
        // Auto-clear error messages after 5 seconds
        setTimeout(() => this.clearStatusMessage(), 5000);
    }

    showInfoMessage(message) {
        console.log('ℹ️ Info:', message);
        this.updateStatusMessage(message, 'info');
        // Auto-clear info messages after 4 seconds
        setTimeout(() => this.clearStatusMessage(), 4000);
    }

    updateStatusMessage(message, type = 'info') {
        const statusBar = this.shadowRoot.querySelector('.status-bar');
        if (!statusBar) return;

        // Remove existing status message
        const existingMessage = statusBar.querySelector('.status-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new status message
        const messageElement = document.createElement('span');
        messageElement.className = `status-message status-${type}`;
        messageElement.textContent = message;

        // Add appropriate icon
        const icons = {
            loading: '⏳',
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        messageElement.textContent = `${icons[type]} ${message}`;

        // Insert at the beginning of status bar
        statusBar.insertBefore(messageElement, statusBar.firstChild);
    }

    clearStatusMessage() {
        const statusBar = this.shadowRoot.querySelector('.status-bar');
        if (!statusBar) return;

        const existingMessage = statusBar.querySelector('.status-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    async loadDirectory(path) {
        if (!this.isServiceReady()) return;
        
        try {
            const items = await this.finderService.getDirectoryContents(path);
            this.currentPath = path;
            
            // Save state when directory changes
            this.saveState();
            
            this.updatePathBar();
            this.renderContent(items);
            this.updateStatusBar(items);
            
            // Use a more specific event name for directory changes
            this.dispatchEvent(new CustomEvent('finder-directory-changed', {
                detail: { path, items },
                bubbles: true,
                composed: true
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
            <div class="file-item" data-id="${item.id}" data-path="${item.path}" data-type="${item.type}" draggable="true">
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
        
        // Save state when view mode changes
        this.saveState();
        
        if (mode === 'column') {
            // Column view implementation would go here
            console.log('Column view not fully implemented yet');
            return;
        }
        this.loadDirectory(this.currentPath);
        
        this.dispatchEvent(new CustomEvent('finder-view-mode-changed', {
            detail: { mode },
            bubbles: true,
            composed: true
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
        
        this.dispatchEvent(new CustomEvent('finder-selection-changed', {
            detail: { selectedItems: Array.from(this.selectedItems) },
            bubbles: true,
            composed: true
        }));
    }

    handleContentDoubleClick(e) {
        const item = e.target.closest('.file-item, .list-item');
        if (!item) return;

        if (item.dataset.type === 'folder') {
            this.loadDirectory(item.dataset.path);
        } else {//sys:launch-app
            if (this.createLaunchAppMessage) {
                this.dispatchEvent(this.createLaunchAppMessage({
                    id: item.dataset.id,
                    name: item.querySelector('.file-name, .list-name')?.textContent || 'Unknown',
                    icon: item.querySelector('.file-icon, .list-icon')?.textContent || '📄',
                    path: item.dataset.path
                }));
            } else {
                // Fallback to basic event
                this.dispatchEvent(new CustomEvent('LAUNCH_APP', {
                    detail: { id: item.dataset.id },
                    bubbles: true,
                    composed: true
                }));
            }
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
        
        if (!this.isServiceReady()) return;
        
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

    async openFile(path) {
        if (!this.isServiceReady()) return;

        const nameElement = this.shadowRoot.querySelector(`[data-path="${path}"] .file-name, [data-path="${path}"] .list-name`);
        const name = nameElement ? nameElement.textContent : path.split('/').pop();
        
        try {
            // Show loading state
            this.showLoadingMessage('Opening file...');
            
            // Get basic file info first
            const itemInfo = await this.finderService.getItemInfo(path);
            const mimeType = this.finderService.getMimeType(name);
            const category = this.finderService.getFileCategory(mimeType);
            const extension = name.split('.').pop().toLowerCase();
            
            // Check if we should read the content
            const shouldReadContent = this.finderService.shouldReadContent(mimeType, itemInfo.size);
            
            if (!shouldReadContent) {
                // Dispatch file reference event for files we don't read content for
                this.dispatchFileReferenceEvent({
                    name,
                    path,
                    mimeType,
                    extension,
                    category,
                    size: itemInfo.size,
                    reason: itemInfo.size > 50 * 1024 * 1024 ? 'file_too_large' : 'binary_content',
                    metadata: itemInfo,
                    gitStatus: itemInfo.gitStatus
                });
                return;
            }

            // Read file content
            const contentResult = await this.finderService.readFileContent(path);
            
            if (!contentResult.success) {
                // Handle read errors
                this.showErrorMessage(`Failed to read file: ${contentResult.message}`);
                
                // Still dispatch a reference event with error info
                this.dispatchFileReferenceEvent({
                    name,
                    path,
                    mimeType,
                    extension,
                    category,
                    size: itemInfo.size,
                    reason: contentResult.reason,
                    error: contentResult.message,
                    metadata: itemInfo,
                    gitStatus: itemInfo.gitStatus
                });
                return;
            }

            // For images, add data URL prefix if base64
            let finalContent = contentResult.content;
            if (category === 'image' && contentResult.encoding === 'base64') {
                finalContent = `data:${mimeType};base64,${contentResult.content}`;
            }

            // Dispatch rich content event
            this.dispatchFileContentEvent({
                name,
                path,
                mimeType,
                extension,
                category,
                size: contentResult.size,
                encoding: contentResult.encoding,
                content: finalContent,
                isBinary: contentResult.isBinary,
                metadata: {
                    ...itemInfo,
                    ...contentResult.stats
                },
                gitStatus: itemInfo.gitStatus
            });

        } catch (error) {
            console.error('Failed to open file:', error);
            this.showErrorMessage(`Failed to open file: ${error.message}`);
            
            // Dispatch basic file reference on error
            this.dispatchFileReferenceEvent({
                name,
                path,
                mimeType: 'application/octet-stream',
                extension: name.split('.').pop().toLowerCase(),
                category: 'binary',
                reason: 'read_error',
                error: error.message
            });
        }
    }

    dispatchFileContentEvent(fileData) {
        const event = new CustomEvent('finder-file-content', {
            detail: fileData,
            bubbles: true,
            composed: true
        });
        
        console.log('📄 Dispatching file content event:', fileData);
        this.dispatchEvent(event);
    }

    dispatchFileReferenceEvent(fileData) {
        const event = new CustomEvent('finder-file-reference', {
            detail: fileData,
            bubbles: true,
            composed: true
        });
        
        console.log('📎 Dispatching file reference event:', fileData);
        this.dispatchEvent(event);
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

    // State persistence methods
    saveState() {
        const state = {
            currentPath: this.currentPath,
            viewMode: this.viewMode,
            currentRepoId: this.repoManager.getCurrentRepository()?.id || null,
            timestamp: Date.now()
        };
        
        localStorage.setItem('finder-state', JSON.stringify(state));
        console.log('💾 Finder state saved:', state);
    }

    restoreState() {
        try {
            const savedState = localStorage.getItem('finder-state');
            if (!savedState) {
                console.log('📂 No saved finder state found, using defaults');
                return;
            }

            const state = JSON.parse(savedState);
            console.log('🔄 Restoring finder state:', state);

            // Restore view mode
            if (state.viewMode && ['icon', 'list', 'column'].includes(state.viewMode)) {
                this.viewMode = state.viewMode;
                console.log('   📊 Restored view mode:', this.viewMode);
            }

            // Restore current path
            if (state.currentPath && typeof state.currentPath === 'string') {
                this.currentPath = state.currentPath;
                console.log('   📁 Restored current path:', this.currentPath);
            }

            // Note: Repository restoration happens in repoManager initialization
            // We'll set the current repo after repos are loaded
            if (state.currentRepoId) {
                this.pendingRepoRestore = state.currentRepoId;
                console.log('   🎯 Will restore repository:', state.currentRepoId);
            }

        } catch (error) {
            console.warn('⚠️ Failed to restore finder state:', error);
        }
    }

    // Apply view mode restoration after UI is rendered
    applyViewModeRestore() {
        // Update the UI to reflect the restored view mode
        const viewButtons = this.shadowRoot.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => btn.classList.remove('active'));
        
        const activeButton = this.shadowRoot.getElementById(this.viewMode + '-view');
        if (activeButton) {
            activeButton.classList.add('active');
            console.log('✅ Restored view mode:', this.viewMode);
        }
    }

    // Apply repository restoration after repos are loaded
    applyRepositoryRestore() {
        if (this.pendingRepoRestore) {
            const repo = this.repoManager.repositories.get(this.pendingRepoRestore);
            if (repo) {
                this.repoManager.setCurrentRepository(this.pendingRepoRestore);
                console.log('✅ Restored repository:', repo.name);
            } else {
                console.warn('⚠️ Could not restore repository with ID:', this.pendingRepoRestore);
            }
            this.pendingRepoRestore = null;
        }
    }

    // Clear saved state (useful for debugging)
    clearState() {
        localStorage.removeItem('finder-state');
        console.log('🗑️ Finder state cleared');
    }
}

customElements.define('finder-webapp', FinderWebApp);