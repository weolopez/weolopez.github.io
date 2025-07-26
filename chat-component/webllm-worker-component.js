/**
 * WebLLM Worker Component
 * 
 * A Web Component that manages communication with the WebLLM worker.
 * This component acts as a bridge between the UI and the worker, handling
 * all WebLLM operations and dispatching custom events.
 */
class WebLLMWorkerComponent extends HTMLElement {
  constructor() {
    super();
    this.worker = null;
    this.isInitialized = false;
    this.currentModel = null;
    this.isProcessing = false;
  }

  static get observedAttributes() {
    return ['worker-path', 'model-id'];
  }

  connectedCallback() {
    // Set default attributes if not provided
    if (!this.hasAttribute('worker-path')) {
      this.setAttribute('worker-path', './chat-worker.js');
    }
    if (!this.hasAttribute('model-id')) {
      this.setAttribute('model-id', 'Qwen2.5-0.5B-Instruct-q0f16-MLC');
    }

    // Auto-initialize if model-id is set
    const modelId = this.getAttribute('model-id');
    if (modelId) {
      this.initializeWorker(modelId);
    }
  }

  disconnectedCallback() {
    this.terminateWorker();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'model-id' && newValue && newValue !== oldValue) {
      this.initializeWorker(newValue);
    }
  }

  /**
   * Initialize the WebLLM worker with the specified model
   * @param {string} modelId - The model identifier to load
   */
  async initializeWorker(modelId) {
    try {
      // Terminate existing worker if any
      this.terminateWorker();

      const workerPath = this.getAttribute('worker-path');
      this.worker = new Worker(workerPath, { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      this.currentModel = modelId;
      this.isInitialized = false;
      this.isProcessing = false;

      // Dispatch initialization start event
      this.dispatchEvent(new CustomEvent('llm-init-start', {
        detail: { modelId },
        bubbles: true,
        composed: true
      }));

      // Initialize the model
      this.worker.postMessage({
        type: 'init',
        model: modelId
      });

    } catch (error) {
      this.handleError(error, 'Failed to initialize worker');
    }
  }

  /**
   * Generate a response using the loaded model
   * @param {Array} messages - Array of message objects
   */
  async generateResponse(messages) {
    if (!this.worker || !this.isInitialized) {
      throw new Error('Worker not initialized. Call initializeWorker() first.');
    }

    if (this.isProcessing) {
      throw new Error('Already processing a request. Wait for completion.');
    }

    try {
      this.isProcessing = true;
      
      // Dispatch generation start event
      this.dispatchEvent(new CustomEvent('llm-generation-start', {
        detail: { messages },
        bubbles: true,
        composed: true
      }));

      this.worker.postMessage({
        type: 'generate',
        messages: messages,
        model: this.currentModel
      });

    } catch (error) {
      this.isProcessing = false;
      this.handleError(error, 'Failed to generate response');
    }
  }

  /**
   * Terminate the worker
   */
  terminateWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.isProcessing = false;
      this.currentModel = null;

      this.dispatchEvent(new CustomEvent('llm-worker-terminated', {
        bubbles: true,
        composed: true
      }));
    }
  }

  /**
   * Handle messages from the worker
   * @param {MessageEvent} event - Worker message event
   */
  handleWorkerMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'init-progress':
        this.dispatchEvent(new CustomEvent('llm-init-progress', {
          detail: data,
          bubbles: true,
          composed: true
        }));
        break;

      case 'init-complete':
        this.isInitialized = true;
        this.dispatchEvent(new CustomEvent('llm-init-complete', {
          detail: { 
            modelId: this.currentModel,
            ...data 
          },
          bubbles: true,
          composed: true
        }));
        break;

      case 'response-chunk':
        this.dispatchEvent(new CustomEvent('llm-response-chunk', {
          detail: data,
          bubbles: true,
          composed: true
        }));
        break;

      case 'response-complete':
        this.isProcessing = false;
        this.dispatchEvent(new CustomEvent('llm-response-complete', {
          detail: data,
          bubbles: true,
          composed: true
        }));
        break;

      case 'error':
        this.isProcessing = false;
        this.dispatchEvent(new CustomEvent('llm-error', {
          detail: data,
          bubbles: true,
          composed: true
        }));
        break;

      case 'warning':
        this.dispatchEvent(new CustomEvent('llm-warning', {
          detail: data,
          bubbles: true,
          composed: true
        }));
        break;

      default:
        console.warn('Unknown worker message type:', type);
    }
  }

  /**
   * Handle worker errors
   * @param {ErrorEvent} error - Worker error event
   */
  handleWorkerError(error) {
    this.isProcessing = false;
    this.handleError(error, 'Worker error occurred');
  }

  /**
   * Handle and dispatch error events
   * @param {Error} error - Error object
   * @param {string} message - Error message
   */
  handleError(error, message = 'An error occurred') {
    console.error(message, error);
    
    this.dispatchEvent(new CustomEvent('llm-error', {
      detail: {
        error: {
          message: error.message || message,
          stack: error.stack
        }
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Get the current status of the worker
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isProcessing: this.isProcessing,
      currentModel: this.currentModel,
      hasWorker: !!this.worker
    };
  }

  /**
   * Check if the worker is ready to process requests
   * @returns {boolean} True if ready
   */
  isReady() {
    return this.isInitialized && !this.isProcessing && !!this.worker;
  }

  /**
   * Get available models (this would typically come from a config or API)
   * @returns {Array} Array of available model objects
   */
  getAvailableModels() {
    return [
      { id: "Qwen2.5-0.5B-Instruct-q0f16-MLC", name: "Qwen 0.5B (Fast)" },
      { id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC", name: "DeepSeek 7B (Smart)" }
    ];
  }
}

// Define the custom element
customElements.define('webllm-worker-component', WebLLMWorkerComponent);

export { WebLLMWorkerComponent };