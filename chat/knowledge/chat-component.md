# Chat Component

## Overview
The chat-component is a custom web component that provides an AI chat interface powered by WebLLM. It runs language models directly in the browser with no server requirement.

## Features
- Browser-based AI language model processing
- No server requirements or API keys needed
- Support for multiple WebLLM models
- Persistent chat history with localStorage
- Themeable interface with multiple built-in themes
- Responsive design for mobile and desktop
- Real-time streaming of AI responses
- Resume data integration for contextual responses
- Knowledge base integration for website information

## Technical Implementation
- Custom element extends HTMLElement
- Shadow DOM for style encapsulation
- Web Worker for offloading model processing
- Dynamically loads and processes models via WebLLM
- Manages chat history with localStorage
- Uses CSS variables for theming

## Usage
```html
<chat-component 
  brand="Mauricio Lopez" 
  primary-color="#00A9E0" 
  accent-color="#FF7F32">
</chat-component>
```

## Attributes
- brand: Sets the brand name (affects theming)
- primary-color: Override the primary color
- accent-color: Override the accent color
- border-radius: Custom border radius for UI elements
- font-family: Custom font family

## How It Works
1. When initialized, the component loads resume data and knowledge files
2. It then initializes the WebLLM model in a Web Worker
3. User messages are sent to the model with context from knowledge files
4. The model processes the input and streams responses back
5. Chat history is saved to localStorage for persistence

## Future Improvements
- Support for more models
- Image generation capabilities
- Voice input and output
- File upload and analysis
- Integration with more knowledge sources