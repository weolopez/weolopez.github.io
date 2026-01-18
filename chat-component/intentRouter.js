// intentRouter.js
import { generateStaticResponse } from './chat-worker.js';

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

    const routerPrompt = `Classify the user intent into one of: ${Object.keys(PROMPTS).join(', ')}. 
    Return ONLY the uppercase name of the intent.`;

    const intent = await generateStaticResponse([{ role: "system", content: routerPrompt }, { role: "user", content: userText }]);
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
