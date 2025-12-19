/********************
 * Base Introspection
 * return: {
    attributes: { attrName: "type", ... },
    events: { eventName: "event", ... }
   }
 ********************/
export function discoverAPI(tagName) {
  const constructor = customElements.get(tagName);
  if (!constructor) return {};

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
export function getCanvasAPIs(containerSelector = '#canvas') {
  const elements = [...document.querySelectorAll(`${containerSelector} > *`)];
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

export function buildGeminiTools(containerSelector = '#canvas') {
  return getCanvasAPIs(containerSelector).flatMap(comp =>
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

export async function routeCommand(text, apiKey, containerSelector = '#canvas') {
  const tools = buildGeminiTools(containerSelector);

  const body = {
    contents: [{ role: 'user', parts: [{ text }] }],
    tools: [{ functionDeclarations: tools }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
  if (!part) return null;

  return { tool: part.functionCall.name, args: part.functionCall.args };
}

export function executeTool(cmd) {
  if (!cmd) return 'No action taken.';
  const [id, action] = cmd.tool.split('.');
  const attr = action.replace('set_', '');
  const element = document.getElementById(id);
  if (!element) return `Element with id ${id} not found.`;
  element.setAttribute(attr, cmd.args.value);
  return `${id}: ${attr} set to ${cmd.args.value}`;
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
