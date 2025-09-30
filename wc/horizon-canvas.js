class HorizonCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.resizeCanvas();
    this.loadImage();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          min-height: 100vh;
          background-color: #1a1a1a;
          color: #e0e0e0;
          text-align: center;
        }

        h1 {
          font-weight: 300;
          letter-spacing: 1px;
        }

        .canvas-container {
          width: 90%;
          max-width: 900px;
          height: 400px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          margin: 20px auto;
        }

        canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        footer {
          margin-top: 40px;
          font-size: 0.9em;
          color: #888;
        }

        .slider-container {
          margin-top: 20px;
          width: 90%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        input[type="range"] {
          width: 100%;
        }

        .display-info {
          display: flex;
          gap: 20px;
        }
      </style>
      <h1>Dynamic Horizon (Canvas)</h1>
      <div class="canvas-container">
        <canvas id="horizonCanvas"></canvas>
      </div>
      <footer id="time-display">Fetching time...</footer>
      <div class="slider-container">
        <label for="lunarSlider">Lunar Day (0-29.5, fractional for time of day):</label>
        <input type="range" id="lunarSlider" min="0" max="29.5" step="0.01" value="12">
        <div class="display-info">
          <span id="sliderDayDisplay">Day: 12</span>
          <span id="sliderTimeDisplay">Time: 00:00</span>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const lunarSlider = this.shadowRoot.getElementById('lunarSlider');
    const sliderDayDisplay = this.shadowRoot.getElementById('sliderDayDisplay');
    const sliderTimeDisplay = this.shadowRoot.getElementById('sliderTimeDisplay');
    const timeDisplay = this.shadowRoot.getElementById('time-display');

    let currentLunarDay = 12;

    function updateLunarDisplay(lunarDay) {
      const day = Math.floor(lunarDay);
      const fractional = lunarDay - day;
      const hours = Math.floor(fractional * 24);
      const minutes = Math.round((fractional * 24 - hours) * 60);
      sliderDayDisplay.textContent = `Day: ${day}`;
      sliderTimeDisplay.textContent = `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Initial value
    const nowInitial = new Date();
    const initialHours = nowInitial.getHours();
    const initialMinutes = nowInitial.getMinutes();
    const initialFractional = (initialHours + initialMinutes / 60) / 24;
    currentLunarDay = 12 + initialFractional;
    lunarSlider.value = currentLunarDay;
    updateLunarDisplay(currentLunarDay);

    lunarSlider.addEventListener('input', (e) => {
      currentLunarDay = parseFloat(e.target.value);
      updateLunarDisplay(currentLunarDay);
      this.draw();
    });

    // Animation loop
    let animationId;
    function animate() {
      const now = new Date();
      timeDisplay.textContent = `Real time: ${now.toLocaleTimeString()}`;
      this.draw();
      animationId = requestAnimationFrame(animate.bind(this));
    }
    this.animate = animate;

    // Resize listener
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  loadImage() {
    const horizonImageUrl = '/horizon-3.png';
    this.horizonImage = new Image();
    this.horizonImage.src = horizonImageUrl;
    this.horizonImage.onload = () => {
      console.log("Horizon image loaded successfully.");
      this.animate();
    };
    this.horizonImage.onerror = () => {
      console.error("Failed to load the horizon image.");
      this.animate();
    };
  }

  resizeCanvas() {
    const canvas = this.shadowRoot.getElementById('horizonCanvas');
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  lerpColor(color1, color2, factor) {
    factor = Math.max(0, Math.min(1, factor));
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  getSkyGradient(ctx, timeScore, height) {
    const normalizedTime = timeScore % 24;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);

    // Key times for transitions (in hours)
    const keyTimes = [0, 5, 6, 8, 17, 19, 21, 24];
    // Corresponding top, mid, bottom colors for each key time
    const topColors = ['#0a0a1a', '#1a1a2a', '#2a2a3a', '#87ceeb', '#ff6b6b', '#4d4c7a', '#0c0a1a', '#0a0a1a'];
    const midColors = ['#1a1a2a', '#2a2a3a', '#4a3a2a', '#add8e6', '#ff8c69', '#3a3a5a', '#1a0a2a', '#1a1a2a'];
    const bottomColors = ['#2a2a3a', '#4a4a5a', '#8a5a2a', '#b0e0e6', '#ffa500', '#212042', '#212042', '#2a2a3a'];

    // Function to get interpolated color at normalizedTime
    const getInterpolatedColor = (colors, times, t) => {
      if (t <= times[0]) return colors[0];
      if (t >= times[times.length - 1]) return colors[times.length - 1];

      for (let i = 0; i < times.length - 1; i++) {
        if (t >= times[i] && t <= times[i + 1]) {
          const factor = (t - times[i]) / (times[i + 1] - times[i]);
          return this.lerpColor(colors[i], colors[i + 1], factor);
        }
      }
      return colors[0]; // Fallback
    };

    const topColor = getInterpolatedColor(topColors, keyTimes, normalizedTime);
    const midColor = getInterpolatedColor(midColors, keyTimes, normalizedTime);
    const bottomColor = getInterpolatedColor(bottomColors, keyTimes, normalizedTime);

    // Basic 3-stop gradient for smoothness
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(0.5, midColor);
    gradient.addColorStop(1, bottomColor);

    // Enhance twilight periods with more stops if in dawn (6-8) or sunset (17-19)
    if ((normalizedTime >= 6 && normalizedTime < 8) || (normalizedTime >= 17 && normalizedTime < 19)) {
      // Add intermediate warm colors
      const warmMid1 = this.lerpColor(midColor, '#ff8c00', 0.5);
      const warmMid2 = this.lerpColor(bottomColor, '#ffd700', 0.3);
      gradient.addColorStop(0.3, warmMid1);
      gradient.addColorStop(0.7, warmMid2);
    }

    return gradient;
  }

  draw() {
    const canvas = this.shadowRoot.getElementById('horizonCanvas');
    const ctx = canvas.getContext('2d');
    const timeDisplay = this.shadowRoot.getElementById('time-display');

    const lunarSlider = this.shadowRoot.getElementById('lunarSlider');
    const currentLunarDay = parseFloat(lunarSlider.value);
    const day = Math.floor(currentLunarDay);
    const fractional = currentLunarDay - day;
    const timeScore = fractional * 24;
    const currentMoonPhase = day % 29.5;

    // Calculate image dimensions
    let imgHeight, imgY;
    if (this.horizonImage.complete && this.horizonImage.naturalHeight > 0) {
      const imgAspectRatio = this.horizonImage.naturalWidth / this.horizonImage.naturalHeight;
      imgHeight = canvas.width / imgAspectRatio;
      imgY = canvas.height - imgHeight;
      if (imgHeight < canvas.height * 0.4) {
        imgHeight = canvas.height * 0.4;
        imgY = canvas.height - imgHeight;
      }
    } else {
      // Default dimensions if image not loaded
      imgHeight = canvas.height * 0.5;
      imgY = canvas.height - imgHeight;
    }
    const horizonY = imgY;

    // Create sky gradient
    const skyGradient = this.getSkyGradient(ctx, timeScore, canvas.height);

    // Draw the sky
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the sun if during day (before horizon image so partially hidden)
    const isDay = timeScore >= 6 && timeScore <= 18;
    let sunX, sunY, sunRadius;
    if (isDay && this.horizonImage.complete) {
      const t = Math.max(0, Math.min(1, (timeScore - 6) / 12));
      sunX = canvas.width * t;
      const elevationRad = t * Math.PI;
      const elevationFraction = Math.sin(elevationRad);
      sunRadius = 25;
      const maxElevation = horizonY - sunRadius * 2; // Higher arch to make rise/set relatively lower
      const sunElevation = elevationFraction * maxElevation;
      // sunY = horizonY - sunElevation -200; // Center at horizon at rise/set, half below
      if (elevationFraction > 0.1) {
        // sunY = horizonY - (sunRadius * 10); // Keep sun just above horizon at low elevations
        sunY = 30 / elevationFraction;
      } else {
        sunY = horizonY - sunElevation - (sunRadius * 2); // Offset to keep more visible
      }

      // Ensure sun doesn't go above canvas top
      // if (sunY < sunRadius) {
      //     sunY = sunRadius;
      // }

      // console.log('Debug: timeScore=', timeScore, 't=', t, 'elevationFraction=', elevationFraction, 'maxElevation=', maxElevation, 'sunElevation=', sunElevation, 'sunX=', sunX, 'sunY=', sunY, 'glowRadius=', sunRadius * 3);

      // Draw sun glow
      const glowRadius = sunRadius * 3; // Reduced for less extension
      const glowGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, glowRadius);
      if (timeScore < 8 || timeScore > 17) { // Dawn or dusk: orange glow
        glowGradient.addColorStop(0, 'rgba(255, 140, 0, 0.8)');
        glowGradient.addColorStop(0.2, 'rgba(255, 165, 0, 0.6)');
        glowGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
      } else { // Day: yellow glow
        glowGradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
        glowGradient.addColorStop(0.2, 'rgba(255, 255, 0, 0.6)');
        glowGradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
      }
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(sunX, sunY, glowRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw sun disk
      let sunColor = 'yellow';
      if (timeScore < 8 || timeScore > 17) sunColor = 'orange';
      ctx.fillStyle = sunColor;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Moon position and drawing with refined visibility
    const nightStart = 18;
    const nightEnd = 6;
    const nightDuration = 12;
    let nightT = ((timeScore - nightStart + 24) % 24) / nightDuration;
    const isNight = timeScore >= 18 || timeScore < 6;
    let moonOpacity = isNight ? 1 : 0;
    // Fade moon near twilight (17-19 and 5-7)
    if (timeScore >= 17 && timeScore < 18) {
      moonOpacity = (18 - timeScore);
    } else if (timeScore >= 5 && timeScore < 6) {
      moonOpacity = (timeScore - 5);
    } else if (!isNight) {
      moonOpacity = 0;
    }
    let moonX, moonY, moonRadius;
    let drawMoon = moonOpacity > 0.01 && this.horizonImage.complete;
    if (drawMoon) {
      const elevationRad = nightT * Math.PI;
      const elevationFraction = Math.sin(elevationRad);
      moonX = canvas.width * nightT;
      moonRadius = 20;
      const maxElevation = horizonY - moonRadius * 2;
      const moonElevation = elevationFraction * maxElevation;
      moonY = horizonY - moonElevation;
      if (moonY < moonRadius) {
        moonY = moonRadius;
      }

      // Moon phase calculation (0=new moon, 0.5=full moon, 1=new moon)
      const phase = (currentMoonPhase % 29.5) / 29.5; // 0 to 1

      // Sample background color at moon position for shadow (after sky is drawn)
      const bgPixel = ctx.getImageData(moonX, moonY, 1, 1);
      const shadowR = bgPixel.data[0];
      const shadowG = bgPixel.data[1];
      const shadowB = bgPixel.data[2];
      const skyColor = `rgb(${shadowR}, ${shadowG}, ${shadowB})`;

      const phaseAngle = phase * 2 * Math.PI;
      const illumination = Math.abs(Math.cos(phaseAngle)); // 0 at new, 1 at full

      ctx.save();
      ctx.globalAlpha = moonOpacity;

      // Draw moon glow (subtle blueish, scaled by illumination)
      const glowIntensity = 0.3 * Math.abs(illumination);
      const moonGlowRadius = moonRadius * 2.5;
      const moonGlowGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonGlowRadius);
      moonGlowGradient.addColorStop(0, `rgba(200, 200, 255, ${glowIntensity})`);
      moonGlowGradient.addColorStop(0.5, `rgba(200, 200, 255, ${glowIntensity * 0.3})`);
      moonGlowGradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
      ctx.fillStyle = moonGlowGradient;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonGlowRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Improved moon phase rendering using dual-circle method for accurate phases
      const phaseAngleAdjusted = (phase * 2 * Math.PI) - Math.PI; // Adjust to start shadow from left for waxing
      const shadowOffset = moonRadius * Math.cos(phaseAngleAdjusted);

      // Draw the illuminated part (full circle minus shadow)
      ctx.fillStyle = '#f0f0f0'; // Moon surface
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw the shadow (offset circle)
      ctx.fillStyle = skyColor; // Night sky color for shadow
      ctx.beginPath();
      ctx.arc(moonX + shadowOffset, moonY, moonRadius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    }

    // Draw the horizon image on top
    if (this.horizonImage.complete) { // Check if image is loaded
      ctx.globalAlpha = 0.85; // Set transparency for the image
      ctx.drawImage(this.horizonImage, 0, imgY, canvas.width, imgHeight);
      ctx.globalAlpha = 1.0; // Reset global alpha
    }
  }
}

customElements.define('horizon-canvas', HorizonCanvas);
