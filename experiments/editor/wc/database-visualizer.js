import { getAllFiles, saveFile, deleteFile } from './db-manager.js';

export class DatabaseVisualizer extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        window.addEventListener('file-list-changed', () => {
            if (this.style.display === 'block') this.renderDBTable();
        });
    }

    render() {
        this.innerHTML = `
        <style>
            #db-overlay {
                display: none;
                position: fixed;
                top: 48px; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 100;
                padding: 40px;
            }
            .db-modal {
                background: #252526;
                width: 100%;
                max-width: 900px;
                height: 80%;
                margin: 0 auto;
                border: 1px solid #444;
                display: flex;
                flex-direction: column;
            }
            .db-table-container {
                flex: 1;
                overflow: auto;
                padding: 20px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }
            th, td {
                text-align: left;
                padding: 10px;
                border: 1px solid #333;
            }
            th { background: #333; }
            .db-controls {
                padding: 15px 20px;
                background: #2d2d2d;
                display: flex;
                gap: 10px;
                border-bottom: 1px solid #444;
            }
        </style>
        <div id="db-overlay">
            <div class="db-modal">
                <div class="db-controls">
                    <strong style="margin-right: auto">IndexedDB: ComponentStudioDB</strong>
                    <button id="close-db-btn" style="background:transparent; color:#888; border:none; cursor:pointer">✕ Close</button>
                </div>
                <div class="db-table-container">
                    <table id="db-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Content Size</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="db-tbody"></tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        this.querySelector('#close-db-btn').onclick = () => this.close();
    }

    open() {
        this.querySelector('#db-overlay').style.display = 'block';
        this.renderDBTable();
    }

    close() {
        this.querySelector('#db-overlay').style.display = 'none';
    }

    async renderDBTable() {
        const files = await getAllFiles();
        const tbody = this.querySelector('#db-tbody');
        tbody.innerHTML = '';
        files.forEach(file => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${file.id}</td>
                <td><input type="text" value="${file.name}" data-id="${file.id}" class="db-name-input" style="background:#1e1e1e; color:white; border:1px solid #444; padding:2px"></td>
                <td>${file.content.length} chars</td>
                <td>
                    <button class="db-delete-btn" data-id="${file.id}" style="color:#f48771; background:none; border:none; cursor:pointer">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.db-name-input').forEach(input => {
            input.onchange = (e) => this.updateFileName(parseInt(e.target.dataset.id), e.target.value);
        });

        tbody.querySelectorAll('.db-delete-btn').forEach(btn => {
            btn.onclick = (e) => this.handleTableDelete(parseInt(e.target.dataset.id));
        });
    }

    async updateFileName(id, newName) {
        const files = await getAllFiles();
        const file = files.find(f => f.id === id);
        if (file) {
            file.name = newName;
            await saveFile(file);
            this.dispatchEvent(new CustomEvent('file-list-changed', { bubbles: true }));
        }
    }

    async handleTableDelete(id) {
        await deleteFile(id);
        this.renderDBTable();
        this.dispatchEvent(new CustomEvent('file-list-changed', { bubbles: true }));
    }
}

customElements.define('database-visualizer', DatabaseVisualizer);
