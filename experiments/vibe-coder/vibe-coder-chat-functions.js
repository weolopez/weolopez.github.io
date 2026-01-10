import { eventBus } from '../../desktop/src/events/event-bus.js';
import { MESSAGES } from '../../desktop/src/events/message-types.js';

export async function onSend(app, prompt, context = []) {

    console.log('onSend called with prompt:', prompt, 'context:', context);
    const chat = app.chat;
    const canvas = app.canvas;
    chat.addMessage('user', prompt);
    chat.setSendDisabled(true);
    const loader = chat.addMessage('ai', '<i class="fas fa-circle-notch animate-spin mr-2"></i> Vibing...', true);

    const response = await generate(prompt, context);
    send(prompt, context);

    loader.remove();

    if (!response) {
        chat.addMessage('ai', 'Error: Failed to fetch response from AI.');
        return;
    }

}
export async function send(prompt, context = []) {

    try {

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        
        // Handle tool calls
        const toolCalls = parts.filter(p => p.functionCall);
        if (toolCalls.length > 0) {
            let results = [];
            for (const call of toolCalls) {
                const stage = app.canvas.shadowRoot.querySelector('.canvas-stage');
                const result = executeTool({ 
                    type: 'tool', 
                    tool: call.functionCall.name, 
                    args: call.functionCall.args 
                }, stage);
                results.push(result);
            }
            chat.addMessage('ai', results.join('\n'));
            saveToStorage();
            return;
        }

        // Handle text response (original logic)
        const raw = parts.find(p => p.text)?.text || "";
        if (!raw) {
            chat.addMessage('ai', "No response from Gemini.");
            return;
        }

        const codeRegex = /```(?:javascript|js)?\n?(.*?)```/gs;
        const matches = raw.match(codeRegex);
        if (matches) {
            const code = matches[0].replace(/```(?:javascript|js)?/g, '').replace(/```$/g, '').trim();
            try {
                new Function(code);
            } catch (e) {
                chat.addMessage('ai', 'Error: The generated code contains syntax errors and cannot be registered.');
                return;
            }
            const tag = register(code);
            if (tag) {
                chat.addMessage('ai', `<pre><code>${code}</code></pre>`);
                // syncLibrary(app, tag);
                updateUI(app, tag, null, code);
                localStorage.setItem('vibe-coder-active-tag', tag);
                // saveToStorage(); // Ensure everything is saved
            } else {
                chat.addMessage('ai', 'Error: Failed to register the generated component. Please check the code.');
            }
        } else {
            chat.addMessage('ai', raw);
        }
    } catch (error) {
        console.error(error);
        loader.remove();
        chat.addMessage('ai', 'Error: ' + error.message);
    } finally {
        chat.setSendDisabled(false);
    }
}


function generate(text, context) {
        const query = text.trim();
        if (query) {
            this.messages.push({ role: 'user', content: query });
            eventBus.publish(MESSAGES.WEBLLM_GENERATE_REQUEST, {
                messages: this.messages,
                conversationId: this.conversationId,
                options: {
                    temperature: 0.7,
                    maxTokens: 512,
                    stream: false
                }
            });
            this.chatInput.disabled = true;
        }
    }