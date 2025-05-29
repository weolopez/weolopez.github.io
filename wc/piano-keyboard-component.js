const WHITE_KEY_WIDTH_PX = 50;
const BLACK_KEY_WIDTH_PX = 30;
const BLACK_KEY_HEIGHT_PERCENT = 60;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_TYPES = {
    'C': 'white', 'C#': 'black', 'D': 'white', 'D#': 'black', 'E': 'white',
    'F': 'white', 'F#': 'black', 'G': 'white', 'G#': 'black', 'A': 'white',
    'A#': 'black', 'B': 'white'
};

const DESKTOP_KEY_MAP = {
    // White keys (middle C = C4)
    'KeyA': { note: 'C', octave: 4, id: 'C4' },
    'KeyS': { note: 'D', octave: 4, id: 'D4' },
    'KeyD': { note: 'E', octave: 4, id: 'E4' },
    'KeyF': { note: 'F', octave: 4, id: 'F4' },
    'KeyG': { note: 'G', octave: 4, id: 'G4' },
    'KeyH': { note: 'A', octave: 4, id: 'A4' },
    'KeyJ': { note: 'B', octave: 4, id: 'B4' },
    'KeyK': { note: 'C', octave: 5, id: 'C5' },
    'KeyL': { note: 'D', octave: 5, id: 'D5' },
    'Semicolon': { note: 'E', octave: 5, id: 'E5' },

    // Black keys
    'KeyW': { note: 'C#', octave: 4, id: 'C#4' },
    'KeyE': { note: 'D#', octave: 4, id: 'D#4' },
    // 'KeyR': (E4 is white)
    'KeyT': { note: 'F#', octave: 4, id: 'F#4' },
    'KeyY': { note: 'G#', octave: 4, id: 'G#4' },
    'KeyU': { note: 'A#', octave: 4, id: 'A#4' },
    // 'KeyI': (B4 is white)
    'KeyO': { note: 'C#', octave: 5, id: 'C#5' },
    'KeyP': { note: 'D#', octave: 5, id: 'D#5' },
};


