class DbManagementPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 10px;
                    border: 1px solid #eee;
                    border-radius: 5px;
                    background-color: #fff;
                }
                button {
                    background-color: #dc3545;
                    color: white;
                    padding: 10px 15px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-right: 10px;
                    margin-bottom: 10px;
                }
                button:hover {
                    background-color: #c82333;
                }
                button.safe {
                    background-color: #ffc107;
                    color: #333;
                }
                button.safe:hover {
                    background-color: #e0a800;
                }
                p {
                    margin-top: 10px;
                    font-weight: bold;
                }
                .status-indicator {
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background-color: gray;
                    margin-left: 5px;
                }
                .status-indicator.running {
                    background-color: green;
                }
                .status-indicator.stopped {
                    background-color: red;
                }
            </style>
            <div>
                <button id="close-db" class="safe">Close DB Connection</button>
                <button id="drop-db">Drop Database</button>
                <p>Worker Status: <span id="worker-status">Unknown</span> <span class="status-indicator" id="status-dot"></span></p>
            </div>
        `;

        this.closeDbButton = this.shadowRoot.getElementById('close-db');
        this.dropDbButton = this.shadowRoot.getElementById('drop-db');
        this.workerStatusSpan = this.shadowRoot.getElementById('worker-status');
        this.statusDot = this.shadowRoot.getElementById('status-dot');

        this.closeDbButton.addEventListener('click', this.handleCloseDb.bind(this));
        this.dropDbButton.addEventListener('click', this.handleDropDb.bind(this));
    }

    setWorkerStatus(isRunning) {
        if (isRunning) {
            this.workerStatusSpan.textContent = 'Running';
            this.statusDot.classList.remove('stopped');
            this.statusDot.classList.add('running');
        } else {
            this.workerStatusSpan.textContent = 'Stopped';
            this.statusDot.classList.remove('running');
            this.statusDot.classList.add('stopped');
        }
    }

    handleCloseDb() {
        if (confirm('Are you sure you want to close the database connection? This will stop the worker.')) {
            this.dispatchEvent(new CustomEvent('close-db', { bubbles: true, composed: true }));
        }
    }

    handleDropDb() {
        if (confirm('WARNING: Are you sure you want to PERMANENTLY DELETE the database? This action cannot be undone.')) {
            this.dispatchEvent(new CustomEvent('drop-db', { bubbles: true, composed: true }));
        }
    }
}

customElements.define('db-management-panel', DbManagementPanel);