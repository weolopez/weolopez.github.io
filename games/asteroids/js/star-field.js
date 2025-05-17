export class StarField {
    constructor(mainCanvas, mainCtx) {
        this.mainCanvas = mainCanvas;
        this.mainCtx = mainCtx;
        this.layers = [];
        this.currentZoomLevel = 1; // Keep track of the zoom level starfield is using for init

        this.layerConfigs = [
            { // Layer 0: Nebula Clouds (drawn first, furthest back)
                elementType: 'nebula',
                numElementsBase: 8, // Base number, adjusted by view
                sizeRange: [150, 350], // World units
                colorOptions: [
                    { r: 100, g: 50, b: 150 },  // Purplish
                    { r: 50, g: 100, b: 130 },  // Bluish-Teal
                    { r: 130, g: 70, b: 100 }   // Magenta-ish
                ],
                alphaRange: [0.03, 0.08], // Very subtle
                parallaxFactor: 0.08, // Scrolls extremely slowly
                shapeComplexity: 3 // Number of overlapping circles per cloud
            },
            { // Layer 1: Distant Stars
                elementType: 'star',
                numElementsBase: 180,
                sizeRange: [0.3, 0.7],
                colorPattern: { r: 200, g: 200, b: 255 }, // Pale blueish
                alphaRange: [0.2, 0.6],
                parallaxFactor: 0.18
            },
            { // Layer 2: Nearer Stars
                elementType: 'star',
                numElementsBase: 60,
                sizeRange: [0.6, 1.3],
                colorPattern: { r: 255, g: 255, b: 255 }, // Brighter white
                alphaRange: [0.5, 0.9],
                parallaxFactor: 0.45
            }
        ];

        this.initBackgroundElements(this.currentZoomLevel);
    }

    initBackgroundElements(zoomLevel) {
        this.layers = [];
        this.currentZoomLevel = zoomLevel;
        const initialWorldWidth = this.mainCanvas.width / this.currentZoomLevel;
        const initialWorldHeight = this.mainCanvas.height / this.currentZoomLevel;

        this.layerConfigs.forEach(config => {
            const layerElements = [];
            const numElements = Math.floor(config.numElementsBase / Math.max(this.currentZoomLevel, 0.15));

            for (let i = 0; i < numElements; i++) {
                const x = Math.random() * initialWorldWidth;
                const y = Math.random() * initialWorldHeight;
                const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
                const alpha = config.alphaRange[0] + Math.random() * (config.alphaRange[1] - config.alphaRange[0]);
                let color;

                if (config.elementType === 'star') {
                    color = `rgba(${config.colorPattern.r}, ${config.colorPattern.g}, ${config.colorPattern.b}, ${alpha.toFixed(2)})`;
                    layerElements.push({ type: 'star', x, y, size, color, parallax: config.parallaxFactor });
                } else if (config.elementType === 'nebula') {
                    const baseColor = config.colorOptions[Math.floor(Math.random() * config.colorOptions.length)];
                    color = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha.toFixed(2)})`;
                    const cloudParts = [];
                    for(let j = 0; j < (config.shapeComplexity || 1); j++) {
                        cloudParts.push({
                            offsetX: (Math.random() - 0.5) * size * 0.5, // Parts offset from main cloud x,y
                            offsetY: (Math.random() - 0.5) * size * 0.5,
                            partSize: size * (0.5 + Math.random() * 0.5) // Each part has varying size
                        });
                    }
                    layerElements.push({ type: 'nebula', x, y, baseSize: size, color, cloudParts, parallax: config.parallaxFactor });
                }
            }
            this.layers.push(layerElements);
        });
    }

    setZoomLevel(newZoomLevel) {
        // If zoom changes significantly, consider re-initializing for density.
        // For now, parallax effect in update handles visual scaling.
        if (Math.abs(this.currentZoomLevel - newZoomLevel) > 0.3) { // Example threshold
            // this.initBackgroundElements(newZoomLevel);
            // Debounce or make this less frequent if it causes performance hitches.
        }
        this.currentZoomLevel = newZoomLevel; // Store for potential re-init
    }

    update(deltaTime, gameZoomLevel) {
        const worldHeight = this.mainCanvas.height / gameZoomLevel;
        const worldWidth = this.mainCanvas.width / gameZoomLevel;

        this.layers.forEach(layerElements => {
            layerElements.forEach(element => {
                // Simple vertical parallax scroll for now
                element.y += (element.parallax * 50) * deltaTime; // Base speed * parallax * time

                if (element.y - (element.baseSize || element.size) > worldHeight) {
                    element.y = -(element.baseSize || element.size);
                    element.x = Math.random() * worldWidth;
                }
            });
        });
    }

    draw() {
        // Assumes main context is already scaled by gameZoomLevel
        this.layers.forEach(layerElements => {
            layerElements.forEach(element => {
                this.mainCtx.fillStyle = element.color;
                if (element.type === 'star') {
                    this.mainCtx.beginPath();
                    this.mainCtx.arc(element.x, element.y, element.size, 0, Math.PI * 2);
                    this.mainCtx.fill();
                } else if (element.type === 'nebula') {
                    // For a softer, more diffuse look, could use globalAlpha or filter
                    // const oldAlpha = this.mainCtx.globalAlpha;
                    // this.mainCtx.globalAlpha = parseFloat(element.color.split(',')[3] || '1)'); // Extract alpha
                    
                    element.cloudParts.forEach(part => {
                        this.mainCtx.beginPath();
                        this.mainCtx.arc(element.x + part.offsetX, element.y + part.offsetY, part.partSize, 0, Math.PI * 2);
                        this.mainCtx.fill();
                    });
                    // this.mainCtx.globalAlpha = oldAlpha;
                }
            });
        });
    }
}