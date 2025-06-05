// FILE: openai.js

// New helper function to get the OpenAI API key
function getApiKey() {
	let apiKey = localStorage.getItem('openai_api_key');
	if (!apiKey) {
		const key = prompt('Please enter your OpenAI API key:');
		if (key) {
			localStorage.setItem('openai_api_key', key);
			apiKey = key;
		} else {
            // redirect the page to /wc/google-login.html
            const currentUrl = encodeURIComponent(window.location.pathname);
            window.location.href = `/wc/google-login.html?returnUrl=${currentUrl}`;
			throw new Error('API key not found in local storage');
		}
	}
	return apiKey;
}

export async function getOpenAIResponse(userPrompt, systemPrompt) {
	const apiKey = getApiKey();
	const url = 'https://api.openai.com/v1/chat/completions';

	const headers = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${apiKey}`
	};

	const messages = [];
	if (systemPrompt) {
		messages.push({
			role: 'system',
			content: systemPrompt
		});
	}
	messages.push({
		role: 'user',
		content: userPrompt
	});

	const data = {
		model: 'gpt-4o-mini',
		stream: false,
		messages: messages
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

// New streaming chat completion function for the chat worker
export async function* streamChatCompletion(messages, options = {}) {
	const apiKey = getApiKey();
	const url = 'https://api.openai.com/v1/chat/completions';

	const headers = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${apiKey}`
	};

	const data = {
		model: options.model || 'gpt-4o-mini',
		messages: messages,
		temperature: options.temperature || 0.7,
		max_tokens: options.max_tokens || 1024,
		stream: true
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

		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			const lines = chunk.split('\n');

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);
					if (data === '[DONE]') {
						return;
					}
					
					try {
						const parsed = JSON.parse(data);
						if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
							yield parsed;
						}
					} catch (e) {
						// Skip invalid JSON lines
						continue;
					}
				}
			}
		}
	} catch (error) {
		console.error('Error in streaming chat completion:', error);
		throw error;
	}
}

// Example usage
// getOpenAIResponse('System prompt here', 'User prompt here').then(response => console.log(response));
export async function generateImage(prompt) {
	const apiKey = getApiKey();
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

/**
 * Resizes an image File or Blob to a fixed square size and converts it to a PNG Blob.
 * The image is scaled to fit within the square, maintaining aspect ratio,
 * and transparent padding is added if necessary.
 * @param {File | Blob} imageBlob - The input image file or blob.
 * @param {number} fixedSize - The width and height of the output square PNG.
 * @returns {Promise<Blob>} A promise that resolves with the resized image data as a PNG Blob.
 */
export async function resizeImageToFixedSquarePngBlob(imageBlob, fixedSize) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = fixedSize;
			canvas.height = fixedSize;
			const ctx = canvas.getContext('2d');

			// Calculate new dimensions to fit within fixedSize while maintaining aspect ratio
			let newWidth, newHeight;
			if (img.width > img.height) {
				newWidth = fixedSize;
				newHeight = (img.height / img.width) * fixedSize;
			} else {
				newHeight = fixedSize;
				newWidth = (img.width / img.height) * fixedSize;
			}

			// Calculate coordinates to center the image on the square canvas
			const x = (fixedSize - newWidth) / 2;
			const y = (fixedSize - newHeight) / 2;

			// Ensure canvas is transparent
			ctx.clearRect(0, 0, fixedSize, fixedSize);

			// Draw the resized image onto the center of the square canvas
			ctx.drawImage(img, x, y, newWidth, newHeight);

			// Export the canvas content as a PNG Blob
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('Canvas toBlob failed to create Blob during resize.'));
				}
			}, 'image/png');
		};
		img.onerror = (error) => {
			console.error("Image load error for resizing:", error);
			reject(new Error('Error loading image for resizing.'));
		};

		const reader = new FileReader();
		reader.onload = (e) => {
			if (e.target && e.target.result) {
				img.src = e.target.result;
			} else {
				reject(new Error('FileReader did not produce a result for resizing.'));
			}
		};
		reader.onerror = (error) => {
			console.error("FileReader error for resizing:", error);
			reject(new Error('Error reading image file for resizing.'));
		};
		reader.readAsDataURL(imageBlob);
	});
}

