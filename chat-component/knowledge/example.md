---
title: Chat Component Documentation
tags: web-components, chat, memory
category: documentation
---

# Chat Component Documentation

This document provides information about the Chat Component, a Web Component that provides AI chat functionality with memory capabilities.

## Overview

The Chat Component is a custom web component that enables AI-powered chat capabilities in any web application. It runs a language model directly in the browser and includes both short-term memory (recent conversation history) and long-term memory through vector storage.

## Key Features

- Browser-based AI chat using WebLLM technology
- Semantic memory using vector embeddings
- Knowledge base integration from markdown files
- Responsive design with customizable themes
- Light/dark mode support
- Conversation history persistence
- Works without a server (fully client-side)

## Installation

Add the component to your HTML:

```html
<script type="module" src="./chat-component.js"></script>

<chat-component></chat-component>
```

## Customization

You can customize the component using attributes:

```html
<chat-component 
  brand="Your Brand"
  primary-color="#00A9E0"
  accent-color="#FF7F32">
</chat-component>
```

### Available attributes:

- `brand`: Display name for the chat (string)
- `primary-color`: Main color for buttons and UI elements (hex color)
- `accent-color`: Secondary color for highlights (hex color)
- `border-radius`: Corner radius for UI elements (CSS value)
- `font-family`: Font family for text (CSS font stack)

## Memory System

The component includes two types of memory:

1. **Recent history**: Maintains the last N messages in the conversation
2. **Semantic memory**: Uses vector embeddings to find relevant past messages

When you ask a question, the component will:
- Include the recent conversation
- Search for semantically similar past messages 
- Combine both into the context for the AI model

This enables the AI to "remember" information from much earlier in the conversation.