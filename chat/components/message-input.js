class MessageInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.typingTimeout = null;
    this.eventListenersSetup = false;
    this.selectedImage = null; // To store the image file
  }

  static get observedAttributes() {
    return ['disabled', 'placeholder'];
  }

  connectedCallback() {
    console.log('MessageInput: connectedCallback called');
    this.render();
    // Use a small delay to ensure Shadow DOM is fully rendered
    setTimeout(() => {
      this.setupEventListeners();
    }, 0);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      // Only re-render if the component is already connected and rendered
      if (this.shadowRoot.children.length > 0) {
        this.render();
        // Reset the flag so event listeners can be set up again
        this.eventListenersSetup = false;
        this.setupEventListeners();
      }
    }
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  get placeholder() {
    return this.getAttribute('placeholder') || 'Type your message...';
  }

  set placeholder(value) {
    this.setAttribute('placeholder', value);
  }

  get value() {
    const input = this.shadowRoot.querySelector('.message-input');
    return input ? input.value : '';
  }

  set value(val) {
    const input = this.shadowRoot.querySelector('.message-input');
    if (input) {
      input.value = val;
    }
  }

  focus() {
    const input = this.shadowRoot.querySelector('.message-input');
    if (input) {
      input.focus();
    }
  }

  clear() {
    this.value = '';
    this.removeTypingIndicator();
    this.removeImagePreview();
  }

  setupEventListeners() {
    if (this.eventListenersSetup) {
      console.log('MessageInput: Event listeners already setup, skipping');
      return;
    }

    console.log('MessageInput: Setting up event listeners...');

    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      const form = this.shadowRoot.querySelector('form');
      const input = this.shadowRoot.querySelector('.message-input');
      const sendButton = this.shadowRoot.querySelector('.send-button');
      const emojiButton = this.shadowRoot.querySelector('.emoji-btn');

      console.log('MessageInput: DOM elements found:', {
        form: !!form,
        input: !!input,
        sendButton: !!sendButton,
        emojiButton: !!emojiButton
      });

      if (form) {
        console.log('MessageInput: Adding form submit listener');
        form.addEventListener('submit', (e) => {
          console.log('MessageInput: Form submit event triggered');
          e.preventDefault();
          this.handleSubmit();
        });
      } else {
        console.error('MessageInput: Form element not found!');
      }

      if (input) {
        console.log('MessageInput: Adding input event listeners');
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            console.log('MessageInput: Enter key pressed, submitting');
            e.preventDefault();
            this.handleSubmit();
          } else {
            this.showTypingIndicator();
          }
        });

        input.addEventListener('input', () => {
          this.updateSendButtonState();
        });

        input.addEventListener('paste', this.handlePaste.bind(this));
        input.addEventListener('dragover', this.handleDragOver.bind(this));
        input.addEventListener('drop', this.handleDrop.bind(this));
      } else {
        console.error('MessageInput: Input element not found!');
      }

      if (sendButton) {
        console.log('MessageInput: Adding send button event listeners');
        
        // Add global click detection for debugging
        sendButton.addEventListener('mousedown', (e) => {
          console.log('MessageInput: Send button mousedown detected');
        });
        
        sendButton.addEventListener('mouseup', (e) => {
          console.log('MessageInput: Send button mouseup detected');
        });
        
        // Primary click handler
        sendButton.addEventListener('click', (e) => {
          console.log('MessageInput: Send button clicked');
          e.preventDefault();
          e.stopPropagation();
          this.handleSubmit();
        });

        // Fallback for touch devices
        sendButton.addEventListener('touchend', (e) => {
          console.log('MessageInput: Send button touch end');
          e.preventDefault();
          e.stopPropagation();
          this.handleSubmit();
        });

        // Add a direct onclick attribute as fallback
        sendButton.onclick = (e) => {
          console.log('MessageInput: Send button onclick attribute triggered');
          e.preventDefault();
          this.handleSubmit();
        };

        // Test if button is actually clickable
        console.log('MessageInput: Send button properties:', {
          disabled: sendButton.disabled,
          style: sendButton.style.cssText,
          offsetWidth: sendButton.offsetWidth,
          offsetHeight: sendButton.offsetHeight,
          pointerEvents: getComputedStyle(sendButton).pointerEvents,
          zIndex: getComputedStyle(sendButton).zIndex,
          position: getComputedStyle(sendButton).position
        });
      } else {
        console.error('MessageInput: Send button element not found!');
      }

      if (emojiButton) {
        console.log('MessageInput: Adding emoji button listener');
        emojiButton.addEventListener('click', (e) => {
          console.log('MessageInput: Emoji button clicked');
          e.preventDefault();
          this.handleEmojiClick();
        });
      } else {
        console.warn('MessageInput: Emoji button element not found');
      }

      // Mark as setup
      this.eventListenersSetup = true;
      console.log('MessageInput: Event listeners setup completed');

      // Initial update of send button state
      this.updateSendButtonState();
    });
  }

  handleButtonClick() {
    console.log('MessageInput: handleButtonClick called via onclick');
    this.handleSubmit();
  }

  handleSubmit() {
    console.log('MessageInput: handleSubmit called');
    const message = this.value.trim();
    const imageURL = this.selectedImage ? this.selectedImage.url : null;
    console.log('MessageInput: Message content:', message);
    console.log('MessageInput: Component disabled state:', this.disabled);

    if ((message || imageURL) && !this.disabled) {
      console.log('MessageInput: Dispatching message-send event with message and/or image');

      const detail = { message, imageURL };

      const event = new CustomEvent('message-send', {
        bubbles: true,
        composed: true, // Allow event to cross Shadow DOM boundaries
        detail: detail
      });
      
      console.log('MessageInput: Event created:', event);
      const dispatched = this.dispatchEvent(event);
      console.log('MessageInput: Event dispatched successfully:', dispatched);
      
      this.clear();
      console.log('MessageInput: Input and image cleared');
    } else {
      if (!message && !this.selectedImage) {
        console.log('MessageInput: No message or image to send (empty)');
      }
      if (this.disabled) {
        console.log('MessageInput: Component is disabled, cannot send message');
      }
    }
  }

  handleEmojiClick() {
    // Simple emoji picker - in a real implementation, you might want a more sophisticated picker
    const emojis = ['😊', '👍', '❤️', '😂', '🤔', '👋', '🎉', '💡'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const input = this.shadowRoot.querySelector('.message-input');
    if (input) {
      input.value += randomEmoji;
      input.focus();
      this.updateSendButtonState();
    }
  }

  showTypingIndicator() {
    const input = this.shadowRoot.querySelector('.message-input');
    if (input) {
      input.classList.add('is-typing');
      
      // Clear previous timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }
      
      // Set new timeout
      this.typingTimeout = setTimeout(() => {
        this.removeTypingIndicator();
      }, 1000);
    }
  }

  removeTypingIndicator() {
    const input = this.shadowRoot.querySelector('.message-input');
    if (input) {
      input.classList.remove('is-typing');
    }
  }

  updateSendButtonState() {
    console.log('MessageInput: updateSendButtonState called');
    const input = this.shadowRoot.querySelector('.message-input');
    const sendButton = this.shadowRoot.querySelector('.send-button');
    
    if (input && sendButton) {
      const hasContent = input.value.trim().length > 0 || (this.selectedImage && this.selectedImage.url !== null);
      const shouldDisable = this.disabled || !hasContent;
      console.log('MessageInput: Button state update:', {
        inputValue: input.value,
        hasContent,
        componentDisabled: this.disabled,
        shouldDisable,
        currentlyDisabled: sendButton.disabled,
        selectedImage: this.selectedImage ? this.selectedImage.name : 'none'
      });
      sendButton.disabled = shouldDisable;
      console.log('MessageInput: Send button disabled set to:', sendButton.disabled);
    } else {
      console.error('MessageInput: Could not find input or send button for state update');
    }
  }

  enable() {
    this.disabled = false;
    this.focus();
  }

  disable() {
    this.disabled = true;
  }

  handlePaste(event) {
    console.log('MessageInput: Paste event detected');
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        this.handleImageFile(file);
        event.preventDefault(); // Prevent default paste behavior (e.g., pasting text if image is also text)
        break;
      }
    }
  }

  handleDragOver(event) {
    event.preventDefault(); // Prevent default to allow drop
    event.stopPropagation();
    console.log('MessageInput: Drag over event detected');
    // Add visual feedback if desired
  }

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    console.log('MessageInput: Drop event detected');
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.indexOf('image') !== -1) {
      this.handleImageFile(files[0]);
    }
  }

  handleImageFile(file) {
    if (file) {
      console.log('MessageInput: Image file detected:', file.name, file.type);
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target.result;
        this.selectedImage = { file: file, url: base64Image }; // Store both file and Base64 URL
        this.displayImagePreview(base64Image, file.name); // Pass Base64 URL and file name to display
        this.updateSendButtonState();
      };
      reader.readAsDataURL(file);
    }
  }

  displayImagePreview(imageUrl, fileName) {
    const previewContainer = this.shadowRoot.querySelector('.image-preview-container');
    const previewImage = this.shadowRoot.querySelector('.image-preview');
    const fileNameSpan = this.shadowRoot.querySelector('.file-name');
    const removeButton = this.shadowRoot.querySelector('.remove-image-btn');

    if (previewContainer && previewImage && fileNameSpan && removeButton) {
      previewImage.src = imageUrl; // Use the provided URL directly
      fileNameSpan.textContent = fileName;
      previewContainer.style.display = 'flex';

      removeButton.onclick = () => this.removeImagePreview();
    }
  }

  removeImagePreview() {
    console.log('MessageInput: Removing image preview');
    if (this.selectedImage && this.selectedImage.url) {
      URL.revokeObjectURL(this.selectedImage.url); // Revoke the URL
    }
    this.selectedImage = null;
    const previewContainer = this.shadowRoot.querySelector('.image-preview-container');
    const previewImage = this.shadowRoot.querySelector('.image-preview');
    const fileNameSpan = this.shadowRoot.querySelector('.file-name');

    if (previewContainer && previewImage && fileNameSpan) {
      previewImage.src = '';
      fileNameSpan.textContent = '';
      previewContainer.style.display = 'none';
    }
    this.updateSendButtonState();
  }

  render() {
    const isDisabled = this.disabled;
    const placeholder = this.placeholder;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .input-container {
          padding: 10px 10px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          background-color: var(--background-color, #ffffff);
          z-index: 1;
          position: relative;
        }

        .image-preview-container {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background-color: var(--input-background, #F2F2F2);
          border-radius: 12px;
          margin-bottom: 10px;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .image-preview-container img {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 8px;
        }

        .image-preview-container .file-name {
          font-size: 0.85rem;
          color: var(--text-color, #2A2A2A);
          flex-grow: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .image-preview-container .remove-image-btn {
          background: none;
          border: none;
          color: var(--text-color, #2A2A2A);
          opacity: 0.6;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s ease;
        }

        .image-preview-container .remove-image-btn:hover {
          opacity: 1;
        }

        .input-container::before {
          content: '';
          position: absolute;
          top: -10px;
          left: 0;
          right: 0;
          height: 10px;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.05), transparent);
          pointer-events: none;
        }

        form {
          display: flex;
          gap: 10px;
          position: relative;
        }

        .message-input-container {
          flex-grow: 1;
          position: relative;
        }

        .message-input {
          width: 100%;
          padding: 13px 0px 5px 5px;
          border: none;
          border-radius: 24px;
          background-color: var(--input-background, #F2F2F2);
          color: var(--text-color, #2A2A2A);
          outline: none;
          font-family: inherit;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px var(--shadow-color, rgba(0, 0, 0, 0.1));
          font-size: 0.95rem;
          resize: none;
          min-height: 46px;
          max-height: 120px;
        }

        .message-input:focus {
          box-shadow: 0 0 0 2px var(--primary-color, #00A9E0), 0 4px 15px var(--shadow-color, rgba(0, 0, 0, 0.1));
        }

        .message-input.is-typing {
          box-shadow: 0 0 0 2px var(--accent-color, #FF7F32), 0 4px 15px var(--shadow-color, rgba(0, 0, 0, 0.1));
        }

        .message-input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .input-actions {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .input-action-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background-color: transparent;
          color: var(--text-color, #2A2A2A);
          opacity: 0.6;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .input-action-btn:hover:not(:disabled) {
          opacity: 1;
          background-color: rgba(0, 0, 0, 0.05);
        }

        .input-action-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .input-action-btn svg {
          width: 16px;
          height: 16px;
        }

        .send-button {
          background: var(--primary-color, #00A9E0);
          background: var(--primary-gradient, linear-gradient(135deg, #00A9E0 0%, #0568AE 100%));
          color: white;
          border: none;
          border-radius: 50%;
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          outline: none;
          box-shadow: 0 2px 10px var(--shadow-color, rgba(0, 0, 0, 0.1));
          flex-shrink: 0;
          position: relative;
          z-index: 10;
          pointer-events: auto;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 4px 20px var(--shadow-color, rgba(0, 0, 0, 0.1));
        }

        .send-button:active:not(:disabled) {
          transform: translateY(0) scale(0.95);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .send-button svg {
          width: 22px;
          height: 22px;
          transition: transform 0.2s ease;
        }

        .send-button:hover:not(:disabled) svg {
          transform: translateX(2px);
        }

        @media (max-width: 768px) {
          .input-container {
            padding: 10px 10px;
          }
          
          .message-input {
            padding: 0px 0px;
            padding-right: 45px;
            font-size: 0.9rem;
          }
          
          .send-button {
            width: 42px;
            height: 42px;
          }
          
          .send-button svg {
            width: 20px;
            height: 20px;
          }
        }
      </style>
      <div class="input-container">
        <div class="image-preview-container" style="display: none;">
          <img src="" alt="Image preview" class="image-preview">
          <span class="file-name"></span>
          <button type="button" class="remove-image-btn" title="Remove image">&times;</button>
        </div>
        <form>
          <div class="message-input-container">
            <textarea
              class="message-input"
              placeholder="${placeholder}"
              autocomplete="off"
              ${isDisabled ? 'disabled' : ''}
              rows="1"
            ></textarea>
            <div class="input-actions">
              <button type="button" class="input-action-btn emoji-btn" title="Add emoji" ${isDisabled ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,17.5C14.33,17.5 16.3,16.04 17.11,14H6.89C7.69,16.04 9.67,17.5 12,17.5M8.5,11A1.5,1.5 0 0,0 10,9.5A1.5,1.5 0 0,0 8.5,8A1.5,1.5 0 0,0 7,9.5A1.5,1.5 0 0,0 8.5,11M15.5,11A1.5,1.5 0 0,0 17,9.5A1.5,1.5 0 0,0 15.5,8A1.5,1.5 0 0,0 14,9.5A1.5,1.5 0 0,0 15.5,11M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"></path></svg>
              </button>

          <button type="submit" class="send-button" ${isDisabled ? 'disabled' : ''} onclick="if(!this.disabled) this.getRootNode().host.handleButtonClick()">
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
            </div>
          </div>
        </form>
      </div>
    `;

    // Setup auto-resize for textarea
    const textarea = this.shadowRoot.querySelector('.message-input');
    if (textarea) {
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      });
    }
  }
}

customElements.define('message-input', MessageInput);