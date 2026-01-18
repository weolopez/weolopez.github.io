// What is the weather in the capital of GA USA and how does that make you feel?
import * as webllm from "./deps/webllm/web-llm.js";
import { determineSystemPrompt } from './intentRouter.js';

let engine = null;
let resumeData = null;
let knowledgeBase = { };

// Knowledge files will be loaded from index.json
let knowledgeFiles = [];
let geminiApiKey = null;

/**
 * Generate a response using Gemini API
 */
export async function generateGeminiResponse(messages, systemPrompt) {
  try {
    if (!geminiApiKey) {
      throw new Error('Gemini API key is missing');
    }

    // Prepare history for Gemini
    // Filter out previous system messages and handle format
    const history = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Get the last user message
    const lastMessage = history.pop();
    
    const requestBody = {
      contents: [...history, lastMessage],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
    { method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(requestBody) });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    

    const data = await response.json();
    const accumulatedResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Send a response-chunk first, as the client might expect it to handle transitions/loading states
    self.postMessage({
      type: 'response-chunk',
      data: { text: accumulatedResponse }
    });

    const fullMessage = {
      role: 'assistant',
      content: accumulatedResponse
    };

    self.postMessage({
      type: 'response-complete',
      data: { message: fullMessage }
    });
  } catch (error) {
    console.error('Gemini generation error:', error);
    self.postMessage({
      type: 'error',
      data: { 
        error: { 
          message: `Gemini failure: ${error.message}` 
        } 
      }
    });
  }
}

// Handle messages from the main thread
self.onmessage = async function(event) {
  const { type, model, messages } = event.data;
  
  try {
    if (type === 'init') {
      // Store API key if provided in the messages array
      geminiApiKey = messages?.[0]?.geminiToken || null;
      console.log('Received Gemini API Key in init message:', geminiApiKey ? 'Present' : 'Not found');

      await fetchResumeData();
      await loadKnowledgeBase();
      await initEngine(model);
    } else if (type === 'generate') {
      await generateResponse(messages);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: { error: { message: error.message } }
    });
  }
};

// Fetch resume data from the JSON file
async function fetchResumeData() {
  try {
    self.postMessage({
      type: 'init-progress',
      data: {
        text: 'Fetching resume data...',
        progress: 0.1
      }
    });
    
    const response = await fetch('/resume.json');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch resume data: ${response.status} ${response.statusText}`);
    }
    
    resumeData = await response.json();
    
    self.postMessage({
      type: 'init-progress',
      data: {
        text: 'Resume data loaded successfully',
        progress: 0.2
      }
    });
  } catch (error) {
    console.error('Error fetching resume data:', error);
    self.postMessage({
      type: 'error',
      data: { 
        error: { 
          message: `Failed to load resume data: ${error.message}` 
        } 
      }
    });
  }
}

// Load knowledge base markdown files
async function loadKnowledgeBase() {
  try {
    self.postMessage({
      type: 'init-progress',
      data: {
        text: 'Loading knowledge index...',
        progress: 0.3
      }
    });
    
    // First, load the knowledge index
    await loadKnowledgeIndex();
    
    if (knowledgeFiles.length === 0) {
      console.warn('No knowledge files found in index.json');
      self.postMessage({
        type: 'warning',
        data: { 
          warning: { 
            message: 'No knowledge files found in index.json' 
          } 
        }
      });
      return;
    }
    
    console.log(`Found ${knowledgeFiles.length} knowledge files to load:`, knowledgeFiles);
    
    self.postMessage({
      type: 'init-progress',
      data: {
        text: `Loading ${knowledgeFiles.length} knowledge files...`,
        progress: 0.35
      }
    });
    
    // Load all knowledge files in parallel
    const results = await Promise.allSettled(
      knowledgeFiles.map(async (file) => {
        // console.log(`Attempting to load knowledge file: ${file}`);
        
        try {
          const response = await fetch(file);
          if (!response.ok) {
            console.warn(`Failed to load knowledge file: ${file} - ${response.status} ${response.statusText}`);
            return { file, content: null, error: `${response.status} ${response.statusText}` };
          }
          
          // For markdown files, return the text content
          const content = await response.text();
          // console.log(`Successfully loaded knowledge file: ${file} (${content.length} characters)`);
          return { file, content, error: null };
        } catch (error) {
          console.error(`Error loading knowledge file ${file}:`, error);
          return { file, content: null, error: error.message };
        }
      })
    );
    
    // Process results with detailed logging
    let loadedCount = 0;
    let failedCount = 0;
    const loadedFiles = [];
    const failedFiles = [];
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.content) {
        const fileName = result.value.file.split('/').pop().split('.')[0];
        knowledgeBase[fileName] = result.value.content;
        loadedFiles.push(result.value.file);
        loadedCount++;
      } else {
        failedFiles.push({
          file: result.value?.file || 'unknown',
          error: result.value?.error || result.reason?.message || 'Unknown error'
        });
        failedCount++;
      }
    });
    
    console.log(`Knowledge loading complete: ${loadedCount} loaded, ${failedCount} failed`);
    console.log('Loaded files:', loadedFiles);
    if (failedFiles.length > 0) {
      console.log('Failed files:', failedFiles);
    }
    console.log('Knowledge base keys:', Object.keys(knowledgeBase));
    
    self.postMessage({
      type: 'init-progress',
      data: {
        text: `Knowledge base loaded (${loadedCount}/${knowledgeFiles.length} files)`,
        progress: 0.4
      }
    });
    
    if (loadedCount === 0) {
      console.warn('No knowledge files were loaded successfully');
      self.postMessage({
        type: 'warning',
        data: { 
          warning: { 
            message: `Failed to load any knowledge files. Check console for details.` 
          } 
        }
      });
    } else if (failedCount > 0) {
      console.warn(`${failedCount} knowledge files failed to load. Check console for details.`);
    }
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    // Non-critical error - continue without knowledge base
    self.postMessage({
      type: 'warning',
      data: { 
        warning: { 
          message: `Failed to load knowledge base: ${error.message}` 
        } 
      }
    });
  }
}

// Load knowledge file list from index.json
async function loadKnowledgeIndex() {
  try {
    console.log('Loading knowledge index from ./knowledge/index.json');
    const response = await fetch('./knowledge/index.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load knowledge index: ${response.status} ${response.statusText}`);
    }
    
    const indexData = await response.json();
    knowledgeFiles = indexData.files || [];
    
    // console.log(`Loaded knowledge index with ${knowledgeFiles.length} files:`, knowledgeFiles);
    
    if (knowledgeFiles.length === 0) {
      console.warn('Knowledge index is empty');
    }
    
  } catch (error) {
    console.error('Error loading knowledge index:', error);
    
    // Fallback to hardcoded files for backward compatibility
    console.log('Falling back to hardcoded knowledge files');
    knowledgeFiles = [
      './knowledge/website.md',
      './knowledge/chat-component.md',
      './knowledge/projects.md'
    ];
  }
}

