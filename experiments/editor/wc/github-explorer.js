import { Octokit } from "https://esm.sh/octokit";
import { saveGithubFile, getGithubFile, getAllGithubFiles, getDirtyGithubFiles, deleteGithubFile, clearGithubCache } from './db-manager.js';

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
        
        window.addEventListener('file-selected', (e) => {
            this._currentFileId = e.detail.id;
            this.updateActiveFileUI(this._currentFileId);
        });

        window.addEventListener('file-list-changed', () => {
            this.refreshFileList();
        });
    }

    render() {
        this.innerHTML = `
        <style>
            /* ...existing styles... */
            :host {
                padding: 0;
                margin: 0;
            }
            .sidebar-header {
                padding: 0px 12px;
                width: 100%;
                font-size: 11px;
                text-transform: uppercase;
                color: #969696;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #333;
                background: #252526;
            }
            .section-label {
                padding: 4px 12px;
                font-size: 11px;
                font-weight: bold;
                color: #888;
                background: #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .header-actions {
                display: flex;
                gap: 8px;
            }
            .clear-btn {
                background: none; border: none; color: #888; cursor: pointer; padding: 2px; font-size: 12px;
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
                border-bottom: 1px solid #333;
                display: none;
            }
            #changes-list.has-changes {
                display: block;
            }
            .item-path {
                font-size: 10px;
                color: #666;
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
            .item:hover { background: var(--hover-bg, #2a2d2e); }
            .item.active { background: var(--active-bg, #37373d); color: #fff; box-shadow: inset 2px 0 0 var(--accent-color, #007acc); }
            
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
                background: none; border: none; color: #888; cursor: pointer; padding: 2px;
                display: flex; align-items: center;
            }
            .action-btn:hover { color: #fff; }

            .add-btn {
                background: none; border: none; color: #ccc; cursor: pointer; padding: 2px; font-size: 16px;
            }
            .add-btn:hover { color: #fff; }
            .item.modified .item-name::after {
                content: '●';
                color: #cca700;
                margin-left: 5px;
                font-size: 10px;
            }
            .sync-btn {
                background: none; border: none; color: #888; cursor: pointer; padding: 2px; font-size: 12px;
            }
            .sync-btn:hover { color: #fff; }
        </style>
        <div class="sidebar-header">
            <span>GitHub Explorer</span>
            <div class="header-actions">
                <button class="clear-btn" id="clear-cache-btn" title="Clear Local Cache">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                <button class="sync-btn" id="sync-btn" title="Sync Changes">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </button>
                <button class="add-btn" id="new-file-btn" title="New File">+</button>
            </div>
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
            const path = (this.config.path ? this.config.path + '/' : '') + name;
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

                const result = await this.octokit.request(`PUT /repos/${this.config.owner}/${this.config.repo}/contents/${file.path}`, {
                owner: this.config.owner,
                repo: this.config.repo,
                path: file.path,
                branch: this.config.branch,
                message: `Sync ${file.path}`,
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

            dirtyFiles.forEach(file => {
                const item = this.createFileItem(file, false);
                const pathHint = document.createElement('span');
                pathHint.className = 'item-path';
                pathHint.textContent = file.path.split('/').slice(0, -1).join('/') || '/';
                item.querySelector('.item-name').appendChild(pathHint);
                changesList.appendChild(item);
            });

            // 2. Get remote files
            const { data: remoteData } = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: this.config.path,
                ref: this.config.branch
            });

            // 3. Get local files for this path
            const localFiles = await getAllGithubFiles();
            const currentPathFiles = localFiles.filter(f => {
                const parentPath = f.path.substring(0, f.path.lastIndexOf('/')) || '';
                return parentPath === this.config.path;
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
            
            items.forEach(itemData => {
                const item = this.createFileItem(itemData, itemData.type === 'dir');
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

    createFileItem(itemData, isDir) {
        const item = document.createElement('div');
        item.className = `item ${itemData.status === 'modified' || itemData.status === 'new' ? 'modified' : ''}`;
        item.dataset.id = itemData.sha;
        item.dataset.path = itemData.path;
        item.classList.toggle('active', itemData.sha === this._currentFileId);
        
        const isWebComponent = !isDir && itemData.content && itemData.content.match(/customElements\.define\(['"]([^'"]+)['"]/);
        
        const icon = isDir 
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; color: #dcb67a;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;

        item.innerHTML = `
            ${icon}
            <span class="item-name">${itemData.name}</span>
            <div class="item-actions">
                ${!isDir ? `
                ${isWebComponent ? `
                <button class="action-btn run-btn" title="Run Component">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>` : ''}
                <button class="action-btn rename-btn" title="Rename">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                </button>
                <button class="action-btn delete-btn" title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>` : ''}
            </div>
        `;

        item.onclick = async (e) => {
            if (e.target.closest('.action-btn')) return;

            if (isDir) {
                this.config.path = itemData.path;
                this.refreshFileList();
                return;
            }

            // If already active, initiate rename
            if (this._currentFileId === itemData.sha) {
                await this.renameFile(itemData);
                return;
            }

            // Check local first
            let fileData = await getGithubFile(itemData.path);

            if (!fileData || fileData.status === 'synced') {
                try {
                    const { data: remoteFile } = await this.octokit.rest.repos.getContent({
                        owner: this.config.owner,
                        repo: this.config.repo,
                        path: itemData.path,
                        ref: this.config.branch
                    });

                    const content = decodeURIComponent(escape(atob(remoteFile.content)));
                    fileData = {
                        ...itemData,
                        content,
                        sha: remoteFile.sha,
                        status: 'synced'
                    };
                    await saveGithubFile(fileData);
                } catch (error) {
                    await this.handleError(error, "Opening remote file");
                    return;
                }
            }
            this.dispatchEvent(new CustomEvent('file-opened', {
                detail: { id: fileData.sha, name: fileData.name, content: fileData.content, path: fileData.path },
                bubbles: true,
                composed: true
            }));
            this._currentFileId = fileData.sha;
            this.updateActiveFileUI(this._currentFileId);
        };

        if (!isDir) {
            if (isWebComponent) {
                item.querySelector('.run-btn').onclick = (e) => {
                    e.stopPropagation();
                    document.dispatchEvent(new CustomEvent('vibe-coder-play', {detail: itemData.content}));
                }
            }

            item.querySelector('.rename-btn').onclick = (e) => {
                e.stopPropagation()            
                document.dispatchEvent(new CustomEvent('editor-show', { bubbles: true, composed: true }));
            };

            item.querySelector('.delete-btn').onclick = async (e) => {
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
            };
        }

        return item;
    }

    updateActiveFileUI(id) {
        this.querySelectorAll('.item').forEach(item => {
            item.classList.toggle('active', item.dataset.id == id);
        });
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

    // Helper to save changes to an existing file
    async saveFileContent(path, content, sha) {
        try {
            const existing = await getGithubFile(path);
            await saveGithubFile({
                ...existing,
                path,
                content,
                sha,
                status: 'modified'
            });
            await this.refreshFileList();
            return sha; // Return existing sha as it hasn't changed on remote yet
        } catch (error) {
            console.error("Error saving file locally:", error);
            throw error;
        }
    }
}

customElements.define('github-explorer', GithubExplorer);
