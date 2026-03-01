import { Classifier } from './Classifier.js';
import { SystemPromptBuilder } from './PromptBuilder.js';
import { NativeToolDispatcher, XmlToolDispatcher } from './Dispatcher.js';

/**
 * The core Agent class that coordinates between LLM, tools, and memory.
 */
export class Agent {
  constructor(config = {}) {
    this.provider = config.provider;
    this.tools = config.tools || [];
    this.toolSpecs = this.tools.map(tool => {
      if (typeof tool.spec === 'function') {
        return tool.spec();
      }

      return {
        type: 'function',
        function: {
          name: tool.name(),
          description: tool.description(),
          parameters: tool.parameters_schema()
        }
      };
    });
    this.memory = config.memory;
    this.observer = config.observer || { record_event: () => {} };
    this.promptBuilder = config.promptBuilder || new SystemPromptBuilder();
    this.toolDispatcher = config.toolDispatcher || new XmlToolDispatcher();
    this.classifier = new Classifier(config.classificationConfig);
    this.modelName = config.modelName || 'anthropic/claude-3-5-sonnet';
    this.temperature = config.temperature || 0.7;
    this.maxToolIterations = config.maxToolIterations || 10;
    this.history = [];
    this.skills = config.skills || [];
    this.workspaceDir = config.workspaceDir || '.';
    this.availableHints = config.availableHints || [];
  }

  /**
   * Execute a single turn of conversation.
   * @param {string} userMessage - The message from the user.
   * @returns {Promise<string>} - The agent's response.
   */
  async turn(userMessage) {
    if (this.history.length === 0) {
      const systemPrompt = this.buildSystemPrompt();
      this.history.push({ role: 'system', content: systemPrompt });
    }

    // Load memory context
    const memoryContext = await this.loadMemoryContext(userMessage);
    const enrichedMessage = memoryContext ? `${memoryContext}
${userMessage}` : userMessage;

    this.history.push({ role: 'user', content: enrichedMessage });

    // Classify query for specialized model hints
    const effectiveModel = this.classifyModel(userMessage);

    for (let i = 0; i < this.maxToolIterations; i++) {
      const providerMessages = this.toolDispatcher.toProviderMessages(this.history);
      
      const response = await this.provider.chat({
        messages: providerMessages,
        model: effectiveModel,
        temperature: this.temperature,
        tools: this.toolDispatcher.shouldSendToolSpecs() ? this.toolSpecs : null
      });

      const [text, toolCalls] = this.toolDispatcher.parseResponse(response);

      if (toolCalls.length === 0) {
        const finalContent = text || response.text || '';
        this.history.push({ role: 'assistant', content: finalContent });
        return finalContent;
      }

      if (text) {
        this.history.push({ role: 'assistant', content: text });
        // Handle streaming/partial output if needed
      }

      this.history.push({ 
        role: 'assistant_tool_calls', 
        text: response.text, 
        tool_calls: response.tool_calls 
      });

      const results = await this.executeTools(toolCalls);
      const resultsMessage = this.toolDispatcher.formatResults(results);
      this.history.push(resultsMessage);
      
      this.trimHistory();
    }

    throw new Error(`Exceeded maximum tool iterations (${this.maxToolIterations})`);
  }

  buildSystemPrompt() {
    const instructions = this.toolDispatcher.promptInstructions(this.tools);
    const ctx = {
      workspace_dir: this.workspaceDir,
      model_name: this.modelName,
      tools: this.tools,
      skills: this.skills,
      dispatcher_instructions: instructions
    };
    return this.promptBuilder.build(ctx);
  }

  async executeTools(calls) {
    const results = [];
    for (const call of calls) {
      const tool = this.tools.find(t => t.name() === call.name);
      if (tool) {
        try {
          const result = await tool.execute(call.arguments);
          results.push({
            name: call.name,
            output: result.success ? result.output : `Error: ${result.error || result.output}`,
            success: result.success,
            tool_call_id: call.tool_call_id
          });
        } catch (e) {
          results.push({
            name: call.name,
            output: `Error executing ${call.name}: ${e.message}`,
            success: false,
            tool_call_id: call.tool_call_id
          });
        }
      } else {
        results.push({
          name: call.name,
          output: `Unknown tool: ${call.name}`,
          success: false,
          tool_call_id: call.tool_call_id
        });
      }
    }
    return results;
  }

  classifyModel(userMessage) {
    const hint = this.classifier.classify(userMessage);
    if (hint && this.availableHints.includes(hint)) {
      return `hint:${hint}`;
    }
    return this.modelName;
  }

  async loadMemoryContext(userMessage) {
    if (!this.memory) return '';
    try {
      const entries = await this.memory.recall(userMessage, 5);
      if (!entries || entries.length === 0) return '';
      
      let context = '[Memory context]';
      for (const entry of entries) {
        context += `- ${entry.key}: ${entry.content} `;
      }
      return context + ' ';
    } catch (e) {
      console.warn('Memory recall failed:', e);
      return '';
    }
  }

  trimHistory() {
    const max = 50; // Default limit
    if (this.history.length <= max) return;
    
    // Always keep system prompt
    const systemPrompt = this.history.find(m => m.role === 'system');
    const recent = this.history.slice(-max + 1);
    
    this.history = systemPrompt ? [systemPrompt, ...recent] : recent;
  }
}
