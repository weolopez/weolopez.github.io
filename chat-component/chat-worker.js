// Import WebLLM from CDN
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let engine = null;

// Handle messages from the main thread
self.onmessage = async function(event) {
  const { type, model, messages } = event.data;
  
  try {
    if (type === 'init') {
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

// Initialize the WebLLM engine
async function initEngine(modelId) {
  try {
    // Create progress callback
    const initProgressCallback = (progress) => {
      self.postMessage({
        type: 'init-progress',
        data: {
          text: progress.text,
          progress: progress.progress
        }
      });
    };
    
    // Initialize the engine
    engine = await webllm.CreateMLCEngine(
      modelId,
      { 
        initProgressCallback,
        cacheUrl: 'http://weolopez.com/',
      }
    );
    
    // Notify the main thread that initialization is complete
    self.postMessage({
      type: 'init-complete',
      data: { success: true }
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
    
    // Add system prompt if not present
    if (!messages.some(msg => msg.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: 'You are a helpful, friendly AI assistant. Provide concise and accurate responses.'
      });
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