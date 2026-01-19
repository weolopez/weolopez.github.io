// Code for weather-component.js
/**
 * ModernWeatherWidget
 * A high-quality, stand-alone web component that fetches and displays real-time weather 
 * data using the Open-Meteo API (no API key required).
 * 
 * Attributes:
 * - data-latitude-coordinate: Decimal latitude (default: 40.7128)
 * - data-longitude-coordinate: Decimal longitude (default: -74.0060)
 * - data-temperature-unit-preference: "celsius" or "fahrenheit" (default: celsius)
 * - data-widget-accent-color: CSS color for UI highlights (default: #3b82f6)
 */
class ModernWeatherWidget extends HTMLElement {
  static get observedAttributes() {
    return [
      'data-latitude-coordinate',
      'data-longitude-coordinate',
      'data-temperature-unit-preference',
      'data-widget-accent-color'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._weatherData = null;
    this._isLoading = false;
    this._errorMessage = null;
  }

  connectedCallback() {
    this._fetchWeather();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) {
      this._fetchWeather();
    }
  }

  async _fetchWeather() {
    const lat = this.getAttribute('data-latitude-coordinate') || '40.7128';
    const lon = this.getAttribute('data-longitude-coordinate') || '-74.0060';
    const unit = this.getAttribute('data-temperature-unit-preference') === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    
    this._isLoading = true;
    this._errorMessage = null;
    this._render();

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=${unit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch weather data');
      this._weatherData = await response.json();
    } catch (err) {
      this._errorMessage = err.message;
    } finally {
      this._isLoading = false;
      this._render();
    }
  }

  _getWeatherIcon(code) {
    // Mapping WMO Weather interpretation codes to emojis
    const icons = {
      0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
      45: '🌫️', 48: '🌫️',
      51: '🌦️', 53: '🌦️', 55: '🌦️',
      61: '🌧️', 63: '🌧️', 65: '🌧️',
      71: '❄️', 73: '❄️', 75: '❄️',
      95: '⛈️'
    };
    return icons[code] || '🌡️';
  }

  _render() {
    const accentColor = this.getAttribute('data-widget-accent-color') || '#3b82f6';
    const unitSymbol = this.getAttribute('data-temperature-unit-preference') === 'fahrenheit' ? '°F' : '°C';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          max-width: 320px;
          contain: content;
        }

        .card {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid #f1f5f9;
          text-align: center;
          transition: transform 0.3s ease;
        }

        .card:hover {
          transform: translateY(-4px);
        }

        .loading-shimmer {
          height: 120px;
          background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 12px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .temp-display {
          font-size: 3rem;
          font-weight: 800;
          margin: 12px 0;
          color: #1e293b;
          letter-spacing: -2px;
        }

        .weather-icon {
          font-size: 3.5rem;
          margin-bottom: 8px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
        }

        .meta {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 999px;
          background: ${accentColor}15;
          color: ${accentColor};
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }

        .error {
          color: #ef4444;
          font-size: 0.875rem;
          padding: 12px;
        }

        .wind-info {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.7rem;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .stat-value {
          font-weight: 600;
          color: #334155;
          font-size: 0.9rem;
        }
      </style>

      <div class="card">
        ${this._isLoading ? `
          <div class="loading-shimmer"></div>
          <p class="meta">Retrieving atmosphere data...</p>
        ` : this._errorMessage ? `
          <div class="error">⚠️ ${this._errorMessage}</div>
        ` : this._weatherData ? `
          <div class="badge">Live Weather</div>
          <div class="weather-icon">
            ${this._getWeatherIcon(this._weatherData.current_weather.weathercode)}
          </div>
          <div class="temp-display">
            ${Math.round(this._weatherData.current_weather.temperature)}${unitSymbol}
          </div>
          <div class="meta">
            Lat: ${this._weatherData.latitude} • Lon: ${this._weatherData.longitude}
          </div>
          
          <div class="wind-info">
            <div class="stat">
              <span class="stat-label">Wind</span>
              <span class="stat-value">${this._weatherData.current_weather.windspeed} km/h</span>
            </div>
            <div class="stat">
              <span class="stat-label">Direction</span>
              <span class="stat-value">${this._weatherData.current_weather.winddirection}°</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

if (!customElements.get('modern-weather-widget')) {
  customElements.define('modern-weather-widget', ModernWeatherWidget);
}
