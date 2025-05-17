import { createCardElement } from '../../common/js/card_ui.js';
import { delay } from '../../common/js/utils.js';

// --- DOM Elements (Game-specific, fetched as needed or passed in) ---
// It's often better to pass these as arguments to functions or store them in a game state object
// rather than querying them globally here, but for now, we'll list some key ones.
// const communityCardsDiv = document.getElementById('community-cards'); // Will be passed or accessed via game state
// const potDiv = document.getElementById('pot-area');
// const dealerButtonElement = document.getElementById('dealer-button');
// const actionsDiv = document.getElementById('actions-area');
// const foldButton = document.getElementById('foldButton');
// const checkCallButton = document.getElementById('checkCallButton');
// const betRaiseButton = document.getElementById('betRaiseButton');
// const betRangeSlider = document.getElementById('betRangeSlider');
// const betAmountDisplay = document.getElementById('betAmountDisplay');


/**
 * Updates the UI for a single Hold'em player.
 * @param {HoldemPlayer} player - The player object.
 * @param {string} gamePhase - The current phase of the game (e.g., 'SHOWDOWN').
 */
export function updatePlayerUI(player, gamePhase) {
    if (!player || !player.ui) {
        console.warn("updatePlayerUI: Player or player.ui is undefined", player);
        return;
    }
    if (player.ui.chipsDiv) player.ui.chipsDiv.textContent = `Chips: ${player.chips}`;
    if (player.ui.betDiv) player.ui.betDiv.textContent = player.currentBet > 0 ? `Bet: ${player.currentBet}` : "";

    if (player.ui.statusDiv) {
        player.ui.statusDiv.textContent = "";
        if (player.folded) player.ui.statusDiv.textContent = "Folded";
        else if (player.isAllIn) player.ui.statusDiv.textContent = "All-in";
        // else if (player.lastAction) player.ui.statusDiv.textContent = player.lastAction; // Optional: display last action
    }

    if (player.ui.cardsDiv) {
        player.ui.cardsDiv.innerHTML = '';
        if (player.hand.length > 0) {
            player.hand.forEach(card => {
                // Showdown reveals all, otherwise hide non-human player cards unless they folded and need to show
                const isHidden = !player.isHuman && gamePhase !== 'SHOWDOWN' && !player.showCardsAfterFold;
                const cardElement = createCardElement(card, isHidden);
                player.ui.cardsDiv.appendChild(cardElement);
            });
        } else if (!player.isHuman && gamePhase !== 'SHOWDOWN' && !player.folded) {
            // If hand is empty for an AI player not in showdown and not folded, show two card backs.
            // This assumes 2 hole cards are expected.
            for (let i = 0; i < 2; i++) {
                // createCardElement handles a minimal/dummy card object if isHiddenForPlayer is true.
                const cardElement = createCardElement({}, true); // Pass dummy card, force hidden
                player.ui.cardsDiv.appendChild(cardElement);
            }
        }
    }
}

/**
 * Updates the UI for all players.
 * @param {Array<HoldemPlayer>} players - Array of all player objects.
 * @param {string} gamePhase - The current phase of the game.
 * @param {HoldemPlayer} [currentPlayer=null] - The current player to highlight.
 */
export function updateAllPlayersUI(players, gamePhase, currentPlayer = null) {
    players.forEach(p => updatePlayerUI(p, gamePhase));

    // Highlight current player
    players.forEach(p => {
        if (p.ui && p.ui.areaDiv) {
            p.ui.areaDiv.classList.remove('active');
        }
    });
    if (currentPlayer && currentPlayer.ui && currentPlayer.ui.areaDiv && !currentPlayer.folded && !currentPlayer.isAllIn) {
        currentPlayer.ui.areaDiv.classList.add('active');
    }
}

/**
 * Updates the community cards display.
 * @param {Array<object>} communityCardsData - Array of community card objects.
 * @param {HTMLElement} communityCardsDiv - The DOM element for community cards.
 */
