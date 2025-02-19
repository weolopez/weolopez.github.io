//import {ToolbarComponent} from '../../wc/toolbar-component.js'
class CardSection extends HTMLElement {
    constructor() {
      super();
      // Attach shadow DOM
      this.attachShadow({ mode: 'open' });

      // Define template markup and styles
      const template = document.createElement('template');
      template.innerHTML = `

  <script type="module" src="../../wc/toolbar-component.js"></script>
        <style>
          :host {
            display: block;
            perspective: 1000px;
            margin: 20px auto;
            height: 220px;
            min-width: 28%;
          }
          section {
            position: relative;
            width: 100%;
            height: 100%;
            transform-style: preserve-3d;
            transition: transform 0.6s;
          }
          /* When in editing state, flip the card */
          section.editing {
            transform: rotateY(180deg);
          }
          .card-face {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            background: #fff;
            padding: 16px;
            box-sizing: border-box;
          }
          /* Back face is rotated so it shows up when flipped */
          .card-face.back {
            transform: rotateY(180deg);
          }
          /* Style the contenteditable area */
          .edit-area {
            width: 100%;
            height: 100%;
            outline: none;
          }
        </style>
        <!--toolbar-component id="atoolbar"></toolbar-component-->
        <section>
          <!-- Front face: default content via slot -->
          <div class="card-face front">
            <!--slot name="front">Default Front Content</slot-->
            <slot></slot>
          </div>
          <!-- Back face: editing area for HTML attributes -->
          <div class="card-face back">
            <div contenteditable="true" class="edit-area">
              Edit HTML Attributes Here
            </div>
          </div>
        </section>
      `;
      // Append the template content to the shadow root
      this.shadowRoot.appendChild(template.content.cloneNode(true));

      // Cache the section element for later use
      this._cardSection = this.shadowRoot.querySelector('section');
      this.toolbar = document.createElement('toolbar-component');
      this.shadowRoot.querySelector('.card-face.back').insertBefore(this.toolbar, this.shadowRoot.querySelector('.card-face.back').firstChild);

      // this.toolbar = this.shadowRoot.querySelector('toolbar-component');
      this.toolbar.addComponent('button', '1️⃣ | width1');
      this.toolbar.addComponent('button', '2️⃣ | width2');
      this.toolbar.addComponent('button', '3️⃣ | width3');
      this.toolbar.addEventListener('toolbar-action', (e) => {
        if (e.detail.action === 'width1') {
            this.shadowRoot.host.style.minWidth = '24%';
        } else if (e.detail.action === 'width2') {
            this.shadowRoot.host.style.minWidth = '60%';
        } else if (e.detail.action === 'width3') {
            this.shadowRoot.host.style.minWidth = '100%';
        }
          
      });
      
    }

    connectedCallback() {
      // Make sure the host is focusable
      if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '0');
      }

      // If in edit mode, add handlers for flipping the card.
      // A click toggles the flip; focus ensures the back is visible.
      this.addEventListener('click', () => {
        if (this.hasAttribute('edit-mode')) {
          this.toggleFlip();
        }
      });
      this.addEventListener('focus', () => {
        if (this.hasAttribute('edit-mode')) {
          this.showBack();
        }
      });
        
      // On blur, remove the editing state
      this.addEventListener('blur', () => {
        if (this.hasAttribute('edit-mode')) {
          this._cardSection.classList.remove('editing');
        }
      });
          // Listen for "EDIT" event on document to toggle edit-mode attribute
      document.addEventListener('EDIT', (e) => {
        if (e.detail) {
          this.setAttribute('edit-mode', '');
        } else {
          this.removeAttribute('edit-mode');
        }
      });
    }



    // Toggles the "editing" class to flip the card
    toggleFlip() {
      if (this._cardSection.classList.contains('editing')) {
        this._cardSection.classList.remove('editing');
      } else {
        this._cardSection.classList.add('editing');
      }
    }

    // Ensures the back face is visible (e.g., when focused)
    showBack() {
      this._cardSection.classList.add('editing');
    }

    // Observe changes to the "edit-mode" attribute so we can reset the card if needed
    static get observedAttributes() {
      return ['edit-mode'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'edit-mode' && !this.hasAttribute('edit-mode')) {
        // If edit mode is turned off, make sure the card is not flipped.
        this._cardSection.classList.remove('editing');
      }
    }
  }

  // Define the new element
  customElements.define('card-section', CardSection);