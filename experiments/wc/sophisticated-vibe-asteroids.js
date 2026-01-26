/**
 * SophisticatedVibeAsteroids - A high-fidelity, arcade-grade space combat engine.
 * 
 * Features:
 * - Ship Archetypes: Choose between 'Viper' (Speed), 'Bastion' (Shields), and 'Wraith' (Rapid-Fire).
 * - Enemy AI: Raiders that track and engage the player.
 * - Particle System: Physics-based debris and thruster trails.
 * - Ability System: Cooldown-based special moves.
 * 
 * Attributes:
 * - player-ship-archetype: "viper" | "bastion" | "wraith"
 * - enemy-ai-spawn-interval-ms: Frequency of AI hunter spawns.
 * - neon-glow-intensity: CSS filter brightness for the glow effect.
 * - global-difficulty-scaling: Multiplier for speed and density.
 * - primary-ui-color: Theme color for HUD elements.
 */
class SophisticatedVibeAsteroids extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    
    // Core Game State
    this.state = {
      player: null,
      asteroids: [],
      enemies: [],
      bullets: [],
      particles: [],
      keys: {},
      score: 0,
      gameOver: false,
      lastEnemySpawn: 0
    };

    this.archetypes = {
      viper: { name: 'Viper', color: '#00f2ff', speed: 0.25, rot: 0.1, ability: 'Turbo Dash', cooldown: 2000 },
      bastion: { name: 'Bastion', color: '#ffcc00', speed: 0.12, rot: 0.06, ability: 'Shield Nova', cooldown: 5000 },
      wraith: { name: 'Wraith', color: '#ff00ff', speed: 0.18, rot: 0.08, ability: 'Triple Shot', cooldown: 3000 }
    };
  }

  static get observedAttributes() {
    return [
      'player-ship-archetype',
      'enemy-ai-spawn-interval-ms',
      'neon-glow-intensity',
      'global-difficulty-scaling',
      'primary-ui-color'
    ];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal && this.canvas) this.reset();
  }

  connectedCallback() {
    this.render();
    this.init();
    this.loop();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.animationId);
  }

  init() {
    this.canvas = this.shadowRoot.getElementById('game-engine');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.reset();
    
    window.addEventListener('keydown', (e) => this.state.keys[e.code] = true);
    window.addEventListener('keyup', (e) => {
      this.state.keys[e.code] = false;
      if (e.code === 'Space') this.fire(this.state.player);
      if (e.code === 'ShiftLeft') this.triggerAbility();
      if (e.code === 'Enter' && this.state.gameOver) this.reset();
    });
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 600;
  }

  reset() {
    const archKey = this.getAttribute('player-ship-archetype') || 'viper';
    const arch = this.archetypes[archKey] || this.archetypes.viper;
    
    this.state.player = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hp: 100,
      maxHp: 100,
      radius: 15,
      arch: arch,
      lastAbility: 0,
      lastFire: 0
    };

    this.state.asteroids = [];
    this.state.enemies = [];
    this.state.bullets = [];
    this.state.particles = [];
    this.state.score = 0;
    this.state.gameOver = false;

    const diff = parseFloat(this.getAttribute('global-difficulty-scaling')) || 1.0;
    for (let i = 0; i < 6 * diff; i++) this.spawnAsteroid();
  }

  spawnAsteroid(x, y, r = 45) {
    this.state.asteroids.push({
      x: x || Math.random() * this.canvas.width,
      y: y || Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      r: r,
      points: Array.from({ length: 10 }, () => Math.random() * 0.4 + 0.8)
    });
  }

  spawnEnemyAI() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = 0; y = Math.random() * this.canvas.height; }
    else if (side === 1) { x = this.canvas.width; y = Math.random() * this.canvas.height; }
    else if (side === 2) { x = Math.random() * this.canvas.width; y = 0; }
    else { x = Math.random() * this.canvas.width; y = this.canvas.height; }

    this.state.enemies.push({
      x, y, vx: 0, vy: 0, angle: 0, hp: 40, radius: 12, lastFire: 0
    });
  }

  fire(entity, angleOffset = 0) {
    if (!entity) return;
    const now = Date.now();
    if (now - entity.lastFire < 250) return;
    
    entity.lastFire = now;
    const angle = (entity.angle || 0) + angleOffset;
    this.state.bullets.push({
      x: entity.x + Math.cos(angle) * entity.radius,
      y: entity.y + Math.sin(angle) * entity.radius,
      vx: Math.cos(angle) * 8 + (entity.vx || 0),
      vy: Math.sin(angle) * 8 + (entity.vy || 0),
      owner: entity === this.state.player ? 'player' : 'enemy',
      life: 80
    });
  }

  triggerAbility() {
    const p = this.state.player;
    const now = Date.now();
    if (now - p.lastAbility < p.arch.cooldown) return;
    
    p.lastAbility = now;
    if (p.arch.name === 'Viper') {
      p.vx += Math.cos(p.angle) * 15;
      p.vy += Math.sin(p.angle) * 15;
    } else if (p.arch.name === 'Bastion') {
      this.state.asteroids.forEach(a => {
        if (Math.hypot(a.x - p.x, a.y - p.y) < 200) {
          a.vx += (a.x - p.x) * 0.1;
          a.vy += (a.y - p.y) * 0.1;
        }
      });
    } else if (p.arch.name === 'Wraith') {
      this.fire(p, -0.3);
      this.fire(p, 0.3);
    }
    this.createExplosion(p.x, p.y, p.arch.color, 20);
  }

  createExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.02,
        color
      });
    }
  }

  update() {
    if (this.state.gameOver) return;
    const p = this.state.player;
    const keys = this.state.keys;
    const now = Date.now();

    // Player Input
    if (keys['ArrowLeft'] || keys['KeyA']) p.angle -= p.arch.rot;
    if (keys['ArrowRight'] || keys['KeyD']) p.angle += p.arch.rot;
    if (keys['ArrowUp'] || keys['KeyW']) {
      p.vx += Math.cos(p.angle) * p.arch.speed;
      p.vy += Math.sin(p.angle) * p.arch.speed;
      if (Math.random() > 0.5) this.state.particles.push({
        x: p.x - Math.cos(p.angle) * 10,
        y: p.y - Math.sin(p.angle) * 10,
        vx: -p.vx * 0.5, vy: -p.vy * 0.5, life: 0.5, decay: 0.05, color: '#ff4400'
      });
    }
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.98; p.vy *= 0.98;

    // AI logic
    const interval = parseInt(this.getAttribute('enemy-ai-spawn-interval-ms')) || 8000;
    if (now - this.state.lastEnemySpawn > interval) {
      this.spawnEnemyAI();
      this.state.lastEnemySpawn = now;
    }

    this.state.enemies.forEach((en, idx) => {
      const dx = p.x - en.x;
      const dy = p.y - en.y;
      const dist = Math.hypot(dx, dy);
      en.angle = Math.atan2(dy, dx);
      en.vx = Math.cos(en.angle) * 1.5;
      en.vy = Math.sin(en.angle) * 1.5;
      en.x += en.vx; en.y += en.vy;
      if (dist < 300 && Math.random() < 0.02) this.fire(en);
      
      if (dist < en.radius + p.radius) {
        p.hp -= 1;
        if (p.hp <= 0) this.state.gameOver = true;
      }
    });

    // Physics & Wrap
    [p, ...this.state.enemies, ...this.state.asteroids, ...this.state.bullets].forEach(obj => {
      if (obj.x < 0) obj.x = this.canvas.width;
      if (obj.x > this.canvas.width) obj.x = 0;
      if (obj.y < 0) obj.y = this.canvas.height;
      if (obj.y > this.canvas.height) obj.y = 0;
    });

    // Bullets
    for (let i = this.state.bullets.length - 1; i >= 0; i--) {
      const b = this.state.bullets[i];
      b.x += b.vx; b.y += b.vy;
      if (--b.life <= 0) { this.state.bullets.splice(i, 1); continue; }

      // Hit Detect
      if (b.owner === 'player') {
        this.state.enemies.forEach((en, ei) => {
          if (Math.hypot(en.x - b.x, en.y - b.y) < en.radius) {
            en.hp -= 20;
            this.state.bullets.splice(i, 1);
            if (en.hp <= 0) {
              this.createExplosion(en.x, en.y, '#ff0000', 15);
              this.state.enemies.splice(ei, 1);
              this.state.score += 500;
            }
          }
        });
      } else {
        if (Math.hypot(p.x - b.x, p.y - b.y) < p.radius) {
          p.hp -= 10;
          this.state.bullets.splice(i, 1);
          if (p.hp <= 0) this.state.gameOver = true;
        }
      }

      this.state.asteroids.forEach((as, ai) => {
        if (Math.hypot(as.x - b.x, as.y - b.y) < as.r) {
          this.state.bullets.splice(i, 1);
          this.splitAsteroid(ai);
        }
      });
    }

    // Particles
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const part = this.state.particles[i];
      part.x += part.vx; part.y += part.vy;
      part.life -= part.decay;
      if (part.life <= 0) this.state.particles.splice(i, 1);
    }

    // Asteroid collision with player
    this.state.asteroids.forEach(a => {
      a.x += a.vx; a.y += a.vy;
      if (Math.hypot(a.x - p.x, a.y - p.y) < a.r + p.radius) {
        p.hp -= 0.5;
        if (p.hp <= 0) this.state.gameOver = true;
      }
    });
  }

  splitAsteroid(index) {
    const a = this.state.asteroids[index];
    this.createExplosion(a.x, a.y, '#ffffff', 5);
    this.state.score += 100;
    if (a.r > 20) {
      this.spawnAsteroid(a.x, a.y, a.r / 2);
      this.spawnAsteroid(a.x, a.y, a.r / 2);
    }
    this.state.asteroids.splice(index, 1);
  }

  draw() {
    const { ctx, canvas, state } = this;
    const glow = this.getAttribute('neon-glow-intensity') || '1.5';
    const uiColor = this.getAttribute('primary-ui-color') || '#ffffff';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${glow}) drop-shadow(0 0 5px currentColor)`;

    // Draw Particles
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 2, 2);
    });
    ctx.globalAlpha = 1;

    // Draw Player
    ctx.strokeStyle = state.player.arch.color;
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(state.player.x, state.player.y);
    ctx.rotate(state.player.angle);
    ctx.beginPath();
    ctx.moveTo(state.player.radius, 0);
    ctx.lineTo(-state.player.radius, -state.player.radius/1.5);
    ctx.lineTo(-state.player.radius, state.player.radius/1.5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Draw Enemies
    ctx.strokeStyle = '#ff3333';
    state.enemies.forEach(en => {
      ctx.save();
      ctx.translate(en.x, en.y);
      ctx.rotate(en.angle);
      ctx.strokeRect(-en.radius, -en.radius, en.radius*2, en.radius*2);
      ctx.restore();
    });

    // Draw Asteroids
    ctx.strokeStyle = '#fff';
    state.asteroids.forEach(a => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2;
        const d = a.r * a.points[i];
        ctx.lineTo(a.x + Math.cos(ang) * d, a.y + Math.sin(ang) * d);
      }
      ctx.closePath();
      ctx.stroke();
    });

    // Draw Bullets
    state.bullets.forEach(b => {
      ctx.fillStyle = b.owner === 'player' ? state.player.arch.color : '#ff3333';
      ctx.fillRect(b.x, b.y, 3, 3);
    });

    // HUD
    ctx.filter = 'none';
    ctx.fillStyle = uiColor;
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText(`SCORE: ${state.score.toLocaleString()}`, 20, 30);
    ctx.fillText(`ARCHETYPE: ${state.player.arch.name}`, 20, 50);
    
    // HP Bar
    ctx.strokeStyle = uiColor;
    ctx.strokeRect(20, 65, 100, 10);
    ctx.fillStyle = state.player.hp < 30 ? '#ff0000' : '#00ff00';
    ctx.fillRect(20, 65, state.player.hp, 10);

    // Ability Cooldown
    const cd = Math.max(0, (state.player.arch.cooldown - (Date.now() - state.player.lastAbility)) / state.player.arch.cooldown);
    ctx.fillStyle = '#666';
    ctx.fillRect(20, 85, 100, 4);
    ctx.fillStyle = state.player.arch.color;
    ctx.fillRect(20, 85, 100 * (1 - cd), 4);
    ctx.fillText(`[SHIFT] ${state.player.arch.ability}`, 130, 92);

    if (state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '40px monospace';
      ctx.fillText('MISSION FAILED', canvas.width/2, canvas.height/2);
      ctx.font = '16px monospace';
      ctx.fillText('PRESS ENTER TO RE-DEPLOY', canvas.width/2, canvas.height/2 + 40);
      ctx.textAlign = 'left';
    }
  }

  loop() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          min-height: 400px;
          background: radial-gradient(circle at center, #1a1a2e 0%, #000 100%);
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          position: relative;
          overflow: hidden;
        }
        canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .controls {
          position: absolute;
          bottom: 20px;
          left: 20px;
          background: rgba(0,0,0,0.5);
          padding: 10px;
          border-left: 3px solid #00f2ff;
          font-size: 11px;
          pointer-events: none;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      </style>
      <canvas id="game-engine"></canvas>
      <div class="controls">
        WASD/ARROWS: PILOT • SPACE: PRIMARY WEAPON • SHIFT: SPECIAL ABILITY
      </div>
    `;
  }
}

customElements.define('sophisticated-vibe-asteroids', SophisticatedVibeAsteroids);