import { createDeck, shuffleDeck, dealCard as dealCardFromDeck } from '../../common/js/deck.js';
import { displayMessage, delay } from '../../common/js/utils.js';
import { HoldemPlayer } from './holdem_player.js';
import {
    updatePlayerUI,
    updateAllPlayersUI,
    updateCommunityCardsUI,
    updatePotUI,
    updateDealerButtonUI,
    enablePlayerActions,
    disablePlayerActions,
    dealAnimatedCardToPlayer,
    dealAnimatedCardToCommunity
} from './holdem_ui.js';

// --- Constants and Game State ---
const NUM_PLAYERS = 4;
const STARTING_CHIPS = 1000;
const SMALL_BLIND_AMOUNT = 10;
const BIG_BLIND_AMOUNT = 20;

let players = [];
let communityCards = [];
let pot = 0;
let currentPlayerIndex = 0; // Index within playersInHand array for current turn
let dealerButtonPosition = 0; // Index within the main `players` array
let bettingRoundInProgress = false;
let gamePhase = ''; // e.g., 'PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'
let highestBetThisRound = 0;
let playersInHand = []; // Players who haven't folded and still have chips for the current hand

// DOM elements will be passed from main.js or accessed via a shared state/config object
let domElements = {};

// --- Game Initialization and Management ---

export function initializeGame(uiElements) {
    domElements = uiElements;
    initializePlayers();
    dealerButtonPosition = players.length - 1; // So first hand dealer is player 0 (originalId)
    // UI updates will be called from main.js after initialization
}

function initializePlayers() {
    players = [];
    for (let i = 0; i < NUM_PLAYERS; i++) {
        // Passing originalId which is 'i' here for stable UI mapping
        const playerUIElements = {
            cardsDiv: document.getElementById(`player${i}-cards`),
            chipsDiv: document.getElementById(`player${i}-chips`),
            betDiv: document.getElementById(`player${i}-bet`),
            statusDiv: document.getElementById(`player${i}-status`),
            areaDiv: document.getElementById(`player${i}-area`)
        };
        players.push(new HoldemPlayer(
            i, // This 'id' can be the same as originalId if players array doesn't change order
            i === 0 ? "You" : `AI Player ${i + 1}`, // Name AI Players 1, 2, 3
            STARTING_CHIPS,
            i === 0,
            playerUIElements,
            i // originalId
        ));
    }
}

export async function startNewHand() {
    console.log("--- Starting New Hand ---");
    gamePhase = 'PREFLOP';
    communityCards = [];
    updateCommunityCardsUI(communityCards, domElements.communityCardsDiv);
    pot = 0;
    highestBetThisRound = 0;

    players.forEach(p => p.resetForNewHand()); // Resets hand, bets, folded status etc.

    playersInHand = players.filter(p => p.chips > 0 && !p.folded);

    if (playersInHand.length < 2) {
        const winner = playersInHand.length === 1 ? playersInHand[0].name : (players.find(p => p.chips > 0)?.name || "Someone");
        displayMessage(`${winner} wins the game! Not enough players. Reset Game.`, 5000, domElements.messageBox.id);
        disablePlayerActions(domElements.actionControls);
        if (domElements.startGameButton) {
            domElements.startGameButton.style.display = 'block';
            domElements.startGameButton.textContent = "Reset Game";
        }
        return;
    }

    createDeck();
    shuffleDeck();

    // Move dealer button (among all original players, skipping those with 0 chips)
    let potentialDealerIdx = dealerButtonPosition;
    if (players.length > 0) {
        do {
            potentialDealerIdx = (potentialDealerIdx + 1) % players.length;
        } while (players[potentialDealerIdx].chips === 0);
        dealerButtonPosition = potentialDealerIdx;
    }


    // Determine blinds. Blinds are posted by players in `playersInHand`.
    const dealerInHandIndex = playersInHand.findIndex(p => p.originalId === players[dealerButtonPosition].originalId);

    let sbPlayerInHand, bbPlayerInHand;

    if (playersInHand.length === 2) { // Heads up
        sbPlayerInHand = playersInHand[dealerInHandIndex];
        bbPlayerInHand = playersInHand[(dealerInHandIndex + 1) % 2];
        currentPlayerIndex = dealerInHandIndex; // SB (dealer) acts first pre-flop in HU
    } else {
        let sbIndex = (dealerInHandIndex + 1) % playersInHand.length;
        sbPlayerInHand = playersInHand[sbIndex];

        let bbIndex = (sbIndex + 1) % playersInHand.length;
        bbPlayerInHand = playersInHand[bbIndex];

        currentPlayerIndex = (bbIndex + 1) % playersInHand.length; // UTG
    }

    if (sbPlayerInHand) postBlind(sbPlayerInHand, SMALL_BLIND_AMOUNT, "Small Blind");
    if (bbPlayerInHand) postBlind(bbPlayerInHand, BIG_BLIND_AMOUNT, "Big Blind");
    highestBetThisRound = BIG_BLIND_AMOUNT;

    await dealHoleCards();

    updateAllUIState();
    displayMessage("New hand! Blinds posted. Pre-flop betting.", 2500, domElements.messageBox.id);
    startBettingRound();
}

