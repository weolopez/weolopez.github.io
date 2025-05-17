import { initializeGame, startNewHand, handlePlayerAction, getGameStateForDebug } from './holdem_game.js';
import { displayMessage } from '../../common/js/utils.js';
import { updateAllPlayersUI, updatePotUI, disablePlayerActions, updateDealerButtonUI, updateCommunityCardsUI } from './holdem_ui.js';

// --- DOM Elements ---
// Grouping DOM elements for easier management and passing to modules
const domElements = {
    communityCardsDiv: document.getElementById('community-cards'),
    potDiv: document.getElementById('pot-area'),
    dealerButton: document.getElementById('dealer-button'),
    pokerTable: document.querySelector('.poker-table'), // Assuming only one poker table
    messageBox: document.getElementById('messageBox'),
    startGameButton: document.getElementById('startGameButtonGlobal'),
    actionControls: { // Group action controls for easier passing
        actionsDiv: document.getElementById('actions-area'),
        foldButton: document.getElementById('foldButton'),
        checkCallButton: document.getElementById('checkCallButton'),
        betRaiseButton: document.getElementById('betRaiseButton'),
        betRangeSlider: document.getElementById('betRangeSlider'),
        betAmountDisplay: document.getElementById('betAmountDisplay')
    },
    // Player-specific elements will be handled within HoldemPlayer class instances
};

// --- Event Listeners ---
if (domElements.startGameButton) {
    domElements.startGameButton.addEventListener('click', () => {
        displayMessage("Starting new game...", 1500, domElements.messageBox.id);
        // Initialize game will set up players. startNewHand will deal etc.
        initializeGame(domElements); // Pass all relevant DOM elements to the game logic
        startNewHand();
        domElements.startGameButton.style.display = 'none';
        domElements.startGameButton.textContent = "Start Game"; // Reset button text
    });
}

if (domElements.actionControls.foldButton) {
    domElements.actionControls.foldButton.addEventListener('click', () => {
        handlePlayerAction('fold');
    });
}

if (domElements.actionControls.checkCallButton) {
    domElements.actionControls.checkCallButton.addEventListener('click', () => {
        // Determine if it's a check or a call based on button text or game state
        const gameState = getGameStateForDebug(); // Get current game state
        const humanPlayer = gameState.playersInHand.find(p => p.isHuman && p.originalId === gameState.playersInHand[gameState.currentPlayerIndex]?.originalId);
        if (humanPlayer) {
            const amountToCall = gameState.highestBetThisRound - humanPlayer.currentBet;
            if (amountToCall > 0) {
                handlePlayerAction('call');
            } else {
                handlePlayerAction('check');
            }
        }
    });
}

if (domElements.actionControls.betRaiseButton) {
    domElements.actionControls.betRaiseButton.addEventListener('click', () => {
        const betValueTotal = parseInt(domElements.actionControls.betRangeSlider.value);
        const gameState = getGameStateForDebug();
        const actionType = gameState.highestBetThisRound > 0 ? 'raise' : 'bet';
        handlePlayerAction(actionType, betValueTotal);
    });
}

if (domElements.actionControls.betRangeSlider) {
    domElements.actionControls.betRangeSlider.addEventListener('input', () => {
        if (domElements.actionControls.betAmountDisplay) {
            domElements.actionControls.betAmountDisplay.textContent = domElements.actionControls.betRangeSlider.value;
        }
    });
}

// --- Initial Game Setup ---
function gameInit() {
    displayMessage("Welcome to Texas Hold'em! Click Start Game.", 5000, domElements.messageBox.id);
    
    // Initialize game state but don't start a hand yet.
    // `initializeGame` will create player objects and can do initial UI setup if needed.
    initializeGame(domElements); 

    // Initial UI state before game starts
    const initialGameState = getGameStateForDebug();
    updateAllPlayersUI(initialGameState.players, initialGameState.gamePhase); // Show players with initial chips
    updatePotUI(initialGameState.pot, domElements.potDiv);
    updateCommunityCardsUI(initialGameState.communityCards, domElements.communityCardsDiv);
    if (domElements.dealerButton) domElements.dealerButton.style.display = 'none';
    disablePlayerActions(domElements.actionControls); // Actions disabled until game starts
    
    if (domElements.startGameButton) {
        domElements.startGameButton.style.display = 'block'; // Ensure start button is visible
    }
}

// --- Start the game ---
// Ensure the DOM is fully loaded before trying to access elements and initialize the game.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', gameInit);
} else {
    gameInit(); // DOMContentLoaded has already fired
}