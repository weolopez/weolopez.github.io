// src/components/p2pChat.js

import IPFSSignaler from '../modules/IPFSSignaler.js';
import PeerManager from '../modules/PeerManager.js';

export default class P2PChat extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.signaler = new IPFSSignaler();
    this.eventEmitter = new EventTarget();
    this.peerManager = null;
  }

  connectedCallback() {
    this.render();
    this.initialize();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    if (this.peerManager) {
      this.peerManager.closeConnection();
    }
    this.signaler.shutdown();
  }

  // Initialize IPFS and PeerManager
  async initialize() {
    try {
      await this.signaler.init();
      this.dispatchEvent(new Event('ipfs-ready'));
      this.peerManager = new PeerManager(this.signaler, this.eventEmitter);
      this.setupPeerManagerListeners();
    } catch (error) {
      console.error('Initialization error:', error);
      this.dispatchEvent(new CustomEvent('error', { detail: 'Failed to initialize IPFS' }));
    }
  }

  // Render the component's UI
  render() {
    const style = `
      <style>
        /* Component-specific styles can be added here */
      </style>
    `;

    const template = `
      <div id="p2p-chat-container">
        <!-- The main UI is handled in index.html -->
      </div>
    `;

    this.shadowRoot.innerHTML = `${style}${template}`;
  }

  // Setup event listeners for internal events
  setupEventListeners() {
    this.addEventListener('create-offer', () => this.peerManager.createOffer());
    this.addEventListener('connect-offer', (event) => this.peerManager.handleOffer(event.detail.offerCID));
    this.addEventListener('connect-answer', (event) => this.peerManager.handleAnswer(event.detail.answerCID));
    this.addEventListener('add-ice-candidates', (event) => this.peerManager.handleRemoteIceCandidates(event.detail.iceCID));
    this.addEventListener('send-message', (event) => this.peerManager.sendMessage(event.detail.message));
  }

  // Listen to PeerManager events and re-emit them for the UI
  setupPeerManagerListeners() {
    this.peerManager.eventEmitter.addEventListener('offer-created', (cid) => {
      this.dispatchEvent(new CustomEvent('offer-created', { detail: { offerCID: cid } }));
    });

    this.peerManager.eventEmitter.addEventListener('answer-created', (cid) => {
      this.dispatchEvent(new CustomEvent('answer-created', { detail: { answerCID: cid } }));
    });

    this.peerManager.eventEmitter.addEventListener('ice-candidates', (cid) => {
      this.dispatchEvent(new CustomEvent('ice-candidates', { detail: { iceCID: cid } }));
    });

    this.peerManager.eventEmitter.addEventListener('message-received', (message) => {
      this.dispatchEvent(new CustomEvent('message-received', { detail: { message } }));
    });

    this.peerManager.eventEmitter.addEventListener('message-sent', (message) => {
      this.dispatchEvent(new CustomEvent('message-sent', { detail: { message } }));
    });

    this.peerManager.eventEmitter.addEventListener('error', (errorMsg) => {
      this.dispatchEvent(new CustomEvent('error', { detail: errorMsg }));
    });

    this.peerManager.eventEmitter.addEventListener('connection-closed', () => {
      this.dispatchEvent(new Event('connection-closed'));
    });

    this.peerManager.eventEmitter.addEventListener('datachannel-open', () => {
      this.dispatchEvent(new Event('datachannel-open'));
    });

    this.peerManager.eventEmitter.addEventListener('datachannel-closed', () => {
      this.dispatchEvent(new Event('datachannel-closed'));
    });
  }
}

customElements.define('p2p-chat', P2PChat);
