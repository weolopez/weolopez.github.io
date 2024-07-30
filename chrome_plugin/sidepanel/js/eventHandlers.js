
// Select the custom element
const imagePreviewElement = document.querySelector('image-preview');
const chatHeader = document.querySelector('chat-header');
const chatMessages = document.querySelector('.chat-messages');
const chatContainer = document.querySelector('.chat-container');
const imageLabel = document.querySelector('.image-label');
const selectedText = document.getElementById('selectedText')
const sendButton = document.querySelector('#chat-button');
const chatInput = document.getElementById('chat-input');
const context = document.getElementById('context')

// const save = document.getElementById('save')
// save.addEventListener('click', async () => { })

let spinner = document.getElementById('spinner')
spinner.show = () => spinner.style.display = 'flex'
spinner.hide = () => spinner.style.display = 'none'


const settingsPanel = document.querySelector('settings-panel');
settingsPanel.addEventListener('item-click', (event) => {
    // console.log(`Item clicked: ${event.detail.id}`);
    if (event.detail.id === 'askatt') setPromptType('askatt')
    if (event.detail.id === 'prompt') context.toggle();
    if (event.detail.id === 'save') addText(context.innerText);

    if (event.detail.id === 'context') setPromptType('context')
    if (event.detail.id === 'history') setPromptType('history')

    chatHeader.toggleHamburgerMenu()
})

chatHeader.addEventListener('hamburger-menu-click', (event) => {
    document.getElementById('top-drawer').toggle();
  });

document.addEventListener('DOMContentLoaded', function () {
    chatInput.focus();
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', async function (event) {
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                // Shift + Enter pressed, allow the newline
                // No need to explicitly add a newline as textarea supports it natively
                event.preventDefault(); // Prevent default to avoid form submission
            } else {
                // Enter pressed without Shift, send the message
                await sendMessage(); // Implement this function as needed
                event.preventDefault(); // Prevent the default action to stop form submission
                this.value = ''; // Clear the textarea after sending the message
            }
        }
    });
    chatInput.addEventListener('paste', async (event) => {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file') {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const base64Image = e.target.result.split(',')[1];
                    imagePreviewElement.updateImageSrc(e.target.result);
                        // imagePreviewElement.updateLabelText(await llava("provide a very brief description of this image", base64Image))
                };
                reader.readAsDataURL(blob);
                event.preventDefault();
            }
        }
    });
    // event listener for option + up arrow combination
    document.addEventListener('keydown', async function (event) {
        if (event.key === 'ArrowUp' && event.altKey) {
            context.toggle();
        }
    });
});