
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

export async function fetchGemini(text = '', systemPrompt = null, canvasTools = [], context = []) {

  const payload = {
    contents: [],
    tools: canvasTools.length > 0 ? [{ functionDeclarations: canvasTools }] : undefined,
    toolConfig: canvasTools.length > 0 ? { functionCallingConfig: { mode: 'AUTO' } } : undefined
  };

  if (systemPrompt) {
    payload.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  // Add history context
  if (context && context.length > 0) {
    context.forEach(msg => {
      payload.contents.push({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    });
  }

  payload.contents.push({ role: 'user', parts: [{ text }] });

  const apiKey = getApiKey();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
  return await res.json();
}

/**
 * 1. INSPECTION LAYER
 * Scans a specific element to build a schema of what it can do
 * AND captures its current state (values).
 */
export function inspectElement(element) {
  const tagName = element.tagName.toLowerCase();
  const constructor = customElements.get(tagName);

  // If it's not a known web component, skip it
  if (!constructor || !constructor.observedAttributes) return null;

  const schema = {
    id: element.id || `unknown_${Math.random().toString(36).substr(2, 9)}`,
    tag: tagName,
    properties: {},
    currentState: {},
  };

  // Iterate over observed attributes to build the definition
  constructor.observedAttributes.forEach((attr) => {
    // 1. Capture Current State
    // We read the current DOM value so the AI knows the starting point.
    const currentValue = element.getAttribute(attr);
    schema.currentState[attr] = currentValue || "null";

    // 2. Define Schema for the Tool
    // We default to string, but you can enhance this with type inference later
    schema.properties[attr] = {
      type: "string",
      description: `Control the ${attr} of the element. Current value: ${
        currentValue || "(not set)"
      }`,
    };
  });

  return schema;
}

/**
 * 2. DEFINITION LAYER (The Factory)
 * Scans the DOM and builds the JSON tools for Gemini.
 * CONSOLIDATES all attributes of an element into a single tool.
 */
export function buildControlTools(
  containerSelector = "#canvas",
  root = document
) {
  const elements = [...root.querySelectorAll(`${containerSelector} *`)];

  return elements
    .filter((el) => el.tagName.includes("-")) // Only look at Custom Elements
    .map((el) => {
      const meta = inspectElement(el);
      if (!meta) return null;

      // Create ONE tool per element
      return {
        name: `update_${meta.id.replace(/-/g, "_")}`, // Tool names can't have dashes
        description: `Update configuration for <${meta.tag}> (ID: ${
          meta.id
        }). \nCURRENT STATE: ${JSON.stringify(meta.currentState)}`,
        parameters: {
          type: "object",
          properties: meta.properties,
          // We don't require any specific field, allowing partial updates
          required: [],
        },
      };
    })
    .filter(Boolean); // Remove nulls
}
/**
 * Compatibility wrapper that supports the command object format from llm-tools.
 * Calls executeControlAction internally.
 */
export function executeTool(cmd, root = document) {
  if (!cmd) return "No action taken.";
  if (cmd.type === "text") return cmd.content;

  let toolName = cmd.tool;
  let args = cmd.args;

  // Handle legacy 'id.set_attr' format from llm-tools
  if (toolName.includes(".set_")) {
    const [id, action] = toolName.split(".");
    const attr = action.replace("set_", "");
    // Normalize to the format expected by executeControlAction
    toolName = `update_${id}`;
    args = { [attr]: args.value };
  }

  return executeControlAction(toolName, args, root);
}

/**
 * 3. EXECUTION LAYER
 * Applies the AI's changes to the DOM.
 * intelligently switches between Attributes (strings) and Properties (data).
 */
export function executeControlAction(toolName, args, root = document) {
  // Parse ID from tool name: "update_hero_header_1" -> "hero-header-1"
  // Note: This relies on a consistent naming convention (reversing the replace we did earlier)
  // A robust system might store a map of ToolName -> ElementID
  const rawId = toolName.replace("update_", "");

  // Find the element (handling the ID/underscore nuance is tricky,
  // so for this example we assume the ID in DOM uses underscores or we search strictly)
  // In production, maintain a Map<ToolName, ElementRef> to avoid ID parsing issues.
  let element = root.querySelector(`#${rawId}`) || root.querySelector(`#${rawId.replace(/_/g, "-")}`);

  if (!element)
    return `Error: Element with ID derived from '${toolName}' not found.`;

  const updates = [];

  for (const [key, value] of Object.entries(args)) {
    // STRATEGY: Property > Attribute
    // If the element has a JS property for this key, set it directly.
    // This allows passing rich data (Objects, Arrays, Booleans) if the component supports it.
    if (key in element) {
      element[key] = value;
      updates.push(`Property '${key}' set to ${JSON.stringify(value)}`);
    } else {
      // Fallback to HTML attribute (always string)
      element.setAttribute(key, String(value));
      updates.push(`Attribute '${key}' set to "${value}"`);
    }
  }

  return `Updated <${element.tagName.toLowerCase()}>:\n - ${updates.join(
    "\n - "
  )}`;
}
export async function routeCommand(text, containerSelector = "#canvas", root) {
  // 1. Generate the consolidated tools
  // Gemini now sees tools like "update_chart_1" instead of "chart_1_set_color"
  const canvasTools = buildControlTools(containerSelector, root);

  if (canvasTools.length === 0) {
    return "No controllable web components found on the canvas.";
  }

  // 2. Fetch Gemini with the new toolset
  const json = await fetchGemini(
    text,
    `You are a UI controller. You have access to the elements on the canvas. 
     The tools provided represent the specific elements available. 
     Each tool description contains the CURRENT STATE of that element.
     Use this state to make intelligent decisions (e.g., if asked to "toggle", look at the current state first).`,
    canvasTools
  );

  const candidate = json.candidates?.[0];
  const functionCall = candidate?.content?.parts?.find(
    (p) => p.functionCall
  )?.functionCall;

  // 3. Execute
  if (functionCall) {
    return executeControlAction(functionCall.name, functionCall.args, root);
  }

  return (
    candidate?.content?.parts?.find((p) => p.text)?.text || "No action taken."
  );
}

document.addEventListener('prompt-submit', async (e) => {
  const result = await routeCommand(e.detail.prompt, '#canvas', e.target.activeElement.canvas.shadowRoot);
  document.dispatchEvent(new CustomEvent('tool-executed', { detail: { result, timestamp: Date.now() } }));
});
