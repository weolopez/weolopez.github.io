// given
// dungeon[y][x].type = 'floor';
const dungeon = window.dungeon;
function findRandomFloorLocation() {
    let x, y;
    do {
        x = Math.floor(Math.random() * dungeon[0].length);
        y = Math.floor(Math.random() * dungeon.length);
    } while (dungeon[y][x].type !== 'floor');
    return { x, y };
}

const randomFloorLocation = findRandomFloorLocation();
console.log(randomFloorLocation);


let character = {
    x: randomFloorLocation.x,
    y: randomFloorLocation.y,
};
// add to character an svg icon
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('width', '20');
svg.setAttribute('height', '20');
svg.setAttribute('viewBox', '0 0 100 100');
svg.innerHTML = `
    <circle cx="50" cy="50" r="45" fill="yellow" />
    <path d="M50,50 L50,5 A45,45 0 0,1 95,50 z" fill="black" transform="rotate(45, 50, 50)" />
`;
character.direction = 'East'
character.svg = svg;
svg.style.position = 'absolute';
svg.style.left = `${character.x * 20+10}px`;
svg.style.top = `${character.y * 20+10}px`;
svg.style.zIndex = '10';
gameDiv.appendChild(svg);

function moveCharacter(dx, dy) {
    // Check if the new position is a floor tile
    // if (dungeon[character.y + dy][character.x + dx].type === 'floor') {
    //     //remove the character from the current position
    //     character.x += dx;
    //     character.y += dy;
    //     svg.style.left = `${character.x * 20}px`;
    //     svg.style.top = `${character.y * 20}px`;
    // }
    const newX = character.x + dx;
    const newY = character.y + dy;

    if (newX >= 0 && newX < dungeon[0].length && newY >= 0 && newY < dungeon.length && dungeon[newY][newX].type === 'floor') {
        character.x = newX;
        character.y = newY;
        svg.style.left = `${character.x * 20+10}px`;
        svg.style.top = `${character.y * 20+10}px`;
        console.log(`Character moved to (${character.x}, ${character.y})`);
        let tilesInFront = [];
        for (let i = 1; i <= 5; i++) {
            let frontX = character.x;
            let frontY = character.y;
            if (character.direction === 'East') frontX += i;
            else if (character.direction === 'North') frontY -= i;
            else if (character.direction === 'West') frontX -= i;
            else if (character.direction === 'South') frontY += i;

            if (frontX >= 0 && frontX < dungeon[0].length && frontY >= 0 && frontY < dungeon.length) {
            tilesInFront.push({
                x: frontX,
                y: frontY,
                type: dungeon[frontY][frontX].type,
                theme: dungeon[frontY][frontX].theme
            });
            } else {
            break;
            }
        }
        console.log('Next 5 tiles in front:', tilesInFront);
        const description = `You are in a dungeon Next 5 tiles in front of you is described as ${JSON.stringify(tilesInFront)})`;
        window.systemPrompt = 
        `You are a Dungeon Master. Describe the scene based on the following details: ${description}.`
        
    }
}

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            if (character.direction === 'East') moveCharacter(1, 0);
            else if (character.direction === 'North') moveCharacter(0, -1);
            else if (character.direction === 'West') moveCharacter(-1, 0);
            else if (character.direction === 'South') moveCharacter(0, 1);
            break;
        case 'ArrowDown':
            if (character.direction === 'East') moveCharacter(-1, 0);
            else if (character.direction === 'North') moveCharacter(0, 1);
            else if (character.direction === 'West') moveCharacter(1, 0);
            else if (character.direction === 'South') moveCharacter(0, -1);
            break;
        case 'ArrowLeft':
            if (character.direction === 'East') character.direction = 'North';
            else if (character.direction === 'North') character.direction = 'West';
            else if (character.direction === 'West') character.direction = 'South';
            else if (character.direction === 'South') character.direction = 'East';
            svg.style.transform = `rotate(${(parseInt(svg.style.transform.replace('rotate(', '').replace('deg)', '')) || 0) - 90}deg)`;
            break;
        case 'ArrowRight':
            if (character.direction === 'East') character.direction = 'South';
            else if (character.direction === 'South') character.direction = 'West';
            else if (character.direction === 'West') character.direction = 'North';
            else if (character.direction === 'North') character.direction = 'East';
            svg.style.transform = `rotate(${(parseInt(svg.style.transform.replace('rotate(', '').replace('deg)', '')) || 0) + 90}deg)`;
            break;
        case '/':
            {
                const spinner = document.createElement('div');
                spinner.style.position = 'fixed';
                spinner.style.top = '50%';
                spinner.style.left = '50%';
                spinner.style.transform = 'translate(-50%, -50%)';
                spinner.style.border = '16px solid #f3f3f3';
                spinner.style.borderTop = '16px solid #3498db';
                spinner.style.borderRadius = '50%';
                spinner.style.width = '120px';
                spinner.style.height = '120px';
                spinner.style.animation = 'spin 2s linear infinite';
                document.body.appendChild(spinner);

                const style = document.createElement('style');
                style.innerHTML = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }`;
                document.head.appendChild(style);

                getOpenAIResponse(window.systemPrompt, "create a prompt for a text to image generator").then(response => {
                    console.log(response);
                    generateImage(response).then(url => {
                        document.body.removeChild(spinner);
                        // display the image url as a popover and a click anywhere hides it
                        const body = document.querySelector('body');
                        const popover = document.createElement('div');
                        popover.style.position = 'fixed';
                        popover.style.top = '50%';
                        popover.style.left = '50%';
                        popover.style.transform = 'translate(-50%, -50%)';
                        popover.style.backgroundColor = 'white';
                        popover.style.padding = '20px';
                        const img = document.createElement('img');
                        img.src = url;
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '100%';
                        popover.appendChild(img);
                        body.appendChild(popover);

                        popover.addEventListener('click', () => {
                            body.removeChild(popover);
                        });
                    });
                });
            getOpenAIResponse(window.systemPrompt, "create a prompt for a text to image generator").then(response => {
                    console.log(response)
                generateImage(response).then(url => { 
                    // display the image url as a popover and a click anywhere hides it
                    const body = document.querySelector('body');
                    const popover = document.createElement('div');
                    popover.style.position = 'fixed';
                    popover.style.top = '50%';
                    popover.style.left = '50%';
                    popover.style.transform = 'translate(-50%, -50%)';
                    popover.style.backgroundColor = 'white';
                    popover.style.padding = '20px';
                    const img = document.createElement('img');
                    img.src = url;
                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '100%';
                    popover.appendChild(img);
                    body.appendChild(popover);

                    popover.addEventListener('click', () => {
                        body.removeChild(popover);
                    });
                })
            });
        }
    }
});