export class Renderer {
    constructor(canvasContext, starField) {
        this.ctx = canvasContext;
        this.canvas = canvasContext.canvas; // Access to canvas for width/height
        this.starField = starField; // Instance of StarField
    }

    render(gameManager, entityManager, uiManager, zoomManager) {
        const actualZoomLevel = zoomManager.getActualZoom();
        const worldWidth = this.canvas.width / actualZoomLevel;
        const worldHeight = this.canvas.height / actualZoomLevel;

        // 1. Reset transform and clear canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); 
        this.ctx.fillStyle = 'black'; // Or whatever background color if starfield isn't full opaque
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);


        // 2. Apply game zoom
        this.ctx.scale(actualZoomLevel, actualZoomLevel);
        
        // 3. Draw Starfield (already operates in world coordinates, will be scaled by context)
        if (this.starField) {
            // Starfield update might be better handled in GameManager's update loop
            // For now, assuming its update is called elsewhere or it's self-contained for draw.
            // If starfield needs deltaTime for its own update before drawing:
            // this.starField.update(deltaTime, actualZoomLevel); // GameManager should pass deltaTime
            this.starField.draw(this.ctx); // Pass context if starfield doesn't store it
        }

        // 4. Draw all active game objects
        const entities = entityManager.getEntities();
        entities.forEach(obj => {
            if (obj.isActive) {
                obj.draw(this.ctx); // Pass context if GameObject.draw needs it explicitly
            }
        });

        // 5. Draw UI elements (drawn in screen space, so reset transform)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (uiManager) {
            uiManager.drawCurrentUI(this.ctx, gameManager);
        }
    }
}