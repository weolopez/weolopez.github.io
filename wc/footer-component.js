class FooterComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  render() {
    this.shadowRoot.innerHTML = `
    <style>
        footer {
            background-color: #f1f1f1;
            position: absolute;
            bottom: -1px; /* Adjusted to -1px to avoid overlap */
            width: 100vw;
			border-top: 1px solid #eee; /* Lighter border */
			text-align: center;
			background: transparent; /* Transparent background */
			color: #555; /* Default text color for footer */
			font-size: 13px; /* Base font size for footer */
            left: 0;
            background: white;
		}
    </style>
    <footer>
                 © 2025 version ${this.version}
    </footer>
        `;
  }
  connectedCallback() {
    window.addEventListener("DOMContentLoaded", () => {
    
    // Fetch version from version.txt and display in the footer
    fetch("version.txt")
      .then((response) => response.text())
      .then((version) => {
        this.version = version.trim();
        // const footer = document.getElementById("footer");
        // const versionDiv = document.createElement("div");
        // // versionDiv.style.fontSize = "0.9em"; // Relative to footer font size
        // // versionDiv.style.color = "#777"; // Slightly darker gray
        // versionDiv.style.marginTop = '10px'; // Remove, let footer padding handle
        // footer.textContent = `Version: ${version.trim()}`;
        // footer.appendChild(versionDiv);

        this.render();
      })
      .catch(() => {
        // Optionally handle error
      });    // Wait for full page render before fetching version
    });
  }
}
customElements.define("footer-component", FooterComponent);
