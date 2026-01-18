// intentRouter.js
import { generateStaticResponse } from './chat-worker.js';

const PROMPTS = {
  CREATE: "You are an Expert Web Architect. Generate new components using clean HTML/CSS...",
  MODIFY: "You are a Refactoring specialist. Update the provided code carefully...",
  ABOUT: "You are an AI representative for the website owner. Use the provided resume and knowledge base information to answer questions about their background and experience.",
  GENERAL: "You are a helpful assistant. Provide general web development advice..."
};

/**
 * Encapsulates the classification logic
 */
export async function determineSystemPrompt(userText) {
  const routerPrompt = `Classify intent as CREATE, MODIFY, ABOUT, or GENERAL based on user text. Output one word only.
   "ABOUT" is for any and all personal questions about you, work experience, skills, or projects.
   "CREATE" is for requests to generate new content or components.
   "MODIFY" is for requests to change or update existing content.
   "GENERAL" is for non-personal, non-specific inquiries.  Does not have the word you in it.
   `;

  try {
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