function postBlind(player, amount, type) {
    if (!player || player.chips === 0) return;
    const blindAmount = Math.min(player.chips, amount);
    player.placeBet(blindAmount); // Uses HoldemPlayer's placeBet
    pot += blindAmount;
    player.lastAction = type;
    displayMessage(`${player.name} posts ${type} (${blindAmount})`, 1500, domElements.messageBox.id);
}

async function dealHoleCards() {
    console.log("Dealing hole cards...");
    let cardDealDelay = 50;

    const dealerInHandIndex = playersInHand.findIndex(p => p.originalId === players[dealerButtonPosition].originalId);
    const dealOrder = [];
    if (dealerInHandIndex !== -1) {
        for (let i = 0; i < playersInHand.length; i++) {
            dealOrder.push(playersInHand[(dealerInHandIndex + 1 + i) % playersInHand.length]);
        }
    } else {
        dealOrder.push(...playersInHand);
    }

    for (let i = 0; i < 2; i++) { // Two cards each
        for (const player of dealOrder) {
            if (player.chips > 0 && !player.folded) {
                const card = dealCardFromDeck(); // Common deck deals non-hidden by default
                if (card) {
                    // Animation needs player's areaDiv, cardsDiv, card data, index, hidden status, table element, delay
                    await dealAnimatedCardToPlayer(
                        player.ui.areaDiv,
                        player.ui.cardsDiv,
                        card,
                        player.hand.length, // card index in hand before adding
                        !player.isHuman,    // isHidden
                        domElements.pokerTable,
                        cardDealDelay
                    );
                    player.addCardToHand(card); // Add to player's logical hand
                    updatePlayerUI(player, gamePhase); // Update this player's UI immediately after animation resolves
                    cardDealDelay += 80;
                }
            }
        }
    }
}

async function dealCommunityCardsAnimated(numCards) {
    console.log(`Dealing ${numCards} community cards for ${gamePhase}`);
    if (dealCardFromDeck() && communityCards.length < 5) { /* Burn a card */ }

    let animationStartDelay = 100;
    for (let i = 0; i < numCards && communityCards.length < 5; i++) {
        const card = dealCardFromDeck();
        if (card) {
            await dealAnimatedCardToCommunity(
                domElements.communityCardsDiv,
                card,
                communityCards.length, // index in community cards before adding
                domElements.pokerTable,
                animationStartDelay
            );
            communityCards.push(card);
            updateCommunityCardsUI(communityCards, domElements.communityCardsDiv); // Update UI after animation
            animationStartDelay += 100;
            await delay(150); // Pause between community cards
        }
    }
}


function startBettingRound() {
    console.log(`Starting betting round: ${gamePhase}. Current player index (in playersInHand): ${currentPlayerIndex}`);
    bettingRoundInProgress = true;

    playersInHand.forEach(p => {
        if (!p.folded && !p.isAllIn) {
            p.hasActedThisRound = false;
        }
        if (gamePhase !== 'PREFLOP') { // For flop/turn/river, currentBet for the round resets
            p.currentBet = 0;
        }
    });

    if (gamePhase !== 'PREFLOP') {
        highestBetThisRound = 0; // Reset for new betting round post-flop
        const dealerInHandIdx = playersInHand.findIndex(p => p.originalId === players[dealerButtonPosition].originalId);
        currentPlayerIndex = (dealerInHandIdx + 1) % playersInHand.length; // Action starts left of dealer

        let attempts = 0; // Skip folded/all-in players
        while (playersInHand.length > 0 && (playersInHand[currentPlayerIndex].folded || (playersInHand[currentPlayerIndex].isAllIn && playersInHand[currentPlayerIndex].chips === 0)) && attempts < playersInHand.length) {
            currentPlayerIndex = (currentPlayerIndex + 1) % playersInHand.length;
            attempts++;
        }
        if (attempts >= playersInHand.length && playersInHand.some(p => p.folded || (p.isAllIn && p.chips === 0))) {
             // All remaining are folded or all-in and cannot act
            endBettingRound(); return;
        }
    }
    
    updateAllUIState(); // Includes highlighting current player
    nextPlayerAction();
}

