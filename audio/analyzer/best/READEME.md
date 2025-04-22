
# Audio Visualizer with Frequency Bands

## Introduction

This project is a web-based audio visualizer implemented in a single HTML file. It utilizes the p5.js library (including p5.sound) to capture audio input from the user's microphone, analyze its properties in real-time, and generate corresponding visual feedback on an HTML canvas.

## Detailed Description

The application listens to the default microphone input once the user clicks the "Start Visualizer" button. It then performs the following actions:

1.  **Frequency Visualization:** It analyzes the incoming audio's frequency spectrum using Fast Fourier Transform (FFT). The spectrum is visualized on the canvas, with specific frequency ranges highlighted:
    *   **Bass (60-250 Hz):** Drawn in Red
    *   **Midrange (250-2000 Hz):** Drawn in Green
    *   **Presence (2000-4000 Hz):** Drawn in Blue
    *   **Brilliance (4000-20000 Hz):** Drawn in Yellow
2.  **Beat Detection:** It attempts to detect beats in the audio stream using peak detection. When a beat is detected, a temporary red circle flashes in the center of the screen.
3.  **Information Display:** An information panel at the top of the screen displays real-time audio analysis results:
    *   **Tempo:** Estimated Beats Per Minute (BPM) based on the detected beat intervals.
    *   **Volume:** Current input volume level.
    *   **Note:** The dominant musical note (e.g., C4, F#5) derived from the audio's fundamental frequency (centroid).
    *   **Frequency:** The calculated dominant frequency (centroid) in Hertz (Hz).

The visualization and information update continuously, providing a dynamic representation of the microphone audio.

## Technical Analysis

*   **Technologies:**
    *   HTML: Structures the web page content (canvas, info panel, button).
    *   CSS: Styles the page elements for layout and appearance.
    *   JavaScript: Implements the core logic for audio processing and visualization.
    *   **p5.js:** A JavaScript library for creative coding, used here for canvas drawing, audio input (`p5.AudioIn`), FFT analysis (`p5.FFT`), and beat detection (`p5.PeakDetect`).
    *   **p5.sound.js:** An addon for p5.js that provides easy access to Web Audio API features.

*   **Core Concepts:**
    *   **Web Audio API:** Underneath p5.sound, the browser's Web Audio API is used for accessing the microphone and processing audio data. User interaction (button click) is required to initiate the `AudioContext`.
    *   **Fast Fourier Transform (FFT):** An algorithm used to convert the time-domain audio signal into the frequency domain, allowing analysis of the amplitude of different frequencies present in the sound.
    *   **Peak Detection:** An algorithm used to identify significant peaks in the audio signal's amplitude or specific frequency bands, often corresponding to beats.
    *   **Frequency Centroid:** A measure representing the "center of mass" of the spectrum, often used as an indicator of the dominant frequency or perceived pitch.
    *   **Frequency-to-MIDI Conversion:** The dominant frequency is converted to a MIDI note number, which is then mapped to a standard musical note name and octave.
    *   **DOM Manipulation:** Standard JavaScript is used to update the text content of the HTML elements in the info panel (`#tempo`, `#volume`, `#note`, `#frequency`).

*   **File Structure:**
    *   The entire application (HTML, CSS, JavaScript) is contained within the single `audio_visualizer4.html` file.
    *   p5.js and p5.sound.js libraries are loaded externally from a Content Delivery Network (CDN).

*   **Execution Flow:**
    1.  The HTML page loads, displaying the "Start Visualizer" button and the info panel structure.
    2.  The `setup()` function in the p5.js script initializes the canvas, audio components (mic, FFT, beatDetect), and sets up the button listener.
    3.  The user clicks the "Start Visualizer" button.
    4.  The `startAudio()` function is called, which initiates the browser's audio context (`userStartAudio()`) and starts the microphone input (`mic.start()`). The button is hidden.
    5.  The `draw()` function begins its loop:
        *   Analyzes the current audio frame using `fft.analyze()`.
        *   Updates the beat detector using `beatDetect.update(fft)`.
        *   If a beat is detected, it updates the tempo calculation and draws a visual cue.
        *   Calls `drawFrequencyBand()` for each defined frequency range to visualize the spectrum.
        *   Periodically calls `updateInfo()` to recalculate and display the tempo, volume, note, and frequency in the info panel.
    6.  The `windowResized()` function ensures the canvas resizes if the browser window changes size.

```