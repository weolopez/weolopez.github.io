class GoogleLogin extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Clear any previous shadow content in case of re-attachment
    this.shadowRoot.innerHTML = '';

    // Create elements in shadow DOM
    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'buttonDiv';

    const img = document.createElement('img');
    img.id = 'userAvatar';
    img.alt = 'User Avatar';
    img.style.cssText = 'display:none; width:50px; height:50px; border-radius:50%;';

    this.shadowRoot.append(buttonDiv, img);

    console.log('[GoogleLogin] connectedCallback: attempting restoreAuthentication');
    this.restoreAuthentication();

    // Only load GSI script and render button if we still are not authenticated
    if (!this.isAuthenticated()) {
      console.log('[GoogleLogin] No valid session found, loading Google script for sign-in');
      this.loadGoogleScript();
    } else {
      console.log('[GoogleLogin] Session restored, no need to load Google script');
    }
  }

  loadGoogleScript() {
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => this.initializeGoogle();
      document.head.appendChild(script);
    } else {
      this.initializeGoogle();
    }
  }

  initializeGoogle() {
    console.log('[GoogleLogin] initializeGoogle called');
    if (!this.shadowRoot) {
      console.warn('[GoogleLogin] initializeGoogle: no shadowRoot, aborting');
      return;
    }

    // If we became authenticated before the script finished loading, do nothing.
    if (this.isAuthenticated()) {
      console.log('[GoogleLogin] Already authenticated, skipping GSI init');
      return;
    }

    const buttonDiv = this.shadowRoot.getElementById('buttonDiv');
    if (!buttonDiv) {
      console.warn('[GoogleLogin] initializeGoogle: #buttonDiv not found in shadowRoot');
      return;
    }

    google.accounts.id.initialize({
      client_id: "671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com",
      callback: this.handleCredentialResponse.bind(this),
      use_fedcm_for_prompt: true
    });

    google.accounts.id.renderButton(
      buttonDiv,
      { theme: "filled_black", type: "icon", size: "large" }
    );

    google.accounts.id.prompt();
  }

  handleCredentialResponse(response) {
    console.log("[GoogleLogin] handleCredentialResponse: received credential");
    this._jwtToken = response.credential; // Store the raw JWT token in memory (not reused for avatar)
    localStorage.setItem('googleLoginToken', response.credential);
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      this._userInfo = payload; // Store decoded user info
      console.log("[GoogleLogin] handleCredentialResponse: decoded payload", payload);

      const pictureUrl = payload.picture;
      if (!pictureUrl) {
        console.warn("[GoogleLogin] handleCredentialResponse: no picture URL in payload");
      }

      if (pictureUrl) {
        // STRICT REQUIREMENT: download profile image once and persist as a STRING (data URL) in localStorage
        this.cacheAvatarAsDataUrl(pictureUrl)
          .then((dataUrl) => {
            if (dataUrl) {
              localStorage.setItem('googleLoginAvatarDataUrl', dataUrl);
              console.log("[GoogleLogin] handleCredentialResponse: avatar cached as data URL string");
              this.updateAvatarUI(dataUrl);
            } else {
              console.warn("[GoogleLogin] handleCredentialResponse: failed to create data URL, using remote URL");
              this.updateAvatarUI(pictureUrl);
            }
          })
          .catch((err) => {
            console.error("[GoogleLogin] handleCredentialResponse: cacheAvatarAsDataUrl error, using remote URL", err);
            this.updateAvatarUI(pictureUrl);
          });
      } else {
        this.updateAvatarUI(null);
      }

      // Dispatch authenticated event
      this.dispatchEvent(new CustomEvent('authenticated', { detail: { token: this._jwtToken, user: payload } }));
    } catch (e) {
      console.error("Error decoding JWT:", e);
    }
  }

  // Method to get the JWT token
  getToken() {
    return this._jwtToken;
  }

  // Method to get user info
  getUserInfo() {
    return this._userInfo;
  }

  decodeJWT(credential) {
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  restoreAuthentication() {
    // Restore UI from stored avatar DATA URL string; no network fetch required
    const avatarDataUrl = localStorage.getItem('googleLoginAvatarDataUrl');

    if (avatarDataUrl) {
      console.log('[GoogleLogin] restoreAuthentication: restoring avatar from cached data URL string');
      this.updateAvatarUI(avatarDataUrl);
      return;
    }

    // Fallback: legacy behavior if only token is present (kept for compatibility, safe-guarded)
    const token = localStorage.getItem('googleLoginToken');
    if (!token) {
      console.log('[GoogleLogin] restoreAuthentication: no stored avatar or token');
      return;
    }
    try {
      const payload = this.decodeJWT(token);
      if (!payload || !payload.exp) {
        console.warn('[GoogleLogin] restoreAuthentication: invalid token payload, clearing');
        localStorage.removeItem('googleLoginToken');
        return;
      }
      if (Date.now() / 1000 > payload.exp) {
        console.log('[GoogleLogin] restoreAuthentication: token expired, clearing');
        localStorage.removeItem('googleLoginToken');
        return;
      }

      this._jwtToken = token;
      this._userInfo = payload;

      const userAvatar = this.shadowRoot.getElementById('userAvatar');
      const buttonDiv = this.shadowRoot.getElementById('buttonDiv');

      if (userAvatar && payload.picture) {
        userAvatar.src = payload.picture;
        userAvatar.style.display = 'block';
      }

      if (buttonDiv) {
        buttonDiv.remove();
      }

      console.log('[GoogleLogin] restoreAuthentication: restored session from token for', payload.email || payload.sub);
      this.dispatchEvent(new CustomEvent('authenticated', { detail: { token: this._jwtToken, user: payload } }));
    } catch (e) {
      console.error('[GoogleLogin] Error restoring auth from token:', e);
      localStorage.removeItem('googleLoginToken');
    }
  }

  // Method to logout
  logout() {
    this._jwtToken = null;
    this._userInfo = null;
    localStorage.removeItem('googleLoginToken');
    localStorage.removeItem('googleLoginAvatarDataUrl');
    // Reset UI to show login button
    const userAvatar = this.shadowRoot.getElementById('userAvatar');
    if (userAvatar) {
      userAvatar.style.display = 'none';
      userAvatar.src = '';
    }
    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'buttonDiv';
    this.shadowRoot.appendChild(buttonDiv);
    this.initializeGoogle(); // Re-initialize to show button
  }

  // Method to check if authenticated
  isAuthenticated() {
    return !!this._jwtToken;
  }

  // Helper: set avatar image and remove button if URL is provided
  updateAvatarUI(url) {
    const userAvatar = this.shadowRoot && this.shadowRoot.getElementById('userAvatar');
    const buttonDiv = this.shadowRoot && this.shadowRoot.getElementById('buttonDiv');

    if (url && userAvatar) {
      userAvatar.src = url;
      userAvatar.style.display = 'block';
      console.log('[GoogleLogin] updateAvatarUI: avatar set');
    }

    if (url && buttonDiv) {
      buttonDiv.remove();
    }
  }

  // Helper: fetch avatar once and convert to data URL for caching
  async cacheAvatarAsDataUrl(url) {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        console.warn('[GoogleLogin] cacheAvatarAsDataUrl: non-OK response', response.status);
        return null;
      }
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[GoogleLogin] cacheAvatarAsDataUrl: fetch/convert failed', err);
      return null;
    }
  }
}

customElements.define('google-login', GoogleLogin);