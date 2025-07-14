# Troubleshooting Guide

This guide covers common issues encountered when developing or using the Camera Mouse Controller, along with solutions and debugging tips.

---

## Common Issues & Solutions

### 1. Camera Access Denied

**Symptoms:**  
- No video feed appears  
- Tracking does not start

**Solutions:**  
- Check browser permissions and allow camera access.
- Ensure the site is served over HTTPS.
- Try refreshing the page or restarting the browser.

---

### 2. Poor Tracking Quality

**Symptoms:**  
- Hand not detected reliably  
- Cursor jumps or is unresponsive

**Solutions:**  
- Improve lighting conditions and avoid backlighting.
- Keep hand clearly visible and within the camera frame.
- Use the calibration feature to set custom tracking boundaries.
- Minimize background movement and clutter.

---

### 3. Low Performance

**Symptoms:**  
- Low frame rate (FPS)  
- High latency in cursor movement

**Solutions:**  
- Close other applications or browser tabs using the camera.
- Ensure GPU acceleration is enabled in browser settings.
- Reduce browser zoom level.
- Use the latest version of your browser.

---

### 4. Gesture Not Recognized

**Symptoms:**  
- Expected gesture does not trigger mouse action

**Solutions:**  
- Hold the gesture steady for at least the minimum hold time.
- Adjust gesture sensitivity and confidence threshold in settings.
- Check for correct hand orientation and finger extension.

---

### 5. Desktop Integration Not Working

**Symptoms:**  
- Mouse events do not reach the desktop environment

**Solutions:**  
- Ensure desktop integration is enabled and supported.
- Check for errors in the browser console.
- Verify correct configuration of desktop mapping area.

---

## Debugging Tips

- Use the test harness (`test.html`) to visualize events and gestures.
- Open the browser console for detailed error messages.
- Log gesture recognition output using the `gestureLog` event.
- Review the API and configuration documentation for advanced troubleshooting.

---

## Error Messages Reference

- **"Camera access not supported"**: Browser does not support `getUserMedia`.
- **"Camera permission denied"**: User denied camera access.
- **"No camera found"**: No camera device detected.
- **"Camera already in use"**: Another application is using the camera.
- **"MediaPipe initialization failed"**: Network or compatibility issue.
