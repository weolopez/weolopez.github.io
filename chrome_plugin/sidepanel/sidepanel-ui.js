
try {
    if (settings) console.log("Settings already defined");
} finally {
    // var settings = { model: "askatt" }
    var settings = { model: "llama3" }
}

var imageURL = ''

function Settings() { return JSON.stringify(settings) }

var bufferText = ''
var replaceMap = {
    '**': '<bold>',
    '##': '<h2>',
    '###': '<h3>',
}


  function setPromptType(context) {
    if (context === 'context') {
        if (settingsPanel.isPressed('context')) {
            settingsPanel.press('history', false);
        }
        settings.useContext=settingsPanel.isPressed('context')
    }
    else if (context === 'history') {
        if (settingsPanel.isPressed('history')) {
            settingsPanel.press('context', false);
            settingsPanel.press('askatt', false);
            settings.model = "history" 
        } else settings.model = "llama3" 
        // askQuestion()
    } 
    if (context === 'askatt') {
        if (settingsPanel.isPressed('askatt')) {
            settingsPanel.press('history', false);
            settings.model = "askatt" 
        } else settings.model = "llama3" 
    }
    sendButton.textContent = settings.model
}


function processStream(partialText) {

    if (bufferText.length === 0) {
        startKey = '';
        for (const [key, value] of Object.entries(replaceMap)) {
            if (partialText.includes(key)) startKey = value;
        }
        if (startKey.length > 0) {
            // replace partialText with value
            bufferText += partialText.replace(key, startKey);
            return '';
        }
    } else {
        closeKey = '';
        for (const [key, value] of Object.entries(replaceMap)) {
            value = value.replace('<', '</');
            if (partialText.includes(key)) closeKey = value;
        }
        if (closeKey.length > 0) {
            // replace beginning of value from < to </
            //replace partialText with value
            bufferText += partialText.replace(key, closeKey);
            partialText = bufferText;
            bufferText = ''
        } else {
            bufferText += partialText;
            console.log(bufferText)
            return '';
        }
    }

    return partialText.replace(/\n/g, '<br>');
}

function appendMessage(isUser, text) {
    const message = document.createElement('li');
    //create a new element with a custom tag name md-block and add it to message
    const mdBlock = document.createElement('div');
    message.appendChild(mdBlock)

    message.className = 'message ' + (isUser ? 'my-message' : 'other-message');
    mdBlock.textContent = text;
    chatMessages.appendChild(message);
    return mdBlock;
}

async function sendMessage() {
    chatMessages.scrollTop = chatMessages.scrollHeight;

    let userInput = (chatInput.value.trim() === 'undefined') ? "Summarize: " : chatInput.value.trim();
    if (userInput) {

        appendMessage(true, userInput);
        const otherMessage = appendMessage(false, 'Thinking...');

        // Clear the input field
        chatInput.value = '';
        //if the first character in userInput is a '!' then eval it
        if (userInput.charAt(0) === '!') {
            let result = eval(userInput.substring(1));
            otherMessage.textContent = result;
            return;
        }

        if (settings.useContext && imageURL.length == 0) {
            userInput += selectedText.innerHTML
        }

        var rawContent = ''
        if (settings.model === "llama3") {
            rawContent = await lamma3(userInput, otherMessage)
        } else if (settings.model === "askatt") {
            rawContent = await askatt(userInput, imageURL)
        } else if (settings.model === "history") {
            rawContent = await askHistory(userInput)
        }

        rawContent = rawContent.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        rawContent = rawContent.replace(/```(?:\w+\s)?(.*?)```/gs, '<div class="code-block">$1</div>');
        otherMessage.innerHTML = rawContent;
    }
}


// chatInput.value='how do I print in JSON'
// sendMessage()