// Initialize the WebLLM engine
async function initEngine(modelId) {
  try {
    // If it's a Gemini model, we skip WebLLM engine initialization
    if (modelId && modelId.toLowerCase().includes('gemini')) {
      console.log('Gemini model detected, skipping WebLLM engine initialization');
      self.postMessage({
        type: 'init-complete',
        data: { 
          success: true,
          knowledgeFiles: Object.keys(knowledgeBase),
          modelType: 'gemini'
        }
      });
      return;
    }

    // Create progress callback
    const initProgressCallback = (progress) => {
      self.postMessage({
        type: 'init-progress',
        data: {
          text: progress.text,
          progress: progress.progress * 0.6 + 0.4 // Adjust progress to account for resume and knowledge loading
        }
      });
    };
    
    // Initialize the engine
    engine = await webllm.CreateMLCEngine(
      modelId,
      { 
        initProgressCallback,
        cacheUrl: './deps/models/cache',
      }
    );
    
    // Notify the main thread that initialization is complete
    self.postMessage({
      type: 'init-complete',
      data: { 
        success: true,
        knowledgeFiles: Object.keys(knowledgeBase)
      }
    });
  } catch (error) {
    console.error('Engine initialization error:', error);
    self.postMessage({
      type: 'error',
      data: { 
        error: { 
          message: `Failed to load model: ${error.message}` 
        } 
      }
    });
  }
}

// Generate a response from the LLM
async function generateResponse(messages) { 
  try {
    // Use the system prompt to wrap the conversation
    const userText = messages[messages.length - 1]?.content || '';
    const { prompt: basePrompt, intent } = await determineSystemPrompt(userText);
    console.log(`Detected intent: ${intent}`);
    
    // Emit intent to main thread
    self.postMessage({ type: 'intent', data: { intent } });

    let systemPrompt = basePrompt;

    // Inject resume/knowledge context for ABOUT intent
    if (intent === 'ABOUT') {
      systemPrompt = createSystemPrompt();
    }

    // Check for Gemini model usage
    if (!engine && geminiApiKey) {
       console.log('Using Gemini API with key');
       await generateGeminiResponse(messages, systemPrompt);
       return;
    }

    if (!engine) {
      throw new Error('Engine not initialized');
    }
    
    // Add system prompt if not present, or replace it
    if (!messages.some(msg => msg.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: systemPrompt
      });
    } else {
      // Find and replace the existing system message
      const systemIndex = messages.findIndex(msg => msg.role === 'system');
      if (systemIndex !== -1) {
        messages[systemIndex].content = systemPrompt;
      }
    }
    
    // Initialize an accumulating response string
    let accumulatedResponse = '';
    
    // Create the streaming chat completion
    const chunks = await engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });
    
    // Process each chunk as it arrives
    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta.content || '';
      accumulatedResponse += content;
      
      // Send the accumulated text so far back to the main thread
      self.postMessage({
        type: 'response-chunk',
        data: { text: accumulatedResponse }
      });
    }
    
    // Get the complete message when done
    const fullMessage = {
      role: 'assistant',
      content: accumulatedResponse
    };
    
    // Send the complete message back to the main thread
    self.postMessage({
      type: 'response-complete',
      data: { message: fullMessage }
    });
  } catch (error) {
    console.error('Generation error:', error);
    self.postMessage({
      type: 'error',
      data: { 
        error: { 
          message: `Failed to generate response: ${error.message}` 
        } 
      }
    });
  }
}

