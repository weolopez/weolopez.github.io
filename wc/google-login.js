class GoogleLogin extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    // Create elements in shadow DOM
    const buttonDiv = document.createElement('div');
    buttonDiv.id = 'buttonDiv';

    const img = document.createElement('img');
    img.id = 'userAvatar';
    img.alt = 'User Avatar';
    img.style.cssText = 'display:none; width:50px; height:50px; border-radius:50%;';

    this.shadowRoot.append(buttonDiv, img);

    this.loadGoogleScript();
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
    google.accounts.id.initialize({
      client_id: "671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com",
      callback: this.handleCredentialResponse.bind(this),
      use_fedcm_for_prompt: true
    });

    google.accounts.id.renderButton(
      this.shadowRoot.getElementById('buttonDiv'),
      { theme: "filled_black", type: "icon", size: "large" }
    );

    google.accounts.id.prompt();
  }

  handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);

      const userAvatar = this.shadowRoot.getElementById('userAvatar');
      if (userAvatar) {
        userAvatar.src = payload.picture;
        userAvatar.style.display = 'block';

        // Remove the Google sign-in button once the user avatar is shown
        const buttonDiv = this.shadowRoot.getElementById('buttonDiv');
        if (buttonDiv) {
          buttonDiv.remove();
        }
      }
    } catch (e) {
      console.error("Error decoding JWT:", e);
    }
  }
}

customElements.define('google-login', GoogleLogin);