

**Prompt:**

> Generate a comprehensive **Test Driven Development (TDD)** test file for a serverless peer-to-peer chat application that uses IPFS for WebRTC signaling. The chat app should allow two browsers to connect and exchange messages directly, without using a central server. The application has the following key features:
> 
> 1. **IPFS signaling**: Uses IPFS to exchange WebRTC signaling data, including offers, answers, and ICE candidates.
> 2. **Peer connection setup**: Establishes a WebRTC connection between two browsers by exchanging signaling information and ICE candidates.
> 3. **Message exchange**: After the connection is established, peers can send and receive chat messages in real-time.
> 4. **Event-driven architecture**: All core functionality (peer connection, signaling, messaging) is built around browser events (e.g., `message-received`, `offer-created`, `answer-created`, `ice-candidates`).
> 5. **Handling ICE candidates**: The application bundles and exchanges ICE candidates to handle different network conditions.
> 
> The TDD test file should:
> 
> - Cover unit tests for all core functions such as creating offers, handling answers, bundling ICE candidates, sending messages, and receiving messages.
> - Include integration tests to simulate a complete peer-to-peer chat session, verifying successful peer connection and message exchange between two browsers.
> - Use mock objects to simulate IPFS interactions for offer, answer, and ICE candidate exchanges.
> - Ensure that events like `offer-created`, `answer-created`, `message-received`, and `ice-candidates` are dispatched correctly at appropriate points in the connection lifecycle.
> - Test edge cases, such as failed connections, delayed ICE candidate exchanges, and message failures.

