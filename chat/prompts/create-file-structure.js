const fs = require('fs');
const path = require('path');

const structure = [
  { type: 'dir', name: 'public', children: [
    { type: 'file', name: 'index.html' },
    { type: 'file', name: 'styles.css' }
  ]},
  { type: 'dir', name: 'src', children: [
    { type: 'dir', name: 'components', children: [
      { type: 'file', name: 'p2pChat.js' }
    ]},
    { type: 'dir', name: 'modules', children: [
      { type: 'file', name: 'IPFSSignaler.js' },
      { type: 'file', name: 'PeerManager.js' }
    ]},
    { type: 'dir', name: 'utils', children: [
      { type: 'file', name: 'utils.js' }
    ]}
  ]},
  { type: 'dir', name: 'tests', children: [
    { type: 'file', name: 'ipfsSignaler.test.js' },
    { type: 'file', name: 'peerManager.test.js' },
    { type: 'file', name: 'p2pChat.test.js' }
  ]},
  { type: 'file', name: 'package.json' },
  { type: 'file', name: 'README.md' }
];

function createStructure(basePath, structure) {
  structure.forEach(item => {
    const itemPath = path.join(basePath, item.name);
    if (item.type === 'dir') {
      if (!fs.existsSync(itemPath)) {
        fs.mkdirSync(itemPath);
      }
      if (item.children) {
        createStructure(itemPath, item.children);
      }
    } else if (item.type === 'file') {
      if (!fs.existsSync(itemPath)) {
        fs.writeFileSync(itemPath, '');
      }
    }
  });
}

createStructure('p2p-chat-app', structure);