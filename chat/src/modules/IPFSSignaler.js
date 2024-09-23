// src/modules/IPFSSignaler.js
export default class IPFSSignaler {
  constructor() {
    // Initialize IPFS node with custom bootstrap nodes a node is a computer that is connected to the network
    this.node = null;
  }

  // Initialize IPFS node with custom bootstrap nodes
  async init() {
    try {
      this.node = await createIPFS({
        config: {
          Bootstrap: [
            '/dns4/ipfs.bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNL3BKE8FSzBPVkdCZdYQ7xgJRn',
            '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
            // Add more reliable nodes as needed
          ],
        },
      });
      console.log('IPFS node initialized');
    } catch (error) {
      console.error('IPFS initialization error:', error);
      throw error;
    }
  }

  // Add data to IPFS and return the CID of the added data
  // CID: Content Identifier, a unique identifier for the content
  async addData(data) {
    try {
      const { cid } = await this.node.add(JSON.stringify(data));
      return cid.toString();
    } catch (error) {
      console.error('Error adding data to IPFS:', error);
      throw error;
    }
  }

  // Retrieve data from IPFS using CID
  async getData(cid) {
    try {
      const chunks = [];
      for await (const chunk of this.node.cat(cid)) {
        chunks.push(chunk);
      }
      // Concatenate Uint8Arrays
      const fullArray = chunks.reduce((acc, val) => {
        const tmp = new Uint8Array(acc.length + val.length);
        tmp.set(acc, 0);
        tmp.set(val, acc.length);
        return tmp;
      }, new Uint8Array());

      const data = new TextDecoder().decode(fullArray);
      return JSON.parse(data);
    } catch (error) {
      console.error('Error retrieving data from IPFS:', error);
      throw error;
    }
  }

  // Shutdown IPFS node gracefully
  async shutdown() {
    if (this.node) {
      await this.node.stop();
      console.log('IPFS node stopped');
    }
  }
}
