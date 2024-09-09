import { Bullet } from "./bullet.js";

export class Spaceship {
    canvas
    ctx
    sprite
    target
    aimTowards
    constructor(canvas, ctx, sprite) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.sprite = sprite;

        this.x = this.sprite.startx
        this.y = this.sprite.starty
        this.width = sprite.width;
        this.height = sprite.height;
        this.scale = sprite.scale
        this.max_speed = sprite.max_speed
        this.rotationSpeed = 0//sprite.rotationSpeed 
        this.momentumX = 0; // Initial momentum in the X direction
        this.momentumY = 0; // Initial momentum in the Y direction
        // this.zoomLevel = this.sprite.zoomLevel 
        this.angle = 0;
        this.speed = sprite.speed;

        // this.bullets = [];
        // // // Load the ships.png image
        this.shipImage = new Image();
        this.shipImage.src = this.sprite.src//'./ships.png'; // Path to the uploaded image
        if (this.sprite.ai) {
            this.ai = this.sprite.ai;
        }

        // this.x =  this.x-170
    }
    ai
    asteroids
    zoomLevel
    update(zoomLevel) {
        let width = this.canvas.width / zoomLevel
        let height = this.canvas.height / zoomLevel
        this.zoomLevel = zoomLevel;
        if (this.ai) {
            this.ai(this, 1);
        }


        // Adjust momentum to not exceed max speed while maintaining ratio
        const speed = Math.sqrt(this.momentumX ** 2 + this.momentumY ** 2);
        const maxSpeed = Math.abs(this.max_speed);
        if (speed > maxSpeed) {
            const scale = maxSpeed / speed;
            this.momentumX *= scale;
            this.momentumY *= scale;
        }

        this.angle += this.rotationSpeed;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.x += this.momentumX * this.zoomLevel;
        this.y += this.momentumY * this.zoomLevel;

        //    let max =  (this.x+769.5/zoomLevel) - 1

        // if (this.sprite.name === "human") {
        //     // Display ship1's coordinates and canvas dimensions
        //     this.ctx.font = '16px Arial';
        //     this.ctx.fillStyle = 'white'; //(baseShipX - canvasWidth / 2) / zoomLevel + canvasWidth / 2;
        //     this.ctx.fillText(`Ship1 X: ${ max } : ${this.x/zoomLevel} : ${this.x}`, this.canvas.width - 450, 20);
        //     this.ctx.fillText(`Ship1 Y: ${ (this.y+581.75/zoomLevel) } : ${this.y/zoomLevel} : ${this.y} `, this.canvas.width - 450, 40);
        //     this.ctx.fillText(`Canvas Width: ${this.canvas.width/zoomLevel }`, this.canvas.width - 450, 60);
        //     this.ctx.fillText(`Canvas Height: ${this.canvas.height /zoomLevel }`, this.canvas.width - 450, 80);
        // }


        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // this.bullets.forEach(bullet => bullet.update());
        // this.bullets = this.bullets.filter(bullet => bullet.isInBounds());

        // // Check for collisions
        // this.bullets.forEach((bullet, bulletIndex) => {
        //     if (this.asteroids) {
        //         this.asteroids.forEach((asteroid, asteroidIndex) => {
        //             if (bullet.collidesWith(asteroid)) {
        //                 this.bullets.splice(bulletIndex, 1);
        //                 this.asteroids.splice(asteroidIndex, 1);
        //             }
        //         });
        //     }
        // });

        this.draw();
    }

    draw() {
        this.ctx.save();
        // Translate to the center of the sprite
        this.ctx.translate(this.x + this.sprite.width / 2, this.y + this.sprite.height / 2);
        // Rotate the context
        this.ctx.rotate(this.angle + Math.PI / 2);
        // Translate back to the top-left corner of the sprite
        this.ctx.translate(-this.sprite.width / 2, -this.sprite.height / 2);

        if (this.shipImage.complete) {  // Ensure the image is fully loaded
            this.ctx.drawImage(this.shipImage, this.sprite.x, this.sprite.y, this.sprite.width, this.sprite.height, 0, 0, this.sprite.width, this.sprite.height);
        }

        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.sprite.width, this.sprite.height);
        this.ctx.restore();
    }

    shoot() {
        this.bullets.push(new Bullet(this.x, this.y, this.angle, this.canvas, this.ctx))
    }
    collidesWith(asteroid) {
        const dx = this.x - asteroid.x;
        const dy = this.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < asteroid.size;
    }

    setZoomLevel(zoomLevel) {
        this.zoomLevel = zoomLevel;
    }
}
