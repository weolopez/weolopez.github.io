# Camera Mouse Controller

A standalone web component that uses camera input and hand tracking to control mouse movement and clicks through hand gestures.

## Features

- **Real-time Hand Tracking**: Uses MediaPipe HandLandmarker for accurate hand detection
- **Virtual Mouse Control**: Convert hand movements to mouse cursor movement
- **Gesture Recognition**: Pinch gestures for clicking and dragging
- **Calibration System**: Customize tracking area boundaries
- **Performance Monitoring**: Real-time FPS and tracking quality indicators
- **Accessibility**: Full keyboard navigation and screen reader support
- **Mobile Responsive**: Works on both desktop and mobile devices

## Quick Start

1. **Serve the files**: Use any HTTP server to serve the component files
   ```bash
   npx http-server
   ```

2. **Open in browser**: Navigate to `index.html` in your browser

3. **Grant permissions**: Allow camera access when prompted

4. **Start tracking**: Click "Start Tracking" button

## Usage

### Basic Controls
- **Start Tracking**: Begin camera capture and hand detection
- **Stop Tracking**: Stop tracking and release camera
- **Calibrate**: Set custom tracking boundaries (move hand around tracking area for 5 seconds)

### Hand Gestures
- **Move cursor**: Point with index finger extended 👆
- **Left Click**: Peace sign ✌️ (index and middle fingers extended)
- **Right Click**: Three fingers 🖖 (index, middle, and ring fingers extended)
- **Scroll**: Make a fist 👊 and move vertically
- **Double Click**: Peace sign twice quickly ✌️✌️
- **Drag**: Hold peace sign while moving ✌️↔️

### Settings
- **Sensitivity**: Adjust mouse movement responsiveness (0.1-3.0)
- **Smoothing**: Reduce cursor jitter (0.0-0.9)

### Keyboard Shortcuts
- **Ctrl/Cmd + S**: Toggle tracking on/off
- **Ctrl/Cmd + C**: Start calibration
- **Escape**: Stop tracking
- **Enter/Space**: Activate focused button

## Integration

### Basic HTML Usage
```html
<!DOCTYPE html>
<html>
<head>
    <title>Camera Mouse Demo</title>
</head>
<body>
    <camera-mouse></camera-mouse>
    <script type="module" src="camera-mouse-component.js"></script>
</body>
</html>
```

### Programmatic Control
```javascript
import { CameraMouseComponent } from './camera-mouse-component.js';

const cameraMouseElement = document.querySelector('camera-mouse');

// Listen for events
cameraMouseElement.cameraMouseService.addEventListener('mouseMove', (event) => {
    console.log('Mouse moved to:', event.detail.x, event.detail.y);
});

cameraMouseElement.cameraMouseService.addEventListener('mouseDown', (event) => {
    console.log('Mouse clicked at:', event.detail.x, event.detail.y);
});

// Control programmatically
cameraMouseElement.startTracking();
cameraMouseElement.stopTracking();
```

## Browser Compatibility

### Minimum Requirements
- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

### Required Features
- WebRTC (getUserMedia)
- Web Components (Custom Elements, Shadow DOM)
- ES2020+ JavaScript features
- WebAssembly support for MediaPipe

## Performance

### Expected Performance
- **Desktop**: 25-30 FPS
- **Mobile**: 15-25 FPS
- **Latency**: 50-100ms

### Optimization Tips
- Use good lighting for better hand detection
- Keep hand within camera frame
- Minimize background movement
- Close other camera-using applications

## Troubleshooting

### Common Issues

**Camera Access Denied**
- Check browser permissions in settings
- Ensure HTTPS is used (required for camera access)
- Try refreshing the page

**Poor Tracking Quality**
- Improve lighting conditions
- Keep hand clearly visible in frame
- Avoid cluttered backgrounds
- Use calibration feature

**Low Performance**
- Close other tabs/applications
- Check if GPU acceleration is enabled
- Reduce browser zoom level
- Use latest browser version

### Error Messages

- **"Camera access not supported"**: Browser doesn't support getUserMedia
- **"Camera permission denied"**: User denied camera access
- **"No camera found"**: No camera device detected
- **"Camera already in use"**: Another application is using the camera
- **"MediaPipe initialization failed"**: Network or compatibility issue

## Development

### File Structure
```
camera-mouse/
├── camera-mouse-component.js    # Main Web Component
├── camera-mouse-service.js      # Core tracking logic
├── index.html                   # Demo page
└── README.md                   # Documentation
```

### Architecture
- **Component**: UI and interaction logic
- **Service**: Camera access and MediaPipe integration
- **Event System**: Decoupled communication between layers

### Key Technologies
- **MediaPipe Tasks Vision**: Hand landmark detection
- **Web Components**: Native browser component system
- **WebRTC**: Camera stream access
- **Canvas API**: Hand landmark visualization

## License

This component uses MediaPipe, which is licensed under the Apache License 2.0.

## Support

For issues and feature requests, please check the browser console for detailed error messages and ensure all requirements are met.