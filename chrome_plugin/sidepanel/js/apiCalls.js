
async function llava(prompt, image) {
    const url = 'http://localhost:11434/api/generate';
    const data = {
        model: 'llava',
        prompt: prompt,
        images: [image]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const reader = response.body.getReader();
        let result = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const line = new TextDecoder().decode(value);
            try {
                const jsonObject = JSON.parse(line);
                result += jsonObject.response;
                console.log(result);
            } catch (error) {
                console.error('Invalid JSON:', error);
            }
        }
        return result

        console.log(result);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function askatt(question, imageURL) {
    spinner.show() 
    // Send a POST request to the "/ask" endpoint
    return fetch("http://localhost:8080/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            question: question,
            imageURL: imageURL,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            spinner.hide() 
            return data.Response
        })
        .catch((error) => {
            console.error("Error:", error);
            spinner.hide()
            return "Error getting response. " + error;
        });
}
async function lamma3(userInput, otherMessage) {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "llama3.1",
                prompt: userInput,
            }),
        });

        if (response.status !== 200) {
            console.error('Error:', response.status);
            console.error(response.statusText);
            otherMessage.textContent = "Error getting response. Fallback to AskATT";
            askatt(userInput, otherMessage);
            return;
        }

        otherMessage.textContent = '';
        const reader = response.body.getReader();
        let decoder = new TextDecoder();
        let content = '';
        let rawContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            content += decoder.decode(value, { stream: true });

            // Process the chunk (assuming each chunk is a complete JSON object)
            try {
                let json = JSON.parse(content);
                if (!json.done) {
                    otherMessage.innerHTML += json.response.replace(/\n/g, '<br>');
                }
                content = ''; // Reset content if you've successfully parsed it
            } catch (e) {
                // If error, it means the JSON is not complete, wait for more chunks
            }
        }

        // Post-process otherMessage after reading all chunks
        // rawContent = otherMessage.innerHTML.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // rawContent = rawContent.replace(/```(?:\w+\s)?(.*?)```/gs, '<div class="code-block">$1</div>');

        // Return or use rawContent as needed
        return otherMessage.innerHTML;
    } catch (error) {
        console.error('Error:', error);
        otherMessage.textContent = "Error getting response.";
    }
}

async function addText(text) {
    const url = 'http://localhost:8080/api/add_text';
    const data = { text: text };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Success:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}
async function askHistory(question) {
    const url = 'http://localhost:8080//api/ask_question';
    const headers = {
        'Content-Type': 'application/json'
    };
    const body = JSON.stringify({ question });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        const data = await response.json();
        return data.answer.result;
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
}
