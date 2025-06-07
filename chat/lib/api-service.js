export class ApiService {
  constructor(config = {}) {
    this.selectedModel = config.model || 'gpt-4o-mini';
    this.apiKey = null;
    this.resumeData = null;
    this.knowledgeBase = {};
    this.knowledgeFiles = [
      '/chat-component/knowledge/website.md',
      '/chat-component/knowledge/chat-component.md',
      '/chat-component/knowledge/projects.md'
    ];
    this.useWebLLM = config.useWebLLM || false;
    this.webLLMEngine = config.engine || null;
  }

  // Retrieve API key from localStorage or prompt user
  getApiKey() {
    let key = localStorage.getItem('openai_api_key');
    if (!key) {
      key = prompt('Please enter your OpenAI API key:');
      if (key) {
        localStorage.setItem('openai_api_key', key);
      } else {
        // redirect the page to /wc/google-login.html
        const currentUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/wc/google-login.html?returnUrl=${currentUrl}`;
        throw new Error('API key not found in local storage');
      }
    }
    this.apiKey = key;
    return key;
  }

  // Initialize service: load API key, resume data, knowledge base
  async initialize() {
    this.getApiKey();
    await this.fetchResumeData();
    await this.loadKnowledgeBase();
  }

  // Fetch resume data from the JSON file
  async fetchResumeData() {
    try {
      const response = await fetch('/resume.json');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch resume data: ${response.status} ${response.statusText}`);
      }
      
      this.resumeData = await response.json();
    } catch (error) {
      console.error('Error fetching resume data:', error);
      throw new Error(`Failed to load resume data: ${error.message}`);
    }
  }

  // Load knowledge base markdown files
  async loadKnowledgeBase() {
    try {
      // Load all knowledge files in parallel
      const results = await Promise.allSettled(
        this.knowledgeFiles.map(async (file) => {
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
          this.knowledgeBase[fileName] = result.value.content;
          loadedCount++;
        }
      });
      
      if (loadedCount === 0) {
        console.warn('No knowledge files were loaded');
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      // Non-critical error - continue without knowledge base
      console.warn(`Failed to load knowledge base: ${error.message}`);
    }
  }

  // Streaming chat completion function
  async* streamChatCompletion(messages, options = {}) {
    if (this.useWebLLM) {
      // Use WebLLM engine
      if (!this.webLLMEngine) {
        throw new Error('WebLLM engine not provided');
      }
      
      try {
        const chunks = await this.webLLMEngine.chat.completions.create({
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1024,
          stream: true,
        });
        
        for await (const chunk of chunks) {
          yield chunk;
        }
      } catch (error) {
        console.error('Error in WebLLM streaming chat completion:', error);
        throw error;
      }
    } else {
      // Use OpenAI API
      if (!this.apiKey) {
        throw new Error('API key not provided');
      }
      
      const url = 'https://api.openai.com/v1/chat/completions';

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      };

      const data = {
        model: options.model || this.selectedModel,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1024,
        stream: true
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                  yield parsed;
                }
              } catch (e) {
                // Skip invalid JSON lines
                continue;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in streaming chat completion:', error);
        throw error;
      }
    }
  }

  // Create a system prompt that includes the resume data context and knowledge base
  createSystemPrompt() {
    let prompt = 'You are a helpful, friendly AI assistant. Provide concise and accurate responses.';

    // Add resume data if available
    if (this.resumeData) {
      const { basics, expertise, skills, work, education, patents } = this.resumeData;
      
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
    if (Object.keys(this.knowledgeBase).length > 0) {
      prompt += `\n\nKNOWLEDGE BASE:\n`;
      
      // Website information
      if (this.knowledgeBase['website']) {
        prompt += `\nWEBSITE INFORMATION:\n${this.knowledgeBase['website']}\n`;
      }
      
      // Chat component information
      if (this.knowledgeBase['chat-component']) {
        prompt += `\nCHAT COMPONENT INFORMATION:\n${this.knowledgeBase['chat-component']}\n`;
      }
      
      // Projects information
      if (this.knowledgeBase['projects']) {
        prompt += `\nOTHER PROJECTS:\n${this.knowledgeBase['projects']}\n`;
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
}