/********************
 * Base Introspection
 * return: {
    attributes: { attrName: "type", ... },
    events: { eventName: "event", ... }
   }
 ********************/
export function discoverAPI(tagName) {
  const constructor = customElements.get(tagName);
  if (!constructor) return;

  const schema = { attributes: {}, events: {} };
  const observed = constructor.observedAttributes || [];

  for (const attr of observed) {
    if (typeof attr === 'string') {
      schema.attributes[attr] = 'string';
    } else {
      for (const [name, type] of Object.entries(attr)) {
        if (name.startsWith('on')) {
          schema.events[name.slice(2)] = 'event';
        } else {
          schema.attributes[name] = type;
        }
      }
    }
  }
  return schema;
}

/********************
 * Canvas Introspection (Attribute-driven)
 * return: [
    {
      id: element id,
      tag: tag name,
      description: element description,
      attributes: [attr1, attr2, ...]
    },
    ...
   ]
 ********************/
export function getCanvasAPIs(containerSelector = '#canvas', root = document) {
  const elements = [...root.querySelectorAll(`${containerSelector} *`)];
  const functions = elements
    .filter(el => el.tagName.includes('-'))
    .map(el => {
      const name = el.tagName.toLowerCase();
      const apis = discoverAPI(name);
      const functionList = [];
      for (const [attr, type] of Object.entries(apis.attributes)) {
        functionList.push({
          id: el.id,
          tag: el.tagName.toLowerCase(),
          description: `Sets the ${attr} attribute of <${name}> component.`,
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

export function buildGeminiTools(containerSelector = '#canvas', root = document) {
  return getCanvasAPIs(containerSelector, root).flatMap(comp =>
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

export async function fetchGemini(text = '', systemPrompt = null, canvasTools = []) {

  const payload = {
    contents: [],
    tools: canvasTools.length > 0 ? [{ functionDeclarations: canvasTools }] : undefined,
    toolConfig: canvasTools.length > 0 ? { functionCallingConfig: { mode: 'AUTO' } } : undefined
  };

  if (systemPrompt) {
    payload.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  payload.contents.push({ role: 'user', parts: [{ text }] });

  const apiKey = getApiKey();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
  return await res.json();
}


export async function routeCommand(text, containerSelector = '#canvas', root) {
  const canvasTools = buildGeminiTools(containerSelector, root);
  const json = await fetchGemini(text, 
    'You are a seasoned web developer. Your task is to update web component attributes based on user input. Use the provided tools to set attribute values on components identified by their IDs.', 
    canvasTools);
  const candidate = json.candidates?.[0];
  const part = candidate?.content?.parts?.find(p => p.functionCall);
  const textResponse = candidate?.content?.parts?.find(p => p.text)?.text;
  const cmd = part?.functionCall;
  return executeTool({ type: 'tool', tool: cmd.name, args: cmd.args }, root);
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

export function getApiKey(keyName = 'GEMINI_API_KEY') {
  let apiKey = localStorage.getItem(keyName);
  if (!apiKey) {
    apiKey = prompt(`Please enter your ${keyName}:`);
    if (apiKey) {
      localStorage.setItem(keyName, apiKey);
    }
  }
  return apiKey;
}

document.addEventListener('prompt-submit', async (e) => {
  const result = await routeCommand(e.detail.prompt, '#canvas', e.target.activeElement.canvas.shadowRoot);
  document.dispatchEvent(new CustomEvent('tool-executed', { detail: { result, timestamp: Date.now() } }));
});