function nextPlayerAction() {
    if (!bettingRoundInProgress) return;

    const unFoldedPlayers = playersInHand.filter(p => !p.folded);
    if (unFoldedPlayers.length <= 1) {
        endBettingRound(); return;
    }

    if (checkBettingRoundEnd()) {
        endBettingRound(); return;
    }

    if (currentPlayerIndex < 0 || currentPlayerIndex >= playersInHand.length) {
        currentPlayerIndex = 0; // Safety net
        if (playersInHand.length === 0) { endBettingRound(); return; } // No one left
    }
    
    let currentPlayer = playersInHand[currentPlayerIndex];
    let initialPlayerIndex = currentPlayerIndex;
    let safetyBreak = 0;

    // Find next active player
    while (currentPlayer.folded || (currentPlayer.isAllIn && currentPlayer.chips === 0)) {
        currentPlayerIndex = (currentPlayerIndex + 1) % playersInHand.length;
        currentPlayer = playersInHand[currentPlayerIndex];
        safetyBreak++;
        if (safetyBreak > playersInHand.length * 2) {
            console.error("Infinite loop in nextPlayerAction avoidance");
            endBettingRound(); return;
        }
        if (currentPlayerIndex === initialPlayerIndex && (currentPlayer.folded || (currentPlayer.isAllIn && currentPlayer.chips === 0))) {
            endBettingRound(); return; // Cycled through all, no one can act
        }
    }
    
    updateAllPlayersUI(players, gamePhase, currentPlayer); // Highlight current player

    if (currentPlayer.isHuman) {
        enablePlayerActions(currentPlayer, highestBetThisRound, BIG_BLIND_AMOUNT, domElements.actionControls);
    } else {
        disablePlayerActions(domElements.actionControls);
        setTimeout(() => aiAction(currentPlayer), 1200 + Math.random() * 800);
    }
}

function checkBettingRoundEnd() {
    const activePlayersThisRound = playersInHand.filter(p => !p.folded);
    if (activePlayersThisRound.length === 0) return true; // No one left to act

    // Everyone who can act has acted, and bets are matched or they are all-in for less.
    const allHaveActedOrAreAllInUnableToAct = activePlayersThisRound.every(p =>
        p.hasActedThisRound || (p.isAllIn && p.chips === 0) // All-in with no chips means they can't act further
    );
    if (!allHaveActedOrAreAllInUnableToAct) return false;

    const allBetsMatchedOrAllInForLess = activePlayersThisRound.every(p => {
        return p.currentBet === highestBetThisRound || (p.isAllIn && p.currentBet <= highestBetThisRound);
    });
    
    return allBetsMatchedOrAllInForLess;
}

