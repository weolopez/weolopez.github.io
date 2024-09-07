
export class Asteroid {
    canvas
    ctx
    constructor(x, y, size, canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.size = size;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 2 + 1;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        if (this.x < 0) this.x = this.canvas.width;
        if (this.x > this.canvas.width) this.x = 0;
        if (this.y < 0) this.y = this.canvas.height;
        if (this.y > this.canvas.height) this.y = 0;
    }

    draw() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'white';
        this.ctx.stroke();
    }
    collidesWith(bullet) {
        return bullet.collidesWith(this);
    }
    collidesWith(spaceship) {
        return spaceship.collidesWith(this);
    }
}
