// src/modules/PeerManager.js

export default class PeerManager {
    constructor(signaler, eventEmitter) {
      this.signaler = signaler;
      this.eventEmitter = eventEmitter;
      this.peerConnection = null;
      this.dataChannel = null;
      this.iceCandidates = [];
    }
  
    // Create a WebRTC connection and generate an SDP offer
    async createOffer() {
      try {
        this.setupPeerConnection();
        this.dataChannel = this.peerConnection.createDataChannel('chat');
        this.setupDataChannel();
        this.setupICEHandling();
  
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
  
        // Publish the offer SDP to IPFS and trigger event
        const offerCID = await this.signaler.addData(this.peerConnection.localDescription);
        this.eventEmitter.emit('offer-created', offerCID);
      } catch (error) {
        console.error('Error creating offer:', error);
        this.eventEmitter.emit('error', 'Failed to create offer');
        throw error;
      }
    }
  
    // Handle a received SDP offer and generate an answer
    async handleOffer(offerCID) {
      try {
        const offer = await this.signaler.getData(offerCID);
        this.setupPeerConnection();
        await this.peerConnection.setRemoteDescription(offer);
        this.setupICEHandling();
  
        this.peerConnection.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.setupDataChannel();
        };
  
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
  
        // Publish the answer SDP to IPFS and trigger event
        const answerCID = await this.signaler.addData(this.peerConnection.localDescription);
        this.eventEmitter.emit('answer-created', answerCID);
      } catch (error) {
        console.error('Error handling offer:', error);
        this.eventEmitter.emit('error', 'Failed to handle offer');
        throw error;
      }
    }
  
    // Handle a received SDP answer
    async handleAnswer(answerCID) {
      try {
        const answer = await this.signaler.getData(answerCID);
        await this.peerConnection.setRemoteDescription(answer);
      } catch (error) {
        console.error('Error handling answer:', error);
        this.eventEmitter.emit('error', 'Failed to handle answer');
        throw error;
      }
    }
  
    // Add ICE candidates received from the other peer
    async addIceCandidates(iceCID) {
      try {
        const candidates = await this.signaler.getData(iceCID);
        for (const candidate of candidates) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error('Error adding ICE candidates:', error);
        this.eventEmitter.emit('error', 'Failed to add ICE candidates');
        throw error;
      }
    }
  
    // Send a message through the data channel
    sendMessage(message) {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(message);
        this.eventEmitter.emit('message-sent', message);
      } else {
        console.error('Data channel is not open');
        this.eventEmitter.emit('error', 'Data channel is not open');
      }
    }
  
    // Setup the RTCPeerConnection
    setupPeerConnection() {
      this.peerConnection = new RTCPeerConnection();
  
      // Listen for ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.iceCandidates.push(event.candidate.toJSON());
          if (this.iceCandidates.length >= 5) { // Bundle ICE candidates
            this.bundleIceCandidates();
          }
        }
      };
  
      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);
        if (this.peerConnection.connectionState === 'disconnected') {
          this.eventEmitter.emit('disconnected');
        }
      };
    }
  
    // Setup the data channel for message exchange
    setupDataChannel() {
      if (!this.dataChannel) return;
  
      this.dataChannel.onmessage = (event) => {
        this.eventEmitter.emit('message-received', event.data);
      };
  
      this.dataChannel.onopen = () => {
        console.log('Data channel is open');
        this.eventEmitter.emit('datachannel-open');
      };
  
      this.dataChannel.onclose = () => {
        console.log('Data channel is closed');
        this.eventEmitter.emit('datachannel-closed');
      };
    }
  
    // Bundle ICE candidates and publish to IPFS
    async bundleIceCandidates() {
      try {
        const iceCID = await this.signaler.addData(this.iceCandidates);
        this.eventEmitter.emit('ice-candidates', iceCID);
        this.iceCandidates = []; // Reset after bundling
      } catch (error) {
        console.error('Error bundling ICE candidates:', error);
        this.eventEmitter.emit('error', 'Failed to bundle ICE candidates');
        throw error;
      }
    }
  
    // Handle ICE candidates from the other peer
    async handleRemoteIceCandidates(iceCID) {
      await this.addIceCandidates(iceCID);
    }
  
    // Close the peer connection and data channel
    closeConnection() {
      if (this.dataChannel) this.dataChannel.close();
      if (this.peerConnection) this.peerConnection.close();
      this.eventEmitter.emit('connection-closed');
    }
  }
  