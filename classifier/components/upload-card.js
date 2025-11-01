/**
 * Upload Card Web Component
 * Handles CSV file upload and sample data loading
 */

import { embeddingService } from '../modules/embedding-service.js';
import { vectorDB } from '../modules/database.js';

export class UploadCard extends HTMLElement {
  constructor() {
    super();
    this.state = {
      isUploading: false,
      progress: 0,
      summary: 'No data loaded.',
      lastEmbedCount: 0,
      lastEmbedTime: 0
    };
    this.progressTracker = new this.ProgressTracker();
    this.eventListeners = new Map();
  }

  // Utility methods (previously from BaseComponent)
  $(selector) {
    return this.querySelector(selector);
  }

  $$(selector) {
    return this.querySelectorAll(selector);
  }

  emit(eventName, detail = null, options = {}) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true,
      ...options
    });
    this.dispatchEvent(event);
  }

  attachEventListener(element, event, handler, options = {}) {
    if (!element || typeof element.addEventListener !== 'function') {
      console.warn('Invalid element passed to attachEventListener:', element);
      return;
    }

    const key = `${element.tagName || 'unknown'}_${element.id || 'noid'}_${event}_${handler.name || 'anonymous'}_${Date.now()}`;

    // Remove existing listener if it exists
    if (this.eventListeners.has(key)) {
      const [el, evt, oldHandler] = this.eventListeners.get(key);
      el.removeEventListener(evt, oldHandler, options);
    }

    element.addEventListener(event, handler, options);
    this.eventListeners.set(key, [element, event, handler, options]);
  }

  detachEventListeners() {
    for (const [element, event, handler, options] of this.eventListeners.values()) {
      element.removeEventListener(event, handler, options);
    }
    this.eventListeners.clear();
  }

  setLoading(element, loading) {
    if (loading) {
      element.classList.add('loading');
      element.disabled = true;
    } else {
      element.classList.remove('loading');
      element.disabled = false;
    }
  }

  // Inline utility functions (previously from helpers.js)
  validateCSVData(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { valid: false, error: 'No data found in CSV' };
    }

    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') {
      return { valid: false, error: 'Invalid CSV format' };
    }

    const cols = Object.keys(firstRow).map(k => k.trim().toLowerCase());
    if (!cols.includes('key') || !cols.includes('value')) {
      return { valid: false, error: 'CSV must have "key" and "value" columns' };
    }

    return { valid: true };
  }

  // ProgressTracker class (previously from helpers.js)
  ProgressTracker = class {
    constructor() {
      this.total = 0;
      this.current = 0;
      this.onProgressCallback = null;
    }

    setTotal(total) {
      this.total = total;
      this.current = 0;
    }

    update(amount) {
      this.current = Math.min(amount, this.total);
      if (this.onProgressCallback) {
        const percentage = this.total > 0 ? (this.current / this.total) * 100 : 0;
        this.onProgressCallback(percentage);
      }
    }

    onProgress(callback) {
      this.onProgressCallback = callback;
    }
  };

  // Lifecycle methods
  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.onConnected();
  }

  disconnectedCallback() {
    this.detachEventListeners();
  }

  render() {
    this.innerHTML = `
      <style>
        .upload-card .controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .upload-card input[type="file"] { display: none; }
        .upload-card .file-actions { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
        .upload-card .dropzone {
          margin-top: 10px;
          border: 2px dashed var(--border, #d0d7de);
          border-radius: 8px;
          padding: 16px;
          background: var(--bg-subtle, #fafbfc);
          color: var(--fg-muted, #57606a);
          text-align: center;
          transition: background 120ms ease, border-color 120ms ease;
        }
        .upload-card .dropzone.dragover {
          background: var(--bg-emph, #f0f6ff);
          border-color: var(--accent, #0969da);
          color: var(--fg, #24292f);
        }
        .upload-card .hint { font-size: 12px; color: var(--fg-muted, #57606a); margin-top: 6px; }
        .upload-card .summary { margin-top: 8px; }
        .upload-card .progress { height: 6px; background: #eee; border-radius: 999px; overflow: hidden; }
        .upload-card .progress-bar { height: 100%; width: 0; background: linear-gradient(90deg, #2563eb, #22c55e); transition: width 120ms ease; }
        .upload-card .spinner { width: 16px; height: 16px; border: 2px solid #ccc; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .upload-card .meta { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
      </style>
      <div class="card upload-card">
        <h3>Upload CSV (key,value)</h3>
        <div class="muted">
          Expect exactly two columns: <strong>key</strong> (string) and <strong>value</strong> (text).
          Rows will be embedded on-device.
        </div>

        <div class="file-actions">
          <input id="csvFile" type="file" accept="text/csv" aria-label="Upload CSV file" />
          <label class="btn" id="csvTrigger" for="csvFile">Choose CSV</label>
          <div class="controls">
            <button class="btn" id="loadSample">Load Sample</button>
            <button class="btn ghost" id="clearDB">Clear Database</button>
          </div>
        </div>

  <div id="dropZone" class="dropzone" aria-label="Drop CSV here" role="button" tabindex="0">
          Drag & drop your CSV here, or click "Choose CSV"
          <div class="hint">We only read the two columns: key, value</div>
        </div>

        <div style="margin-top: 12px;">
          <div class="progress" aria-hidden="true">
            <div class="progress-bar" id="progressBar"></div>
          </div>
          <div class="summary" id="summary">${this.state.summary}</div>
          <div class="meta">
            <div id="uploadSpinner" style="display: none;" class="spinner" role="status" aria-hidden="true"></div>
            <div class="muted small">Model: <strong>Xenova/all-MiniLM-L6-v2</strong></div>
          </div>
        </div>
      </div>
    `;
  }

  onConnected() {}

  attachEventListeners() {
    const csvFile = this.$('#csvFile');
    const loadSample = this.$('#loadSample');
    const clearDB = this.$('#clearDB');
  const dropZone = this.$('#dropZone');
  const csvTrigger = this.$('#csvTrigger');

    console.log('UploadCard attachEventListeners - csvFile element:', csvFile);
    console.log('UploadCard attachEventListeners - csvFile exists:', !!csvFile);

    // File selection
    this.attachEventListener(csvFile, 'change', this.handleFileUpload.bind(this));
    // Some browsers may not trigger label->input click reliably without focus
    if (csvTrigger) {
      this.attachEventListener(csvTrigger, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          csvFile?.click();
        }
      });
    }
    this.attachEventListener(loadSample, 'click', this.handleLoadSample.bind(this));
    this.attachEventListener(clearDB, 'click', this.handleClearDatabase.bind(this));

    // Drag & drop
    if (dropZone) {
      this.attachEventListener(dropZone, 'dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      this.attachEventListener(dropZone, 'dragleave', () => {
        dropZone.classList.remove('dragover');
      });
      this.attachEventListener(dropZone, 'click', () => {
        csvFile?.click();
      });
      this.attachEventListener(dropZone, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          csvFile?.click();
        }
      });
      this.attachEventListener(dropZone, 'drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) {
          this.parseAndProcessFile(file);
        }
      });
    }

    // Setup progress tracking
    this.progressTracker.onProgress((percentage) => {
      this.updateProgress(percentage);
    });
  }

  async handleFileUpload(event) {
    console.log('handleFileUpload called with event:', event);
    const file = event.target.files?.[0];
    console.log('Selected file:', file);
    if (!file) return;
    await this.parseAndProcessFile(file);
  }

  async parseAndProcessFile(file) {
    try {
      this.state.isUploading = true;
      this.showSpinner(true);
      this.updateSummary('Parsing CSV...');

      const text = await file.text();
      const parsed = Papa.parse(text.trim(), {
        header: true,
        skipEmptyLines: true
      });

      if (parsed.errors?.length) {
        throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
      }

      const validation = this.validateCSVData(parsed.data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Clear DB before loading a new dataset
      await vectorDB.clear();
      this.state.lastEmbedCount = 0;
      
      await this.processData(parsed.data);
    } catch (error) {
      console.error('File upload error:', error);
      this.updateSummary(`Error: ${error.message}`);
    } finally {
      this.state.isUploading = false;
      this.showSpinner(false);
      setTimeout(() => this.updateProgress(0), 600);
    }
  }

  async handleLoadSample() {
    try {
      this.state.isUploading = true;
      this.showSpinner(true);
      this.updateSummary('Loading sample data from CSV...');

      // Clear file input
      const csvFile = this.$('#csvFile');
      csvFile.value = '';

  // Clear DB before loading sample
  await vectorDB.clear();
  this.state.lastEmbedCount = 0;

  // Load CSV data from br.csv
      const response = await fetch('/classifier/br.csv');
      if (!response.ok) {
        throw new Error(`Failed to load sample CSV: ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const parsed = Papa.parse(csvText.trim(), { 
        header: true, 
        skipEmptyLines: true 
      });

      if (parsed.errors?.length) {
        throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
      }

      const validation = this.validateCSVData(parsed.data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      await this.processData(parsed.data);
      
    } catch (error) {
      console.error('Sample load error:', error);
      this.updateSummary(`Sample load failed: ${error.message}`);
    } finally {
      this.state.isUploading = false;
      this.showSpinner(false);
      setTimeout(() => this.updateProgress(0), 600);
    }
  }

  async handleClearDatabase() {
    if (!confirm('Clear all embeddings from IndexedDB?')) {
      return;
    }

    try {
      await vectorDB.clear();
      this.updateSummary('Database cleared.');
      this.state.lastEmbedCount = 0;
      this.emit('database-cleared');
    } catch (error) {
      console.error('Clear database error:', error);
      this.updateSummary(`Clear failed: ${error.message}`);
    }
  }

  async processData(data) {
    const BATCH_SIZE = 32;
    const startTime = performance.now();
    const entriesToStore = [];

    this.progressTracker.setTotal(data.length);

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const endIndex = Math.min(i + BATCH_SIZE, data.length);
      
      this.updateSummary(`Embedding ${endIndex} / ${data.length}`);

      try {
        const texts = batch.map(item => item.value);
        const embeddings = await embeddingService.embedBatch(texts);

        for (let j = 0; j < embeddings.length; j++) {
          entriesToStore.push({
            key: batch[j].key,
            value: batch[j].value,
            embedding: embeddingService.embeddingToJSON(embeddings[j])
          });
        }

        this.progressTracker.update(i + batch.length);
        
        // Allow UI updates
        await new Promise(resolve => setTimeout(resolve, 40));
        
      } catch (error) {
        throw new Error(`Embedding failed: ${error.message}`);
      }
    }

    this.updateSummary('Storing embeddings locally...');
    await vectorDB.putMany(entriesToStore);

    const endTime = performance.now();
    const elapsed = Math.round(endTime - startTime);

    this.updateProgress(100);
    this.updateSummary(
      `Loaded ${entriesToStore.length} entries into local vector index in ${elapsed} ms.`
    );

    this.state.lastEmbedCount = entriesToStore.length;
    this.state.lastEmbedTime = elapsed;

    // Emit event for other components
    this.emit('data-loaded', {
      count: entriesToStore.length,
      time: elapsed
    });
  }

  updateProgress(percentage) {
    const progressBar = this.$('#progressBar');
    if (progressBar) {
      progressBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    }
  }

  updateSummary(text) {
    this.state.summary = text;
    const summaryEl = this.$('#summary');
    if (summaryEl) {
      summaryEl.textContent = text;
    }
  }

  showSpinner(show) {
    const spinner = this.$('#uploadSpinner');
    if (spinner) {
      spinner.style.display = show ? 'inline-block' : 'none';
    }
  }

  async onConnected() {
    // Clear DB on component (page) load to avoid stale embeddings
    try {
      await vectorDB.clear();
      this.state.lastEmbedCount = 0;
      this.updateSummary('Database cleared on reload. Ready for CSV.');
    } catch (error) {
      console.warn('Could not clear DB on load:', error);
    }
  }

  // Getter for external access to state
  get embedCount() {
    return this.state.lastEmbedCount;
  }

  get embedTime() {
    return this.state.lastEmbedTime;
  }
}

// Register the custom element
customElements.define('upload-card', UploadCard);
