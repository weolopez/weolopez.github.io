export class ChatUIController {
  constructor({ agent, memory, elements }) {
    this.agent = agent;
    this.memory = memory;
    this.elements = elements;

    this.assignMemoryRenderer();
    this.bindEvents();
    this.syncThemeToggleIcon();
  }

  assignMemoryRenderer() {
    window.renderMemoryList = (memories) => {
      this.renderMemoryList(memories);
    };
  }

  bindEvents() {
    this.elements.themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      this.syncThemeToggleIcon();
    });

    this.elements.userInput.addEventListener('input', () => {
      this.elements.userInput.style.height = 'auto';
      this.elements.userInput.style.height = `${this.elements.userInput.scrollHeight}px`;
    });

    this.elements.userInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.elements.chatForm.dispatchEvent(new Event('submit'));
      }
    });

    this.elements.clearMemoryBtn.addEventListener('click', async () => {
      if (confirm('Clear all agent memory?')) {
        await this.memory.clearMemory();
      }
    });

    this.elements.chatForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.handleSubmit();
    });
  }

  syncThemeToggleIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    this.elements.themeToggleIcon.className = isDark ? 'fas fa-sun text-xs' : 'fas fa-moon text-xs';
  }

  scrollToBottom() {
    this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
  }

  escapeHtml(unsafe) {
    return (unsafe || '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  appendUserMessage(text) {
    const html = `
      <div class="flex items-start justify-end message-enter">
        <div class="mr-3 bg-blue-600 p-3 rounded-2xl rounded-tr-none text-sm text-white max-w-[85%] shadow-sm">
          <p class="whitespace-pre-wrap">${this.escapeHtml(text)}</p>
        </div>
        <div class="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 shrink-0 shadow-sm">
          <i class="fas fa-user text-sm"></i>
        </div>
      </div>
    `;
    this.elements.chatMessages.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  }

  createBotMessageContainer() {
    const id = `msg_${Math.random().toString(36).substring(2, 11)}`;
    const html = `
      <div id="${id}" class="flex items-start message-enter">
        <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-md">
          <i class="fas fa-robot text-sm"></i>
        </div>
        <div class="ml-3 flex flex-col gap-2 max-w-[85%] w-full">
          <div class="content-area space-y-2"></div>
        </div>
      </div>
    `;
    this.elements.chatMessages.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
    return document.getElementById(id).querySelector('.content-area');
  }

  appendTextChunk(container, text) {
    if (!text.trim()) return;

    const block = document.createElement('div');
    block.className = 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none text-sm text-gray-800 dark:text-slate-100 shadow-sm whitespace-pre-wrap';

    let formatted = this.escapeHtml(text).replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-x-auto my-2 border border-slate-700 font-mono text-xs"><code>$1</code></pre>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    block.innerHTML = formatted;
    container.appendChild(block);
    this.scrollToBottom();
  }

  createTypingIndicator() {
    const html = `
      <div id="typingIndicator" class="flex items-start message-enter">
        <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-md">
          <i class="fas fa-robot text-sm"></i>
        </div>
        <div class="ml-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center h-[42px]">
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
    `;
    this.elements.chatMessages.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
  }

  renderMemoryList(memories) {
    this.elements.memoryList.innerHTML = '';
    if (!memories || memories.length === 0) {
      this.elements.memoryList.innerHTML = '<div class="text-xs text-gray-400 dark:text-gray-500 italic text-center py-4">No memories recorded yet...</div>';
      return;
    }

    const recent = [...memories]
      .sort((first, second) => new Date(second.timestamp) - new Date(first.timestamp))
      .slice(0, 10);

    for (const memoryEntry of recent) {
      const memoryDiv = document.createElement('div');
      memoryDiv.className = 'bg-white dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700 shadow-sm text-xs truncate cursor-help group relative';
      memoryDiv.innerHTML = `<strong>Q:</strong> ${this.escapeHtml(memoryEntry.userPrompt)}`;

      const tooltip = document.createElement('div');
      tooltip.className = 'absolute z-50 left-full top-0 ml-2 w-48 bg-gray-800 text-white p-2 rounded text-xs hidden group-hover:block whitespace-normal shadow-lg';
      tooltip.innerHTML = `<strong>A:</strong> ${this.escapeHtml(memoryEntry.agentResponse).substring(0, 150)}...`;
      memoryDiv.appendChild(tooltip);

      this.elements.memoryList.appendChild(memoryDiv);
    }
  }

  async handleSubmit() {
    const text = this.elements.userInput.value.trim();
    if (!text) return;

    this.elements.userInput.value = '';
    this.elements.userInput.style.height = 'auto';
    this.elements.sendBtn.disabled = true;

    this.appendUserMessage(text);
    this.createTypingIndicator();

    try {
      const finalResponse = await this.agent.turn(text);
      const container = this.createBotMessageContainer();
      this.appendTextChunk(container, finalResponse);
      await this.memory.saveEpisode(text, finalResponse);
    } catch (error) {
      const container = this.createBotMessageContainer();
      this.appendTextChunk(container, `⚠️ An error occurred: ${error.message}`);
      console.error(error);
    } finally {
      this.removeTypingIndicator();
      this.elements.sendBtn.disabled = false;
      this.elements.userInput.focus();
      this.scrollToBottom();
    }
  }
}

function requiredElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required DOM element: #${id}`);
  }
  return element;
}

export function bootstrapChat({ agent, memory }) {
  const elements = {
    chatMessages: requiredElement('chatMessages'),
    chatForm: requiredElement('chatForm'),
    userInput: requiredElement('userInput'),
    sendBtn: requiredElement('sendBtn'),
    memoryList: requiredElement('memoryList'),
    clearMemoryBtn: requiredElement('clearMemoryBtn'),
    themeToggleBtn: requiredElement('themeToggleBtn'),
    themeToggleIcon: requiredElement('themeToggleIcon')
  };

  return new ChatUIController({ agent, memory, elements });
}
