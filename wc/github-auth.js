class AuthComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = /*html*/`
            <style>
            :host { 
                display: none; 
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(63, 75, 101, 0.9);
                max-width: 400px; 
                margin: 0 auto; 
                font-family: Arial, sans-serif; 
                padding: 20px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                color: white;
            }
            input, button { 
                margin: 10px 0; 
                padding: 5px; 
                width: 100%; 
                box-sizing: border-box; 

            }
            button { 
                background-color: #0366d6; 
                color: white; 
                border: none; 
                padding: 10px; 
                cursor: pointer; 
            }
            button:hover { 
                background-color: #0056b3; 
            }
            </style>
            <div id="auth">
            <h2>Step 1: Generate Token</h2>
            <p>To edit files, you need to generate a personal access token with 'repo' scope:</p>
            <ol>
                <li>Go to <a href="https://github.com/settings/tokens" target="_blank">GitHub Token Settings</a></li>
                <li>Click "Generate new token" and select "Generate new token (classic)"</li>
                <li>Give it a name, select the 'repo' scope</li>
                <li>Click "Generate token" at the bottom of the page</li>
                <li>Copy the generated token and paste it below</li>
            </ol>
            <input type="text" id="token" placeholder="Paste your token here">
            <button id="authenticateButton">Authenticate</button>
            </div>
        `;
        const storedToken = localStorage.getItem('githubToken');
        if (storedToken || storedToken !== '') {
            this.style.display = 'none';
        } else {
            this.style.display = 'block';
            this.dispatchEvent(new CustomEvent('authenticated', { detail: { token: storedToken } }));
        }
    }

    connectedCallback() {
        this.shadowRoot.getElementById('authenticateButton').addEventListener('click', this.authenticate.bind(this));
    }

    authenticate() {
        const token = this.shadowRoot.getElementById('token').value.trim();
        if (!token) {
            this.style.display = 'block';
            return;
        } else {
          this.style.display = 'none';
          localStorage.setItem('githubToken', token);
          this.dispatchEvent(new CustomEvent('authenticated', { detail: { token } }));
        }
    }
}

customElements.define('github-auth', AuthComponent);