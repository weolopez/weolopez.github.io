// google-login-button.js
class GoogleLoginButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.clientId = '48322380639-dkjn6j3ma6ndjj914vs0na1l10icblvf.apps.googleusercontent.com'
    this.scope = 'https://www.googleapis.com/auth/business.manage profile email';
    this.tokenClient = null;
    this.accessToken = null;
    this.userProfile = null;
  }

  connectedCallback() {
    this.render();
    this.initializeGSI();
  }

  render() {
    const style = `
      <style>
        button {
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
          border: none;
          border-radius: 4px;
          background-color: #4285F4;
          color: white;
          display: flex;
          align-items: center;
        }
        img {
          border-radius: 50%;
          width: 24px;
          height: 24px;
          margin-right: 8px;
        }
      </style>
    `;

    this.shadowRoot.innerHTML = `
      ${style}
      <button id="login-button">Sign in with Google</button>
    `;

    this.shadowRoot.getElementById('login-button').addEventListener('click', () => {
      if (this.accessToken) {
        this.logout();
      } else {
        this.requestAccessToken();
      }
    });
  }

  initializeGSI() {
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: this.scope,
      callback: (response) => {
        if (response.error) {
          console.error('Token Error:', response);
          return;
        }
        this.accessToken = response.access_token;
        this.fetchUserProfile();
        // Dispatch an event with the access token
        this.dispatchEvent(new CustomEvent('google-login', {
          detail: { accessToken: this.accessToken },
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  requestAccessToken() {
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  async fetchUserProfile() {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      this.userProfile = await response.json();
      this.updateButtonToLoggedIn();
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }

  updateButtonToLoggedIn() {
    const button = this.shadowRoot.getElementById('login-button');
    button.innerHTML = `
      <img src="${this.userProfile.picture}" alt="Profile Picture" />
      Logout
    `;
  }

  logout() {
    const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${this.accessToken}`;
    fetch(revokeUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      .then(() => {
        this.accessToken = null;
        this.userProfile = null;
        this.shadowRoot.getElementById('login-button').innerText = 'Sign in with Google';
        // Dispatch a logout event
        this.dispatchEvent(new CustomEvent('google-logout', {
          bubbles: true,
          composed: true
        }));
      })
      .catch(error => {
        console.error('Error revoking token:', error);
      });
  }
}

customElements.define('google-login-button', GoogleLoginButton);
