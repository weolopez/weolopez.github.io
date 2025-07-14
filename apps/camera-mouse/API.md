# Camera Mouse Service – API Reference

This document provides detailed API documentation for the main gesture recognition and tracking methods in the Camera Mouse Service.

---

## Core Methods

### `startTracking()`
**Description:**  
Initializes camera access, starts the hand tracking pipeline, and begins gesture recognition.

**Usage:**  
```javascript
cameraMouseService.startTracking();
```

---

### `stopTracking()`
**Description:**  
Stops camera capture and gesture recognition, releasing all resources.

**Usage:**  
```javascript
cameraMouseService.stopTracking();
```

---

### `calibrate()`
**Description:**  
Runs the calibration routine to set custom tracking boundaries.

**Usage:**  
```javascript
cameraMouseService.calibrate();
```

---

### Getting the Virtual Mouse Location

**There is no direct method like `getCurrentMousePosition()`.**  
To get the current virtual mouse coordinates, use the `lastMousePosition` property:

```javascript
const { x, y } = cameraMouseService.lastMousePosition;
console.log('Virtual mouse location:', x, y);
```

Or, listen for the `mouseMove` event:

```javascript
cameraMouseService.addEventListener('mouseMove', (event) => {
  const { x, y } = event.detail;
  // Use x and y as the current virtual mouse location
});
```

---

### `analyzeGestures(landmarks)`
**Description:**  
Analyzes hand landmark data to detect gestures (point, click, scroll, etc.).

**Parameters:**  
- `landmarks` (Array): Array of 21 hand landmark objects from MediaPipe.

**Returns:**  
- `gesture` (String): Detected gesture type.

---

### `processTrackingResults(results)`
**Description:**  
Processes MediaPipe tracking results, updates gesture state, and emits events.

**Parameters:**  
- `results` (Object): MediaPipe results object containing hand landmarks and metadata.

---

### `processMouseMovement(landmarks)`
**Description:**  
Maps hand landmarks to mouse coordinates and updates the virtual mouse position.

**Parameters:**  
- `landmarks` (Array): Array of hand landmark objects.

---

### `applyCustomSettings(settings)`
**Description:**  
Applies custom configuration for sensitivity, smoothing, mapping area, and gesture thresholds.

**Parameters:**  
- `settings` (Object): Partial settings object.

---

## Event Listeners

- `mouseMove`
- `mouseDown`
- `mouseUp`
- `gestureLog`
- `tracking_started`
- `tracking_stopped`

---

## Notes

- The current virtual mouse location is always available in the `lastMousePosition` property of the service.
- You can also listen for the `mouseMove` event to get real-time updates.
- All methods are asynchronous where camera or MediaPipe access is required.
- Gesture recognition logic is extensible for new gestures.
- See [`EVENTS.md`](apps/camera-mouse/EVENTS.md) for event payloads and integration details.
