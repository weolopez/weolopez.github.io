class MemoryPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._memoryInfo = null;
  }

  static get observedAttributes() {
    return ['active'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get active() {
    return this.hasAttribute('active');
  }

  set active(value) {
    if (value) {
      this.setAttribute('active', '');
    } else {
      this.removeAttribute('active');
    }
  }

  get memoryInfo() {
    return this._memoryInfo;
  }

  set memoryInfo(value) {
    this._memoryInfo = value;
    this.updateContent();
  }

  setupEventListeners() {
    const closeBtn = this.shadowRoot.querySelector('.close-memory');
    closeBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('memory-close', { bubbles: true }));
    });
  }

  updateContent() {
    const memoryContent = this.shadowRoot.querySelector('.memory-content');
    const memoryStats = this.shadowRoot.querySelector('.memory-stats');
    
    if (!memoryContent || !memoryStats || !this._memoryInfo) {
      return;
    }

    // Update stats
    const recentCountEl = memoryStats.querySelector('#recentCount');
    const totalCountEl = memoryStats.querySelector('#totalCount');
    
    if (recentCountEl) recentCountEl.textContent = this._memoryInfo.recentCount || 0;
    if (totalCountEl) totalCountEl.textContent = this._memoryInfo.totalCount || 0;
    
    // Clear memory content
    memoryContent.innerHTML = '';
    
    // Create section for recent conversation history
    if (this._memoryInfo.recentMessages && this._memoryInfo.recentMessages.length > 0) {
      const historySection = document.createElement('div');
      historySection.className = 'memory-item';
      
      let historyContent = `
        <div class="memory-item-header">
          <span>Recent Conversation History</span>
        </div>
        <div class="memory-item-text" style="white-space: pre-line;">
      `;
      
      this._memoryInfo.recentMessages.forEach(msg => {
        historyContent += `${msg.role}: ${msg.content}\n`;
      });
      
      historyContent += `</div>`;
      historySection.innerHTML = historyContent;
      memoryContent.appendChild(historySection);
    } else {
      // Show message when no conversation history
      const noHistorySection = document.createElement('div');
      noHistorySection.className = 'memory-item';
      noHistorySection.innerHTML = `
        <div class="memory-item-header">
          <span>💭 Conversation Memory</span>
        </div>
        <div class="memory-item-text">
          <p><em>No conversation history yet. Start chatting to see your recent messages appear here!</em></p>
        </div>
      `;
      memoryContent.appendChild(noHistorySection);
    }
    
    // Create section for knowledge base details
    if (this._memoryInfo.hasKnowledge && this._memoryInfo.knowledgeDetails) {
      const knowledgeSection = document.createElement('div');
      knowledgeSection.className = 'memory-item';
      
      let knowledgeContent = `
        <div class="memory-item-header">
          <span>📚 Knowledge Base</span>
        </div>
        <div class="memory-item-text">
          <p><strong>✓ Knowledge base loaded (${this._memoryInfo.knowledgeDetails.fileCount} files)</strong></p>
      `;
      
      // Show loaded files
      if (this._memoryInfo.knowledgeDetails.loadedFiles.length > 0) {
        knowledgeContent += '<p><strong>Loaded files:</strong></p><ul>';
        this._memoryInfo.knowledgeDetails.loadedFiles.forEach(file => {
          const fileName = file.split('/').pop();
          knowledgeContent += `<li>${fileName}</li>`;
        });
        knowledgeContent += '</ul>';
      }
      
      // Show sample knowledge entries
      if (this._memoryInfo.knowledgeDetails.sampleEntries.length > 0) {
        knowledgeContent += '<p><strong>Sample knowledge content:</strong></p>';
        this._memoryInfo.knowledgeDetails.sampleEntries.forEach((entry, index) => {
          const preview = entry.text.length > 100 ? entry.text.substring(0, 100) + '...' : entry.text;
          knowledgeContent += `<div style="margin: 5px 0; padding: 5px; background: rgba(0,0,0,0.05); border-radius: 3px; font-size: 0.9em;">
            <strong>${entry.document?.title || 'Document'}:</strong><br>
            ${preview}
          </div>`;
        });
      }
      
      knowledgeContent += `
          <p><small>When you ask questions, relevant information from these sources will be automatically retrieved.</small></p>
        </div>
      `;
      
      knowledgeSection.innerHTML = knowledgeContent;
      memoryContent.appendChild(knowledgeSection);
    } else if (this._memoryInfo.hasKnowledge) {
      // Fallback if knowledge details couldn't be loaded
      const knowledgeSection = document.createElement('div');
      knowledgeSection.className = 'memory-item';
      knowledgeSection.innerHTML = `
        <div class="memory-item-header">
          <span>📚 Knowledge Base</span>
        </div>
        <div class="memory-item-text">
          <p>✓ Knowledge base is loaded and ready!</p>
          <p><small>When you ask questions, relevant information will be retrieved automatically.</small></p>
        </div>
      `;
      memoryContent.appendChild(knowledgeSection);
    } else {
      // No knowledge base
      const noKnowledgeSection = document.createElement('div');
      noKnowledgeSection.className = 'memory-item';
      noKnowledgeSection.innerHTML = `
        <div class="memory-item-header">
          <span>📚 Knowledge Base</span>
        </div>
        <div class="memory-item-text">
          <p><em>No knowledge base loaded.</em></p>
        </div>
      `;
      memoryContent.appendChild(noKnowledgeSection);
    }
  }

  showLoading() {
    const memoryContent = this.shadowRoot.querySelector('.memory-content');
    if (memoryContent) {
      memoryContent.innerHTML = '<p>Loading memory information...</p>';
    }
  }

  showError() {
    const memoryContent = this.shadowRoot.querySelector('.memory-content');
    if (memoryContent) {
      memoryContent.innerHTML = '<p>Error displaying memory information.</p>';
    }
  }

  render() {
    const isActive = this.active;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          right: 0;
          top: 65px;
          bottom: 80px;
          width: 0;
          background-color: var(--background-color, #ffffff);
          border-left: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: -5px 0 15px var(--shadow-color, rgba(0, 0, 0, 0.1));
          transition: width 0.3s ease;
          overflow: hidden;
          z-index: 10;
          display: flex;
          flex-direction: column;
        }

        :host([active]) {
          width: 350px;
        }

        .memory-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background-color: var(--primary-color, #00A9E0);
          color: white;
          font-weight: 600;
          flex-shrink: 0;
        }

        .close-memory {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          line-height: 1;
          transition: opacity 0.2s ease;
        }

        .close-memory:hover {
          opacity: 0.8;
        }

        .memory-content {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .memory-content::-webkit-scrollbar {
          width: 6px;
        }

        .memory-content::-webkit-scrollbar-track {
          background: var(--input-background, #F2F2F2);
          border-radius: 3px;
        }

        .memory-content::-webkit-scrollbar-thumb {
          background: var(--primary-color, #00A9E0);
          border-radius: 3px;
          opacity: 0.7;
        }

        .memory-item {
          background-color: var(--secondary-color, #F2F2F2);
          border-radius: var(--border-radius, 8px);
          padding: 12px;
          margin-bottom: 15px;
          border-left: 3px solid var(--primary-color, #00A9E0);
        }

        .memory-item-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--primary-color, #00A9E0);
          margin-bottom: 8px;
        }

        .memory-item-text {
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--text-color, #2A2A2A);
        }

        .memory-item-text p {
          margin: 0 0 8px 0;
        }

        .memory-item-text p:last-child {
          margin-bottom: 0;
        }

        .memory-item-text ul {
          margin: 8px 0;
          padding-left: 20px;
        }

        .memory-item-text li {
          margin-bottom: 4px;
        }

        .memory-stats {
          display: flex;
          justify-content: space-between;
          padding: 10px 15px;
          background-color: var(--secondary-color, #F2F2F2);
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 0.8rem;
          color: var(--text-color, #2A2A2A);
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          :host([active]) {
            width: 100%;
            left: 0;
            top: 0;
            bottom: 0;
          }

          .memory-header {
            padding: 12px 16px;
          }

          .memory-content {
            padding: 12px;
          }

          .memory-stats {
            padding: 8px 12px;
          }
        }
      </style>
      <div class="memory-header">
        <span>Memory & Knowledge</span>
        <button class="close-memory" title="Close Memory Panel">×</button>
      </div>
      <div class="memory-content">
        <!-- Memory context will be displayed here -->
        <p>No context has been sent to the AI yet. Send a message to see what context is used.</p>
      </div>
      <div class="memory-stats">
        <div>Recent messages: <span id="recentCount">0</span></div>
        <div>Total memories: <span id="totalCount">0</span></div>
      </div>
    `;
  }
}

customElements.define('memory-panel', MemoryPanel);