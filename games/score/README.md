# Score Components

A flexible, reusable set of web components for keeping score in multi-player games. Built with vanilla JavaScript and Web Components standards.

## Components

### Score Component (`<score-component>`)
The main scoring interface with player sections, score tracking, and dealer functionality.

### Score Toolbar (`<score-toolbar>`)
A separate toolbar component with Next Round and Reset buttons that can be connected to any score component.

## Features

- **Configurable Players**: Support for 2-8 players with customizable names and colors
- **Dealer Tracking**: Optional dealer puck that rotates between players
- **Running Totals**: Track both current round scores and cumulative totals
- **Touch-Friendly**: Hold-to-increment/decrement functionality for mobile devices
- **Responsive Design**: Adapts to different screen sizes
- **Custom Events**: Emits events for score changes, round completion, and game resets
- **Programmatic API**: Control the component via JavaScript methods
- **Flexible Styling**: Multiple color themes and customizable appearance
- **Modular Design**: Separate toolbar component for flexible layouts

## Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        .app-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        score-component { flex: 1; }
    </style>
</head>
<body>
    <div class="app-container">
        <score-component
            id="scoreKeeper"
            num-players="3"
            player-names="Alice,Bob,Charlie"
            player-colors="sky,rose,emerald">
        </score-component>
        
        <score-toolbar id="toolbar"></score-toolbar>
    </div>
    
    <script src="score-component.js"></script>
    <script src="score-toolbar.js"></script>
    <script>
        // Connect toolbar to score component
        const scoreKeeper = document.getElementById('scoreKeeper');
        const toolbar = document.getElementById('toolbar');
        
        toolbar.addEventListener('next-round-clicked', () => {
            scoreKeeper.processNextRound();
        });
        
        toolbar.addEventListener('reset-clicked', () => {
            scoreKeeper.resetGame();
        });
    </script>
</body>
</html>
```

## HTML Attributes

### Score Component (`<score-component>`)

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `num-players` | number | `3` | Number of players (2-8) |
| `player-names` | string | `"Team 1,Team 2,Team 3"` | Comma-separated player names |
| `player-colors` | string | `"sky,rose,emerald"` | Comma-separated color themes |
| `show-dealer` | boolean | `true` | Show/hide dealer puck |
| `show-running-total` | boolean | `true` | Show/hide running totals |
| `max-name-length` | number | `15` | Maximum characters for player names |
| `allow-negative-scores` | boolean | `false` | Allow scores to go below zero |

### Score Toolbar (`<score-toolbar>`)

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `show-next-round` | boolean | `true` | Show/hide Next Round button |
| `show-reset` | boolean | `true` | Show/hide Reset button |
| `next-round-text` | string | `"Next Round"` | Text for Next Round button |
| `reset-text` | string | `"Reset All"` | Text for Reset button |
| `orientation` | string | `"horizontal"` | Layout orientation: "horizontal" or "vertical" |

### Available Colors

- `sky` (blue)
- `rose` (pink/red)
- `emerald` (green)
- `purple`
- `orange`
- `teal`
- `indigo`
- `pink`

## Custom Events

The component emits the following custom events:

### `score-changed`
Fired when a player's score changes.
```javascript
scoreComponent.addEventListener('score-changed', (event) => {
    console.log(event.detail);
    // {
    //   playerId: 1,
    //   currentScore: 5,
    //   runningTotal: 15,
    //   action: 'increment' | 'decrement' | 'set'
    // }
});
```

### `next-round`
Fired when a round is completed.
```javascript
scoreComponent.addEventListener('next-round', (event) => {
    console.log(event.detail);
    // {
    //   players: [...],
    //   currentDealer: 2
    // }
});
```

### `game-reset`
Fired when the game is reset.
```javascript
scoreComponent.addEventListener('game-reset', (event) => {
    console.log(event.detail);
    // {
    //   players: [...]
    // }
});
```

### `dealer-changed`
Fired when the dealer changes.
```javascript
scoreComponent.addEventListener('dealer-changed', (event) => {
    console.log(event.detail);
    // {
    //   currentDealer: 3
    // }
});
```

### `player-name-changed`
Fired when a player's name is modified.
```javascript
scoreComponent.addEventListener('player-name-changed', (event) => {
    console.log(event.detail);
    // {
    //   playerId: 1,
    //   name: "New Name"
    // }
});
```

### Score Toolbar Events

The toolbar component emits the following custom events:

### `next-round-clicked`
Fired when the Next Round button is clicked.
```javascript
toolbar.addEventListener('next-round-clicked', (event) => {
    console.log(event.detail);
    // {
    //   timestamp: 1234567890
    // }
});
```

### `reset-clicked`
Fired when the Reset button is clicked.
```javascript
toolbar.addEventListener('reset-clicked', (event) => {
    console.log(event.detail);
    // {
    //   timestamp: 1234567890
    // }
});
```

## JavaScript API

### Methods

#### `incrementScore(playerId)`
Increment a player's current score.
```javascript
scoreComponent.incrementScore(1); // Increment player 1's score
```

#### `decrementScore(playerId)`
Decrement a player's current score.
```javascript
scoreComponent.decrementScore(2); // Decrement player 2's score
```

#### `setPlayerScore(playerId, score)`
Set a player's current score to a specific value.
```javascript
scoreComponent.setPlayerScore(1, 10); // Set player 1's score to 10
```

#### `getPlayerScore(playerId)`
Get a player's current score.
```javascript
const score = scoreComponent.getPlayerScore(1); // Returns current score
```

#### `getPlayerTotal(playerId)`
Get a player's running total.
```javascript
const total = scoreComponent.getPlayerTotal(1); // Returns running total
```

#### `processNextRound()`
Complete the current round (adds current scores to totals, resets current scores).
```javascript
scoreComponent.processNextRound();
```

#### `resetGame()`
Reset all scores and player names to defaults.
```javascript
scoreComponent.resetGame();
```

#### `moveDealerPuck(playerId)`
Move the dealer puck to a specific player.
```javascript
scoreComponent.moveDealerPuck(2); // Make player 2 the dealer
```

#### `getGameState()`
Get the complete current game state.
```javascript
const state = scoreComponent.getGameState();
// Returns:
// {
//   players: [
//     { id: 1, name: "Alice", currentScore: 5, runningTotal: 15, color: "sky" },
//     ...
//   ],
//   currentDealer: 2,
//   config: { ... }
// }
```

#### `setGameState(gameState)`
Restore a previously saved game state.
```javascript
scoreComponent.setGameState(savedState);
```

### Score Toolbar Methods

#### `enableNextRound()` / `disableNextRound()`
Enable or disable the Next Round button.
```javascript
toolbar.enableNextRound();
toolbar.disableNextRound();
```

#### `enableReset()` / `disableReset()`
Enable or disable the Reset button.
```javascript
toolbar.enableReset();
toolbar.disableReset();
```

#### `setNextRoundText(text)` / `setResetText(text)`
Change the button text dynamically.
```javascript
toolbar.setNextRoundText("End Round");
toolbar.setResetText("New Game");
```

#### `showNextRound()` / `hideNextRound()`
Show or hide the Next Round button.
```javascript
toolbar.showNextRound();
toolbar.hideNextRound();
```

#### `showReset()` / `hideReset()`
Show or hide the Reset button.
```javascript
toolbar.showReset();
toolbar.hideReset();
```

## Configuration Examples

### Simple 2-Player Game
```html
<score-component 
    num-players="2"
    player-names="Player 1,Player 2"
    show-dealer="false"
    show-running-total="false">
