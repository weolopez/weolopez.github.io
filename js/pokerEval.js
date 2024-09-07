function getAllPossibleHands(cards) {
    const combinations = [];
    const n = cards.length;

    function combine(start, chosen) {
        if (chosen.length === 5) {
            combinations.push([...chosen]);
            return;
        }
        for (let i = start; i < n; i++) {
            chosen.push(cards[i]);
            combine(i + 1, chosen);
            chosen.pop();
        }
    }

    combine(0, []);
    return combinations;
}

function evaluateFiveCardHand(hand) {
    const ranks = '23456789TJQKA';

    // Helper function to get rank and suit of a card
    function getRank(card) {
        return ranks.indexOf(card[0]);
    }

    const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];

    function getSuit(card) {
        const suit = card.split(" of ")[1];
        return suits.indexOf(suit);
    }

    // Sort the hand by rank
    hand.sort((a, b) => getRank(a) - getRank(b));

    // Check for flush only if hand has 5 cards and each card is the same suit
    const isFlush = hand.length === 5 && hand.every(card => getSuit(card) === getSuit(hand[0]));

    // Check for straight
    const isStraight = hand.every((card, i) => i === 0 || getRank(card) === getRank(hand[i - 1]) + 1);

    // Check for straight with Ace low
    const isAceLowStraight = hand[0][0] === '2' && hand[1][0] === '3' && hand[2][0] === '4' && hand[3][0] === '5' && hand[4][0] === 'A';

    // Count occurrences of each rank
    const rankCounts = {};
    hand.forEach(card => {
        const rank = card[0];
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });

    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    // Determine hand type
    if (isFlush && isStraight) {
        return { rank: 9, description: "Straight Flush" };
    } else if (counts[0] === 4) {
        return { rank: 8, description: "Four of a Kind" };
    } else if (counts[0] === 3 && counts[1] === 2) {
        return { rank: 7, description: "Full House" };
    } else if (isFlush) {
        console.log(hand);
        return { rank: 6, description: "Flush" };
    } else if (isStraight || isAceLowStraight) {
        return { rank: 5, description: "Straight" };
    } else if (counts[0] === 3) {
        return { rank: 4, description: "Three of a Kind" };
    } else if (counts[0] === 2 && counts[1] === 2) {
        return { rank: 3, description: "Two Pair" };
    } else if (counts[0] === 2) {
        return { rank: 2, description: "One Pair" };
    } else {
        return { rank: 1, description: "High Card" };
    }
}

export { getAllPossibleHands, evaluateFiveCardHand };