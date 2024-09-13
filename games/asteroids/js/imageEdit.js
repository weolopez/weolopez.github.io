import { Sprites } from './sprites.js';

let sprites = new Sprites();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let shipImage = new Image();
// shipImage.src = "./roids.png"; // Path to the uploaded image
shipImage.src = "./ships.png"; // Path to the uploaded image

let rect = {
    x: (canvas.width - 300) / 2,
    y: (canvas.height - 300) / 2,
    width: 300,
    height: 300,
    dragging: false
};

shipImage.onload = function() {
    gameLoop();
};

    ctx.scale(.3,.3)
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the full image on the canvas
    ctx.drawImage(shipImage, 0, 0, shipImage.width, shipImage.height);
    
    // Draw the rectangle at its current position
    ctx.strokeStyle = 'red'; // Set the color of the rectangle
    ctx.lineWidth = 2; // Set the width of the rectangle's border
    // Draw the rectangle
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    
    // Set the fill style to white
    ctx.fillStyle = 'white';
    
    // Display the rectangle values
    ctx.fillText(`x: ${rect.x}`, rect.x, rect.y - 10);
    ctx.fillText(`y: ${rect.y}`, rect.x, rect.y + rect.height + 20);
    ctx.fillText(`width: ${rect.width}`, rect.x + rect.width + 10, rect.y + rect.height / 2);
    ctx.fillText(`height: ${rect.height}`, rect.x + rect.width + 10, rect.y + rect.height / 2 + 20);
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousedown', (e) => {
    const mouseX = e.clientX - canvas.offsetLeft;
    const mouseY = e.clientY - canvas.offsetTop;
    
    if (mouseX > rect.x && mouseX < rect.x + rect.width && mouseY > rect.y && mouseY < rect.y + rect.height) {
        rect.dragging = true;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (rect.dragging) {
        const mouseX = e.clientX - canvas.offsetLeft;
        const mouseY = e.clientY - canvas.offsetTop;
        
        rect.x = mouseX - rect.width / 2;
        rect.y = mouseY - rect.height / 2;
    }
});

canvas.addEventListener('mouseup', () => {
    rect.dragging = false;
});

let spaceship = {
    momentumX: 0,
    momentumY: 0,
    angle: 0,
    speed: 1,
    rotationSpeed: 0,
    shoot: function() {
        console.log("Shoot!");
    }
};


document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') {
        rect.height += 5;
    }
    if (e.code === 'ArrowDown') {
        rect.height -= 5;
    }
    if (e.code === 'ArrowLeft') {
        rect.width -= 5;
    }
    if (e.code === 'ArrowRight') {
        rect.width += 5;
    }
    drawRect();
});

document.getElementById('gameCanvas').addEventListener('click', () => {
    const rectProperties = `x: ${rect.x}, y: ${rect.y}, width: ${rect.width}, height: ${rect.height}`;
    navigator.clipboard.writeText(rectProperties).then(() => {
        console.log('Rectangle properties copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
});