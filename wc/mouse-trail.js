// MouseTrail Web Component
class MouseTrail extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.particles = [];
        this.mouse = { x: null, y: null };
        this.isModifierActive = false;
        this.alwaysOn = false;
        this.config = {};
    }

    connectedCallback() {
        this.effect = this.getAttribute('data-effect') || 'cosmic';
        this.modifierKey = this.getAttribute('data-modifier');
        this.alwaysOn = !this.modifierKey;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.shadowRoot.appendChild(this.canvas);

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                pointer-events: none;
            }
            canvas {
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                pointer-events: none;
                z-index: 0;
            }
        `;
        this.shadowRoot.appendChild(style);

        this.loadEffectConfig();
        this.addEventListeners();
        this.setCanvasSize();
        this.animate();
    }

    loadEffectConfig() {
        const effects = {
            cosmic: {
                particleCount: 2,
                lifespan: 40,
                background: 'rgba(10, 10, 26, 0.1)',
                createParticle: (x, y) => ({
                    x, y,
                    vx: Math.random() * 2 - 1,
                    vy: Math.random() * 2 - 1,
                    size: Math.random() * 4 + 1,
                    hue: 200 + Math.random() * 60,
                    lifespan: 40,
                    maxLifespan: 40,
                    update: function() {
                        this.x += this.vx; this.y += this.vy; this.lifespan--;
                        if (this.size > 0.1) this.size -= 0.08;
                    },
                    draw: function(ctx) {
                        ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.lifespan / this.maxLifespan})`;
                        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
                    }
                })
            },
            fire: {
                particleCount: 3,
                lifespan: 50,
                background: 'rgba(42, 0, 0, 0.1)',
                createParticle: (x, y) => ({
                    x, y,
                    vx: Math.random() * 2 - 1,
                    vy: Math.random() * -2 - 1,
                    size: Math.random() * 5 + 2,
                    hue: Math.random() * 60,
                    lifespan: 50,
                    maxLifespan: 50,
                    update: function() {
                        this.x += this.vx; this.y += this.vy; this.lifespan--;
                        this.vy += 0.05;
                        if (this.size > 0.2) this.size -= 0.15;
                    },
                    draw: function(ctx) {
                        ctx.fillStyle = `hsla(${this.hue}, 100%, 50%, ${this.lifespan / this.maxLifespan})`;
                        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
                    }
                })
            },
            electric: {
                particleCount: 1,
                lifespan: 20,
                background: 'rgba(0, 0, 20, 0.15)',
                createParticle: (x, y, last) => ({
                    x, y,
                    lastX: last.x, lastY: last.y,
                    lifespan: 20,
                    maxLifespan: 20,
                    hue: 180 + Math.random() * 60,
                    update: function() { this.lifespan--; },
                    draw: function(ctx) {
                        ctx.strokeStyle = `hsla(${this.hue}, 100%, 70%, ${this.lifespan / this.maxLifespan})`;
                        ctx.lineWidth = Math.random() * 2 + 1;
                        ctx.beginPath(); ctx.moveTo(this.lastX, this.lastY); ctx.lineTo(this.x, this.y); ctx.stroke();
                    }
                })
            },
            bubbles: {
                particleCount: 1,
                lifespan: 80,
                background: 'rgba(0, 50, 80, 0.1)',
                createParticle: (x, y) => ({
                    x, y,
                    vx: Math.random() * 1 - 0.5,
                    vy: Math.random() * -1 - 0.5,
                    size: Math.random() * 3 + 1,
                    maxSize: Math.random() * 10 + 5,
                    hue: Math.random() * 360,
                    lifespan: 80,
                    maxLifespan: 80,
                    update: function() {
                        this.x += this.vx; this.y += this.vy; this.lifespan--;
                        if (this.size < this.maxSize) this.size += 0.2;
                    },
                    draw: function(ctx) {
                        ctx.strokeStyle = `hsla(${this.hue}, 100%, 70%, ${this.lifespan / this.maxLifespan})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.stroke();
                    }
                })
            },
            matrix: {
                particleCount: 2,
                lifespan: 100,
                background: 'rgba(0, 0, 0, 0.1)',
                chars: "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン",
                createParticle: (x, y) => ({
                    x, y,
                    vy: 1.5,
                    char: this.config.chars[Math.floor(Math.random() * this.config.chars.length)],
                    lifespan: 100,
                    maxLifespan: 100,
                    update: function() { this.y += this.vy; this.lifespan--; },
                    draw: function(ctx) {
                        ctx.fillStyle = `hsla(120, 100%, 60%, ${this.lifespan / this.maxLifespan})`;
                        ctx.font = '16px monospace';
                        ctx.fillText(this.char, this.x, this.y);
                    }
                })
            },
            chem_trails: {
                particleCount: 3,
                lifespan: 180,
                background: 'rgba(0, 41, 85, 0.005)',
                createParticle: (x, y, last) => ({
                    x, y,
                    lastX: last ? last.x : x,
                    lastY: last ? last.y : y,
                    vx: (Math.random() - 0.5) * 0.3, // Slight horizontal drift
                    vy: (Math.random() - 0.5) * 0.2, // Minimal vertical drift
                    size: Math.random() * 2 + 1,
                    maxSize: Math.random() * 8 + 4,
                    disperseRate: Math.random() * 0.02 + 0.01,
                    windDrift: Math.random() * 0.5 - 0.25,
                    chemicalHue: 120 + Math.random() * 40, // Greenish chemical tint
                    lifespan: 180,
                    maxLifespan: 180,
                    segments: [], // For creating segmented trail effect
                    update: function() {
                        // Store previous positions for trail segments
                        this.segments.push({x: this.x, y: this.y, age: this.maxLifespan - this.lifespan});
                        if (this.segments.length > 15) this.segments.shift();
                        
                        // Apply drift and dispersion
                        this.vx += this.windDrift * 0.01;
                        this.x += this.vx;
                        this.y += this.vy;
                        
                        // Gradual size increase (dispersing vapor)
                        if (this.size < this.maxSize) {
                            this.size += this.disperseRate;
                        }
                        
                        this.lifespan--;
                    },
                    draw: function(ctx) {
                        const alpha = this.lifespan / this.maxLifespan;
                        const ageFactor = 1 - (this.lifespan / this.maxLifespan);
                        
                        // Draw trail segments
                        this.segments.forEach((segment, i) => {
                            const segmentAlpha = alpha * (1 - (i / this.segments.length));
                            const segmentSize = this.size * (0.3 + (i / this.segments.length) * 0.7);
                            
                            // Main white/gray vapor
                            ctx.fillStyle = `rgba(255, 255, 255, ${segmentAlpha * 0.4})`;
                            ctx.beginPath();
                            ctx.arc(segment.x, segment.y, segmentSize, 0, Math.PI * 2);
                            ctx.fill();
                            
                            // Subtle chemical tint overlay
                            ctx.fillStyle = `hsla(${this.chemicalHue}, 30%, 70%, ${segmentAlpha * 0.15})`;
                            ctx.beginPath();
                            ctx.arc(segment.x, segment.y, segmentSize * 0.8, 0, Math.PI * 2);
                            ctx.fill();
                        });
                        
                        // Main particle with stronger chemical appearance
                        ctx.fillStyle = `rgba(245, 245, 245, ${alpha * 0.6})`;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Chemical tint on main particle
                        ctx.fillStyle = `hsla(${this.chemicalHue}, 40%, 60%, ${alpha * 0.25})`;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Add subtle glow effect for older particles
                        if (ageFactor > 0.3) {
                            ctx.shadowColor = `hsla(${this.chemicalHue}, 50%, 80%, ${alpha * 0.3})`;
                            ctx.shadowBlur = this.size * 2;
                            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.1})`;
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.shadowBlur = 0;
                        }
                    }
                })
            }
        };
        this.config = effects[this.effect] || effects.cosmic;
    }

    addEventListeners() {
        window.addEventListener('resize', this.setCanvasSize.bind(this));
        window.addEventListener('mousemove', this.updateMousePosition.bind(this));
        if (this.modifierKey) {
            window.addEventListener('keydown', this.handleKeyDown.bind(this));
            window.addEventListener('keyup', this.handleKeyUp.bind(this));
        }
    }

    updateMousePosition(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    handleKeyDown(e) {
        if (e.key.toLowerCase() === this.modifierKey) {
            this.isModifierActive = true;
        }
    }

    handleKeyUp(e) {
        if (e.key.toLowerCase() === this.modifierKey) {
            this.isModifierActive = false;
        }
    }

    setCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        const shouldCreate = this.alwaysOn || this.isModifierActive;
        if (!shouldCreate || this.mouse.x === null) return;
        for (let i = 0; i < this.config.particleCount; i++) {
            const lastParticle = this.particles[this.particles.length-1] || this.mouse;
            this.particles.push(this.config.createParticle(this.mouse.x, this.mouse.y, lastParticle));
        }
    }

    animate() {
        this.ctx.fillStyle = this.config.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            p.draw(this.ctx);
            if (p.lifespan <= 0) {
                this.particles.splice(i, 1);
            }
        }
        this.createParticles();
        requestAnimationFrame(this.animate.bind(this));
    }
}

customElements.define('mouse-trail', MouseTrail);