async function endBettingRound() {
    console.log("Betting round ended for: " + gamePhase);
    bettingRoundInProgress = false;
    players.forEach(p => { if(p.ui && p.ui.areaDiv) p.ui.areaDiv.classList.remove('active'); });

    const remainingPlayersInHand = playersInHand.filter(p => !p.folded);
    if (remainingPlayersInHand.length === 1) {
        awardPot([remainingPlayersInHand[0]]); return;
    }
    
    const nonFoldedPlayers = playersInHand.filter(p => !p.folded);
    const allRemainingAreAllIn = nonFoldedPlayers.length > 0 && nonFoldedPlayers.every(p => p.isAllIn);

    if (allRemainingAreAllIn && nonFoldedPlayers.length > 1) {
        console.log("All remaining players are all-in. Dealing remaining cards.");
        if (gamePhase === 'PREFLOP') {
            await dealCommunityCardsAnimated(3); gamePhase = 'FLOP'; updateCommunityCardsUI(communityCards, domElements.communityCardsDiv); await delay(700);
        }
        if (gamePhase === 'FLOP') {
            await dealCommunityCardsAnimated(1); gamePhase = 'TURN'; updateCommunityCardsUI(communityCards, domElements.communityCardsDiv); await delay(700);
        }
        if (gamePhase === 'TURN') {
            await dealCommunityCardsAnimated(1); gamePhase = 'RIVER'; updateCommunityCardsUI(communityCards, domElements.communityCardsDiv); await delay(700);
        }
        gamePhase = 'SHOWDOWN';
        handleShowdown();
        return;
    }


    if (gamePhase === 'PREFLOP') gamePhase = 'FLOP';
    else if (gamePhase === 'FLOP') gamePhase = 'TURN';
    else if (gamePhase === 'TURN') gamePhase = 'RIVER';
    else if (gamePhase === 'RIVER') { gamePhase = 'SHOWDOWN'; handleShowdown(); return; }

    if (gamePhase !== 'SHOWDOWN') {
        if (gamePhase === 'FLOP') await dealCommunityCardsAnimated(3).then(startBettingRound);
        else if (gamePhase === 'TURN' || gamePhase === 'RIVER') await dealCommunityCardsAnimated(1).then(startBettingRound);
    }
}


// --- Player Actions ---
export function handlePlayerAction(actionType, amount = 0) {
    const humanPlayer = playersInHand.find(p => p.isHuman && p.originalId === playersInHand[currentPlayerIndex]?.originalId);
    if (humanPlayer) {
        playerActionLogic(humanPlayer, actionType, amount);
    }
    disablePlayerActions(domElements.actionControls);
}

function playerActionLogic(player, action, amount = 0) {
    if (!player || player.folded || (player.isAllIn && player.chips === 0 && action !== 'check' && action !== 'fold')) {
        if (!(player.isAllIn && action === 'check' && player.currentBet === highestBetThisRound)) {
            nextPlayerAction(); return;
        }
    }

    player.hasActedThisRound = true;
    player.lastAction = action;
    let actionText = "";

    if (action === 'fold') {
        player.folded = true;
        actionText = `${player.name} folds.`;
    } else if (action === 'check') {
        if (player.currentBet < highestBetThisRound && !player.isAllIn) {
            displayMessage("Invalid action: Must call, raise, or fold.", 2000, domElements.messageBox.id);
            player.hasActedThisRound = false; enablePlayerActions(player, highestBetThisRound, BIG_BLIND_AMOUNT, domElements.actionControls); return;
        }
        actionText = `${player.name} checks.`;
    } else if (action === 'call') {
        const amountToCall = highestBetThisRound - player.currentBet;
        const actualCallAmount = player.placeBet(amountToCall); // placeBet handles all-in
        pot += actualCallAmount;
        actionText = `${player.name} calls ${actualCallAmount}.`;
        if (player.isAllIn && actualCallAmount > 0) actionText += ` (All-in)`;
    } else if (action === 'bet' || action === 'raise') {
        const totalBetForPlayer = amount; // `amount` from slider is the total new bet for the player
        const additionalChipsNeeded = totalBetForPlayer - player.currentBet;

        if (additionalChipsNeeded <= 0 && action === 'raise') {
            displayMessage("Raise must be greater than current bet.", 2000, domElements.messageBox.id);
            player.hasActedThisRound = false; enablePlayerActions(player, highestBetThisRound, BIG_BLIND_AMOUNT, domElements.actionControls); return;
        }
        if (totalBetForPlayer < BIG_BLIND_AMOUNT && highestBetThisRound === 0) { // Min opening bet
            displayMessage(`Minimum bet is ${BIG_BLIND_AMOUNT}.`, 2000, domElements.messageBox.id);
            player.hasActedThisRound = false; enablePlayerActions(player, highestBetThisRound, BIG_BLIND_AMOUNT, domElements.actionControls); return;
        }
        
        const minRaiseTotal = highestBetThisRound + (player.lastRaiseAmount || BIG_BLIND_AMOUNT); // Simplified min raise rule
        if (action === 'raise' && totalBetForPlayer < minRaiseTotal && totalBetForPlayer < (player.chips + player.currentBet) ) { // Not all-in and less than min raise
            displayMessage(`Minimum raise to ${minRaiseTotal}. (Or All-in)`, 2500, domElements.messageBox.id);
            player.hasActedThisRound = false; enablePlayerActions(player, highestBetThisRound, BIG_BLIND_AMOUNT, domElements.actionControls); return;
        }

        const actualAmountBet = player.placeBet(additionalChipsNeeded); // placeBet handles chip deduction and all-in
        pot += actualAmountBet;
        actionText = `${player.name} ${action === 'bet' ? 'bets' : 'raises to'} ${player.currentBet}.`;
        if (player.isAllIn) actionText += ` (All-in)`;

        if (player.currentBet > highestBetThisRound) {
            player.lastRaiseAmount = player.currentBet - highestBetThisRound; // Store the raise delta
            highestBetThisRound = player.currentBet;
            // Reset hasActedThisRound for other players who are not folded or all-in
            playersInHand.forEach(p => { if (p.id !== player.id && !p.folded && !p.isAllIn) p.hasActedThisRound = false; });
        }
    }
    
    displayMessage(actionText, 2000, domElements.messageBox.id);
    updatePlayerUI(player, gamePhase);
    updatePotUI(pot, domElements.potDiv);
    
    const currentActorIndexInHand = playersInHand.findIndex(p => p.originalId === player.originalId);
    if (currentActorIndexInHand !== -1) {
        currentPlayerIndex = (currentActorIndexInHand + 1) % playersInHand.length;
    } else {
        currentPlayerIndex = (currentPlayerIndex + 1) % playersInHand.length; // Fallback
    }
    nextPlayerAction();
}