export async function getImageDescription(imageBlob) {
	const apiKey = getApiKey();
	const url = 'https://api.openai.com/v1/responses'; // Updated endpoint

	const headers = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${apiKey}`
	};

    const imageUrl = await blobToBase64(imageBlob);
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
	const apiKey = getApiKey();
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
// Helper function to convert base64 string to a File object
export function base64ToFile(base64String, fileName, mimeType) {
    const byteCharacters = atob(base64String.split(',')[1] || base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], fileName, { type: mimeType });
}

export async function removeBackground(imageFile) {

    const maskPrompt = "Generate a mask from the input image where the entire foreground subject, including all internal details such as hair, clothing, and intricate patterns, is untouched, colors pixels remain the same . The entire background, encompassing everything outside the foreground subject, must be solid white (RGB 255, 255, 255). The mask should have precise edges that accurately follow the subject's contours, capturing fine details without any outline artifacts. Eliminate all noise, partial transparency, or residual elements to produce a clean, high-contrast binary mask suitable for background removal, ensuring absolutely no black is present in the background."
    const removeBgPrompt = "Remove the background, making it transparent. Use the provided mask to keep only forground pixels and the background is white, remove the background from the input image. Keep the foreground subject intact with precise edges, preserving all details such as hair, clothing, and intricate patterns. Output the image with a transparent background (RGBA format, alpha channel set to 0 for the background). Ensure no residual background artifacts remain, and maintain the original colors and textures of the foreground..";

    try {
        // Log dimensions of the input imageFile
        const originalImgLog = new Image();
        const originalImgUrl = URL.createObjectURL(imageFile);
        await new Promise((resolve, reject) => {
            originalImgLog.onload = () => {
                console.log(`[removeBackground] Input imageFile dimensions: ${originalImgLog.naturalWidth}x${originalImgLog.naturalHeight}`);
                URL.revokeObjectURL(originalImgUrl);
                resolve();
            };
            originalImgLog.onerror = (err) => {
                console.error("[removeBackground] Error loading input imageFile to get dimensions for logging.", err);
                URL.revokeObjectURL(originalImgUrl);
                // Resolve even on error to not break the main flow, error is logged.
                resolve();
            };
            originalImgLog.src = originalImgUrl;
        }).catch(err => console.warn("[removeBackground] Continuing after input image dimension logging issue:", err.message));
        // 1. Generate the mask
        console.log("Generating mask...");
        const maskB64Json = await editImageWithOpenAI(imageFile, maskPrompt);
        if (!maskB64Json) {
            throw new Error("Failed to generate mask: API did not return b64_json.");
        }
        // The API returns "data:image/png;base64,..." if it's already a data URL,
        // or just the base64 part. Ensure we handle both for conversion.
        const base64DataForMask = maskB64Json.startsWith('data:') ? maskB64Json.split(',')[1] : maskB64Json;

        // Log the full maskB64Json for user inspection
        console.log("[removeBackground] Generated mask (maskB64Json for viewing - copy and paste into a base64 to image viewer):", maskB64Json);

        // Log dimensions of the generated mask from maskB64Json
        const maskImgLog = new Image();
        let maskDataURLForLog = maskB64Json;
        // Ensure it's a full data URL for Image.src
        if (maskB64Json && !maskB64Json.startsWith('data:image/')) { // Check if it's base64 data and not already a full data URL
            maskDataURLForLog = 'data:image/png;base64,' + maskB64Json;
        } else if (!maskB64Json) {
            console.error("[removeBackground] maskB64Json is null or undefined, cannot log dimensions.");
            maskDataURLForLog = null; // Prevent error with img.src
        }

        if (maskDataURLForLog) {
            await new Promise((resolve, reject) => {
                maskImgLog.onload = () => {
                    console.log(`[removeBackground] Generated mask (from b64 before File conversion) dimensions: ${maskImgLog.naturalWidth}x${maskImgLog.naturalHeight}`);
                    resolve();
                };
                maskImgLog.onerror = (err) => {
                    console.error("[removeBackground] Error loading mask image from b64 to get dimensions for logging.", err);
                    // Resolve even on error to not break the main flow, error is logged.
                    resolve();
                };
                maskImgLog.src = maskDataURLForLog;
            }).catch(err => console.warn("[removeBackground] Continuing after mask dimension logging issue:", err.message));
        }
        const maskFile = base64ToFile(base64DataForMask, "mask.png", "image/png");
        console.log("Mask generated and converted to File.");

        // 2. Resize original image to match mask dimensions (1024x1024)
        console.log("Resizing original image to match mask dimensions (1024x1024)...");
        const resizedImageBlob = await resizeImageToFixedSquarePngBlob(imageFile, 1024); // Assuming mask is 1024x1024
        const resizedImageFile = new File([resizedImageBlob], imageFile.name || "resized_image.png", { type: 'image/png' });
        console.log(`Original image resized to 1024x1024. New file: ${resizedImageFile.name}`);

        // Log dimensions of the resized imageFile
        const resizedImgLog = new Image();
        const resizedImgUrl = URL.createObjectURL(resizedImageFile);
        await new Promise((resolve) => {
            resizedImgLog.onload = () => {
                console.log(`[removeBackground] Resized imageFile dimensions for final edit: ${resizedImgLog.naturalWidth}x${resizedImgLog.naturalHeight}`);
                URL.revokeObjectURL(resizedImgUrl);
                resolve();
            };
            resizedImgLog.onerror = () => {
                console.error("[removeBackground] Error loading resized imageFile for logging dimensions.");
                URL.revokeObjectURL(resizedImgUrl);
                resolve(); // Continue anyway
            };
            resizedImgLog.src = resizedImgUrl;
        });


        // 3. Remove background using the resized image and the mask
        console.log("Removing background using resized image and mask...");
        const finalImageB64Json = await editImageWithOpenAI(resizedImageFile, removeBgPrompt, maskFile);
        if (!finalImageB64Json) {
            throw new Error("Failed to remove background: API did not return b64_json.");
        }
        console.log("Background removed.");
        return finalImageB64Json;

    } catch (error) {
        console.error("Error in removeBackground:", error);
        throw error; // Re-throw to be caught by the caller
    }
}

// generateImage('a white siamese cat').then(url => console.log(url));
// Example usage for getImageDescription (requires an image blob)
// Assuming you have an imageBlob from somewhere:
// getImageDescription(imageBlob).then(description => console.log(description));