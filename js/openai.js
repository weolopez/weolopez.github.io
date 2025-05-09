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

/**
 * Converts an image File or Blob to a PNG Blob using a canvas.
 * @param {File | Blob} imageBlob - The input image file or blob.
 * @returns {Promise<Blob>} A promise that resolves with the image data as a PNG Blob.
 */
export async function convertImageToPngBlob(imageBlob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Determine the size of the square canvas
            const size = Math.max(img.width, img.height);

            // Create a square canvas element
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');

            // Calculate coordinates to center the image on the square canvas
            const x = (size - img.width) / 2;
            const y = (size - img.height) / 2;

            // The canvas is transparent by default. If we want to ensure
            // the padding is explicitly transparent (e.g., if the original image had some
            // non-transparent background that we don't want to extend), we could clear it:
            // ctx.clearRect(0, 0, size, size); // Or fill with a specific transparent color

            // Draw the image onto the center of the square canvas
            ctx.drawImage(img, x, y, img.width, img.height);

            // Export the canvas content as a PNG Blob
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob failed to create Blob.'));
                }
            }, 'image/png');
        };
        img.onerror = (error) => {
            console.error("Image load error for conversion:", error);
            reject(new Error('Error loading image for conversion.'));
        };

        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target && e.target.result) {
                img.src = e.target.result;
            } else {
                reject(new Error('FileReader did not produce a result.'));
            }
        };
        reader.onerror = (error) => {
            console.error("FileReader error for conversion:", error);
            reject(new Error('Error reading image file for conversion.'));
        };
        reader.readAsDataURL(imageBlob);
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

export async function editImageWithOpenAI(imageFile, promptText, maskFile = null, n = 1, size = "1024x1024") {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
        const apiKeyPrompt = prompt('Please enter your OpenAI API key:');
        if (apiKeyPrompt) {
            localStorage.setItem('openai_api_key', apiKeyPrompt);
        } else {
            // Potentially throw an error or return, consistent with other functions
            console.error('API key not found and not provided.');
            throw new Error('API key not found and not provided.');
        }
    }
    const url = 'https://api.openai.com/v1/images/edits';

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', promptText);
    formData.append('model', 'gpt-image-1');
    formData.append('background', 'transparent');
    formData.append('n', n);
    formData.append('size', size); // User can still specify size, or API default 'auto' will be used if not overridden by caller.

    // Only append mask if it's a File object.
    // If maskFile is null (default when not provided), or any other non-File type, it won't be appended.
    if (maskFile instanceof File) {
        formData.append('mask', maskFile);
    } else if (maskFile) { // If maskFile is truthy but not a File (e.g., a string that would cause an error)
        console.warn(`Optional 'maskFile' parameter was provided but is not a File object (type: ${typeof maskFile}). It will be ignored to prevent API errors.`);
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`
        // 'Content-Type': 'multipart/form-data' is set by the browser automatically for FormData
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: { message: "Failed to parse error response." } };
            }
            console.error('OpenAI API Error:', errorData);
            throw new Error(`Error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown API error'}`);
        }

        const result = await response.json();
        // gpt-image-1 returns b64_json
        if (result.data && result.data.length > 0 && result.data[0].b64_json) {
            return result.data[0].b64_json;
        } else {
            console.error('Unexpected API response structure for image edit:', result);
            throw new Error('Unexpected API response structure from OpenAI. Expected b64_json.');
        }
    } catch (error) {
        console.error('Error editing image with OpenAI:', error);
        throw error; // Re-throw to be caught by the caller
    }
}

// generateImage('a white siamese cat').then(url => console.log(url));
// Example usage for getImageDescription (requires an image blob)
// Assuming you have an imageBlob from somewhere:
// getImageDescription(imageBlob).then(description => console.log(description));