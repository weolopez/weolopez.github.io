// Import WebLLM from CDN
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let engine = null;
let resumeData = null;
let knowledgeBase = {};

// Array of knowledge files to load
const knowledgeFiles = [
  './knowledge/website.md',
  './knowledge/chat-component.md',
  './knowledge/projects.md'
];

// Handle messages from the main thread
self.onmessage = async function(event) {
  const { type, model, messages } = event.data;
  
  try {
    if (type === 'init') {
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
        text: 'Loading knowledge base...',
        progress: 0.3
      }
    });
    
    // Load all knowledge files in parallel
    const results = await Promise.allSettled(
      knowledgeFiles.map(async (file) => {
        const response = await fetch(file);
        if (!response.ok) {
          console.warn(`Could not load knowledge file: ${file}`);
          return { file, content: null };
        }
        
        // For markdown files, return the text content
        const content = await response.text();
        return { file, content };
      })
    );
    
    // Process results
    let loadedCount = 0;
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.content) {
        const fileName = result.value.file.split('/').pop().split('.')[0];
        knowledgeBase[fileName] = result.value.content;
        loadedCount++;
      }
    });
    
    self.postMessage({
      type: 'init-progress',
      data: {
        text: `Knowledge base loaded (${loadedCount} files)`,
        progress: 0.4
      }
    });
    
    if (loadedCount === 0) {
      console.warn('No knowledge files were loaded');
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

// Initialize the WebLLM engine
async function initEngine(modelId) {
  try {
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
        cacheUrl: 'file_cache',
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
    if (!engine) {
      throw new Error('Engine not initialized');
    }
    
    // Prepare the system prompt with resume data
    const systemPrompt = createSystemPrompt();
    
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
    
    // Website information
    if (knowledgeBase['website']) {
      prompt += `\nWEBSITE INFORMATION:\n${knowledgeBase['website']}\n`;
    }
    
    // Chat component information
    if (knowledgeBase['chat-component']) {
      prompt += `\nCHAT COMPONENT INFORMATION:\n${knowledgeBase['chat-component']}\n`;
    }
    
    // Projects information
    if (knowledgeBase['projects']) {
      prompt += `\nOTHER PROJECTS:\n${knowledgeBase['projects']}\n`;
    }
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