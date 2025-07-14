# Configuration & Settings Guide

This document explains all configuration options available in the Camera Mouse Controller, with examples for customizing gesture recognition and tracking behavior.

---

## Configuration Overview

Settings can be provided when instantiating the service or updated at runtime using `applyCustomSettings()`.

### Example Default Settings

```json
{
  "sensitivity": 2.1,
  "smoothing": 0.6,
  "cursorOffset": { "x": 0.05, "y": -0.08 },
  "desktopMappingArea": {
    "enabled": true,
    "x": 0.25,
    "y": 0.25,
    "width": 0.75,
    "height": 0.75
  },
  "gestureSettings": {
    "confidenceThreshold": 0.7,
    "deadZoneRadius": 0.02,
    "doubleClickInterval": 300,
    "scrollSensitivity": 500,
    "gestureHoldTime": 150
  }
}
```

---

## Setting Descriptions

- **sensitivity**: Controls how much hand movement translates to cursor movement (higher = faster).
- **smoothing**: Reduces cursor jitter by averaging movements (0.0–0.9).
- **cursorOffset**: Offsets the cursor position relative to the detected fingertip.
- **desktopMappingArea**: Defines the region of the camera frame mapped to the desktop.
  - **enabled**: Whether mapping area is active.
  - **x, y**: Top-left corner (normalized 0–1).
  - **width, height**: Size of the mapping area (normalized 0–1).
- **gestureSettings**: Fine-tunes gesture recognition.
  - **confidenceThreshold**: Minimum confidence for gesture detection.
  - **deadZoneRadius**: Ignores small, unintentional movements.
  - **doubleClickInterval**: Max time (ms) between clicks for double-click.
  - **scrollSensitivity**: Controls scroll speed.
  - **gestureHoldTime**: Time (ms) gesture must be held to trigger.

---

## Updating Settings at Runtime

```javascript
cameraMouseService.applyCustomSettings({
  sensitivity: 1.5,
  gestureSettings: {
    confidenceThreshold: 0.8,
    scrollSensitivity: 300
  }
});
```

---

## Notes

- All settings can be updated without restarting the service.
- Use calibration to adjust mapping area interactively.
- Store user preferences in localStorage for persistence.
