import { Octokit } from "https://esm.sh/octokit";
import { saveGithubFile, getGithubFile, getAllGithubFiles, getDirtyGithubFiles, deleteGithubFile } from './db-manager.js';

export class GithubExplorer extends HTMLElement {
    constructor() {
        super();
        this._currentFileId = null;
        const savedConfig = JSON.parse(localStorage.getItem('github-explorer-config') || '{}');
        this.config = {
            owner: savedConfig.owner || 'weolopez',
            repo: savedConfig.repo || 'weolopez.github.io',
            branch: savedConfig.branch || 'fs',
            path: savedConfig.path || '',
            auth: savedConfig.auth || ''
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
            .sidebar-header {
                padding: 10px 12px;
                font-size: 11px;
                text-transform: uppercase;
                color: #969696;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #333;
            }
            .header-actions {
                display: flex;
                gap: 8px;
            }
            .list-container {
                flex: 1;
                overflow-y: auto;
                padding-top: 5px;
                max-height: 81vh;
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
                <button class="sync-btn" id="sync-btn" title="Sync Changes">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </button>
                <button class="add-btn" id="new-file-btn" title="New File">+</button>
            </div>
        </div>
        <div class="list-container" id="file-list"></div>
        `;

        this.querySelector('#new-file-btn').onclick = () => this.createNewFile();
        this.querySelector('#sync-btn').onclick = () => this.syncChanges();
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
                const result = await this.octokit.rest.repos.createOrUpdateFileContents({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: file.path,
                    message: `Sync ${file.path}`,
                    content: btoa(unescape(encodeURIComponent(file.content))),
                    sha: file.sha, // undefined for new files
                    branch: this.config.branch
                });
                
                await saveGithubFile({
                    ...file,
                    sha: result.data.content.sha,
                    status: 'synced'
                });
            }
            alert("Sync complete!");
            await this.refreshFileList();
        } catch (error) {
            console.error("Sync error:", error);
            alert("Sync failed. Check console.");
        } finally {
            btn.style.animation = '';
        }
    }

    async refreshFileList() {
        const list = this.querySelector('#file-list');
        if (!list) return;
        
        try {
            // 1. Get remote files
            const { data: remoteData } = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: this.config.path,
                ref: this.config.branch
            });

            // 2. Get local files for this path
            const localFiles = await getAllGithubFiles();
            const currentPathFiles = localFiles.filter(f => {
                const parentPath = f.path.substring(0, f.path.lastIndexOf('/')) || '';
                return parentPath === this.config.path;
            });

            // 3. Merge (Local overrides remote if modified)
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
                const item = document.createElement('div');
                item.className = `item ${itemData.status === 'modified' || itemData.status === 'new' ? 'modified' : ''}`;
                item.dataset.id = itemData.sha;
                item.dataset.path = itemData.path;
                
                const isDir = itemData.type === 'dir';
                const icon = isDir 
                    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; color: #dcb67a;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
                    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;

                item.innerHTML = `
                    ${icon}
                    <span class="item-name">${itemData.name}</span>
                    <div class="item-actions">
                        <button class="action-btn rename-btn" title="Rename">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                        </button>
                        <button class="action-btn delete-btn" title="Delete">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;

                item.onclick = async (e) => {
                    if (e.target.closest('.action-btn')) return;
                    
                    if (isDir) {
                        this.config.path = itemData.path;
                        this.refreshFileList();
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
                            console.error("Error opening remote file:", error);
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

                item.querySelector('.rename-btn').onclick = async (e) => {
                    e.stopPropagation();
                    const newName = prompt("Rename:", itemData.name);
                    if (newName && newName !== itemData.name) {
                        try {
                            if (isDir) {
                                alert("Renaming directories is not supported via this simple interface.");
                                return;
                            }
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
                            console.error("Error renaming file:", error);
                        }
                    }
                };

                item.querySelector('.delete-btn').onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete ${itemData.name}?`)) {
                        try {
                            if (isDir) {
                                alert("Deleting directories is not supported via this simple interface.");
                                return;
                            }
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
                            console.error("Error deleting file:", error);
                        }
                    }
                };

                list.appendChild(item);
            });
            
            if (this._currentFileId) this.updateActiveFileUI(this._currentFileId);
        } catch (error) {
            console.error("Error fetching file list:", error);
            list.innerHTML = '<div style="padding: 10px; color: #f44;">Error loading files. Check config.</div>';
        }
    }

    updateActiveFileUI(id) {
        this.querySelectorAll('.item').forEach(item => {
            item.classList.toggle('active', item.dataset.id == id);
        });
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