export function updateCommunityCardsUI(communityCardsData, communityCardsDiv) {
    if (!communityCardsDiv) return;
    communityCardsDiv.innerHTML = '';
    communityCardsData.forEach(card => {
        const cardElement = createCardElement(card);
        communityCardsDiv.appendChild(cardElement);
    });
}

/**
 * Updates the pot display.
 * @param {number} potAmount - The current pot amount.
 * @param {HTMLElement} potDiv - The DOM element for the pot.
 */
export function updatePotUI(potAmount, potDiv) {
    if (potDiv) potDiv.textContent = `Pot: ${potAmount}`;
}

/**
 * Updates the position of the dealer button.
 * @param {HoldemPlayer} dealerPlayer - The player object who is the current dealer.
 * @param {Array<HoldemPlayer>} allPlayers - Array of all player objects for position reference.
 * @param {HTMLElement} dealerButtonElement - The dealer button DOM element.
 * @param {HTMLElement} pokerTableElement - The poker table DOM element.
 */
export function updateDealerButtonUI(dealerPlayer, allPlayers, dealerButtonElement, pokerTableElement) {
    if (!dealerPlayer || !dealerPlayer.ui || !dealerPlayer.ui.areaDiv || !dealerButtonElement || !pokerTableElement) {
        if (dealerButtonElement) dealerButtonElement.style.display = 'none';
        return;
    }
    dealerButtonElement.style.display = 'flex';

    const dealerPlayerArea = dealerPlayer.ui.areaDiv;
    // const dealerRect = dealerPlayerArea.getBoundingClientRect(); // Using offsetTop/Left for relative positioning
    // const tableRect = pokerTableElement.getBoundingClientRect();

    let top = dealerPlayerArea.offsetTop;
    let left = dealerPlayerArea.offsetLeft;
    const buttonSize = dealerButtonElement.offsetWidth || 28; // Use actual size or default
    const offset = 8;

    // Positioning logic based on player's originalId (assuming fixed positions)
    switch (dealerPlayer.originalId) {
        case 0: // Human Player (Bottom)
            top = dealerPlayerArea.offsetTop + dealerPlayerArea.offsetHeight - (buttonSize / 2);
            left = dealerPlayerArea.offsetLeft + dealerPlayerArea.offsetWidth / 2 - (buttonSize / 2);
            break;
        case 1: // AI 1 (Left)
            top = dealerPlayerArea.offsetTop + dealerPlayerArea.offsetHeight / 2 - (buttonSize / 2);
            left = dealerPlayerArea.offsetLeft - buttonSize - offset;
            break;
        case 2: // AI 2 (Top)
            top = dealerPlayerArea.offsetTop - buttonSize - offset;
            left = dealerPlayerArea.offsetLeft + dealerPlayerArea.offsetWidth / 2 - (buttonSize / 2);
            break;
        case 3: // AI 3 (Right)
            top = dealerPlayerArea.offsetTop + dealerPlayerArea.offsetHeight / 2 - (buttonSize / 2);
            left = dealerPlayerArea.offsetLeft + dealerPlayerArea.offsetWidth + offset;
            break;
        default:
            // Default position or hide if not a recognized player position
            dealerButtonElement.style.display = 'none';
            return;
    }

    dealerButtonElement.style.top = `${top}px`;
    dealerButtonElement.style.left = `${left}px`;
}


/**
 * Enables player action buttons and sets up the bet slider.
 * @param {HoldemPlayer} player - The current human player.
 * @param {number} highestBetThisRound - The highest bet made in the current round.
 * @param {number} bigBlindAmount - The amount of the big blind.
 * @param {object} domElements - Object containing relevant DOM elements (foldButton, checkCallButton, etc.)
 */
