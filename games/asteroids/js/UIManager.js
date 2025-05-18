// UIManager.js
// Manages drawing and interaction for UI screens (menus, HUD, etc.)

export class UIManager {
    constructor(canvas, shipsImage, audioManager) {
        this.canvas = canvas;
        // this.ctx = canvas.getContext('2d'); // Renderer will pass ctx during draw calls
        this.shipsImage = shipsImage; // For ship selection screen
        this.audioManager = audioManager;
        // currentShipSelectionIndex is now managed by GameManager.
        // UIManager receives it as a parameter for drawing.
    }

    // Called by GameManager if UIManager needs to react to updates or handle complex UI state.
    // For now, most UI input directly influences GameManager state, which then tells UIManager what to draw.
    update(inputManager, gameManager) {
        // const currentState = gameManager.getCurrentState();
        // Example: if UIManager had its own animations or complex transitions:
        // if (currentState === gameManager.GameState.SOME_UI_WITH_ANIMATION) {
        //     this.updateMyAnimationLogic(inputManager.deltaTime); // Assuming deltaTime is passed
        // }

        // The ship selection input logic previously here is now handled by GameManager
        // listening to InputManager events.
    }


    drawCurrentUI(ctx, gameManager) {
        const state = gameManager.getCurrentState();
        // Ensure transform is reset for UI drawing (Renderer should do this before calling this)
        // ctx.setTransform(1, 0, 0, 1, 0, 0); 

        switch (state) {
            case gameManager.GameState.SHIP_SELECTION:
                this.drawShipSelection(ctx, gameManager.getSelectablePlayerShips(), gameManager.getCurrentShipSelectionIndex());
                break;
            // TITLE_SCREEN case removed as it's combined with SHIP_SELECTION
            case gameManager.GameState.PLAYER_DIED_CHOICE:
                this.drawPlayerDiedChoice(ctx, gameManager.getLives());
                break;
            case gameManager.GameState.GAME_OVER:
                this.drawGameOver(ctx, gameManager.getScore());
                break;
            case gameManager.GameState.PAUSED:
                this.drawPauseScreen(ctx);
                // HUD is also drawn when paused
                this.drawHUD(ctx, gameManager.getScore(), gameManager.getLives(), gameManager.getPlayerShip());
                break;
            case gameManager.GameState.PLAYING:
                this.drawHUD(ctx, gameManager.getScore(), gameManager.getLives(), gameManager.getPlayerShip());
                break;
        }
    }

    drawShipSelection(ctx, selectableShips, currentSelectionIndex) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.font = 'bold 60px Arial'; // Game Title
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('ASTEROIDS', this.canvas.width / 2, 80);

        ctx.font = 'bold 36px Arial'; // Sub-title for ship selection
        ctx.fillStyle = 'lightgrey';
        ctx.fillText('SELECT YOUR SHIP', this.canvas.width / 2, 130);

        const listX = this.canvas.width * 0.15;
        const detailX = this.canvas.width * 0.65;
        const selectionItemHeight = 50; // Reduced slightly for tighter packing
        const titleFontSize = 28;
        const shipNameFontSize = 24;
        const detailsFontSize = 17;
        const descriptionFontSize = 14;
        const lineSpacing = 6; // Extra spacing between lines of text

        const actualSelectableShips = selectableShips;
        const shipListItemsHeight = actualSelectableShips.length * selectionItemHeight;
        
        // Total height of the list block (ship items)
        // No separate title, "PLAYER SHIP" is the first item from actualSelectableShips.
        const totalListBlockHeight = shipListItemsHeight;
        // Starting Y for the entire block of ship names to be centered
        let listBlockStartY = (this.canvas.height - totalListBlockHeight) / 2;
        
        // Y position for the first actual ship name in the list
        let currentListY = listBlockStartY;

        // --- Y position for the top of the ship details section ---
        // Align the top of the details with the top of the list block
        let detailY = listBlockStartY;

