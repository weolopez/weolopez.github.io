# Developer Onboarding Guide

Welcome to the Camera Mouse Controller project! This guide will help you get set up, understand the codebase, and start contributing effectively.

---

## 1. Project Overview

- **Purpose:** Control the mouse using hand gestures detected via webcam.
- **Core Files:**  
  - [`camera-mouse-service.js`](camera-mouse-service.js): Main logic for tracking and gesture recognition.
  - [`camera-mouse-component.js`](camera-mouse-component.js): Web component for UI integration.
  - [`camera-mouse-test.js`](camera-mouse-test.js): Interactive test harness.
  - [`ARCHITECTURE.md`](ARCHITECTURE.md): System overview and diagrams.

---

## 2. Getting Started

1. **Clone the repository**  
   ```bash
   git clone <repo-url>
   cd camera-mouse
   ```

2. **Install dependencies**  
   No build step required for core demo. For advanced features, see documentation.

3. **Run a local server**  
   ```bash
   npx http-server
   ```
   Open `index.html` or `test.html` in your browser.

4. **Grant camera permissions**  
   Allow access when prompted.

---

## 3. Exploring the Codebase

- **Start with [`ARCHITECTURE.md`](ARCHITECTURE.md)** for a high-level overview.
- Review [`DOCUMENTATION_STRUCTURE.md`](DOCUMENTATION_STRUCTURE.md) for navigation.
- Examine [`GESTURE_RECOGNITION.md`](GESTURE_RECOGNITION.md) and [`TRACKING_PIPELINE.md`](TRACKING_PIPELINE.md) for technical details.

---

## 4. Making Changes

- Fork the repo and create a new branch for your work.
- Follow code style and contribution guidelines in [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Test your changes using the test harness (`test.html`).

---

## 5. Key Concepts

- **Event-driven architecture:** Components communicate via custom events.
- **Modular design:** UI, service, and integration layers are decoupled.
- **Configurable:** All gesture and tracking parameters are customizable.

---

## 6. Getting Help

- Review the troubleshooting guide in [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md).
- Check the API reference in [`API.md`](API.md).
- Open issues or discussions in the repository for further support.

---

Happy coding!