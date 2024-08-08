
// Select the custom element

try {
    if (settings) console.log("Settings already defined");
} finally {
    // var settings = { model: "askatt" }
    var settings = { model: "llama3" }
}



var imageURL = ''

// Function to show the popover
function showPopover() {
    popover.show();
}

async function newChat() {
    let newGroup = await chatGroupList.add({
        type: 'groups',
        image: 'data:image/png;base64,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',
        title: 'Group Added',
        description: 'Description 1'
    });
    await horizontalScrollPanels.switchByID('chats-list')
    await chatHeader.setAction('Back')
    await chatBubble.setChats(newGroup)
}
// const save = document.getElementById('save')
// save.addEventListener('click', async () => { })

contextRefresh.addEventListener('click', (event) => getData())
chatHeader.addEventListener('group-action', async (event) => {
    let action = event.detail.action;
    if (action === 'Add') {
        newChat()
    } else if (action === 'Back') {
        chatHeader.updateTitle('Chats')
        horizontalScrollPanels.switchByID('group-list')
        chatHeader.setAction('Add')
    }
})

chatGroupList.addEventListener('group-click', (event) => {
    // console.log('Group clicked:', event.detail);
    horizontalScrollPanels.switchByID('chats-list')
    chatHeader.setAction('Back')
    chatBubble.setChats(event.detail.group)
    chatHeader.updateTitle(event.detail.group.title)
    // event.detail.group.description += 'u'
    // chatGroupList.update(event.detail.group);
});

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

chatInput.focus();


sendButton.addEventListener('click', async function (event) {
    await sendMessage()
});
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
                imagePreviewElement.updateImageSrc(e.target.result);
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

//create a new event listener for a class="code-block" element to copy on click
document.addEventListener('click', function (event) {
    if (event.target.classList.contains('code-block')) {
        let codeBlock = event.target.innerText;
        // Remove the beginning of the string to the first space and the end of the string to the last space
        // Use a regular expression to match either a space or a newline
        const firstMatch = codeBlock.search(/ |\n/);
        const lastMatch = Math.max(codeBlock.lastIndexOf(' '), codeBlock.lastIndexOf('\n'));

        // Ensure the codeBlock is properly trimmed
        codeBlock = codeBlock.substring(firstMatch + 1, lastMatch);
        navigator.clipboard.writeText(codeBlock)
            .then(() => {
                console.log('Code block copied to clipboard');
                showPopover(); // Show the popover
            })
            .catch((error) => {
                console.error('Failed to copy code block to clipboard:', error);
            });
    }
});

async function getRecommendation(inputElement) {
    return "text data:" + inputElement
}