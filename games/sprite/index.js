// mySpriteLib.js

class Sprite {
    /**
     * @param {Object} options
     * @param {HTMLImageElement} options.image - Loaded image or sprite sheet
     * @param {number} options.x - Initial x position
     * @param {number} options.y - Initial y position
     * @param {number} options.width - Width of the drawn sprite
     * @param {number} options.height - Height of the drawn sprite
     */
    constructor({ image, x, y, width, height }) {
      this.image = image;
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
  
      // Additional properties for animations, collisions, etc.
      this.animations = {};
      this.currentAnimation = null;
      this.frameIndex = 0;
      this.frameTimer = 0;
      this.frameInterval = 100; // ms per frame
      this.isAnimated = false;
      this.loop = true;
    }
  
    addAnimation(name, frames) {
      // frames: Array of frame data (e.g., [{ sx: 0, sy: 0 }, { sx: 32, sy: 0 }...])
      this.animations[name] = frames;
    }
  
    playAnimation(name, loop = true, frameInterval = 100) {
      if (this.animations[name]) {
        this.currentAnimation = name;
        this.loop = loop;
        this.frameInterval = frameInterval;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.isAnimated = true;
      }
    }
  
    stopAnimation() {
      this.isAnimated = false;
    }
  
    update(deltaTime) {
      // If sprite has an active animation
      if (this.isAnimated && this.animations[this.currentAnimation]) {
        this.frameTimer += deltaTime;
  
        if (this.frameTimer >= this.frameInterval) {
          this.frameTimer = 0;
          this.frameIndex++;
  
          // If we reach the end of the animation
          if (this.frameIndex >= this.animations[this.currentAnimation].length) {
            if (this.loop) {
              this.frameIndex = 0; // loop back
            } else {
              this.frameIndex = this.animations[this.currentAnimation].length - 1;
              this.isAnimated = false; // stop if non-looping
            }
          }
        }
      }
    }
  
    draw(ctx) {
      if (!this.currentAnimation || !this.isAnimated) {
        // Draw full image (static sprite)
        ctx.drawImage(
          this.image,
          this.x,
          this.y,
          this.width,
          this.height
        );
      } else {
        // Draw current frame
        const frames = this.animations[this.currentAnimation];
        const { sx, sy } = frames[this.frameIndex];
  
        ctx.drawImage(
          this.image,
          sx,
          sy,
          this.width,
          this.height,
          this.x,
          this.y,
          this.width,
          this.height
        );
      }
    }
  
    // Simple bounding box collision
    collidesWith(other) {
      return !(
        this.x + this.width < other.x ||
        this.x > other.x + other.width ||
        this.y + this.height < other.y ||
        this.y > other.y + other.height
      );
    }
  }
  
  class GameEngine {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext('2d');
      this.sprites = [];
      this.lastTimestamp = 0;
      this.isRunning = false;
    }
  
    addSprite(sprite) {
      this.sprites.push(sprite);
    }
  
    removeSprite(sprite) {
      this.sprites = this.sprites.filter(s => s !== sprite);
    }
  
    update(deltaTime) {
      // Update each sprite
      for (const sprite of this.sprites) {
        sprite.update(deltaTime);
      }
  
      // Simple example: check collisions
      for (let i = 0; i < this.sprites.length; i++) {
        for (let j = i + 1; j < this.sprites.length; j++) {
          if (this.sprites[i].collidesWith(this.sprites[j])) {
            // Handle collision (e.g., remove sprite, reduce health, etc.)
            console.log("Collision detected!");
          }
        }
      }
    }
  
    draw() {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
      // Draw each sprite
      for (const sprite of this.sprites) {
        sprite.draw(this.ctx);
      }
    }
  
    gameLoop(timestamp) {
      if (!this.isRunning) return;
  
      const deltaTime = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
  
      this.update(deltaTime);
      this.draw();
  
      requestAnimationFrame((ts) => this.gameLoop(ts));
    }
  
    start() {
      this.isRunning = true;
      this.lastTimestamp = performance.now();
      requestAnimationFrame((ts) => this.gameLoop(ts));
    }
  
    stop() {
      this.isRunning = false;
    }
  }
  
  // Export as a single module
  export { Sprite, GameEngine };
