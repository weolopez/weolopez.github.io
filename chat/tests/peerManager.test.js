// tests/peerManager.test.js

import PeerManager from '../src/modules/PeerManager.js';
import IPFSSignaler from '../src/modules/IPFSSignaler.js';

jest.setTimeout(60000); // Increase timeout for WebRTC operations

describe('PeerManager Module', () => {
  let signaler1, signaler2;
  let peerManager1, peerManager2;
  let events1, events2;

  beforeAll(async () => {
    signaler1 = new IPFSSignaler();
    signaler2 = new IPFSSignaler();
    await signaler1.init();
    await signaler2.init();

    events1 = new EventTarget();
    events2 = new EventTarget();

    peerManager1 = new PeerManager(signaler1, events1);
    peerManager2 = new PeerManager(signaler2, events2);
  });

  afterAll(async () => {
    await signaler1.shutdown();
    await signaler2.shutdown();
  });

  test('should establish a connection and exchange messages', async (done) => {
    // Listen for offer creation on PeerManager1
    events1.addEventListener('offer-created', async (offerCID) => {
      // PeerManager2 handles the offer
      await peerManager2.handleOffer(offerCID.detail);
    });

    // Listen for answer creation on PeerManager2
    events2.addEventListener('answer-created', async (answerCID) => {
      // PeerManager1 handles the answer
      await peerManager1.handleAnswer(answerCID.detail);
    });

    // Listen for message received on PeerManager2
    events2.addEventListener('message-received', (message) => {
      expect(message.detail).toBe('Hello from Peer1');
      done();
    });

    // Listen for data channel open on PeerManager1
    events1.addEventListener('datachannel-open', () => {
      // PeerManager1 sends a message
      peerManager1.sendMessage('Hello from Peer1');
    });

    // Initiate connection from PeerManager1
    await peerManager1.createOffer();
  });
});
