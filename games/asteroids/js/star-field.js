export class StarField {
    constructor(mainCanvas, mainCtx) {
        this.mainCanvas = mainCanvas;
        this.mainCtx = mainCtx;

        // Create starfield canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = mainCanvas.width;
        this.canvas.height = mainCanvas.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.stars = [];
        this.numStars = 100;
        this.parallaxFactor = 0.5; // Adjust this value to control the parallax effect
        this.initStars(this.zoomLevel);
    }

    initStars(zoomLevel) {
        this.stars = [];
        const numStars = 100 / zoomLevel; // Adjust number of stars based on zoom level
        for (let i = 0; i < numStars; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = Math.random() * 2 * zoomLevel; // Adjust size based on zoom level
            const speed = Math.random() * 0.5 * zoomLevel; // Adjust speed based on zoom level
            this.stars.push({ x, y, size, speed });
        }
    }

    setZoomLevel(zoomLevel) {
        // if zoom level is the same, do nothing
        if (this.zoomLevel === zoomLevel) {
            return;
        }
        this.zoomLevel = zoomLevel;
        this.initStars(zoomLevel);
        this.updateAndDraw();
    }

    updateAndDraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.stars.forEach(star => {
            star.y += star.speed * this.parallaxFactor;
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

// // Example usage
// const canvas = document.getElementById('canvas');
// const ctx = canvas.getContext('2d');
// const starField = new StarField(canvas, ctx);

// // Set initial zoom level
// starField.setZoomLevel(1);

// // Main game loop
// function gameLoop() {
//     starField.updateAndDraw();
//     requestAnimationFrame(gameLoop);
// }

// gameLoop();