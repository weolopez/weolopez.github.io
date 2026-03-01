import { Agent } from './Agent.js';
import { XmlToolDispatcher } from './Dispatcher.js';
import { WebChatMemory } from './WebChatMemory.js';
import { JavaScriptExecuteTool, LoadSkillTool } from './BrowserTools.js';
import { GeminiProvider } from './GeminiProvider.js';
import { bootstrapChat } from './chat.js';

export function bootstrapAarchie() {
  const apiKey = localStorage.getItem('GEMINI_API_KEY') || '';

  const memory = new WebChatMemory('webchat', 'session1');
  const provider = new GeminiProvider(apiKey);
  const tools = [new JavaScriptExecuteTool(), new LoadSkillTool()];

  const agent = new Agent({
    provider,
    tools,
    memory,
    toolDispatcher: new XmlToolDispatcher(),
    classificationConfig: { enabled: false },
    modelName: 'gemini-3-flash-preview'
  });

  return bootstrapChat({ agent, memory });
}

bootstrapAarchie();
