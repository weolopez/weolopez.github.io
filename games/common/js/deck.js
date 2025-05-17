import { SUITS, RANKS, createCard } from './card.js';

let deck = [];

/**
 * Creates a standard 52-card deck.
 * @returns {Array<object>} An array of card objects.
 */
export function createDeck() {
    deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push(createCard(suit, rank));
        }
    }
    return deck;
}

/**
 * Shuffles the deck using the Fisher-Yates algorithm.
 */
export function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

/**
 * Deals a card from the top of the deck.
 * @param {boolean} [hidden=false] - Whether the card should be initially hidden.
 * @returns {object|null} The card object, or null if the deck is empty.
 */
export function dealCard(hidden = false) {
    if (deck.length === 0) {
        console.error("Deck is empty!");
        return null;
    }
    const card = deck.pop();
    card.hidden = hidden;
    return card;
}

/**
 * Returns the current deck.
 * @returns {Array<object>} The array of card objects in the deck.
 */
export function getDeck() {
    return deck;
}