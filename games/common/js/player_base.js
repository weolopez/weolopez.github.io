/**
 * Represents a base player in a card game.
 */
export class PlayerBase {
    /**
     * Creates a new player.
     * @param {number|string} id - The unique identifier for the player.
     * @param {string} name - The name of the player.
     * @param {number} initialChips - The starting amount of chips for the player.
     * @param {boolean} [isHuman=false] - Whether the player is human-controlled.
     */
    constructor(id, name, initialChips, isHuman = false) {
        this.id = id;
        this.name = name;
        this.chips = initialChips;
        this.hand = [];
        this.isHuman = isHuman;
        this.folded = false; // Common state, can be overridden or extended
        this.isAllIn = false; // Common state
        this.lastAction = null; // Common state
    }

    /**
     * Adds a card to the player's hand.
     * @param {object} card - The card object to add.
     */
    addCardToHand(card) {
        this.hand.push(card);
    }

    /**
     * Clears the player's hand.
     */
    clearHand() {
        this.hand = [];
    }

    /**
     * Updates the player's chip count.
     * @param {number} amount - The amount to add (positive) or subtract (negative).
     */
    updateChips(amount) {
        this.chips += amount;
        if (this.chips < 0) {
            this.chips = 0; // Player cannot have negative chips
        }
    }

    /**
     * Resets player state for a new hand/round.
     * @param {number} [startingChips] - Optional new starting chips amount.
     */
    resetForNewHand(startingChips) {
        this.clearHand();
        this.folded = false;
        this.isAllIn = false;
        this.lastAction = null;
        if (typeof startingChips === 'number') {
            this.chips = startingChips;
        }
        // Game-specific properties like currentBet, totalBetInPotThisHand
        // should be reset in the derived class.
    }
}