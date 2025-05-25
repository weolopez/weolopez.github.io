### Plan for Overlay Chat UI Implementation

The goal is to create a chat interface that overlays the existing game, accessible via the `Ctrl + Space` hotkey combination.

#### 1. Project Structure and File Creation

We will create new files to encapsulate the chat UI's structure, styling, and logic, keeping the codebase organized.

*   **`src/ui/chat-ui.html`**: This file will define the HTML structure of the chat interface, including a message display area, an input field, and a send button.
*   **`src/ui/chat-ui.css`**: This file will contain the CSS rules for styling the chat interface. It will ensure the chat UI overlays the game, handles its visibility (hidden by default), and provides a clean, functional appearance.
*   **`src/ui/chat-ui.js`**: This JavaScript module will manage the chat UI's behavior. It will include:
    *   Event listeners for the `Ctrl + Space` hotkey to toggle visibility.
    *   Functions to send and display messages (initially, this can be a simple local message display).
    *   Logic to prevent hotkey interference when the chat input is focused.

#### 2. Integration into `index.html`

The main `index.html` file will be updated to include the new chat UI.

*   The content of `src/ui/chat-ui.html` will be embedded directly into `index.html` or loaded dynamically (embedding is simpler for now).
*   A `<link>` tag for `src/ui/chat-ui.css` will be added to the `<head>`.
*   A `<script type="module">` tag for `src/ui/chat-ui.js` will be added before the closing `</body>` tag.

#### 3. Styling Considerations

*   The `chat-ui.css` will use `position: fixed`, `top`, `left`, `width`, `height`, and `z-index` properties to ensure it overlays the entire page.
*   Initial `display: none;` will hide the chat UI until the hotkey is pressed.
*   Transitions for smooth appearance/disappearance will be considered.

#### 4. Hotkey and Input Handling

*   The `chat-ui.js` will listen for `keydown` events on the `document`.
*   When `Ctrl + Space` is detected, it will toggle a CSS class on the chat UI container to change its `display` property.
*   When the chat input field is focused, the hotkey listener will be temporarily disabled to allow normal typing.

#### 5. Message Handling (Initial)

*   For the initial implementation, messages sent via the input field will simply be appended to the message display area.
*   Future enhancements could involve integrating with a backend for actual multi-user chat or AI interaction.

#### Component Interaction Diagram

```mermaid
graph TD
    A[index.html] --> B(styles.css)
    A --> C(src/map.js)
    A --> D(src/mini-map.js)
    A --> E(src/dungeon-map.js)
    A --> F(src/player.js)
    A --> G(src/legend.js)
    A --> H(wc/github-auth.js)
    A -- "Embeds HTML" --> I(src/ui/chat-ui.html)
    A -- "Links CSS" --> J(src/ui/chat-ui.css)
    A -- "Links JS Module" --> K(src/ui/chat-ui.js)

    K -- "Toggles Visibility (Ctrl+Space)" --> J
    K -- "Appends Messages" --> I