export function enablePlayerActions(player, highestBetThisRound, bigBlindAmount, domElements) {
    const { foldButton, checkCallButton, betRaiseButton, betRangeSlider, betAmountDisplay } = domElements;

    if (!player || player.folded || (player.isAllIn && player.chips === 0)) {
        disablePlayerActions(domElements);
        return;
    }

    foldButton.disabled = false;
    const amountToCall = highestBetThisRound - player.currentBet;

    if (amountToCall > 0) {
        checkCallButton.textContent = `Call ${amountToCall}`;
        checkCallButton.classList.replace('bg-blue-500', 'bg-yellow-500'); // Assuming Tailwind classes
        checkCallButton.classList.replace('hover:bg-blue-600', 'hover:bg-yellow-600');
        betRaiseButton.textContent = 'Raise';
    } else {
        checkCallButton.textContent = 'Check';
        checkCallButton.classList.replace('bg-yellow-500', 'bg-blue-500');
        checkCallButton.classList.replace('hover:bg-yellow-600', 'hover:bg-blue-600');
        betRaiseButton.textContent = 'Bet';
    }
    checkCallButton.disabled = false;

    let minNewBetTotal;
    if (highestBetThisRound > 0) { // Facing a bet/raise
        minNewBetTotal = highestBetThisRound + Math.max(bigBlindAmount, player.lastRaiseAmount || bigBlindAmount);
        minNewBetTotal = Math.min(minNewBetTotal, player.chips + player.currentBet); // Cannot be more than all-in
    } else { // Opening bet
        minNewBetTotal = bigBlindAmount;
    }
    minNewBetTotal = Math.max(minNewBetTotal, bigBlindAmount); // Absolute min is BB

    const maxNewBetTotal = player.chips + player.currentBet; // All-in amount

    betRangeSlider.min = String(Math.min(minNewBetTotal, maxNewBetTotal)); // Slider values are strings
    betRangeSlider.max = String(maxNewBetTotal);

    let defaultSliderValue = Math.max(minNewBetTotal, player.currentBet + bigBlindAmount);
    defaultSliderValue = Math.min(defaultSliderValue, maxNewBetTotal);
    betRangeSlider.value = String(defaultSliderValue);
    betAmountDisplay.textContent = betRangeSlider.value;

    const canBetOrRaise = player.chips > 0 && maxNewBetTotal >= minNewBetTotal && maxNewBetTotal > player.currentBet;
    betRaiseButton.disabled = !canBetOrRaise;
    betRangeSlider.disabled = !canBetOrRaise;
}

/**
 * Disables all player action buttons.
 * @param {object} domElements - Object containing relevant DOM elements
 */
export function disablePlayerActions(domElements) {
    const { foldButton, checkCallButton, betRaiseButton, betRangeSlider } = domElements;
    foldButton.disabled = true;
    checkCallButton.disabled = true;
    checkCallButton.textContent = 'Check';
    checkCallButton.classList.replace('bg-yellow-500', 'bg-blue-500');
    checkCallButton.classList.replace('hover:bg-yellow-600', 'hover:bg-blue-600');
    betRaiseButton.disabled = true;
    betRaiseButton.textContent = 'Bet';
    betRangeSlider.disabled = true;
}


/**
 * Animates a card dealing from table center to a target area (player hand or community area).
 * @param {HTMLElement} targetPlayerAreaDiv - The player's specific area div (e.g., player.ui.areaDiv).
 * @param {HTMLElement} targetCardsDiv - The div where the card element should visually end up (e.g., player.ui.cardsDiv or communityCardsDiv).
 * @param {object} cardData - The card data object.
 * @param {number} cardIndexInHand - The index this card will have in the target hand (for positioning).
 * @param {boolean} isHidden - Whether the card should be rendered as hidden.
 * @param {HTMLElement} pokerTableElement - The main poker table element for coordinate calculations.
 * @param {number} animationDelay - Delay before starting this specific card's animation.
 * @returns {Promise<void>}
 */
