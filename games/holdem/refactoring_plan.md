# Texas Hold'em Refactoring Plan for Reusability

**Overall Goal:** Decompose the existing HTML, CSS, and JavaScript in `games/holdem/index.html` into a modular structure to facilitate reuse of components for other card games (e.g., 21, Solitaire). This involves creating:
1.  **Common (Reusable) Components:** Logic and styles applicable to various card games.
2.  **Game-Specific Components:** Logic and styles unique to Texas Hold'em.

---

## I. Style Refactoring (CSS)

The current inline `<style>` block will be broken down into the following external CSS files:

*   **`games/common/css/common_styles.css`**:
    *   Basic body styles
    *   Layout helpers (e.g., `.game-container`)
    *   General UI elements (e.g., `.message-box`)
*   **`games/common/css/card_styles.css`**:
    *   All styles related to card appearance (e.g., `.card`, `.card.hidden`, `.card-top-left`, `.card-center-suit`).
*   **`games/common/css/table_styles.css`**:
    *   Generic styles for a game table or play area if applicable beyond poker (e.g., base styles for `.poker-table` if parts are reusable).
*   **`games/holdem/css/holdem_styles.css`**:
    *   Styles specific to Texas Hold'em (e.g., detailed `.poker-table` specifics, `.player-area` positioning for Hold'em, `.community-cards-area`, `.pot-area`, `.action-button` styling if not generic enough for common).

---

## II. Script Refactoring (JavaScript)

The current inline `<script>` block will be modularized using ES6 modules (`import`/`export`).

### A. Common Reusable Modules (to be placed under `games/common/js/`)

*   **`card.js`**:
    *   Define a `Card` class or factory function.
    *   Store constants like `SUITS` and `RANKS`.
*   **`deck.js`**:
    *   Define a `Deck` class or module.
    *   Include functions: `createDeck()`, `shuffleDeck()`, `dealCard()`.
*   **`player_base.js`**:
    *   Define a base `Player` class/module with common properties (ID, name, chips, hand).
    *   Basic methods for managing player state.
*   **`card_ui.js`**:
    *   Function: `createCardElement()`.
*   **`utils.js`**:
    *   General utility functions like `displayMessage()`.
    *   Could also include generic animation helpers.

### B. Texas Hold'em Specific Modules (to be placed under `games/holdem/js/`)

*   **`holdem_player.js`**:
    *   Extends or composes the base `Player` from `common/js/player_base.js`.
    *   Adds Hold'em specific properties (currentBet, folded, status, etc.).
    *   Manages Hold'em specific player UI updates.
*   **`holdem_game.js`**:
    *   Core Hold'em game logic: `NUM_PLAYERS`, `STARTING_CHIPS`, blind amounts.
    *   State management: `communityCards`, `pot`, `currentPlayerIndex`, `dealerButtonPosition`, `gamePhase`, `highestBetThisRound`, `playersInHand`.
    *   Game flow: `startNewHand()`, `postBlind()`, `dealHoleCards()`, betting rounds, `dealCommunityCards()`.
    *   AI logic: `aiAction()`.
    *   Hand evaluation: `evaluateHand()` (Hold'em specific), `getPlayerBestHand()`.
    *   Showdown: `handleShowdown()`, `awardPot()`.
*   **`holdem_ui.js`**:
    *   Manages Hold'em specific DOM elements.
    *   UI update functions specific to Hold'em: `updatePlayerUI()` (Hold'em parts), `updateCommunityCardsUI()`, `updatePotUI()`, `updateDealerButtonUI()`.
    *   Player action controls: `enablePlayerActions()`, `disablePlayerActions()`.
*   **`main.js` (Entry point for Hold'em):**
    *   Initializes the game (`gameInit()`).
    *   Sets up main event listeners (start game button, action buttons, slider).
    *   Imports and orchestrates the other Hold'em and common modules.

---

## III. HTML Structure (`games/holdem/index.html`)

*   The HTML body structure will largely remain the same.
*   Inline `<style>` and `<script>` tags will be removed.
*   The `<head>` will link to the new external CSS files.
*   The `<body>` will link to the new external JavaScript files (likely `games/holdem/js/main.js` as a module) at the end.

---

## IV. Proposed File Structure

```
games/
├── common/
│   ├── js/
│   │   ├── card.js
│   │   ├── deck.js
│   │   ├── player_base.js
│   │   ├── card_ui.js
│   │   └── utils.js
│   └── css/
│       ├── common_styles.css
│       ├── card_styles.css
│       └── table_styles.css
├── holdem/
│   ├── js/
│   │   ├── holdem_player.js
│   │   ├── holdem_game.js
│   │   ├── holdem_ui.js
│   │   └── main.js          // Entry point for Hold'em
│   ├── css/
│   │   └── holdem_styles.css
│   ├── index.html           // Updated Hold'em HTML
│   └── refactoring_plan.md  // This file
└── (Future games like twentyone/, solitaire/ would follow similar structure)
```

---

## V. Mermaid Diagram of Module Dependencies (Conceptual)

```mermaid
graph TD
    subgraph "Browser (games/holdem/index.html)"
        HTML_Structure["HTML Document"]
        Holdem_Main_JS["holdem/js/main.js"]
    end

    subgraph "Hold'em Specific Layer"
        Holdem_Game_JS["holdem/js/holdem_game.js"]
        Holdem_UI_JS["holdem/js/holdem_ui.js"]
        Holdem_Player_JS["holdem/js/holdem_player.js"]
        Holdem_CSS["holdem/css/holdem_styles.css"]
    end

    subgraph "Common Reusable Layer"
        C_Card_JS["common/js/card.js"]
        C_Deck_JS["common/js/deck.js"]
        C_Player_Base_JS["common/js/player_base.js"]
        C_Card_UI_JS["common/js/card_ui.js"]
        C_Utils_JS["common/js/utils.js"]
        C_Card_CSS["common/css/card_styles.css"]
        C_Table_CSS["common/css/table_styles.css"]
        C_Common_CSS["common/css/common_styles.css"]
    end

    HTML_Structure --> Holdem_Main_JS
    HTML_Structure -.-> Holdem_CSS
    HTML_Structure -.-> C_Card_CSS
    HTML_Structure -.-> C_Table_CSS
    HTML_Structure -.-> C_Common_CSS

    Holdem_Main_JS --> Holdem_Game_JS
    Holdem_Main_JS --> Holdem_UI_JS

    Holdem_Game_JS --> Holdem_Player_JS
    Holdem_Game_JS --> C_Deck_JS
    Holdem_Game_JS --> C_Utils_JS
    Holdem_Game_JS --> C_Card_UI_JS

    Holdem_UI_JS --> C_Card_UI_JS
    Holdem_UI_JS --> C_Utils_JS
    Holdem_UI_JS --> Holdem_Player_JS

    Holdem_Player_JS --> C_Player_Base_JS
    Holdem_Player_JS --> C_Card_JS

    C_Player_Base_JS --> C_Card_JS
    C_Deck_JS --> C_Card_JS