// FILE: openai.js

async function getOpenAIResponse(systemPrompt, userPrompt) {
    const apiKey = localStorage.getItem('openai_api_key'); // Retrieve the OpenAI API key from local storage
    if (!apiKey) {
        throw new Error('API key not found in local storage');
    }
    const url = 'https://api.openai.com/v1/chat/completions';

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const data = {
        model: 'gpt-4o-mini', // You can change the model if needed
    messages: [
        {
        role: 'system',
        content: systemPrompt
        },
        {
        role: 'user',
        content: userPrompt
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
async function generateImage(prompt) {
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
// generateImage('a white siamese cat').then(url => console.log(url));