/**
 * Generate a non-streaming response from the WebLLM engine.
 * Useful for internal logic like intent routing or summarization.
 * @param {Array} messages - Chat messages
 * @returns {Promise<string>} - The assistant's response text
 */
export async function generateStaticResponse(messages) {
  if (!engine) {
    throw new Error('Engine not initialized');
  }
  
  const response = await engine.chat.completions.create({
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: false,
  });
  
  return response.choices[0].message.content;
}

/**
 * Generate a non-streaming response using Gemini API
 */
export async function generateStaticGeminiResponse(messages, systemPrompt) {
  if (!geminiApiKey) {
    throw new Error('Gemini API key is missing');
  }

  const history = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

  const lastMessage = history.pop() || { role: 'user', parts: [{ text: '' }] };
  
  const requestBody = {
    contents: [...history, lastMessage],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
    { method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(requestBody) });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Create a system prompt that includes the resume data context and knowledge base
function createSystemPrompt() {
  let prompt = 'You are a helpful, friendly AI assistant. Provide concise and accurate responses.';

  // Add resume data if available
  if (resumeData) {
    const { basics, expertise, skills, work, education, patents } = resumeData;
    
    prompt = `You are a helpful AI assistant for ${basics.name}, a ${basics.label}. 
You should respond as if you are representing ${basics.name} in a professional context.

Use the following information from ${basics.name}'s resume to inform your responses:

SUMMARY:
${basics.summary}

EXPERTISE:
${expertise.join(', ')}

TECHNICAL SKILLS:
${skills.join(', ')}

WORK EXPERIENCE:
`;

    // Add work experience
    work.forEach(job => {
      prompt += `- ${job.position} at ${job.company} (${job.startDate} to ${job.endDate}): ${job.description}\n`;
    });

    // Add education
    prompt += `\nEDUCATION:
- ${education[0].studyType} in ${education[0].area} from ${education[0].institution} (${education[0].startDate}-${education[0].endDate})`;

    // Add patents if relevant
    if (patents && patents.length > 0) {
      prompt += `\n\nPATENTS:
${patents.map(patent => `- ${patent.title} (${patent.number})`).join('\n')}`;
    }
  }

  // Add knowledge base information if available
  if (Object.keys(knowledgeBase).length > 0) {
    prompt += `\n\nKNOWLEDGE BASE:\n`;
    console.log('Adding knowledge base to system prompt. Available keys:', Object.keys(knowledgeBase));
    
    // Add all loaded knowledge files
    Object.keys(knowledgeBase).forEach(key => {
      const content = knowledgeBase[key];
      if (content) {
        // Use the first 500 characters for context to avoid token limits
        const truncatedContent = content.length > 500 ? content.substring(0, 500) + '...' : content;
        prompt += `\n${key.toUpperCase()} INFORMATION:\n${truncatedContent}\n`;
      }
    });
  } else {
    console.log('No knowledge base available for system prompt');
  }

  prompt += `\n
When answering questions, incorporate relevant details from the resume and knowledge base when appropriate. 
If asked about technical skills, work history, or professional experience, provide accurate information from the resume.
If asked about the website, how it was built, or about other projects, use information from the knowledge base.
Do not share personal contact information like address, email, or phone number unless explicitly requested by the user.
For questions outside of the provided context, respond as a helpful and friendly assistant.
Provide concise and accurate responses.

First-time users should know they can ask questions like:
- "What experience do you have with cloud architecture?"
- "Tell me about your technical skills"
- "What was your role at AT&T?"
- "What patents do you hold?"
- "How did you build this website?"
- "Tell me about your chat component implementation"
- "What other projects have you worked on?"
- "What technologies have you used in your projects?"
`;

  return prompt;
}