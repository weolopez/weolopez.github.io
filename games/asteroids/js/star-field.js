export class StarField {
    constructor(mainCanvas, mainCtx) {
        this.mainCanvas = mainCanvas; // The main game canvas
        this.mainCtx = mainCtx;     // The main game context to draw on

        this.stars = [];
        this.numStarsBase = 200; // Base number of stars
        this.parallaxFactor = 0.5;
        this.currentZoomLevel = 1; // Keep track of the zoom level starfield is using
        this.initStars(this.currentZoomLevel);
    }

    initStars(zoomLevel) {
        this.stars = [];
        // Adjust number of stars based on zoom level - more stars when zoomed out (smaller zoomLevel value)
        const numStars = Math.floor(this.numStarsBase / Math.max(zoomLevel, 0.1)); 
        
        // Stars should be initialized across the potential world space, not just current canvas view
        // For simplicity, let's assume a large enough fixed world or adapt as needed.
        // Here, we'll distribute them based on the main canvas dimensions,
        // but their perceived density will change with zoom.
        const initialWorldWidth = this.mainCanvas.width / zoomLevel; // Approximate initial world width
        const initialWorldHeight = this.mainCanvas.height / zoomLevel; // Approximate initial world height


        for (let i = 0; i < numStars; i++) {
            const x = Math.random() * initialWorldWidth;
            const y = Math.random() * initialWorldHeight;
            // Star size should be independent of zoom for a consistent look, or scale inversely
            const size = Math.random() * 1.5 + 0.5; // Consistent physical size
            const speed = (Math.random() * 20 + 10) * this.parallaxFactor; // Pixels per second, affected by parallax
            this.stars.push({ x, y, size, speed });
        }
        this.currentZoomLevel = zoomLevel;
    }

    setZoomLevel(newZoomLevel) {
        // This method might be called if the starfield needs to react to zoom changes
        // outside of the main update/draw cycle, e.g., re-initializing stars.
        // For now, the main loop passes zoomLevel to update/draw.
        if (this.currentZoomLevel !== newZoomLevel) {
            // Option: Re-initialize stars if zoom changes significantly,
            // or adjust existing star positions/density.
            // this.initStars(newZoomLevel);
            this.currentZoomLevel = newZoomLevel;
        }
    }

    update(deltaTime, gameZoomLevel) {
        // gameZoomLevel is the current zoom of the main game view
        // Stars move based on their speed and parallax.
        // Their perceived movement speed on screen will be affected by gameZoomLevel.
        
        const worldHeight = this.mainCanvas.height / gameZoomLevel;

        this.stars.forEach(star => {
            star.y += star.speed * deltaTime; // Movement in world units

            // Wrap stars around the world height
            if (star.y > worldHeight) {
                star.y = 0;
                star.x = Math.random() * (this.mainCanvas.width / gameZoomLevel);
            }
            // Could also wrap X if stars move horizontally
        });
    }

    draw() {
        // Assumes the main game context (this.mainCtx) has already been transformed (scaled for zoom)
        // by the main game loop. We draw stars in their world coordinates.
        this.mainCtx.fillStyle = 'white';
        this.stars.forEach(star => {
            this.mainCtx.beginPath();
            // Star size should appear consistent on screen, so scale it by current game zoom level
            // Or, if star.size is already "world size", it will be scaled by the view transform.
            // Let's assume star.size is its intended screen size if zoom was 1.
            // To make it appear constant size on screen: star.size / gameZoomLevel (but gameZoomLevel is already applied by ctx.scale)
            // So, if star.size is world size, it's fine. If it's screen size, it needs to be scaled up.
            // For simplicity, let's assume star.size is a small world unit size.
            this.mainCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.mainCtx.fill();
        });
    }
}