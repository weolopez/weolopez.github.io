# Gesture Recognition Workflow

This document explains the workflow for recognizing hand gestures and mapping them to mouse actions in the Camera Mouse Controller.

---

## Gesture Detection Workflow Diagram

```mermaid
flowchart TD
    A[Camera Input (Video Stream)] --> B[Hand Landmark Detection (MediaPipe)]
    B --> C[Landmark Data Processing]
    C --> D[Gesture Recognition Algorithms]
    D --> E[Gesture Classification (Point, Click, Scroll, etc.)]
    E --> F[Coordinate Transformation]
    F --> G[Mouse Event Simulation]
    G --> H[Event Dispatch to UI/Desktop]
```

---

## Workflow Steps

1. **Camera Input**  
   The user's camera provides a real-time video stream.

2. **Hand Landmark Detection**  
   MediaPipe analyzes each frame and outputs 21 hand landmark coordinates.

3. **Landmark Data Processing**  
   The service normalizes and filters landmark data for stability.

4. **Gesture Recognition Algorithms**  
   Custom logic analyzes finger positions, angles, and distances to detect gestures (e.g., point, peace sign, fist).

5. **Gesture Classification**  
   The detected gesture is classified (move, left click, right click, scroll, drag, etc.).

6. **Coordinate Transformation**  
   Hand positions are mapped to screen or desktop coordinates, applying sensitivity and smoothing.

7. **Mouse Event Simulation**  
   The service generates synthetic mouse events based on the classified gesture.

8. **Event Dispatch**  
   Mouse events are dispatched to UI components or, if enabled, to the desktop integration layer.

---

## Key Points

- Gesture recognition is modular and can be extended with new gestures.
- Filtering and smoothing are applied to reduce jitter and false positives.
- All gesture logic is centralized in the service for maintainability.
