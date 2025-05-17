export const SUITS = ["♠", "♥", "♦", "♣"];
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

/**
 * Creates a card object.
 * @param {string} suit - The suit of the card (e.g., "♠", "♥").
 * @param {string} rank - The rank of the card (e.g., "A", "K", "2").
 * @returns {object} A card object with suit, rank, value, and color.
 */
export function createCard(suit, rank) {
    let numericValue = parseInt(rank);
    if (rank === "T") numericValue = 10;
    else if (rank === "J") numericValue = 11;
    else if (rank === "Q") numericValue = 12;
    else if (rank === "K") numericValue = 13;
    else if (rank === "A") numericValue = 14; // Ace high for evaluation purposes

    return {
        suit,
        rank,
        value: numericValue,
        color: (suit === "♥" || suit === "♦") ? 'red' : 'black',
        hidden: false // Default to not hidden
    };
}