// --- AI Logic ---
function aiAction(player) {
    if (player.folded || (player.isAllIn && player.chips === 0)) { nextPlayerAction(); return; }

    const canCheck = player.currentBet === highestBetThisRound;
    const callAmount = highestBetThisRound - player.currentBet;
    const randomFactor = Math.random();
    let minNewBetTotal;
    if (highestBetThisRound > 0) {
        minNewBetTotal = highestBetThisRound + (player.lastRaiseAmount || BIG_BLIND_AMOUNT); // Min re-raise
    } else {
        minNewBetTotal = BIG_BLIND_AMOUNT; // Min opening bet
    }
    minNewBetTotal = Math.max(minNewBetTotal, BIG_BLIND_AMOUNT);


    // Basic AI: Player 2 (Aggressive), Others (Standard)
    if (player.name === "AI Player 2") { // Aggressive AI
        console.log("AI Player 2 (Aggressive) taking action...");
        if (canCheck) {
            if (randomFactor < 0.35) playerActionLogic(player, 'check');
            else {
                let betSize = Math.min(player.chips, Math.max(BIG_BLIND_AMOUNT * 2, Math.floor(pot * (0.4 + Math.random() * 0.6))));
                betSize = Math.max(betSize, minNewBetTotal);
                betSize = Math.min(betSize, player.chips + player.currentBet); // Total bet amount
                if (betSize > player.currentBet) playerActionLogic(player, 'bet', betSize); else playerActionLogic(player, 'check');
            }
        } else { // Must call, raise, or fold
            if (callAmount >= player.chips) playerActionLogic(player, 'call'); // Call all-in
            else if (randomFactor < 0.10 && callAmount > 0) playerActionLogic(player, 'fold');
            else if (randomFactor < 0.50 && player.chips >= (minNewBetTotal - player.currentBet) ) {
                let raiseTo = Math.min(player.chips + player.currentBet, minNewBetTotal + Math.floor(player.chips * Math.random() * 0.4));
                raiseTo = Math.max(raiseTo, minNewBetTotal);
                if (raiseTo > player.currentBet && (raiseTo - player.currentBet) <= player.chips) playerActionLogic(player, 'raise', raiseTo);
                else playerActionLogic(player, 'call');
            } else playerActionLogic(player, 'call');
        }
    } else { // Standard AI (Players 1 and 3)
        console.log(`${player.name} (Standard AI) taking action...`);
        if (canCheck) {
            if (randomFactor < 0.6) playerActionLogic(player, 'check');
            else {
                let betSize = Math.min(player.chips, Math.max(BIG_BLIND_AMOUNT, Math.floor(pot * (0.3 + Math.random() * 0.3))));
                betSize = Math.max(betSize, minNewBetTotal);
                betSize = Math.min(betSize, player.chips + player.currentBet);
                if (betSize > player.currentBet) playerActionLogic(player, 'bet', betSize); else playerActionLogic(player, 'check');
            }
        } else {
            if (callAmount >= player.chips) playerActionLogic(player, 'call');
            else if (callAmount > player.chips * 0.6 && randomFactor < 0.6) playerActionLogic(player, 'fold');
            else if (randomFactor < 0.15 && player.chips >= (minNewBetTotal - player.currentBet)) {
                let raiseTo = Math.min(player.chips + player.currentBet, minNewBetTotal + Math.floor(player.chips * Math.random() * 0.2));
                raiseTo = Math.max(raiseTo, minNewBetTotal);
                if (raiseTo > player.currentBet && (raiseTo - player.currentBet) <= player.chips) playerActionLogic(player, 'raise', raiseTo);
                else playerActionLogic(player, 'call');
            } else if (randomFactor < 0.80) playerActionLogic(player, 'call');
            else playerActionLogic(player, 'fold');
        }
    }
}

