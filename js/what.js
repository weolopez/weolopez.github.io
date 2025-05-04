import { getImageDescription, blobToBase64 } from './openai.js';
import { DB } from "./db.js";

console.log('what.js script started.');

const videoFeed = document.querySelector('dashcam-video-feed');
const snapshotCanvas = document.querySelector('dashcam-snapshot-canvas');
const descriptionElement = document.getElementById('description');
const videoContainer = document.getElementById('videoContainer');

let videoReady = false; // Flag to track if video-ready event fired

// Wait for the video feed to be ready
videoFeed.addEventListener('video-ready', async () => {
    videoReady = true; // Set flag when event fires
    console.log('video-ready event fired.');
    descriptionElement.textContent = 'Camera feed ready. Waiting for video data...';

    const videoElement = videoFeed.getVideoElement();

    // Wait for video data to be loaded (dimensions and first frame)
    videoElement.addEventListener('loadeddata', async () => {
        console.log('videoElement loadeddata event fired.');
        descriptionElement.textContent = 'Video data loaded. Taking snapshot...';

        try {
            console.log('Getting video element and taking snapshot...');
            const imageBlob = await snapshotCanvas.takeSnapshot(videoElement);
            console.log('Snapshot taken. imageBlob:', imageBlob);

            // Hide video and show loading message
            console.log('Attempting to hide videoContainer:', videoContainer);
            videoContainer.style.display = 'none';
            descriptionElement.textContent = 'Getting description...';
            descriptionElement.classList.add('visible'); // Make description visible

            if (imageBlob) {
                console.log('Calling getImageDescription...');
                const description = await getImageDescription(imageBlob);

                console.log('getImageDescription returned:', description);
                descriptionElement.textContent = description; // Display the description

                // --- Start DB Saving Logic ---
                try {
                    console.log('Initializing DB and saving data...');
                    const db = new DB(true); // Assuming true is for worker mode based on original comment
                    await db.init('what_db', ["Pictures"]); // Using 'what_db' as database name
                    const Pictures = db.Pictures;
                    await Pictures.add({
                        description: description,
                        image: await blobToBase64(imageBlob),
                        timestamp: new Date().toISOString()
                    });
                    console.log('Image and description saved to DB.');
                } catch (dbError) {
                    console.error('Error saving to DB:', dbError);
                    // Optionally update descriptionElement with DB error
                }
                // --- End DB Saving Logic ---

            } else {
                descriptionElement.textContent = 'Error: Could not take snapshot.';
                console.error('Error: imageBlob is null or undefined.');
            }
        } catch (error) {
            console.error('Error during snapshot or API call:', error);
            descriptionElement.textContent = `Error: ${error.message}`;
            descriptionElement.classList.add('visible'); // Make description visible on error
        }
    });
});

// Handle cases where video feed might not start
videoFeed.addEventListener('error', (event) => {
    console.error('Video feed error:', event.detail.error);
    descriptionElement.textContent = `Error starting camera: ${event.detail.error.message}`;
});

// Handle cases where video feed might not start (duplicate listener, keeping for now)
videoFeed.addEventListener('error', (event) => {
    console.error('Video feed error:', event.detail.error);
    descriptionElement.textContent = `Error starting camera: ${event.detail.error.message}`;
    descriptionElement.classList.add('visible'); // Make description visible on error
});

// Set a timeout to check if video-ready fired
setTimeout(() => {
    if (!videoReady) {
        console.error('Video feed did not become ready within timeout.');
        descriptionElement.textContent = 'Error: Camera failed to start. Please check permissions and try again.';
        descriptionElement.classList.add('visible'); // Make description visible
        videoContainer.style.display = 'none'; // Hide video container if it's still there
    }
}, 10000); // 10 second timeout