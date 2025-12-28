import { Octokit } from "https://esm.sh/octokit";

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
        </style>
        <div class="sidebar-header">
            <span>GitHub Explorer</span>
            <button class="add-btn" id="new-file-btn" title="New File">+</button>
        </div>
        <div class="list-container" id="file-list"></div>
        `;

        this.querySelector('#new-file-btn').onclick = () => this.createNewFile();
    }

    async createNewFile() {
        const name = prompt("File name:", "component.js");
        if (name) {
            const content = `// Code for ${name}`;
            try {
                await this.octokit.rest.repos.createOrUpdateFileContents({
                    owner: this.config.owner,
                    repo: this.config.repo,
                    path: (this.config.path ? this.config.path + '/' : '') + name,
                    message: `Create ${name}`,
                    content: btoa(content),
                    branch: this.config.branch
                });
                await this.refreshFileList();
            } catch (error) {
                console.error("Error creating file:", error);
                alert("Error creating file. Check console.");
            }
        }
    }

    async refreshFileList() {
        const list = this.querySelector('#file-list');
        if (!list) return;
        
        try {
            const { data } = await this.octokit.rest.repos.getContent({
                owner: this.config.owner,
                repo: this.config.repo,
                path: this.config.path,
                ref: this.config.branch
            });

            const files = Array.isArray(data) ? data.filter(item => item.type === 'file') : [];
            list.innerHTML = '';
            
            files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'item';
                item.dataset.id = file.sha;
                item.dataset.path = file.path;
                
                item.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                    <span class="item-name">${file.name}</span>
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
                    
                    try {
                        const { data: fileData } = await this.octokit.rest.repos.getContent({
                            owner: this.config.owner,
                            repo: this.config.repo,
                            path: file.path,
                            ref: this.config.branch
                        });
                        
                        const content = decodeURIComponent(escape(atob(fileData.content)));
                        
                        this.dispatchEvent(new CustomEvent('file-opened', { 
                            detail: { id: file.sha, name: file.name, content: content, path: file.path },
                            bubbles: true,
                            composed: true
                        }));
                        this._currentFileId = file.sha;
                        this.updateActiveFileUI(this._currentFileId);
                    } catch (error) {
                        console.error("Error opening file:", error);
                    }
                };

                item.querySelector('.rename-btn').onclick = async (e) => {
                    e.stopPropagation();
                    const newName = prompt("Rename file:", file.name);
                    if (newName && newName !== file.name) {
                        try {
                            // GitHub doesn't have a direct rename, we need to create new and delete old
                            const { data: fileData } = await this.octokit.rest.repos.getContent({
                                owner: this.config.owner,
                                repo: this.config.repo,
                                path: file.path,
                                ref: this.config.branch
                            });

                            const newPath = file.path.replace(file.name, newName);
                            
                            // Create new file
                            await this.octokit.rest.repos.createOrUpdateFileContents({
                                owner: this.config.owner,
                                repo: this.config.repo,
                                path: newPath,
                                message: `Rename ${file.name} to ${newName}`,
                                content: fileData.content,
                                branch: this.config.branch
                            });

                            // Delete old file
                            await this.octokit.rest.repos.deleteFile({
                                owner: this.config.owner,
                                repo: this.config.repo,
                                path: file.path,
                                message: `Delete ${file.name} after rename`,
                                sha: file.sha,
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
                    if (confirm(`Delete ${file.name}?`)) {
                        try {
                            await this.octokit.rest.repos.deleteFile({
                                owner: this.config.owner,
                                repo: this.config.repo,
                                path: file.path,
                                message: `Delete ${file.name}`,
                                sha: file.sha,
                                branch: this.config.branch
                            });
                            this.refreshFileList();
                            this.dispatchEvent(new CustomEvent('file-deleted', { 
                                detail: { id: file.sha },
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
            const result = await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.config.owner,
                repo: this.config.repo,
                path: path,
                message: `Update ${path}`,
                content: btoa(unescape(encodeURIComponent(content))),
                sha: sha,
                branch: this.config.branch
            });
            await this.refreshFileList();
            return result.data.content.sha;
        } catch (error) {
            console.error("Error saving file:", error);
            throw error;
        }
    }
}

customElements.define('github-explorer', GithubExplorer);
