/**
 * Displays a message in a designated message box element.
 * @param {string} message - The message to display.
 * @param {number} [duration=3000] - How long to display the message in milliseconds.
 * @param {string} [messageBoxId='messageBox'] - The ID of the message box element.
 */
export function displayMessage(message, duration = 3000, messageBoxId = 'messageBox') {
    const messageBox = document.getElementById(messageBoxId);
    if (!messageBox) {
        console.error(`Message box with ID "${messageBoxId}" not found.`);
        return;
    }

    messageBox.textContent = message;
    messageBox.classList.add('show'); // Assumes 'show' class handles visibility

    // If a message is already shown, clear its timeout to prevent premature hiding
    if (messageBox.timeoutId) {
        clearTimeout(messageBox.timeoutId);
    }

    messageBox.timeoutId = setTimeout(() => {
        messageBox.classList.remove('show');
        messageBox.timeoutId = null; // Clear the stored timeout ID
    }, duration);
}

/**
 * A simple delay function using Promises.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}