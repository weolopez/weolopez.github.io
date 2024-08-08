const horizontalScrollPanels = document.getElementById('horizontal-scroll-panel');
const imagePreviewElement = document.querySelector('image-preview');
const chatHeader = document.querySelector('chat-header');
const chatGroupList = document.querySelector('chat-group-list');
const chatMessages = document.querySelector('.chat-messages');
const chatContainer = document.querySelector('.chat-container');
const imageLabel = document.querySelector('.image-label');
const selectedText = document.getElementById('selectedText')
const sendButton = document.getElementById('chat-button');
const chatInput = document.getElementById('chat-input');
const context = document.getElementById('context')
const contextRefresh = document.getElementById('context-refresh')
// Create and append the popover element
const popover = document.querySelector('copy-popover');

const chatBubble = document.querySelector('chat-bubble');
var PAGE_URL_STRING=''

let spinner = document.getElementById('spinner')
spinner.show = () => spinner.style.display = 'flex'
spinner.hide = () => spinner.style.display = 'none'
