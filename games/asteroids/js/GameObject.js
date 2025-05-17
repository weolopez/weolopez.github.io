export class GameObject {
    constructor(spriteData, canvas, ctx) {
        this.spriteData = spriteData;
        this.canvas = canvas;
        this.ctx = ctx;

        this.x = spriteData && typeof spriteData.startx === 'number' ? spriteData.startx : 0;
        this.y = spriteData && typeof spriteData.starty === 'number' ? spriteData.starty : 0;
        this.width = spriteData && typeof spriteData.width === 'number' ? spriteData.width : 0;
        this.height = spriteData && typeof spriteData.height === 'number' ? spriteData.height : 0;
        this.angle = 0; // Default angle
        this.speed = spriteData && typeof spriteData.speed === 'number' ? spriteData.speed : 0; // Current movement speed based on angle
        this.momentumX = 0;
        this.momentumY = 0;
        this.isActive = true; // Object is active by default

        // Image loading
        this.image = null;
        if (this.spriteData && this.spriteData.src) {
            this.image = new Image();
            this.image.src = this.spriteData.src;
            // Optional: Add onload/onerror handlers for debugging
            // this.image.onload = () => console.log(`Image loaded: ${this.spriteData.src} for ${this.spriteData.name || 'GameObject'}`);
            // this.image.onerror = () => console.error(`Error loading image: ${this.spriteData.src} for ${this.spriteData.name || 'GameObject'}`);
        }
    }

    // Abstract method for game logic, to be implemented by subclasses
    update(deltaTime) {
        // deltaTime can be used for frame-rate independent movement/logic
        // console.warn("Update method not implemented for", this.constructor.name);
    }

    // Abstract method for rendering, to be implemented by subclasses
    draw() {
        // console.warn("Draw method not implemented for", this.constructor.name);
    }

    // Marks the object for removal
    destroy() {
        this.isActive = false;
    }

    // Basic Axis-Aligned Bounding Box (AABB) collision check
    // Assumes this.x and this.y are the CENTER of the object.
    checkCollisionWith(otherObject) {
        if (!this.isActive || !otherObject.isActive) {
            return false;
        }

        const thisLeft = this.x - this.width / 2;
        const thisRight = this.x + this.width / 2;
        const thisTop = this.y - this.height / 2;
        const thisBottom = this.y + this.height / 2;

        const otherLeft = otherObject.x - otherObject.width / 2;
        const otherRight = otherObject.x + otherObject.width / 2;
        const otherTop = otherObject.y - otherObject.height / 2;
        const otherBottom = otherObject.y + otherObject.height / 2;

        return (
            thisLeft < otherRight &&
            thisRight > otherLeft &&
            thisTop < otherBottom &&
            thisBottom > otherTop
        );
    }
}