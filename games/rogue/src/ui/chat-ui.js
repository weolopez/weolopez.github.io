// chat-ui.js

const chatUI = document.getElementById('chat-ui');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

function toggleChatUI() {
  chatUI.classList.toggle('chat-ui-visible');
  if (chatUI.classList.contains('chat-ui-visible')) {
    chatInput.focus();
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && e.ctrlKey) {
    e.preventDefault();
    if (document.activeElement !== chatInput) {
      toggleChatUI();
    }
  }
});

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message';
  msgEl.textContent = text;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatInput.value = '';
  chatInput.focus();
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});