class PianoKeyboard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._pianoKeysData = this._generatePianoKeys();
        this._pressedDesktopKeys = new Set(); // Tracks active desktop key codes
        this._activePointerIds = new Map(); // Tracks pointerId -> keyElement
    }

    _generatePianoKeys() {
        const keys = [];
        // Standard 88-key piano starts at A0 and ends at C8
        // A0, A#0, B0
        keys.push({ note: 'A', octave: 0, type: 'white', id: 'A0' });
        keys.push({ note: 'A#', octave: 0, type: 'black', id: 'A#0' });
        keys.push({ note: 'B', octave: 0, type: 'white', id: 'B0' });

        // Octaves C1 through B7
        for (let octave = 1; octave <= 7; octave++) {
            for (const noteName of NOTE_NAMES) {
                keys.push({ note: noteName, octave: octave, type: NOTE_TYPES[noteName], id: `${noteName}${octave}` });
            }
        }
        // C8
        keys.push({ note: 'C', octave: 8, type: 'white', id: 'C8' });
        return keys;
    }

    connectedCallback() {
        this._render();
        this._addEventListeners();
        // Scroll to middle C (C4) approximately
        this.scrollToKey('C4');
    }

    disconnectedCallback() {
        this._removeEventListeners();
    }
    
    scrollToKey(keyId) {
        if (!this.shadowRoot) return;
        const scrollWrapper = this.shadowRoot.getElementById('scroll-wrapper');
        const keyElement = this.shadowRoot.querySelector(`.key[data-note-id="${keyId}"]`);
        if (scrollWrapper && keyElement) {
            const keyRect = keyElement.getBoundingClientRect();
            const wrapperRect = scrollWrapper.getBoundingClientRect();
            // Calculate scroll position to center the key, or bring it into view
            const scrollLeft = keyElement.offsetLeft - (wrapperRect.width / 2) + (keyRect.width / 2);
            scrollWrapper.scrollLeft = Math.max(0, scrollLeft);
        }
    }

    _render() {
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 100%;
                height: 200px; /* Default height, can be overridden */
                overflow: hidden;
                font-family: 'Inter', sans-serif;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                border-radius: inherit; /* Inherit border-radius from host */
            }
            #scroll-wrapper {
                width: 100%;
                height: 100%;
                overflow-x: auto;
                overflow-y: hidden;
                background-color: #444; /* Background behind keys */
                -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
                scrollbar-width: thin;
                scrollbar-color: #888 #555;
                border-radius: inherit; /* Inherit border-radius */
            }
            #keys-area {
                position: relative; /* Crucial for absolute positioning of keys */
                height: 100%;
                /* Width is set dynamically based on number of white keys */
            }
            .key {
                position: absolute;
                top: 0;
                box-sizing: border-box;
                cursor: pointer;
                border-radius: 0 0 5px 5px; /* Rounded bottom corners for all keys */
                transition: background-color 0.05s ease-out, transform 0.05s ease-out;
                display: flex; /* For potential inner content, like note names (not used now) */
                align-items: flex-end;
                justify-content: center;
                padding-bottom: 5px; /* Space for note names if ever added */
                font-size: 0.7em;
                color: #777;
            }
            .key.white {
                background-color: #ffffff;
                border: 1px solid #cccccc;
                border-top: none; /* Avoid double border with black keys visually */
                z-index: 1;
                width: ${WHITE_KEY_WIDTH_PX}px;
                height: 100%;
            }
            .key.black {
                background-color: #333333;
                border: 1px solid #222222;
                z-index: 2;
                width: ${BLACK_KEY_WIDTH_PX}px;
                height: ${BLACK_KEY_HEIGHT_PERCENT}%;
                color: #aaa;
                border-radius: 0 0 3px 3px; /* Slightly smaller radius for black keys */
            }
            .key.active.white {
                background-color: #e0e0e0;
                transform: translateY(1px) scale(0.99);
            }
            .key.active.black {
                background-color: #555555;
                transform: translateY(1px) scale(0.98);
            }
            /* Focus outline for the host element (keyboard itself) */
            :host(:focus) {
                outline: 2px solid dodgerblue; /* Or your preferred focus style */
                outline-offset: 2px;
            }
        `;
        this.shadowRoot.appendChild(style);

        const scrollWrapper = document.createElement('div');
        scrollWrapper.id = 'scroll-wrapper';

        const keysArea = document.createElement('div');
        keysArea.id = 'keys-area';
        
        let currentWhiteKeyLeftOffset = 0;
        let totalWhiteKeys = 0;

        this._pianoKeysData.forEach(keyData => {
            const keyElement = document.createElement('div');
            keyElement.classList.add('key', keyData.type);
            keyElement.dataset.noteId = keyData.id;
            keyElement.dataset.note = keyData.note;
            keyElement.dataset.octave = keyData.octave;
            keyElement.dataset.type = keyData.type;

            keyElement.setAttribute('role', 'button');
            keyElement.setAttribute('aria-label', `${keyData.note.replace('#', ' sharp')} ${keyData.octave}`);
            // keyElement.textContent = keyData.id; // Optional: display note ID on key

            if (keyData.type === 'white') {
                keyElement.style.left = `${currentWhiteKeyLeftOffset}px`;
                keysArea.appendChild(keyElement);
                currentWhiteKeyLeftOffset += WHITE_KEY_WIDTH_PX;
                totalWhiteKeys++;
            } else { // black
                // Position black key relative to the end of the previous white key's space
                const leftPosition = currentWhiteKeyLeftOffset - (BLACK_KEY_WIDTH_PX / 2);
                keyElement.style.left = `${leftPosition}px`;
                keysArea.appendChild(keyElement);
                // Black keys do not advance currentWhiteKeyLeftOffset
            }
        });

        keysArea.style.width = `${totalWhiteKeys * WHITE_KEY_WIDTH_PX}px`;
        scrollWrapper.appendChild(keysArea);
        this.shadowRoot.appendChild(scrollWrapper);

        // Bind event handlers
        this._handleHostFocus = this._handleHostFocus.bind(this);
        this._handleHostBlur = this._handleHostBlur.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handlePointerDown = this._handlePointerDown.bind(this);
        this._handlePointerUp = this._handlePointerUp.bind(this);
        this._handlePointerMove = this._handlePointerMove.bind(this);
        this._handlePointerLeaveOrCancel = this._handlePointerLeaveOrCancel.bind(this);

    }

    _addEventListeners() {
        this.setAttribute('tabindex', '0'); // Make the host element focusable
        this.addEventListener('focus', this._handleHostFocus);
        this.addEventListener('blur', this._handleHostBlur);

        const keysArea = this.shadowRoot.getElementById('keys-area');
        if (keysArea) {
            keysArea.addEventListener('pointerdown', this._handlePointerDown);
            // For robust pointer release, listen on document/window for up/cancel
            // These are added here to ensure they are active when a pointerdown occurs on a key
        }
    }

    _removeEventListeners() {
        this.removeEventListener('focus', this._handleHostFocus);
        this.removeEventListener('blur', this._handleHostBlur);
        // Keydown/keyup listeners are added/removed dynamically on focus/blur
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);

        const keysArea = this.shadowRoot.getElementById('keys-area');
        if (keysArea) {
            keysArea.removeEventListener('pointerdown', this._handlePointerDown);
        }
        // Clean up global listeners if any were persistently added (they are not in current design)
        document.removeEventListener('pointerup', this._handlePointerUp);
        document.removeEventListener('pointercancel', this._handlePointerLeaveOrCancel);
        document.removeEventListener('pointermove', this._handlePointerMove); // If used for dragging logic
    }

    _handleHostFocus() {
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);
    }

    _handleHostBlur() {
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
        // Deactivate any keys pressed by physical keyboard when focus is lost
        this._pressedDesktopKeys.forEach(keyCode => {
            const keyMapEntry = DESKTOP_KEY_MAP[keyCode]; // Assuming keyCode is event.code
            if (keyMapEntry) {
                const keyElement = this.shadowRoot.querySelector(`.key[data-note-id="${keyMapEntry.id}"]`);
                if (keyElement) this._deactivateKey(keyElement);
            }
        });
        this._pressedDesktopKeys.clear();
    }

    _activateKey(keyElement, pointerId = null) {
        if (!keyElement || keyElement.classList.contains('active')) return;

        keyElement.classList.add('active');
        if (pointerId !== null) {
            this._activePointerIds.set(pointerId, keyElement);
             try {
                keyElement.setPointerCapture(pointerId); // Capture the pointer
            } catch(e) { /* console.warn("Failed to set pointer capture", e) */ }
        }

        const detail = {
            note: keyElement.dataset.note,
            octave: parseInt(keyElement.dataset.octave),
            id: keyElement.dataset.noteId,
            type: keyElement.dataset.type,
            timestamp: Date.now()
        };
        this.dispatchEvent(new CustomEvent('pianokeypressed', { detail, bubbles: true, composed: true }));
    }

    _deactivateKey(keyElement, pointerId = null) {
        if (!keyElement || !keyElement.classList.contains('active')) return;
        
        keyElement.classList.remove('active');
        if (pointerId !== null) {
            if (this._activePointerIds.has(pointerId)) {
                 try {
                    if (keyElement.hasPointerCapture && keyElement.hasPointerCapture(pointerId)) {
                        keyElement.releasePointerCapture(pointerId);
                    }
                } catch(e) { /* console.warn("Failed to release pointer capture", e) */ }
                this._activePointerIds.delete(pointerId);
            }
        }
        
        const detail = {
            note: keyElement.dataset.note,
            octave: parseInt(keyElement.dataset.octave),
            id: keyElement.dataset.noteId,
            type: keyElement.dataset.type,
            timestamp: Date.now()
        };
        this.dispatchEvent(new CustomEvent('pianokeyreleased', { detail, bubbles: true, composed: true }));
    }

    _handleKeyDown(event) {
        if (event.repeat || this._pressedDesktopKeys.has(event.code)) return;

        const keyMapEntry = DESKTOP_KEY_MAP[event.code];
        if (keyMapEntry) {
            event.preventDefault();
            const keyElement = this.shadowRoot.querySelector(`.key[data-note-id="${keyMapEntry.id}"]`);
            if (keyElement) {
                this._activateKey(keyElement);
                this._pressedDesktopKeys.add(event.code);
            }
        }
    }

    _handleKeyUp(event) {
        const keyMapEntry = DESKTOP_KEY_MAP[event.code];
        if (keyMapEntry) {
            event.preventDefault();
            const keyElement = this.shadowRoot.querySelector(`.key[data-note-id="${keyMapEntry.id}"]`);
            if (keyElement) {
                this._deactivateKey(keyElement);
                this._pressedDesktopKeys.delete(event.code);
            }
        }
    }

    _handlePointerDown(event) {
        const keyElement = event.target.closest('.key');
        if (keyElement && event.isPrimary) { // Process only primary pointer for multi-touch scenarios
            // event.preventDefault(); // Can prevent scroll on touch devices if not careful, but good for dedicated interaction area
            this._activateKey(keyElement, event.pointerId);
            
            // Add global listeners for up/cancel/move when a key is pressed
            document.addEventListener('pointerup', this._handlePointerUp, { once: true }); // Auto-remove after firing
            document.addEventListener('pointercancel', this._handlePointerLeaveOrCancel, { once: true });
            // Optional: Add pointermove if you want to implement dragging across keys (glissando)
            // document.addEventListener('pointermove', this._handlePointerMove);
        }
    }
    
    _handlePointerMove(event) {
        // This is for more complex interactions like dragging across keys (glissando)
        // Only process if a pointer is captured and active
        if (this._activePointerIds.has(event.pointerId)) {
            const currentKeyUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
            const keyElement = currentKeyUnderPointer ? currentKeyUnderPointer.closest('.key') : null;
            const originallyPressedKey = this._activePointerIds.get(event.pointerId);

            if (keyElement && keyElement !== originallyPressedKey) {
                // Pointer moved to a new key while still pressed
                this._deactivateKey(originallyPressedKey, event.pointerId); // Deactivate old
                this._activateKey(keyElement, event.pointerId); // Activate new
            } else if (!keyElement && originallyPressedKey) {
                // Pointer moved off any key
                this._deactivateKey(originallyPressedKey, event.pointerId);
            }
        }
    }


    _handlePointerUp(event) {
        const keyElement = this._activePointerIds.get(event.pointerId);
        if (keyElement) {
            this._deactivateKey(keyElement, event.pointerId);
        }
        // Remove global listeners
        document.removeEventListener('pointerup', this._handlePointerUp);
        document.removeEventListener('pointercancel', this._handlePointerLeaveOrCancel);
        // document.removeEventListener('pointermove', this._handlePointerMove);
    }

    _handlePointerLeaveOrCancel(event) {
        const keyElement = this._activePointerIds.get(event.pointerId);
        if (keyElement) {
            this._deactivateKey(keyElement, event.pointerId);
        }
        // Remove global listeners
        document.removeEventListener('pointerup', this._handlePointerUp);
        document.removeEventListener('pointercancel', this._handlePointerLeaveOrCancel);
        // document.removeEventListener('pointermove', this._handlePointerMove);
    }
}

customElements.define('piano-keyboard', PianoKeyboard);