
export class Bullet {
    canvas
    ctx
    constructor(x, y, angle, canvas, ctx) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 5;
        this.canvas = canvas;
        this.ctx = ctx;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
    }

    isInBounds() {
        return this.x > 0 && this.x < this.canvas.width && this.y > 0 && this.y < this.canvas.height;
    }
    collidesWith(asteroid) {
        const dx = this.x - asteroid.x;
        const dy = this.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < asteroid.size;
    }
}