// --- Hand Evaluation (Placeholder - very basic) ---
function evaluateHand(handCards) { // handCards is an array of 5 to 7 cards
    if (!handCards || handCards.length < 5) return { rankValue: -1, name: "Not enough cards", cards: [], tieBreakerValue: 0 };
    
    const allCards = [...handCards].sort((a, b) => b.value - a.value); // Sort by card value desc

    // This is a highly simplified evaluation. A real one is much more complex.
    // For now, just find pairs, three of a kind, four of a kind.
    const counts = {};
    allCards.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);

    let bestRankValue = 0; // 0: High Card, 1: Pair, 2: Two Pair, 3: 3oaK, ... 8: Straight Flush
    let bestHandName = "High Card";
    let tieBreakerPrimary = allCards[0].value; // Default to highest card

    const ranksPresent = Object.keys(counts);
    let pairs = 0;
    let threeOfAKindRank = null;
    let fourOfAKindRank = null;

    for (const rank of ranksPresent) {
        if (counts[rank] === 4) {
            fourOfAKindRank = rank;
            bestRankValue = 7; bestHandName = "Four of a Kind";
            tieBreakerPrimary = players[0].hand.find(c => c.rank === rank)?.value || 0; // Value of the 4oak rank
            break;
        }
        if (counts[rank] === 3) threeOfAKindRank = rank;
        if (counts[rank] === 2) pairs++;
    }

    if (bestRankValue < 7) { // if not 4 of a kind
        if (threeOfAKindRank && pairs >= 1) { // Full House
            bestRankValue = 6; bestHandName = "Full House";
            tieBreakerPrimary = players[0].hand.find(c => c.rank === threeOfAKindRank)?.value || 0;
        } else if (threeOfAKindRank) { // Three of a Kind
            bestRankValue = 3; bestHandName = "Three of a Kind";
            tieBreakerPrimary = players[0].hand.find(c => c.rank === threeOfAKindRank)?.value || 0;
        } else if (pairs >= 2) { // Two Pair
            bestRankValue = 2; bestHandName = "Two Pair";
            // Simplified tie-breaker: highest pair rank value
            const pairRanks = ranksPresent.filter(r => counts[r] === 2).map(r => players[0].hand.find(c => c.rank === r)?.value || 0);
            tieBreakerPrimary = Math.max(...pairRanks);
        } else if (pairs === 1) { // One Pair
            bestRankValue = 1; bestHandName = "One Pair";
            const pairRank = ranksPresent.find(r => counts[r] === 2);
            tieBreakerPrimary = players[0].hand.find(c => c.rank === pairRank)?.value || 0;
        }
    }
    // TODO: Add flush, straight, straight flush detection

    return { rankValue: bestRankValue, name: bestHandName, cards: allCards.slice(0, 5), tieBreakerValue: tieBreakerPrimary };
}


function getPlayerBestHand(player) {
    if (player.folded) return null;
    const allCards = [...player.hand, ...communityCards];
    if (allCards.length < 5 && gamePhase !== 'PREFLOP' && gamePhase !== 'FLOP') return { rankValue: -1, name: "Not enough cards", cards: [] };
    if (allCards.length === 0) return { rankValue: -1, name: "No cards", cards: [] };
    
    // For Texas Hold'em, we need to find the best 5-card hand from 7 cards (2 hole + 5 community)
    // This requires iterating through all combinations of 5 cards from the available set.
    // The current `evaluateHand` is too simple for this.
    // For now, we'll pass all available cards to the simple evaluator.
    return evaluateHand(allCards);
}


