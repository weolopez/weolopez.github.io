// google-business-profile.js
class GoogleBusinessProfile extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.accessToken = null;
    this.businessData = null;
  }

  connectedCallback() {
    this.renderLoading();
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener("google-login", (event) => {
      this.accessToken = event.detail.accessToken;
      this.fetchBusinessProfile();
    });

    window.addEventListener("google-logout", () => {
      this.clearProfile();
    });
  }

  renderLoading() {
    const style = `
        <style>
          .container {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            max-width: 400px;
            font-family: Arial, sans-serif;
          }
          .hidden {
            display: none;
          }
        </style>
      `;

    this.shadowRoot.innerHTML = `
        ${style}
        <div class="container hidden" id="profile-container">
          <h2>Business Profile</h2>
          <p><strong>Name:</strong> <span id="business-name"></span></p>
          <p><strong>Primary Category:</strong> <span id="business-category"></span></p>
          <p><strong>Account Number:</strong> <span id="account-number"></span></p>
          <p><strong>Type:</strong> <span id="business-type"></span></p>
          <button id="set-key-btn" type="button">Set OpenAI API Key</button>
        </div>
        <div id="loading">Please log in to view your Business Profile.</div>
      `;
  }

  async fetchBusinessProfile() {
    try {
      // Replace with the actual endpoint for fetching business profiles
      // This is a placeholder as the actual API endpoints may vary
      const response = await fetch(
        "https://mybusinessbusinessinformation.googleapis.com/v1/accounts",
        {
          headers: {
            "Authorization": `Bearer ${this.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      // Assuming data.accounts is an array; adjust based on actual API response
      if (data.accounts && data.accounts.length > 0) {
        this.businessData = data.accounts[0];
        this.displayBusinessProfile();
      } else {
        this.displayNoData();
      }
    } catch (error) {
      console.error("Failed to fetch Business Profile:", error);
      this.displayError(error.message);
    }
  }

  displayBusinessProfile() {
    const container = this.shadowRoot.getElementById("profile-container");
    const loading = this.shadowRoot.getElementById("loading");

    // Populate data
    this.shadowRoot.getElementById("business-name").innerText =
      this.businessData.name || "N/A";
    this.shadowRoot.getElementById("business-category").innerText =
      this.businessData.primaryCategory?.displayName || "N/A";
    this.shadowRoot.getElementById("account-number").innerText =
      this.businessData.name || "N/A"; // Adjust based on actual data
    this.shadowRoot.getElementById("business-type").innerText =
      this.businessData.type || "N/A";

    // Show the profile and hide loading
    container.classList.remove("hidden");
    loading.classList.add("hidden");
    // Add event listener for "Set OpenAI API Key" button
    const setKeyBtn = this.shadowRoot.getElementById("set-key-btn");
    if (setKeyBtn) {
      setKeyBtn.addEventListener("click", async () => {
        try {
          const response = await fetch(
            `/getKey?name=${
              this.businessData.name.substring(this.businessData.name.lastIndexOf('/') + 1)
            }`
          );
          if (!response.ok) {
            throw new Error(`Failed to get key: ${response.statusText}`);
          }
          const result = await response.json();
          if (result.key) {
            //response is: {"name":"","key":"hello"}
            localStorage.setItem("openai_api_key", result.key);
            // get returnUrl from query params and redirect
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get("returnUrl");
            if (returnUrl) {
              window.location.href = returnUrl;
            }
            alert(`Key set in localStorage.`);
          } else {
            alert("No key returned.");
          }
        } catch (err) {
          alert(`Error: ${err.message}`);
        }
      });
    }
  }
  displayNoData() {
    const container = this.shadowRoot.getElementById("profile-container");
    const loading = this.shadowRoot.getElementById("loading");

    loading.innerText = "No Business Profile data available.";
    loading.classList.remove("hidden");
    container.classList.add("hidden");
  }

  displayError(message) {
    const container = this.shadowRoot.getElementById("profile-container");
    const loading = this.shadowRoot.getElementById("loading");

    loading.innerText = `Error: ${message}`;
    loading.classList.remove("hidden");
    container.classList.add("hidden");
  }

  clearProfile() {
    const container = this.shadowRoot.getElementById("profile-container");
    const loading = this.shadowRoot.getElementById("loading");

    container.classList.add("hidden");
    loading.innerText = "Please log in to view your Business Profile.";
    loading.classList.remove("hidden");
  }
}

customElements.define("google-business-profile", GoogleBusinessProfile);
