export class InputManager {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.activeActions = new Set(); // For continuous actions like 'thrust'
        this.actionStates = {}; // For more complex state if needed

        // Define game actions (can be expanded)
        this.GAME_ACTIONS = {
            THRUST: 'thrust',
            ROTATE_LEFT: 'rotateLeft',
            ROTATE_RIGHT: 'rotateRight',
            FIRE: 'fire',
            SWITCH_WEAPON_1: 'switchWeapon1',
            SWITCH_WEAPON_2: 'switchWeapon2',
            PAUSE: 'pause',
            MUTE: 'mute',
            // MENU_UP: 'menuUp', // Will be handled by generic arrow events + context
            // MENU_DOWN: 'menuDown', // Will be handled by generic arrow events + context
            MENU_CONFIRM: 'menuConfirm',
            MENU_BACK: 'menuBack', // e.g. for Escape key in menus
            RESPAWN: 'respawn',
            END_GAME_CHOICE: 'endGameChoice',
            // Generic directional presses for context-sensitive handling
            ARROW_UP_PRESS: 'arrowUpPress',
            ARROW_DOWN_PRESS: 'arrowDownPress',
            ARROW_LEFT_PRESS: 'arrowLeftPress',
            ARROW_RIGHT_PRESS: 'arrowRightPress'
        };

        this.keyMap = {
            // Continuous actions (held down)
            'ArrowUp_continuous': this.GAME_ACTIONS.THRUST, // Special handling for continuous
            'ArrowLeft_continuous': this.GAME_ACTIONS.ROTATE_LEFT,
            'ArrowRight_continuous': this.GAME_ACTIONS.ROTATE_RIGHT,

            // Discrete actions (on key press)
            'ArrowUp': this.GAME_ACTIONS.ARROW_UP_PRESS,
            'ArrowDown': this.GAME_ACTIONS.ARROW_DOWN_PRESS,
            'ArrowLeft': this.GAME_ACTIONS.ARROW_LEFT_PRESS,
            'ArrowRight': this.GAME_ACTIONS.ARROW_RIGHT_PRESS,
            'Space': this.GAME_ACTIONS.FIRE,
            'Digit1': this.GAME_ACTIONS.SWITCH_WEAPON_1,
            'Digit2': this.GAME_ACTIONS.SWITCH_WEAPON_2,
            'KeyP': this.GAME_ACTIONS.PAUSE,
            'Escape': this.GAME_ACTIONS.PAUSE, // Could also be MENU_BACK depending on context
            'KeyM': this.GAME_ACTIONS.MUTE,
            'Enter': this.GAME_ACTIONS.MENU_CONFIRM,
            'KeyR': this.GAME_ACTIONS.RESPAWN,
            'KeyE': this.GAME_ACTIONS.END_GAME_CHOICE
        };

        // For menu navigation, ArrowUp/Down are already mapped for thrust/other,
        // so we might need context-specific mapping or different keys for menus.
        // For now, SHIP_SELECTION uses ArrowUp/Down directly.
        // This can be refined when UIManager is built.

        this.eventListeners = {}; // To store discrete action callbacks: { eventName: [callbacks] }

        this.init();
    }

    init() {
        // Using arrow functions to maintain 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);

        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);

        // Placeholder for touch controls
        // this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        // this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        // this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        console.log("InputManager initialized.");
    }

    handleKeyDown(e) {
        // Handle continuous actions
        if (e.code === 'ArrowUp') this.activeActions.add(this.GAME_ACTIONS.THRUST);
        if (e.code === 'ArrowLeft') this.activeActions.add(this.GAME_ACTIONS.ROTATE_LEFT);
        if (e.code === 'ArrowRight') this.activeActions.add(this.GAME_ACTIONS.ROTATE_RIGHT);

        // Handle discrete actions (emitting events)
        if (e.repeat) return; // Prevent continuous firing for discrete actions if key is held down

        const discreteActionToEmit = this.keyMap[e.code];
        // This keyMap lookup (e.g., this.keyMap['ArrowUp']) is intended to get the discrete action
        // like ARROW_UP_PRESS, FIRE, MENU_CONFIRM, etc.
        // It will not directly yield THRUST, ROTATE_LEFT, or ROTATE_RIGHT from this lookup.

        if (discreteActionToEmit) {
            this.emit(discreteActionToEmit, e);
        }
    }

    handleKeyUp(e) {
        // Handle continuous actions
        if (e.code === 'ArrowUp') this.activeActions.delete(this.GAME_ACTIONS.THRUST);
        if (e.code === 'ArrowLeft') this.activeActions.delete(this.GAME_ACTIONS.ROTATE_LEFT);
        if (e.code === 'ArrowRight') this.activeActions.delete(this.GAME_ACTIONS.ROTATE_RIGHT);

        // For discrete actions, keyUp is usually not needed unless for specific "release" logic
        // const discreteAction = this.keyMap[e.code];
        // if (discreteAction) {
        //     this.emit(`${discreteAction}_up`, e);
        // }
    }

    isActionActive(actionName) {
        return this.activeActions.has(actionName);
    }

    clearCustomListeners() {
        this.eventListeners = {};
        // console.log("InputManager: Custom event listeners cleared.");
    }

    // For discrete actions (like button presses)
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }

    off(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName].filter(cb => cb !== callback);
        }
    }

    emit(eventName, ...args) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => callback(...args));
        }
    }
    
    // Example for getting an analog-like value (not fully implemented here)
    // getActionValue(actionName) { 
    //     if(actionName === 'moveX') return this.actionStates.moveX || 0;
    //     return null; 
    // }

    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        // Remove touch listeners if added
        console.log("InputManager destroyed and listeners removed.");
    }
}