</score-component>
```

### 4-Player Tournament
```html
<score-component 
    num-players="4"
    player-names="North,South,East,West"
    player-colors="teal,indigo,pink,orange"
    allow-negative-scores="true">
</score-component>
```

### Card Game with Dealer
```html
<score-component 
    num-players="5"
    player-names="Alice,Bob,Charlie,Diana,Eve"
    player-colors="sky,rose,emerald,purple,orange"
    show-dealer="true"
    max-name-length="10">
</score-component>
```

## Advanced Usage

### Saving/Loading Game State
```javascript
// Save game state to localStorage
const saveGame = () => {
    const state = scoreComponent.getGameState();
    localStorage.setItem('gameState', JSON.stringify(state));
};

// Load game state from localStorage
const loadGame = () => {
    const saved = localStorage.getItem('gameState');
    if (saved) {
        scoreComponent.setGameState(JSON.parse(saved));
    }
};

// Auto-save on score changes
scoreComponent.addEventListener('score-changed', saveGame);
scoreComponent.addEventListener('next-round', saveGame);
```

### Custom Scoring Logic
```javascript
// Add bonus points for winning a round
scoreComponent.addEventListener('next-round', (event) => {
    const players = event.detail.players;
    const winner = players.reduce((prev, current) => 
        prev.currentScore > current.currentScore ? prev : current
    );
    
    // Add bonus to winner's total
    const currentTotal = scoreComponent.getPlayerTotal(winner.id);
    scoreComponent.setPlayerScore(winner.id, 0); // Reset current
    // Note: You'd need to manually update running total for bonus points
});
```

### Integration with Analytics
```javascript
scoreComponent.addEventListener('score-changed', (event) => {
    // Track scoring patterns
    analytics.track('score_changed', {
        player: event.detail.playerId,
        action: event.detail.action,
        score: event.detail.currentScore
    });
});

scoreComponent.addEventListener('game-reset', () => {
    analytics.track('game_reset');
});
```

## Browser Support

- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

Requires support for:
- Custom Elements v1
- Shadow DOM v1
- ES6 Classes

## Files

- `score-component.js` - Main score tracking web component
- `score-toolbar.js` - Toolbar web component with Next Round and Reset buttons
- `index.html` - Basic implementation example using both components
- `examples.html` - Multiple configuration examples
- `README.md` - This documentation

## License

MIT License - feel free to use in your projects!