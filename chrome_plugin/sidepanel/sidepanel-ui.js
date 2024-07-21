
try {
    if (settings) console.log("Settings already defined");
} finally {
    // var settings = { model: "askatt" }
    var settings = { model: "llama3" }
}
const sendButton = document.querySelector('.send-button');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.querySelector('.chat-messages');

document.addEventListener('DOMContentLoaded', function () {
    const chatHeader = document.querySelector('.chat-header');
    const chatMessages = document.querySelector('.chat-messages');

    chatHeader.addEventListener('click', function () {
        chatMessages.classList.toggle('collapsed');
    });
});
function Settings() { return JSON.stringify(settings) }

function askatt(prompt, otherMessage) {

    // Send a POST request to the "/ask" endpoint
    fetch("http://localhost:8080/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: prompt }),
    })
        .then((response) => response.json())
        .then((data) => {
            // console.log("Success:", data);
            otherMessage.textContent = data.Response
            // Assuming "recommendedText" is the ID where you want to display the response
            // document.getElementById("recommendedText").innerHTML = '</br>' + data.Response;
            // Optionally, toggle details or perform additional actions
        })
        .catch((error) => {
            console.error("Error:", error);
        });
}
function lamma3(userInput, otherMessage) {
    // Make an API call to get the response
    fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: "llama3",
            prompt: userInput,
        }),
    })
        .then(response => {
            if (response.status !== 200) {
                console.error('Error:', response.status);
                console.error(response.statusText);
                otherMessage.textContent = "Error getting response. Fallback to AskATT";
                askatt(userInput, otherMessage);
                return;
            }
            otherMessage.textContent = ''
            const reader = response.body.getReader();
            let decoder = new TextDecoder();
            let content = '';
            let rawContent = '';

            function read() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        console.log(rawContent)
                        // otherMessage.innerText = rawContent;
                        return;
                    }
                    content += decoder.decode(value, { stream: true });

                    // Process the chunk (assuming each chunk is a complete JSON object)
                    try {
                        let json = JSON.parse(content);
                        // Assuming the API sends complete JSON objects in each chunk
                        if (!json.done) {
                            // console.error(json.response)
                            rawContent += json.response;
                            otherMessage.innerHTML += json.response;
                        }
                        content = ''; // Reset content if you've successfully parsed it
                    } catch (e) {
                        // If error, it means the JSON is not complete, wait for more chunks
                    }

                    // Call read() again for the next chunk
                    read();
                }).catch(error => {
                    console.error('Error reading the stream', error);
                    otherMessage.textContent = "Error getting response.";
                });
            }

            read(); // Start reading the stream
        })
        .catch(error => {
            console.error(error)
            otherMessage.textContent = "Error getting response.";
        });
}


function appendMessage(isUser, text) {
    const message = document.createElement('li');
    //create a new element with a custom tag name md-block and add it to message
    const mdBlock = document.createElement('md'); 
    message.appendChild(mdBlock)
    
    message.className = 'message ' + (isUser ? 'my-message' : 'other-message');
    mdBlock.textContent = text;
    chatMessages.appendChild(message);
    return mdBlock;
}

async function sendMessage() {

    // Scroll .chat-messages to the bottom
    const chatMessages = document.querySelector('.chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const userInput = chatInput.value.trim();
    if (userInput) {
        // Create and append the user's message
        appendMessage(true, userInput);


        const otherMessage = appendMessage(false, 'Thinking...');

        // Clear the input field
        chatInput.value = '';
        //if the first character in userInput is a '!' then eval it
        if (userInput.charAt(0) === '!') {
            let result  = eval(userInput.substring(1));
            otherMessage.textContent = result;
            return;
        }

        if (settings.model === "llama3") {
            lamma3(userInput, otherMessage);
        } else {
            askatt(userInput, otherMessage);
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('chat-input').focus();
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function (event) {
        // Check if the key pressed is Enter
        if (event.key === 'Enter') {
            sendMessage();
            // Prevent the default action to avoid form submission or any other unwanted behavior
            event.preventDefault();
        }
    });
})

chatInput.value='how do I print in JSON'
sendMessage()
