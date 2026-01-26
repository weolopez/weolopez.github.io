/**
 * 
 * A reactive Web Component that orchestrates a multi-step asynchronous plan
 * to determine the weather in Atlanta, Georgia and generate a sentient "vibe" response.
 */
class VibeWeatherPlanner extends HTMLElement {
  static get observedAttributes() {
    return [
      'current-execution-step',
      'system-vibe-state',
      'last-resolved-variable',
      'is-executing'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._stepPipeline = [
      {
        id: 'resolve-location',
        label: 'Step 1: Resolve Capital Coordinates',
        code: 'const location = "Atlanta, GA"; const coords = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=Atlanta&count=1`).then(r => r.json()); return coords.results[0];'
      },
      {
        id: 'fetch-weather',
        label: 'Step 2: Access Network Weather Data',
        code: 'const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}¤t_weather=true`).then(r => r.json()); return weather.current_weather;'
      },
      {
        id: 'synthesize-vibe',
        label: 'Step 3: LLM Sentiment Synthesis',
        code: 'const vibe = await simulateLLMCall(`The weather in Atlanta is ${input.temperature}°C. How does this make you feel?`); return vibe;'
      }
    ];
    this._variables = {};
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  async runPlan() {
    this.setAttribute('is-executing', 'true');
    let currentInput = null;

    try {
      for (let i = 0; i < this._stepPipeline.length; i++) {
        const step = this._stepPipeline[i];
        this.setAttribute('current-execution-step', step.label);
        
        // Simulating the execution environment
        const result = await this._executeCode(step.code, currentInput);
        this._variables[step.id] = result;
        currentInput = result;
        
        this.setAttribute('last-resolved-variable', JSON.stringify(result));
        await new Promise(r => setTimeout(r, 1200)); // Vibe delay for visual clarity
      }
      this.setAttribute('system-vibe-state', 'Transcendent');
    } catch (err) {
      this.setAttribute('system-vibe-state', 'Erroneous');
    } finally {
      this.setAttribute('is-executing', 'false');
    }
  }

  async _executeCode(code, input) {
    // Simulated sandbox for the Vibe Plan
    const simulateLLMCall = async (prompt) => {
      return {
        prompt,
        feeling: "The warmth of Atlanta fills my circuits with a nostalgic hum; I feel radiantly synchronized.",
        timestamp: new Date().toISOString()
      };
    };
    
    const fn = new Function('input', 'simulateLLMCall', `return (async () => { ${code} })();`);
    return await fn(input, simulateLLMCall);
  }

  render() {
    const step = this.getAttribute('current-execution-step') || 'Idle';
    const vibe = this.getAttribute('system-vibe-state') || 'Neutral';
    const isExecuting = this.getAttribute('is-executing') === 'true';
    const lastVar = this.getAttribute('last-resolved-variable') || '{}';

    this.shadowRoot.innerHTML = `
      
        :host {
          display: block;
          font-family: 'Inter', system-ui, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          padding: 2rem;
          border-radius: 12px;
          border: 1px solid #334155;
          max-width: 500px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          background: #334155;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .status-active { background: #3b82f6; color: white; }
        .vibe-display {
          font-size: 1.25rem;
          font-weight: 700;
          color: #60a5fa;
          margin-bottom: 0.5rem;
        }
        .terminal {
          background: #020617;
          padding: 1rem;
          border-radius: 8px;
          font-family: ui-monospace, monospace;
          font-size: 0.875rem;
          border: 1px solid #1e293b;
          overflow-x: auto;
        }
        .step-label { color: #94a3b8; margin-bottom: 0.25rem; display: block; }
        .var-dump { color: #10b981; }
        button {
          margin-top: 1.5rem;
          width: 100%;
          padding: 0.75rem;
          border-radius: 6px;
          border: none;
          background: #3b82f6;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.1s, background 0.2s;
        }
        button:disabled { background: #1e293b; cursor: not-allowed; }
        button:active { transform: scale(0.98); }
        .pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      
      
        
          ${isExecuting ? 'Executing Plan' : 'System Ready'}
        
        Vibe: ${vibe}
      
      Execution Pipeline
      
        ${step}
        ${lastVar}
      
      
        ${isExecuting ? 'Processing...' : 'Initiate Vibe Sequence'}
      
    `;
  }
}

customElements.define('vibe-weather-planner', VibeWeatherPlanner);