export async function dealAnimatedCardToPlayer(targetPlayerAreaDiv, targetCardsDiv, cardData, cardIndexInHand, isHidden, pokerTableElement, animationDelay) {
    const cardElement = createCardElement(cardData, isHidden);
    cardElement.classList.add('card-deal-animation'); // From card_styles.css

    const tableRect = pokerTableElement.getBoundingClientRect();
    const cardWidth = 55; // Should ideally get from CSS or cardElement.offsetWidth after render
    const cardHeight = 85; // Should ideally get from CSS
    const cardGap = 6;

    // Initial position: center of the table
    cardElement.style.left = `${pokerTableElement.offsetWidth / 2 - cardWidth / 2}px`;
    cardElement.style.top = `${pokerTableElement.offsetHeight / 2 - cardHeight / 2}px`;
    cardElement.style.transform = 'scale(0.5) rotateY(180deg)';
    cardElement.style.opacity = '0';
    pokerTableElement.appendChild(cardElement);

    // Target position: within the targetCardsDiv of the player
    // We need the position of targetCardsDiv relative to the pokerTableElement
    const targetCardsRect = targetCardsDiv.getBoundingClientRect();
    const targetX = targetCardsRect.left - tableRect.left + (cardIndexInHand * (cardWidth + cardGap));
    const targetY = targetCardsRect.top - tableRect.top;

    await delay(animationDelay); // Initial delay before animation starts

    cardElement.style.opacity = '1';
    cardElement.style.left = `${targetX}px`;
    cardElement.style.top = `${targetY}px`;
    cardElement.style.transform = 'scale(1) rotateY(0deg)';

    await delay(500); // Duration of the animation itself

    if (pokerTableElement.contains(cardElement)) {
        pokerTableElement.removeChild(cardElement);
    }
    // The actual card will be added to player.hand and re-rendered by updatePlayerUI later
}

/**
 * Animates a card dealing to the community card area.
 * @param {HTMLElement} communityCardsDiv - The DOM element for community cards.
 * @param {object} cardData - The card data object.
 * @param {number} cardIndexInCommunity - The index this card will have in the community cards.
 * @param {HTMLElement} pokerTableElement - The main poker table element.
 * @param {number} animationDelay - Delay before this animation starts.
 * @returns {Promise<void>}
 */
export async function dealAnimatedCardToCommunity(communityCardsDiv, cardData, cardIndexInCommunity, pokerTableElement, animationDelay) {
    const cardElement = createCardElement(cardData, false); // Community cards are never hidden initially
    cardElement.classList.add('card-deal-animation');

    const tableRect = pokerTableElement.getBoundingClientRect();
    const cardWidth = 55;
    const cardHeight = 85;
    const cardGap = 8; // Gap for community cards

    cardElement.style.left = `${pokerTableElement.offsetWidth / 2 - cardWidth / 2}px`;
    cardElement.style.top = `${pokerTableElement.offsetHeight / 2 - cardHeight / 2}px`;
    cardElement.style.transform = 'scale(0.5) rotateY(180deg)';
    cardElement.style.opacity = '0';
    pokerTableElement.appendChild(cardElement);

    const communityRect = communityCardsDiv.getBoundingClientRect();
    // Calculate target X based on existing cards in communityCardsDiv to append
    // This is a simplified positioning; real layout might be more complex
    const targetX = communityRect.left - tableRect.left + (cardIndexInCommunity * (cardWidth + cardGap));
    const targetY = communityRect.top - tableRect.top;


    await delay(animationDelay);

    cardElement.style.opacity = '1';
    cardElement.style.left = `${targetX}px`;
    cardElement.style.top = `${targetY}px`;
    cardElement.style.transform = 'scale(1) rotateY(0deg)';

    await delay(500); // Animation duration

    if (pokerTableElement.contains(cardElement)) {
        pokerTableElement.removeChild(cardElement);
    }
    // The actual card will be added to communityCards array and re-rendered by updateCommunityCardsUI
}