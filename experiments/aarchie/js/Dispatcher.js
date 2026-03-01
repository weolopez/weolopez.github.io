/**
 * Tool call dispatching logic.
 * Handles parsing LLM responses and formatting tool results.
 */

export class ToolDispatcher {
  /**
   * Parse a chat response for tool calls.
   * @param {Object} response - The chat response from the provider.
   * @returns {[string, Array<Object>]} - A tuple of [text_content, tool_calls].
   */
  parseResponse(response) {
    throw new Error('Not implemented');
  }

  /**
   * Format tool results into a conversation message.
   * @param {Array<Object>} results - The execution results of tools.
   * @returns {Object} - A conversation message containing the results.
   */
  formatResults(results) {
    throw new Error('Not implemented');
  }

  /**
   * Return prompt instructions for tool use.
   * @param {Array<Object>} tools - The registry of tools.
   * @returns {string} - The instruction block for the system prompt.
   */
  promptInstructions(tools) {
    throw new Error('Not implemented');
  }

  /**
   * Transform conversation history for a specific provider format.
   * @param {Array<Object>} history - The conversation history.
   * @returns {Array<Object>} - The formatted messages for the provider.
   */
  toProviderMessages(history) {
    return history.map(msg => ({ ...msg }));
  }

  /**
   * @returns {boolean} - Whether tool specs should be sent to the provider.
   */
  shouldSendToolSpecs() {
    return false;
  }
}

export class XmlToolDispatcher extends ToolDispatcher {
  parseResponse(response) {
    const text = response.text || '';
    const textParts = [];
    const calls = [];
    let remaining = text;

    const startTag = '<tool_call>';
    const endTag = '</tool_call>';

    let startIndex;
    while ((startIndex = remaining.indexOf(startTag)) !== -1) {
      const before = remaining.substring(0, startIndex).trim();
      if (before) textParts.push(before);

      const endIndex = remaining.indexOf(endTag, startIndex);
      if (endIndex !== -1) {
        const inner = remaining.substring(startIndex + startTag.length, endIndex).trim();
        try {
          const parsed = JSON.parse(inner);
          if (parsed.name) {
            calls.push({
              name: parsed.name,
              arguments: parsed.arguments || {},
              tool_call_id: null
            });
          }
        } catch (e) {
          console.warn('Malformed <tool_call> JSON:', e);
        }
        remaining = remaining.substring(endIndex + endTag.length);
      } else {
        break;
      }
    }

    if (remaining.trim()) textParts.push(remaining.trim());

    return [textParts.join(' '), calls];
  }

  formatResults(results) {
    let content = '[Tool results] ';
    for (const result of results) {
      const status = result.success ? 'ok' : 'error';
      content += `<tool_result name="${result.name}" status="${status}">
${result.output}
</tool_result>
`;
    }
    return { role: 'user', content };
  }

  promptInstructions(tools) {
    let instructions = '## Tool Use Protocol ';
    instructions += 'To use a tool, wrap a JSON object in <tool_call></tool_call> tags: ';
    instructions += '``` <tool_call> {"name": "tool_name", "arguments": {"param": "value"}} </tool_call> ``` ';
    instructions += '### Available Tools ';

    for (const tool of tools) {
      instructions += `- **${tool.name()}**: ${tool.description()} Parameters: ${JSON.stringify(tool.parameters_schema())} `;
    }

    return instructions;
  }
}

export class NativeToolDispatcher extends ToolDispatcher {
  parseResponse(response) {
    const text = response.text || '';
    const calls = (response.tool_calls || []).map(tc => ({
      name: tc.name,
      arguments: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : tc.arguments,
      tool_call_id: tc.id
    }));
    return [text, calls];
  }

  formatResults(results) {
    return {
      role: 'tool_results',
      tool_results: results.map(r => ({
        tool_call_id: r.tool_call_id || 'unknown',
        content: r.output
      }))
    };
  }

  promptInstructions(tools) {
    return ''; // Native dispatcher instructions are handled by the provider's system prompt
  }

  shouldSendToolSpecs() {
    return true;
  }
}
