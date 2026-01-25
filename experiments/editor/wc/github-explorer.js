import { Octokit } from "https://esm.sh/octokit";
import { saveGithubFile, getGithubFile, getAllGithubFiles, getDirtyGithubFiles, deleteGithubFile, clearGithubCache } from '/experiments/editor/wc/db-manager.js';
import { getFile, normalizePath } from '/js/fs.js';
import { eventBus } from '/desktop/src/events/event-bus.js';
import { MESSAGES } from '/desktop/src/events/message-types.js';

export class GithubExplorer extends HTMLElement {
    constructor() {
        super();
        this._currentFileId = null;
        const savedConfig = JSON.parse(localStorage.getItem('github-explorer-config') || '{}');
        this.config = {
            owner: savedConfig.owner || 'weolopez',
            repo: savedConfig.repo || 'weolopez.github.io',
            branch: savedConfig.branch || 'fs',
            path: savedConfig.path || 'experiments/wc',
            auth: savedConfig.auth || '',
            email: savedConfig.email || 'octocat@github.com'
        };
        //save to localstorage
        localStorage.setItem('github-explorer-config', JSON.stringify(this.config));
        this.octokit = new Octokit({ auth: this.config.auth });
    }


    connectedCallback() {
        this.render();
        this.refreshFileList();

        eventBus.subscribe(MESSAGES.FINDER_FILE_EDIT, ({ filePath }) => {
            this._currentFilePath = filePath;
            this.editFile(this._currentFilePath);
        });

        window.addEventListener('file-selected', (e) => {
            this._currentFileId = e.detail.id;
            this.updateActiveFileUI(this._currentFileId);
        });

        window.addEventListener('file-list-changed', () => {
            this.refreshFileList();
        });

        window.addEventListener('github-create-file', async (e) => {
            const { 
                name, 
                content = '', 
                path = 'experiments/wc', 
                type = 'file',
                immediate = false,
                message = `new file ${e.detail.name}`
            } = e.detail;

            if (!name) {
                console.error('github-create-file: "name" is required');
                return;
            }

            const cleanPath = normalizePath(path);
            const fullPath = cleanPath ? `${cleanPath}/${name}` : name;

            try {
                if (immediate) {
                    const result = await this.octokit.request(`PUT /repos/${this.config.owner}/${this.config.repo}/contents/${fullPath}`, {
                        owner: this.config.owner,
                        repo: this.config.repo,
                        path: fullPath,
                        branch: this.config.branch,
                        message: message,
                        committer: {
                            name: `${this.config.owner}`,
                            email: `${this.config.email}`
                        },
                        content: btoa(unescape(encodeURIComponent(content))),
                        headers: {
                            'X-GitHub-Api-Version': '2022-11-28'
                        }
                    });

                    await saveGithubFile({
                        path: fullPath,
                        name,
                        content,
                        sha: result.data.content.sha,
                        status: 'synced',
                        type
                    });
                } else {
                    await saveGithubFile({
                        path: fullPath,
                        name,
                        content,
                        status: 'new',
                        type
                    });
                }
                
                await this.refreshFileList();
                console.log(`File ${fullPath} created ${immediate ? 'on GitHub' : 'in local cache'}.`);
            } catch (err) {
                console.error("Failed to create file via event:", err);
                this.handleError(err, "Create File");
            }
        });
    }

