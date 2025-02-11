
    /******************************
     * Main Wiki Editor Page Component *
     ******************************/
    class WikiEditorPage extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
          this.shadowRoot.innerHTML = `
            <style>
              :host {
                display: block;
              }
              .editor-header {
                display: flex;
                flex-direction: column;
              }
              .editor-content {
                display: grid;
                grid-template-columns: 1fr 1fr;
                height: 70vh;
              }
              .footer {
                padding: 0.5rem 1rem;
                background: var(--toolbar-bg, #333);
                color: #fff;
                display: flex;
                justify-content: space-between;
                font-size: 0.9rem;
              }
              .single-mode .editor-content {
                grid-template-columns: 1fr;
              }
            </style>
            <div class="editor-header">
              <wiki-editor-toolbar></wiki-editor-toolbar>
            </div>
            <div class="editor-content split-mode">
              <wiki-source-editor></wiki-source-editor>
              <wiki-preview></wiki-preview>
            </div>
            <div class="footer">
              <span id="status">Ready</span>
              <span id="autosaveStatus"></span>
            </div>
          `;
          this.isDark = true;
          this.isSplitMode = true;
          this.saveTimer = null;
        }
        connectedCallback() {
          this.toolbar = this.shadowRoot.querySelector('wiki-editor-toolbar');
          this.sourceEditor = this.shadowRoot.querySelector('wiki-source-editor');
          this.preview = this.shadowRoot.querySelector('wiki-preview');
          this.statusEl = this.shadowRoot.getElementById('status');
          this.autosaveStatus = this.shadowRoot.getElementById('autosaveStatus');
  
          // Listen for toolbar events
          this.toolbar.addEventListener('toolbarAction', (e) => {
            this.handleToolbarAction(e.detail.action);
          });
  
          // Listen for input events from the source editor to update the preview and auto‑save.
          this.sourceEditor.addEventListener('sourceInput', () => {
            this.renderPreview();
            clearTimeout(this.saveTimer);
            this.saveTimer = setTimeout(() => this.autoSave(), 1500);
          });
  
          // Load any saved content
          this.loadContent();
          this.renderPreview();
        }
        handleToolbarAction(action) {
          switch(action) {
            case 'bold':
              this.sourceEditor.wrapSelection('**');
              break;
            case 'italic':
              this.sourceEditor.wrapSelection('*');
              break;
            case 'heading':
              this.sourceEditor.insertAtLineStart('# ');
              break;
            case 'link':
              this.sourceEditor.insertLink();
              break;
            case 'code':
              this.sourceEditor.wrapSelection('`');
              break;
            case 'list':
              this.sourceEditor.insertAtLineStart('- ');
              break;
            case 'quote':
              this.sourceEditor.insertAtLineStart('> ');
              break;
            case 'ai':
              this.enhanceContent();
              break;
            case 'themeToggle':
              this.toggleTheme();
              break;
            case 'viewToggle':
              this.toggleViewMode();
              break;
            case 'save':
              this.manualSave();
              break;
          }
          this.renderPreview();
        }
        async enhanceContent() {
          const contentToEnhance = this.sourceEditor.value.trim();
          if (!contentToEnhance) {
            alert('Nothing to enhance!');
            return;
          }
          try {
            const enhancedText = await this.fetchAIEnhancement(contentToEnhance);
            this.sourceEditor.value = enhancedText;
          } catch (error) {
            console.error('AI Enhancement error:', error);
            alert('Error during AI enhancement. Check the console for details.');
          }
        }
        async fetchAIEnhancement(content) {
          // Dummy implementation – replace with an actual API call as needed.
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(content + "\n\nEnhanced by AI.");
            }, 1000);
          });
        }
        renderPreview() {
          this.preview.content = this.sourceEditor.value;
        }
        autoSave() {
          const content = this.sourceEditor.value;
          localStorage.setItem('wiki-page-content', content);
          this.autosaveStatus.textContent = `Auto-saved at ${new Date().toLocaleTimeString()}`;
          setTimeout(() => { this.autosaveStatus.textContent = ''; }, 3000);
        }
        manualSave() {
          const content = this.sourceEditor.value;
          this.statusEl.textContent = 'Content saved!';
          localStorage.setItem('wiki-page-content', content);
          setTimeout(() => { this.statusEl.textContent = 'Ready'; }, 2000);
        }
        loadContent() {
          const saved = localStorage.getItem('wiki-page-content');
          if (saved) {
            this.sourceEditor.value = saved;
          }
        }
        toggleTheme() {
          this.isDark = !this.isDark;
          if (this.isDark) {
            this.shadowRoot.host.classList.add('dark');
            document.body.classList.add('dark');
          } else {
            this.shadowRoot.host.classList.remove('dark');
            document.body.classList.remove('dark');
          }
        }
        toggleViewMode() {
          this.isSplitMode = !this.isSplitMode;
          const editorContent = this.shadowRoot.querySelector('.editor-content');
          if (this.isSplitMode) {
            editorContent.classList.remove('single-mode');
          } else {
            editorContent.classList.add('single-mode');
          }
        }
      }
      customElements.define('wiki-editor-page', WikiEditorPage);