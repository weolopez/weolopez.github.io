/**
 * Creates a DOM element for a card.
 * @param {object} card - The card object (should have suit, rank, color, hidden properties).
 * @param {boolean} [isHiddenForPlayer=false] - Whether the card should be rendered as hidden,
 *                                              regardless of its own 'hidden' property.
 *                                              Useful for opponent hands.
 * @returns {HTMLElement} The card div element.
 */
export function createCardElement(card, isHiddenForPlayer = false) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card'); // Assumes 'card' class is defined in CSS

    if (isHiddenForPlayer || card.hidden) {
        cardDiv.classList.add('hidden'); // Assumes 'hidden' class for card back is in CSS
        // Optionally, add content for the card back if not purely CSS-driven
        // cardDiv.innerHTML = `<div>CARD BACK</div>`;
    } else {
        cardDiv.classList.add(card.color); // Assumes 'red' or 'black' class for text color

        // Structure for rank and suit (assumes specific CSS classes for positioning)
        const topLeft = document.createElement('div');
        topLeft.classList.add('card-top-left');
        topLeft.innerHTML = `<span class="rank">${card.rank}</span><span class="suit">${card.suit}</span>`;

        const centerSuit = document.createElement('div');
        centerSuit.classList.add('card-center-suit');
        centerSuit.textContent = card.suit;

        const bottomRight = document.createElement('div');
        bottomRight.classList.add('card-bottom-right');
        bottomRight.innerHTML = `<span class="rank">${card.rank}</span><span class="suit">${card.suit}</span>`;

        cardDiv.appendChild(topLeft);
        cardDiv.appendChild(centerSuit);
        cardDiv.appendChild(bottomRight);
    }
    return cardDiv;
}