    render() {
        // detect OS/browser theme and provide a simple helper to pick colors
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const pick = (dark, light) => isDark ? dark : light;

        const bg = pick('#1e1e1e', '#ffffff');
        const panelBg = pick('#252526', '#f5f5f5');
        const panelAlt = pick('#333', '#efefef');
        const text = pick('#e6e6e6', '#111111');
        const subText = pick('#969696', '#666666');
        const hoverBg = pick('#313536ff', '#f0f0f0');
        const activeBg = pick('#37373d', '#e8e8e8');
        const accent = pick('#007acc', '#0066cc');
        const modifiedDot = pick('#cca700', '#cc7400');

        this.innerHTML = `
        <style>
            github-explorer {
            padding: 0;
            margin: 0;
            color: ${text};
            background: ${bg};
            display: block;
            --panel-bg: ${panelBg};
            --panel-alt: ${panelAlt};
            --text-muted: ${subText};
            --hover-bg: ${hoverBg};
            --active-bg: ${activeBg};
            --accent-color: ${accent};
            --modified-dot: ${modifiedDot};
            min-width: 300px;
            min-height: 598px;
            }

            .sidebar-header {
            padding: 0px 12px;
            width: 100%;
            font-size: 11px;
            text-transform: uppercase;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(0,0,0,0.2);
            background: var(--panel-bg);
            }
            .section-label {
            padding: 4px 12px;
            font-size: 11px;
            font-weight: bold;
            color: var(--text-muted);
            background: var(--panel-alt);
            display: flex;
            justify-content: space-between;
            align-items: center;
            }
            .header-actions {
            display: flex;
            gap: 8px;
            }
            #search-container {
            display: none;
            padding: 4px;
            background: var(--panel-bg);
            border-bottom: 1px solid rgba(0,0,0,0.1);
            }
            #search-container.visible {
            display: block;
            }
            #search-input {
            width: 100%;
            padding: 2px 4px;
            background: var(--active-bg);
            color: ${text};
            border: 1px solid var(--panel-alt);
            font-size: 11px;
            outline: none;
            }
            #search-input:focus {
            border-color: var(--accent-color);
            }
            .search-btn {
             background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; font-size: 12px;
            }
            .search-btn:hover { color: ${text}; }
            .clear-btn {
            background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; font-size: 12px;
            }
            .clear-btn:hover { color: #f44; }
            .list-container {
            flex: 1;
            overflow-y: auto;
            padding-top: 5px;
            }
            #file-list {
            max-height: 81vh;
            }
            #changes-list {
            max-height: 200px;
            border-bottom: 1px solid rgba(0,0,0,0.12);
            display: none;
            }
            #changes-list.has-changes {
            display: block;
            }
            .item-path {
            font-size: 10px;
            color: var(--text-muted);
            margin-left: 4px;
            }
            .item {
            padding: 6px 12px;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            position: relative;
            }
            .item:hover { background: var(--hover-bg);  }
            .item.active { background: var(--active-bg); color: ${text}; box-shadow: inset 2px 0 0 var(--accent-color); }
            
            .item-name {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            }

            .item-actions {
            display: none;
            gap: 4px;
            }
            .item:hover .item-actions {
            display: flex;
            }
            .action-btn {
            background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;
            display: flex; align-items: center;
            }
            .action-btn:hover { color: ${text}; }

            .add-btn {
            background: none; border: none; color: #ccc; cursor: pointer; padding: 2px; font-size: 16px;
            }
            .add-btn:hover { color: ${text}; }
            .item.modified .item-name::after {
            content: '●';
            color: var(--modified-dot);
            margin-left: 5px;
            font-size: 10px;
            }
            .sync-btn {
            background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; font-size: 12px;
            }
            .sync-btn:hover { color: ${text}; }
            svg {
            width: 14px;
            height: 14px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            }
        </style>
        <div class="sidebar-header">
            <span>GitHub Explorer</span>
            <div class="header-actions">
            <button class="search-btn" id="toggle-search-btn" title="Search Code">
                <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
            <button class="clear-btn" id="clear-cache-btn" title="Clear Local Cache">
                <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
            <button class="sync-btn" id="sync-btn" title="Sync Changes">
                <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
            <button class="add-btn" id="new-file-btn" title="New File">+</button>
            </div>
        </div>
        <div id="search-container">
            <input type="text" id="search-input" placeholder="Search code..." />
        </div>
        <div id="changes-section">
            <div class="section-label"><span>PENDING CHANGES</span><span id="change-count">0</span></div>
            <div id="changes-list" class="list-container"></div>
        </div>
        <div class="section-label">FILES</div>
        <div class="list-container" id="file-list"></div>
        `;

        this.querySelector('#new-file-btn').onclick = () => this.createNewFile();
        this.querySelector('#sync-btn').onclick = () => this.syncChanges();
        this.querySelector('#clear-cache-btn').onclick = () => this.clearCache();
        
        const searchInput = this.querySelector('#search-input');
        const searchContainer = this.querySelector('#search-container');
        
        this.querySelector('#toggle-search-btn').onclick = () => {
             searchContainer.classList.toggle('visible');
             if(searchContainer.classList.contains('visible')) {
                 searchInput.focus();
             } else {
                 if (searchInput.value) {
                     searchInput.value = '';
                     this.refreshFileList();
                 }
             }
        };

        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.performSearch(searchInput.value);
            }
            if (e.key === 'Escape') {
                 searchContainer.classList.remove('visible');
                 this.refreshFileList();
            }
        };
    }

    async clearCache() {
        if (confirm("Clear local GitHub cache? Unsynced changes will be lost.")) {
            await clearGithubCache();
            this.refreshFileList();
            alert("Cache cleared.");
        }
    }

    async handleError(error, actionName = "Operation") {
        console.error(`${actionName} error:`, error);
        if (error.status === 401) {
            const newAuth = prompt("GitHub Authentication failed (401). Please enter a valid Personal Access Token (PAT):", this.config.auth);
            if (newAuth) {
                this.config.auth = newAuth;
                localStorage.setItem('github-explorer-config', JSON.stringify(this.config));
                this.octokit = new Octokit({ auth: this.config.auth });
                alert("Token updated. Please try again.");
                this.refreshFileList();
                return;
            }
        }
        alert(`${actionName} failed. ${error.message || 'Check console.'}`);
    }

    async createNewFile() {
        const name = prompt("File name:", "component.js");
        if (name) {
            // Ensure no leading slash in path
            let basePath = this.config.path || '';
            const cleanBasePath = normalizePath(basePath);
            
            const path = (cleanBasePath ? cleanBasePath + '/' : '') + name;
            const content = `// Code for ${name}`;
            await saveGithubFile({
                path,
                name,
                content,
                status: 'new',
                type: 'file'
            });
            await this.refreshFileList();
        }
    }

    async syncChanges() {
        const dirty = await getDirtyGithubFiles();
        if (dirty.length === 0) {
            alert("No changes to sync.");
            return;
        }

        const btn = this.querySelector('#sync-btn');
        btn.style.animation = 'spin 1s linear infinite';

        try {
            for (const file of dirty) {
                // Fix: Sanitize path to ensure it doesn't start with a slash and is not a URL
                const cleanPath = normalizePath(file.path);

                // If path resolution failed or emptied effectively, skip or warn
                if (!cleanPath) {
                    console.warn("Skipping sync for invalid path:", file.path);
                    continue;
                }

                const result = await this.octokit.request(`PUT /repos/${this.config.owner}/${this.config.repo}/contents/${cleanPath}`, {
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: cleanPath,
                    branch: this.config.branch,
                    message: `Sync ${cleanPath}`,
                    committer: {
                        name: `${this.config.owner}`,
                        email: `${this.config.email}`
                    },
                    sha: file.sha, // undefined for new files
                    content: btoa(unescape(encodeURIComponent(file.content))),
                    headers: {
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                })
                
                await saveGithubFile({
                    ...file,
                    path: cleanPath, // Ensure stored path is clean
                    sha: result.data.content.sha,
                    status: 'synced'
                });
            }
            alert("Sync complete!");
            await this.refreshFileList();
        } catch (error) {
            await this.handleError(error, "Sync");
        } finally {
            btn.style.animation = '';
        }
    }

    async refreshFileList() {
        const list = this.querySelector('#file-list');
        const changesList = this.querySelector('#changes-list');
        const changeCountLabel = this.querySelector('#change-count');
        if (!list || !changesList) return;
        
        try {
            // 1. Get Dirty Files for the "Changes" list
            const dirtyFiles = await getDirtyGithubFiles();
            changesList.innerHTML = '';
            changeCountLabel.textContent = dirtyFiles.length;
            changesList.classList.toggle('has-changes', dirtyFiles.length > 0);

            dirtyFiles.forEach(async file => {
                const item = await this.createFileItem(file, false);
                const pathHint = document.createElement('span');
                pathHint.className = 'item-path';
                pathHint.textContent = file.path.split('/').slice(0, -1).join('/') || '/';
                item.querySelector('.item-name').appendChild(pathHint);
                changesList.appendChild(item);
            });

            // 2. Get remote files
            // Fix: Sanitize config.path for the API call
            const apiPath = normalizePath(this.config.path);

            const { data: remoteData } = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: apiPath,
                ref: this.config.branch
            });

            // 3. Get local files for this path
            const localFiles = await getAllGithubFiles();
            const currentPathFiles = localFiles.filter(f => {
                // Ensure comparison logic handles leading slashes consistently
                const normalizedFilePath = normalizePath(f.path);
                const normalizedConfigPath = normalizePath(this.config.path);
                
                const parentPath = normalizedFilePath.substring(0, normalizedFilePath.lastIndexOf('/'));
                // Root items have empty parentPath
                if (normalizedConfigPath === '' && !normalizedFilePath.includes('/')) return true;
                return parentPath === normalizedConfigPath;
            });

            // 4. Merge (Local overrides remote if modified)
            const merged = [...remoteData];
            currentPathFiles.forEach(local => {
                const index = merged.findIndex(m => m.path === local.path);
                if (index !== -1) {
                    merged[index] = { ...merged[index], ...local };
                } else if (local.status === 'new') {
                    merged.push(local);
                }
            });

            const items = merged.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'dir' ? -1 : 1;
            });
            
            list.innerHTML = '';

            // Add "Back" button if not at root
            if (this.config.path) {
                const backItem = document.createElement('div');
                backItem.className = 'item';
                backItem.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"></path></svg>
                    <span class="item-name">..</span>
                `;
                backItem.onclick = () => {
                    const parts = this.config.path.split('/');
                    parts.pop();
                    this.config.path = parts.join('/');
                    this.refreshFileList();
                };
                list.appendChild(backItem);
            }
            
            items.forEach(async itemData => {
                const item = await this.createFileItem(itemData, itemData.type === 'dir');
                list.appendChild(item);
            });
            
            if (this._currentFileId) this.updateActiveFileUI(this._currentFileId);
        } catch (error) {
            if (error.status === 401) {
                await this.handleError(error, "Loading files");
            } else {
                console.error("Error fetching file list:", error);
                list.innerHTML = '<div style="padding: 10px; color: #f44;">Error loading files. Check config.</div>';
            }
        }
    }

    async createFileItem(itemData, isDir) {
        const item = document.createElement('div');
        item.className = `item ${itemData.status === 'modified' || itemData.status === 'new' ? 'modified' : ''}`;
        item.dataset.id = itemData.sha;
        item.dataset.path = itemData.path;
        item.classList.toggle('active', itemData.sha === this._currentFileId);

        if (!isDir && !itemData.content) itemData.content = await getFile(itemData.path);

        if (itemData.content && typeof itemData.content !== 'string') {
            if (typeof itemData.content.content == 'string') itemData.content = itemData.content.content
            else console.warn(`Unexpected content type for ${itemData.name}:`, itemData.content);
        }
        const isWebComponent = !isDir && itemData.content && itemData.content.match(/customElements\.define\(['"]([^'"]+)['"]/);
        
        const icon = isDir 
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; color: #dcb67a;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;

        item.innerHTML = `
            ${icon}
            <span class="item-name">${itemData.name}</span>
            <div class="item-actions">
                ${!isDir ? `
                <button class="action-btn run-btn" title="Run Component">
                    <svg width="12" height="12" viewBox="0 0 24 24"  stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <button class="action-btn edit-btn" title="Rename">
                    <svg width="12" height="12" viewBox="0 0 24 24" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                </button>
                <button class="action-btn delete-btn" title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>` : ''}
            </div>
        `;

        item.onclick = (e) => this.onItemClick(e, itemData, isDir);

        if (!isDir) {
            item.querySelector('.run-btn').onclick = (e) => this.runComponent(e, itemData, isDir, isWebComponent);
            item.querySelector('.edit-btn').onclick = (e) => this.onEditClick(e, itemData, isDir);
            item.querySelector('.delete-btn').onclick = (e) => this.onDeleteClick(e, itemData);
        }

        return item;
    }
    async editFile(path){

        let fileData = await getFile(path);
        this._currentFile = fileData;
        this._currentFileId = fileData.sha;
        const name = fileData.path.split('/').pop();
        this.updateActiveFileUI(this._currentFileId);

        document.dispatchEvent(new CustomEvent('editor-show', { 
            // bubbles: true, composed: true }));
        // document.dispatchEvent(new CustomEvent('file-opened', {
            detail: { id: fileData.sha, name: name, content: fileData.content, path: fileData.path },
            bubbles: true,
            composed: true
        }));

        eventBus.publish(MESSAGES.FINDER_FILE_EDITED, { 
            id: fileData.sha, 
            name: name, 
            content: fileData.content, 
            path: fileData.path 
        });
    }

    updateActiveFileUI(id) {
        this.querySelectorAll('.item').forEach(item => {
            item.classList.toggle('active', item.dataset.id == id);
        });
    }

    async onItemClick(e, itemData, isDir) {
        if (e.target.closest('.action-btn')) return;

        if (isDir) {
            await this.enterDirectory(itemData.path);
        } else {
            if (this._currentFileId === itemData.sha) {
                await this.renameFile(itemData);
            } else {
                await this.selectFile(itemData);
            }
        }
    }

    async enterDirectory(path) {
        this.config.path = path;
        await this.refreshFileList();
    }

    async runComponent(e, itemData, isDir, isWebComponent) {
        e.stopPropagation();
        if (isDir || !isWebComponent) return;
        try {
            let fileData = await getFile(itemData.path);
            document.dispatchEvent(new CustomEvent('vibe-coder-play', { detail: fileData.content }));
            document.dispatchEvent(new CustomEvent('PUBLISH_COMPONENT', {
                "detail": {
                    "code": fileData.content,
                    "url": fileData.path,
                    "mimeType": "application/javascript",
                    "launch": true
                },
                "time": Date.now(),
                "target": "window"
            }));
        } catch (error) {
            await this.handleError(error, "Run Component");
        }
    }

    async onEditClick(e, itemData, isDir) {
        e.stopPropagation();
        if (isDir) return;
        await this.editFile(itemData.path);
    }

    async onDeleteClick(e, itemData) {
        e.stopPropagation();
        if (confirm(`Delete ${itemData.name}?`)) {
            try {
                await this.octokit.rest.repos.deleteFile({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: itemData.path,
                    message: `Delete ${itemData.name}`,
                    sha: itemData.sha,
                    branch: this.config.branch
                });
                this.refreshFileList();
                this.dispatchEvent(new CustomEvent('file-deleted', {
                    detail: { id: itemData.sha },
                    bubbles: true,
                    composed: true
                }));
            } catch (error) {
                await this.handleError(error, "Delete");
            }
        }
    }

    async selectFile(itemData) {
        try {
            let fileData = await getFile(itemData.path);
            this._currentFile = fileData;
            this._currentFileId = fileData.sha;
            this.updateActiveFileUI(this._currentFileId);
        } catch (error) {
            await this.handleError(error, "Opening remote file");
        }
    }

    async renameFile(itemData) {
        const newName = prompt("Rename:", itemData.name);
        if (newName && newName !== itemData.name) {
            try {
                // GitHub doesn't have a direct rename, we need to create new and delete old
                const { data: fileData } = await this.octokit.rest.repos.getContent({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: itemData.path,
                    ref: this.config.branch
                });

                const newPath = itemData.path.replace(itemData.name, newName);
                
                // Create new file
                await this.octokit.rest.repos.createOrUpdateFileContents({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: newPath,
                    message: `Rename ${itemData.name} to ${newName}`,
                    content: fileData.content,
                    branch: this.config.branch
                });

                // Delete old file
                await this.octokit.rest.repos.deleteFile({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: itemData.path,
                    message: `Delete ${itemData.name} after rename`,
                    sha: itemData.sha,
                    branch: this.config.branch
                });

                this.refreshFileList();
            } catch (error) {
                await this.handleError(error, "Rename");
            }
        }
    }

    async searchFiles(query) {
        if (!query) return null;
        try {
            const q = `${query} repo:${this.config.owner}/${this.config.repo}`;
            const result = await this.octokit.rest.search.code({
                q,
                per_page: 100
            });
            return result.data;
        } catch (error) {
            console.error("Search error:", error);
            throw error;
        }
    }

    async performSearch(query) {
        const list = this.querySelector('#file-list');
        
        if (!query.trim()) {
            this.refreshFileList();
            return;
        }

        list.innerHTML = '<div style="padding:10px; color: var(--text-muted);">Searching...</div>';
        
        try {
            const result = await this.searchFiles(query);
            list.innerHTML = '';
            
            if (!result || result.items.length === 0) {
                 list.innerHTML = '<div style="padding:10px; color: var(--text-muted);">No results found.</div>';
                 return;
            }

            for (const item of result.items) {
                 const itemData = {
                     name: item.name,
                     path: item.path,
                     sha: item.sha,
                     type: 'file',
                     status: 'synced',
                     content: " " // Prevent auto-fetch in createFileItem
                 };
                 
                 const el = await this.createFileItem(itemData, false);
                 
                 const nameEl = el.querySelector('.item-name');
                 if(nameEl) {
                    nameEl.innerHTML = `${itemData.name} <span style="opacity:0.5; font-size: 0.8em; margin-left:8px;">${item.path}</span>`;
                 }
                 
                 list.appendChild(el);
            }
            
        } catch (e) {
            console.error(e);
            list.innerHTML = `<div style="padding:10px; color: #f44;">Error: ${e.message}</div>`;
        }
    }
}

customElements.define('github-explorer', GithubExplorer);
