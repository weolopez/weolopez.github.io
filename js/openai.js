// FILE: openai.js

export async function getOpenAIResponse(userPrompt,systemPrompt) {
    const apiKey = localStorage.getItem('openai_api_key'); // Retrieve the OpenAI API key from local storage
    if (!apiKey) {
        const apiKeyPrompt = prompt('Please enter your OpenAI API key:');
        if (apiKeyPrompt) {
            localStorage.setItem('openai_api_key', apiKeyPrompt);
        } else {
            throw new Error('API key not found in local storage');
        }
    }
    const url = 'https://api.openai.com/v1/chat/completions';

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const data = {
        model: 'o1-mini',
        stream: false,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: userPrompt
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error fetching OpenAI response:', error);
        return 'Error fetching response';
    }
}

// Example usage
// getOpenAIResponse('System prompt here', 'User prompt here').then(response => console.log(response));
export async function generateImage(prompt) {
    const apiKey = localStorage.getItem('openai_api_key'); // Retrieve the OpenAI API key from local storage
    if (!apiKey) {
        throw new Error('API key not found in local storage');
    }
    const url = 'https://api.openai.com/v1/images/generations';

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const data = {
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data[0].url;
    } catch (error) {
        console.error('Error generating image:', error);
        return 'Error generating image';
    }
}

// Helper function to convert Blob to Data URL
export function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function getImageDescription(imageBlob) {
    const apiKey = localStorage.getItem('openai_api_key'); // Retrieve the OpenAI API key from local storage
    if (!apiKey) {
        const apiKeyPrompt = prompt('Please enter your OpenAI API key:');
        if (apiKeyPrompt) {
            localStorage.setItem('openai_api_key', apiKeyPrompt);
        } else {
            throw new Error('API key not found in local storage');
        }
    }

    const imageUrl = await blobToBase64(imageBlob); // Convert blob to data URL

    const url = 'https://api.openai.com/v1/responses'; // Updated endpoint

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const data = {
        model: 'gpt-4.1-mini', // Updated model
        input: [ // Updated structure
            {
                role: 'user',
                content: [
                    {"type": "input_text", "text": "describe the objects in the image if there's any text speculate on what the Texas for and say what the text is"}, // Updated type and key
                    {
                        "type": "input_image", // Updated type
                        "image_url": imageUrl // Data URL goes here
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const result = await response.json();
        // Parse the response based on the provided example structure
        if (result && result.output && result.output.length > 0 && result.output[0].content && result.output[0].content.length > 0 && result.output[0].content[0].text) {
             return result.output[0].content[0].text.trim();
        } else {
             console.error('Unexpected API response structure:', result);
             return 'Error: Unexpected API response structure.';
        }
    } catch (error) {
        console.error('Error fetching image description:', error);
        return 'Error fetching image description';
    }
}

// generateImage('a white siamese cat').then(url => console.log(url));
// Example usage for getImageDescription (requires an image blob)
// Assuming you have an imageBlob from somewhere:
// getImageDescription(imageBlob).then(description => console.log(description));