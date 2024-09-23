// tests/ipfsSignaler.test.js

import IPFSSignaler from '../src/modules/IPFSSignaler.js';

jest.setTimeout(30000); // Increase timeout for IPFS operations

describe('IPFSSignaler Module', () => {
  let signaler;

  beforeAll(async () => {
    try {
      signaler = new IPFSSignaler();
      await signaler.init();
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  });

  afterAll(async () => {
    try {
      if (signaler) {
        await signaler.shutdown();
      }
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  });

  test('should add data to IPFS and return a valid CID', async () => {
    const data = { message: 'Hello, IPFS!' };
    const cid = await signaler.addData(data);
    expect(cid).toBeDefined();
  });
});