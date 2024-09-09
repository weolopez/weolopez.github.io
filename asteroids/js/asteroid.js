
export class Sprite {
    canvas
    ctx
    s
    constructor(canvas, ctx, s) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.s = s;
        this.x = s.startx;
        this.y = s.starty;
        this.size = s.size;
        this.angle = 1//Math.random() * Math.PI * 2;
        this.speed = Math.random() * 2 + 1;
    }

    update(scale) {
        // this.ctx.scale(scale,scale)
        let width = this.canvas.width/scale
        let height = this.canvas.height/scale

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
        this.draw();
    }

    draw() {
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
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
