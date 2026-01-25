// intentRouter.js
import { generateStaticResponse, generateGeminiResponse, generateStaticGeminiResponse } from './chat-worker.js';

let PROMPTS = {};

/**
 * Encapsulates the classification logic
 */
export async function determineSystemPrompt(userText) {
  const filepath = './intents/skills.js';
  
  try {
    const { SKILL_REGISTRY } = await import(filepath);

    // Dynamic extraction of PROMPTS from SKILL_REGISTRY
    PROMPTS = Object.keys(SKILL_REGISTRY).reduce((acc, key) => {
      const content = SKILL_REGISTRY[key].content;
      // Extract name and description from the YAML frontmatter
      const nameMatch = content.match(/name:\s*(.+)/);
      const descMatch = content.match(/description:\s*(.+)/);
      
      const name = nameMatch ? nameMatch[1].trim() : key;
      const description = descMatch ? descMatch[1].trim() : "";
      
      acc[name.toUpperCase()] = description;
      return acc;
    }, {});

    // Ensure a GENERAL prompt exists
    if (!PROMPTS.GENERAL) {
      PROMPTS.GENERAL = "You are a helpful assistant. Provide general web development advice...";
    }

    const categories = Object.entries(PROMPTS)
      .map(([name, desc]) => `- ${name}: ${desc}`)
      .join('\n');

    const routerPrompt = `You are a high-accuracy intent classifier. 
Compare the user's request against the following categories and their descriptions:

${categories}

Analyze the user's underlying goal and return ONLY the uppercase name of the best matching category. 
If the request is complex or mentions multiple steps, prioritize "ORCHESTRATOR".
If no specific category fits perfectly, return "GENERAL". 
Output ONLY the name that is provided in capital letters.`;

console.log('Router Prompt:', routerPrompt);

    const intent = await generateStaticGeminiResponse( [{ role: "user", content: userText }], routerPrompt );
    // const intent = await generateStaticResponse([{ role: "system", content: routerPrompt }, { role: "user", content: userText }]);
    const cleanIntent = intent.trim().toUpperCase();

    return { 
      prompt: PROMPTS[cleanIntent] || PROMPTS.GENERAL,
      intent: cleanIntent
    };
  } catch (err) {
    return { 
      prompt: PROMPTS.GENERAL,
      intent: 'GENERAL'
    };
  }
}
