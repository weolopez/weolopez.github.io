import { getAllFiles, saveFile, deleteFile } from './db-manager.js';

export class FileExplorer extends HTMLElement {
    constructor() {
        super();
        this._currentFileId = null;
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
            <span>Explorer</span>
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
            const id = await saveFile({ name, content });
            await this.refreshFileList();
            this.dispatchEvent(new CustomEvent('file-opened', { 
                detail: { id, name, content },
                bubbles: true,
                composed: true
            }));
        }
    }

    async refreshFileList() {
        const list = this.querySelector('#file-list');
        if (!list) return;
        const files = await getAllFiles();
        list.innerHTML = '';
        
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'item';
            item.dataset.id = file.id;
            
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

            item.onclick = (e) => {
                if (e.target.closest('.action-btn')) return;
                this.dispatchEvent(new CustomEvent('file-opened', { 
                    detail: { id: file.id, name: file.name, content: file.content },
                    bubbles: true,
                    composed: true
                }));
            };

            item.querySelector('.rename-btn').onclick = async (e) => {
                e.stopPropagation();
                const newName = prompt("Rename file:", file.name);
                if (newName && newName !== file.name) {
                    file.name = newName;
                    await saveFile(file);
                    this.refreshFileList();
                }
            };

            item.querySelector('.delete-btn').onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Delete ${file.name}?`)) {
                    await deleteFile(file.id);
                    this.refreshFileList();
                    this.dispatchEvent(new CustomEvent('file-deleted', { 
                        detail: { id: file.id },
                        bubbles: true,
                        composed: true
                    }));
                }
            };

            list.appendChild(item);
        });
        
        if (this._currentFileId) this.updateActiveFileUI(this._currentFileId);
    }

    updateActiveFileUI(id) {
        this.querySelectorAll('.item').forEach(item => {
            item.classList.toggle('active', item.dataset.id == id);
        });
    }
}

customElements.define('file-explorer', FileExplorer);
