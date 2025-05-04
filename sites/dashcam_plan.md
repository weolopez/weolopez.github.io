# Dashcam Web Application Plan

This document outlines the plan for creating a dashcam web application at `sites/dashcam.html` using standard web components from the `../wc` directory.

## Objective

Create a web application that displays a live video feed from the user's camera, records video, takes snapshots, and sends snapshots to an API for text conversion.

## Proposed Web Components

To modularize the application and leverage reusable components, the following standard web components will be created in the `../wc` directory:

1.  **`dashcam-video-feed`**: Encapsulates the `<video>` element and handles camera access (`navigator.mediaDevices.getUserMedia()`) and displaying the live stream.
2.  **`dashcam-controls`**: Contains control buttons (Start Recording, Stop Recording, Take Snapshot) and emits custom events for user actions. Can potentially use existing button components from `../wc`.
3.  **`dashcam-snapshot-canvas`**: Manages a hidden `<canvas>` element for drawing video frames and extracting image data (Blob or Data URL).
4.  **`dashcam-api-result`**: Displays the text result received from the image-to-text API call.

## Revised Detailed Plan

1.  **Define and Create Web Components:**
    *   Create `wc/dashcam-video-feed.js`.
    *   Create `wc/dashcam-controls.js`.
    *   Create `wc/dashcam-snapshot-canvas.js`.
    *   Create `wc/dashcam-api-result.js`.
2.  **Initialize `dashcam.html`:** Create the basic HTML structure in `sites/dashcam.html`, importing the new web components and including instances of `<dashcam-video-feed>`, `<dashcam-controls>`, and `<dashcam-api-result>`.
3.  **Implement Main Script Logic:** Write a script (either inline in `dashcam.html` or in a separate file) to orchestrate component interactions:
    *   Get references to component instances.
    *   Listen for events from `<dashcam-controls>` (`start-recording`, `stop-recording`, `take-snapshot`).
    *   Trigger video recording using `MediaRecorder` based on control events (can be managed by `dashcam-video-feed` or the main script).
    *   When `take-snapshot` is triggered, get the video element from `<dashcam-video-feed>`, pass it to `<dashcam-snapshot-canvas>` to get image data.
    *   Send image data to the specified API endpoint using the `Fetch API`.
    *   Pass the API response text to the `<dashcam-api-result>` component for display.
4.  **Implement Camera Access (within `dashcam-video-feed`):** The component's `connectedCallback` will handle requesting and setting up the camera stream.
5.  **Implement Video Recording (Main Script or `dashcam-video-feed`):** Implement the `MediaRecorder` logic.
6.  **Implement Snapshot Functionality (using `dashcam-snapshot-canvas`):** Implement the logic within the component to draw the video frame and extract image data.
7.  **Implement API Call for Text Conversion (Main Script):** Handle the `Fetch API` call and response processing.
8.  **Styling:** Add CSS for component layout and appearance.

## Flow Diagram

```mermaid
graph TD
    A[User opens dashcam.html] --> B[Load Web Components];
    B --> C[Instantiate Components];
    C --> D[dashcam-video-feed];
    C --> E[dashcam-controls];
    C --> F[dashcam-api-result];
    C --> G[dashcam-snapshot-canvas];
    D --> H{Get Camera Access?};
    H -- Yes --> I[Display Live Feed];
    E --> J[User Clicks Button];
    J -- Event --> K[Main Script];
    K -- "take-snapshot" --> G;
    G --> L[Get Image Data];
    L --> M[Send Image to API];
    M --> N[Receive API Result];
    N --> F[Display API Result];
    H -- No --> O[Show Error];