        // --- Draw selectable ship names ---
        actualSelectableShips.forEach((shipSpriteData, index) => {
            const yPosName = currentListY + (index * selectionItemHeight) + (shipNameFontSize * 0.7); // Centering text in item height
            ctx.textAlign = 'left';

            if (index === currentSelectionIndex) {
                ctx.fillStyle = 'yellow';
                ctx.font = `bold ${shipNameFontSize}px Arial`;
                // Draw selection indicator "▶" next to the selected ship name
                ctx.fillText(`▶ ${shipSpriteData.name.replace(/_/g, ' ').toUpperCase()}`, listX - 30, yPosName);

                // --- Draw details for the currently selected ship ---
                let currentDetailY = detailY; // Use the aligned detailY as starting point for this ship's details

                if (this.shipsImage.complete && this.shipsImage.naturalWidth !== 0 && shipSpriteData.src === './ships.png') {
                    const previewScale = 1.8;
                    const previewWidth = shipSpriteData.width * previewScale;
                    const previewHeight = shipSpriteData.height * previewScale;
                    ctx.drawImage(this.shipsImage, shipSpriteData.sx, shipSpriteData.sy, shipSpriteData.sWidth, shipSpriteData.sHeight,
                        detailX - previewWidth / 2, detailY, previewWidth, previewHeight);
                    detailY += previewHeight + (lineSpacing * 2); // Add some space after image
                } else {
                     // If no image, ensure detailY still advances to keep attribute alignment consistent
                    detailY += (shipSpriteData.height * 1.8) + (lineSpacing * 2); // Approximate height of preview image area
                }
                
                ctx.font = `${detailsFontSize}px Arial`;
                ctx.fillStyle = 'cyan';
                const attrStartX = detailX - (200 / 2); // Center the attributes block
                ctx.textAlign = 'left';
                ctx.fillText(`Health: ${shipSpriteData.health}`, attrStartX, detailY); detailY += detailsFontSize + lineSpacing;
                ctx.fillText(`Max Speed: ${shipSpriteData.max_speed}`, attrStartX, detailY); detailY += detailsFontSize + lineSpacing;
                ctx.fillText(`Thrust: ${shipSpriteData.thrust}`, attrStartX, detailY); detailY += detailsFontSize + lineSpacing;
                ctx.fillText(`Agility: ${shipSpriteData.rotationSpeed.toFixed(2)}`, attrStartX, detailY); detailY += detailsFontSize + lineSpacing;
                const defaultWpn = shipSpriteData.weapons.find(w => w.type === shipSpriteData.defaultWeaponType);
                ctx.fillText(`Weapon: ${defaultWpn ? defaultWpn.name : shipSpriteData.defaultWeaponType}`, attrStartX, detailY); detailY += detailsFontSize + lineSpacing * 2;
                
                ctx.fillStyle = 'lightgray';
                ctx.font = `${descriptionFontSize}px Arial`;
                const description = shipSpriteData.description || "No description.";
                const maxDescWidth = 200; // Adjusted width for description
                const words = description.split(' ');
                let line = '';
                for(let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    let metrics = ctx.measureText(testLine);
                    if (metrics.width > maxDescWidth && n > 0) {
                        ctx.fillText(line, attrStartX, detailY);
                        line = words[n] + ' ';
                        detailY += descriptionFontSize + lineSpacing / 2; // Tighter line spacing for description
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, attrStartX, detailY);

            } else { // Non-selected ship names
                ctx.fillStyle = 'grey';
                ctx.font = `${shipNameFontSize}px Arial`;
                ctx.fillText(shipSpriteData.name.replace(/_/g, ' ').toUpperCase(), listX, yPosName);
            }
        });

        ctx.textAlign = 'center';
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Use Arrows to Select, Enter or Space to Start', this.canvas.width / 2, this.canvas.height - 40);
    }

    // drawTitleScreen(ctx) method removed as it's no longer a separate state.

    drawPlayerDiedChoice(ctx, lives) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'orange';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED!', this.canvas.width / 2, this.canvas.height / 2 - 100);
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`Lives Remaining: ${lives}`, this.canvas.width / 2, this.canvas.height / 2 - 30);
        ctx.font = '24px Arial';
        ctx.fillText('Press R to Respawn', this.canvas.width / 2, this.canvas.height / 2 + 40);
        ctx.fillText('Press E to End Game', this.canvas.width / 2, this.canvas.height / 2 + 80);
    }

    drawGameOver(ctx, score) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.font = '60px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`Final Score: ${score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        ctx.font = '24px Arial';
        ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 70);
    }

    drawPauseScreen(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Press P or Esc to Resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }

    drawHUD(ctx, score, lives, playerShip) {
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${score}`, 20, 30);
        ctx.fillText(`Lives: ${lives}`, 20, 60);

        if (playerShip && playerShip.isShieldActive) {
            ctx.fillStyle = 'cyan';
            ctx.fillText(`Shield: ${Math.ceil(playerShip.shieldTimer)}s`, 20, 90);
        }
        // Add weapon display if needed
        // if (playerShip && playerShip.currentWeapon) {
        //     ctx.fillText(`Weapon: ${playerShip.currentWeapon.name}`, 20, 120);
        // }
    }
}