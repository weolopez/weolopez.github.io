/********************
 * Base Introspection
 * return: {
    attributes: { attrName: "type", ... },
    events: { eventName: "event", ... }
   }
 ********************/
export function discoverAPI(tagName, element) {
  const constructor = customElements.get(tagName);
  if (!constructor) return;

  const schema = { attributes: {}, events: {} };
  const observed = constructor.observedAttributes || [];

  for (const attr of observed) {
    const example = element.getAttribute(attr);
    if (typeof attr === 'string') {
      schema.attributes[attr] = { type: 'string', example: example };
    } else {
      for (const [name, type] of Object.entries(attr)) {
        if (name.startsWith('on')) {
          schema.events[name.slice(2)] = 'event';
        } else {
          schema.attributes[name] = { type: type, example: example};
        }
      }
    }
  }
  return schema;
}

export function getAPIs(root) {
  const elements = [...root.querySelectorAll('*')];
  const functions = elements
    .filter(el => el.tagName.includes('-'))
    .map(el => {
      const name = el.tagName.toLowerCase();
      const apis = discoverAPI(name, el);
      const functionList = [];
      for (const [attr, value] of Object.entries(apis.attributes)) {
        functionList.push({
          id: el.id,
          tag: el.tagName.toLowerCase(),
          description: `Sets the ${attr} attribute of <${name}> component. With type of ${value.type}. ${(value.example) ? 'For example: ' + value.example : ''}`,
          attributes: [attr]
        });
      }

      for (const [event, type] of Object.entries(apis.events)) {
        functionList.push({
          id: el.id,
          tag: el.tagName.toLowerCase(),
          description: `Event listener for ${event} event on <${name}> component.`,
          attributes: ['handler']
        });
      }

      return functionList;
    });
  return functions.flat();
}

export function buildTools(root) {
  return getAPIs(root).flatMap(comp =>
    comp.attributes.map(attr => ({
      name: `${comp.id}.set_${attr}`,
      description: `Set ${attr} on ${comp.id}: ${comp.description}`,
      parameters: {
        type: 'object',
        properties: { value: { type: 'string' } },
        required: ['value']
      }
    }))
  );
}


/**
 * Fetches a response from Ollama using the Gemma model, implementing the tool-calling loop.
 * @param {string} text - The user's prompt.
 * @param {string} [systemPrompt] - Optional system instructions.
 * @param {Array} [canvasTools] - Array of tool definitions in Gemini format.
 * @returns {Promise<Object>} - The final JSON response from Ollama.
 */
export async function fetchGemma(text = '', systemPrompt = null, canvasTools = []) {
  const OLLAMA_URL = "http://localhost:11434/api/chat";
  const MODEL = localStorage.getItem('OLLAMA_MODEL') || "functiongemma:270m";

  // Convert Gemini-style tools to Ollama-style tools
  const tools = canvasTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));

  let messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: text });

  try {
    // First request to Ollama
    let response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        tools: tools.length > 0 ? tools : undefined,
        stream: false
      })
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);

    let data = await response.json();
    let message = data.message;

    // Check for tool calls in the response (implements the script's logic)
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolResults = message.tool_calls.map(tc => {
        // Execute the tool using the existing executeTool helper
        const result = executeTool({ 
          type: 'tool', 
          tool: tc.function.name, 
          args: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments 
        });
        
        return {
          role: 'tool',
          content: JSON.stringify({ result }),
          tool_calls: []
        };
      });

      // Append assistant message and tool results to history
      messages.push(message);
      messages.push(...toolResults);

      // Second request to get the final natural language response
      response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: messages,
          tools: [], 
          stream: false
        })
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
      data = await response.json();
    }

    return data;
  } catch (error) {
    console.error("Ollama Error:", error);
    return { error: error.message };
  }
}

export function executeTool(cmd, root = document) {
  if (!cmd) return 'No action taken.';
  if (cmd.type === 'text') return cmd.content;

  const [id, action] = cmd.tool.split('.');
  const attr = action.replace('set_', '');
  
  // Try to find by ID first, then by tag if ID is not set or not found
  let element = root.getElementById ? root.getElementById(id) : root.querySelector(`#${id}`);
  
  if (!element) {
    // Fallback: if the tool name is just "tag.set_attr", try finding by tag
    element = root.querySelector(id);
  }

  if (!element) return `Element ${id} not found.`;
  element.setAttribute(attr, cmd.args.value);
  return `${element.tagName.toLowerCase()}: ${attr} set to ${cmd.args.value}`;
}

export async function sendMessage(text, parentElement) {
  const canvasTools = buildTools(parentElement);
  const json = await fetchGemma(text, 
    'You are a seasoned web developer. Your task is to update web component attributes based on user input. Use the provided tools to set attribute values on components identified by their IDs. ', 
    canvasTools);
  return json.message.content;
}