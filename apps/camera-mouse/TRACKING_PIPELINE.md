# Hand Tracking Pipeline & Coordinate Transformation

This document details the pipeline for processing hand landmark data and transforming it into actionable screen or desktop coordinates.

---

## Pipeline Overview

```mermaid
flowchart TD
    A[Camera Frame] --> B[MediaPipe HandLandmarker]
    B --> C[Raw Landmarks (21 points)]
    C --> D[Landmark Normalization & Filtering]
    D --> E[Gesture Analysis]
    E --> F[Coordinate Mapping]
    F --> G[Screen/Desktop Output]
```

---

## Pipeline Steps

1. **Camera Frame Acquisition**
   - The video stream is captured from the user's camera.

2. **Hand Landmark Detection**
   - MediaPipe processes each frame and outputs 21 hand landmark coordinates per detected hand.

3. **Landmark Normalization & Filtering**
   - Raw coordinates are normalized to a [0,1] range.
   - Smoothing and filtering algorithms reduce jitter and noise.

4. **Gesture Analysis**
   - The normalized landmarks are analyzed to detect gestures (e.g., finger extension, pinch, fist).
   - Algorithms compute angles, distances, and relative positions.

5. **Coordinate Mapping**
   - The detected gesture's reference point (typically the index fingertip) is mapped to screen or desktop coordinates.
   - Sensitivity, smoothing, and mapping area settings are applied.
   - Desktop mode applies additional scaling for multi-monitor setups.

6. **Screen/Desktop Output**
   - The final coordinates are used to move the mouse cursor or trigger events in the UI or desktop environment.

---

## Key Algorithms

- **Smoothing**: Exponential moving average to stabilize cursor movement.
- **Dead Zone**: Ignores small, unintentional hand movements.
- **Mapping Area**: Restricts tracking to a configurable region of the camera frame.
- **Coordinate Scaling**: Adjusts for different screen resolutions and aspect ratios.

---

## Example: Index Finger Mapping

- **Input**: Index fingertip landmark (normalized x, y)
- **Transform**: Apply sensitivity and offset, map to screen width/height
- **Output**: Pixel coordinates for mouse cursor movement

---

## Notes

- All coordinate transformations are centralized in the service for consistency.
- The pipeline is designed for extensibility (e.g., multi-hand support, new gestures).