// --- Showdown and Pot Awarding ---
function handleShowdown() {
    console.log("--- Showdown ---");
    gamePhase = 'SHOWDOWN'; bettingRoundInProgress = false;
    disablePlayerActions(domElements.actionControls);

    const playersInShowdown = playersInHand.filter(p => !p.folded);
    if (playersInShowdown.length === 0) { setTimeout(startNewHand, 3000); return; }
    if (playersInShowdown.length === 1) { awardPot([playersInShowdown[0]]); return; }

    displayMessage("Showdown! Revealing cards...", 2000, domElements.messageBox.id);
    playersInShowdown.forEach(p => { p.showCardsAfterFold = true; updatePlayerUI(p, gamePhase); });
    
    let winners = [];
    let bestHandSoFar = { rankValue: -1, name: "No Hand", cards: [], tieBreakerValue: 0 };

    playersInShowdown.forEach(player => {
        player.bestHandDetails = getPlayerBestHand(player); // Evaluate best 5-card hand
        if (player.bestHandDetails) {
            console.log(`${player.name} has ${player.bestHandDetails.name} (Rank: ${player.bestHandDetails.rankValue}, Tie: ${player.bestHandDetails.tieBreakerValue || 0})`);
            if (player.bestHandDetails.rankValue > bestHandSoFar.rankValue) {
                bestHandSoFar = player.bestHandDetails;
                winners = [player];
            } else if (player.bestHandDetails.rankValue === bestHandSoFar.rankValue) {
                if ((player.bestHandDetails.tieBreakerValue || 0) > (bestHandSoFar.tieBreakerValue || 0)) {
                    bestHandSoFar = player.bestHandDetails;
                    winners = [player];
                } else if ((player.bestHandDetails.tieBreakerValue || 0) === (bestHandSoFar.tieBreakerValue || 0)) {
                    // TODO: Implement full kicker comparison for true ties
                    winners.push(player); // Add to winners for potential split pot
                }
            }
        }
    });
    
    setTimeout(() => {
        if (winners.length > 0) {
            const winnerNames = winners.map(w => w.name).join(" & ");
            const winningHandName = bestHandSoFar.name;
            displayMessage(`${winnerNames} win(s) with ${winningHandName}!`, 5000, domElements.messageBox.id);
            awardPot(winners);
        } else {
            displayMessage("Error: No winner determined.", 3000, domElements.messageBox.id); setTimeout(startNewHand, 5000);
        }
    }, 1500);
}

function awardPot(winnerOrWinners) {
    let winnersArray = Array.isArray(winnerOrWinners) ? winnerOrWinners : [winnerOrWinners];
    if (winnersArray.length === 0) { setTimeout(startNewHand, 5000); return; }

    // Basic pot distribution. Does not handle side pots.
    const totalPotToDistribute = pot;
    const amountPerWinner = Math.floor(totalPotToDistribute / winnersArray.length);
    const remainder = totalPotToDistribute % winnersArray.length;

    winnersArray.forEach((winner, index) => {
        let winnings = amountPerWinner;
        if (index === 0 && remainder > 0) winnings += remainder; // Give remainder to first winner
        winner.updateChips(winnings);
        console.log(`${winner.name} awarded ${winnings} chips.`);
        updatePlayerUI(winner, gamePhase);
    });
    pot = 0;
    updatePotUI(pot, domElements.potDiv);
    setTimeout(startNewHand, 6000); // Delay before starting next hand
}

// --- UI Update Aggregator ---
function updateAllUIState() {
    const currentPlayerForHighlight = (bettingRoundInProgress && playersInHand.length > 0 && currentPlayerIndex < playersInHand.length)
        ? playersInHand[currentPlayerIndex]
        : null;
    updateAllPlayersUI(players, gamePhase, currentPlayerForHighlight);
    updateCommunityCardsUI(communityCards, domElements.communityCardsDiv);
    updatePotUI(pot, domElements.potDiv);
    if (players.length > 0 && dealerButtonPosition >= 0 && dealerButtonPosition < players.length) {
        updateDealerButtonUI(players[dealerButtonPosition], players, domElements.dealerButton, domElements.pokerTable);
    } else if (domElements.dealerButton) {
        domElements.dealerButton.style.display = 'none';
    }
}

export function getGameStateForDebug() {
    return {
        players, communityCards, pot, currentPlayerIndex, dealerButtonPosition,
        bettingRoundInProgress, gamePhase, highestBetThisRound, playersInHand
    };
}