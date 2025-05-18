import { Spaceship } from './spaceship.js'; // For instanceof checks
import { Asteroid } from './asteroid.js';   // For instanceof checks

export class ZoomManager {
    constructor(canvas, initialZoomLevels, initialTargetZoom, smoothFactor = 0.05) {
        this.canvas = canvas;
        this.ZOOM_LEVELS = initialZoomLevels; // e.g., { CLOSE: 0.8, MID: 0.5, FAR: 0.25 }
        this.actualZoomLevel = initialTargetZoom || this.ZOOM_LEVELS.MID;
        this.currentTargetZoom = initialTargetZoom || this.ZOOM_LEVELS.MID;
        this.smoothFactor = smoothFactor;
    }

    lerp(start, end, amt) {
        return start + (end - start) * amt;
    }

    determineTargetZoomLevel(playerShip, allGameObjects) {
        if (!playerShip || !playerShip.isActive) {
            return this.ZOOM_LEVELS.MID; // Default if no player
        }

        const activeEnemies = allGameObjects.filter(obj => obj instanceof Spaceship && obj !== playerShip && obj.isActive);

        if (activeEnemies.length === 0) {
            const nearbyAsteroids = allGameObjects.filter(obj => obj instanceof Asteroid && obj.isActive &&
                Math.sqrt((obj.x - playerShip.x) ** 2 + (obj.y - playerShip.y) ** 2) < 300 / this.actualZoomLevel);
            return nearbyAsteroids.length > 1 ? this.ZOOM_LEVELS.MID : this.ZOOM_LEVELS.CLOSE;
        }

        let minX = playerShip.x, maxX = playerShip.x, minY = playerShip.y, maxY = playerShip.y;

        activeEnemies.sort((a, b) => { // Sort to consider closest enemies first
            const distA = Math.sqrt((a.x - playerShip.x) ** 2 + (a.y - playerShip.y) ** 2);
            const distB = Math.sqrt((b.x - playerShip.x) ** 2 + (b.y - playerShip.y) ** 2);
            return distA - distB;
        });

        const enemiesToConsider = activeEnemies.slice(0, 3); // Focus on up to 3 closest enemies

        enemiesToConsider.forEach(enemy => {
            minX = Math.min(minX, enemy.x - enemy.width / 2);
            maxX = Math.max(maxX, enemy.x + enemy.width / 2);
            minY = Math.min(minY, enemy.y - enemy.height / 2);
            maxY = Math.max(maxY, enemy.y + enemy.height / 2);
        });
        // Include player in bounding box calculation
        minX = Math.min(minX, playerShip.x - playerShip.width / 2);
        maxX = Math.max(maxX, playerShip.x + playerShip.width / 2);
        minY = Math.min(minY, playerShip.y - playerShip.height / 2);
        maxY = Math.max(maxY, playerShip.y + playerShip.height / 2);

        const PADDING_FACTOR = 0.25; // Increased padding
        const paddedWidth = (maxX - minX) * (1 + PADDING_FACTOR);
        const paddedHeight = (maxY - minY) * (1 + PADDING_FACTOR);
        
        // Ensure bounding box is not too small (e.g. when player is alone)
        const minViewWidth = this.canvas.width / this.ZOOM_LEVELS.CLOSE / 2; // Min world width to show
        const minViewHeight = this.canvas.height / this.ZOOM_LEVELS.CLOSE / 2;

        const boundingBoxWidth = Math.max(paddedWidth, minViewWidth);
        const boundingBoxHeight = Math.max(paddedHeight, minViewHeight);

        const zoomToFitX = this.canvas.width / boundingBoxWidth;
        const zoomToFitY = this.canvas.height / boundingBoxHeight;
        let requiredZoom = Math.min(zoomToFitX, zoomToFitY);

        // Clamp the required zoom to the defined min/max levels
        requiredZoom = Math.max(this.ZOOM_LEVELS.FAR, Math.min(requiredZoom, this.ZOOM_LEVELS.CLOSE));
        
        // Heuristics to select one of the 3 target levels
        if (activeEnemies.length >= 2 && requiredZoom < (this.ZOOM_LEVELS.MID + this.ZOOM_LEVELS.FAR) / 1.8) {
             return this.ZOOM_LEVELS.FAR;
        } else if (activeEnemies.length === 1) {
            const distToEnemy = Math.sqrt((activeEnemies[0].x - playerShip.x)**2 + (activeEnemies[0].y - playerShip.y)**2);
            if (distToEnemy < (200 / this.actualZoomLevel) && requiredZoom > (this.ZOOM_LEVELS.MID + this.ZOOM_LEVELS.CLOSE) / 2.2 ) return this.ZOOM_LEVELS.CLOSE;
            return this.ZOOM_LEVELS.MID;
        }

        if (requiredZoom <= this.ZOOM_LEVELS.FAR * 1.2) return this.ZOOM_LEVELS.FAR;
        if (requiredZoom >= this.ZOOM_LEVELS.CLOSE * 0.8) return this.ZOOM_LEVELS.CLOSE;

        return this.ZOOM_LEVELS.MID;
    }

    update(deltaTime, playerShip, allGameObjects, currentGameState, GameStateConsts) {
        if (currentGameState === GameStateConsts.PLAYING) {
            this.currentTargetZoom = this.determineTargetZoomLevel(playerShip, allGameObjects);
        } else if (
            currentGameState === GameStateConsts.SHIP_SELECTION ||
            currentGameState === GameStateConsts.TITLE_SCREEN ||
            currentGameState === GameStateConsts.GAME_OVER ||
            currentGameState === GameStateConsts.PLAYER_DIED_CHOICE
        ) {
            this.currentTargetZoom = 1.0; // Default zoom for menu screens
        }
        // For PAUSED state, currentTargetZoom remains unchanged, so actualZoomLevel will also stabilize.

        const oldZoom = this.actualZoomLevel;
        this.actualZoomLevel = this.lerp(this.actualZoomLevel, this.currentTargetZoom, this.smoothFactor * (deltaTime * 60)); // deltaTime compensation

        // Return true if zoom changed significantly enough to warrant view recalculation
        return Math.abs(oldZoom - this.actualZoomLevel) > 0.0001;
    }

    getActualZoom() {
        return this.actualZoomLevel;
    }

    setTargetZoom(zoomLevelName) { // e.g., "CLOSE", "MID", "FAR"
        if (this.ZOOM_LEVELS[zoomLevelName]) {
            this.currentTargetZoom = this.ZOOM_LEVELS[zoomLevelName];
        } else {
            console.warn(`ZoomManager: Unknown zoom level name "${zoomLevelName}"`);
        }
    }
     // Call this if canvas resizes
    handleResize() {
        // The zoom logic itself is relative to canvas dimensions, so it should adapt.
        // No specific action needed here unless world boundaries or similar are cached based on old canvas size.
    }
}