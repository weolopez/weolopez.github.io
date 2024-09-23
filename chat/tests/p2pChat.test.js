// tests/p2pChat.test.js

/**
 * @jest-environment jsdom
 */

import '../src/components/p2pChat.js';

describe('P2PChat Web Component', () => {
  let chatComponent;
  let chatBox;

  beforeEach(() => {
    document.body.innerHTML = `
      <p2p-chat id="chatComponent"></p2p-chat>
      <div id="chatBox"></div>
    `;
    chatComponent = document.getElementById('chatComponent');
    chatBox = document.getElementById('chatBox');
  });

  test('should initialize IPFS and emit "ipfs-ready"', (done) => {
    chatComponent.addEventListener('ipfs-ready', () => {
      expect(chatComponent.signaler.node).toBeDefined();
      done();
    });
  });

  test('should create an offer and emit "offer-created"', (done) => {
    chatComponent.addEventListener('offer-created', (event) => {
      expect(event.detail.offerCID).toBeDefined();
      done();
    });
    chatComponent.createOffer();
  });

  // Additional tests can be added for handling offers, answers, ICE candidates, and messaging
});
