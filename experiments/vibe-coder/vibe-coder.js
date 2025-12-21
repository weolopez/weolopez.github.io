// Import components
import './vibe-coder-header.js';
import './vibe-coder-chat-message.js';
import './vibe-coder-chat-input.js';
import './vibe-coder-chat.js';
import './vibe-coder-canvas.js';
import './vibe-coder-controls.js';
import './vibe-coder-app.js';
import './vibe-coder-mode-selector.js';
import {fetchGemini, buildGeminiTools, executeTool} from '../js/llm-tools.js';
import { MODES } from './modes.js';

let currentMode = MODES.find(m => m.id === localStorage.getItem('vibe-coder-selected-mode')) || MODES[0];

const SYSTEM_PROMPT = `You are a "Vibe Coding" expert.
Generate ONLY a single JS code block defining a Standard Web Component.
The component MUST:
1. Use observedAttributes with very descriptive names.
2. Handle changes in attributeChangedCallback.
3. Use Shadow DOM with internal <style>.
4. Be high-quality, modern, and stand-alone.
Return JUST the javascript in markdown. Do not include any explanation outside the code block.`;

let componentData = {};

function saveToStorage() {
    localStorage.setItem('vibe-coder-components', JSON.stringify(componentData));
    
    // Also save the current canvas state (instances and their attributes)
    const app = document.querySelector('vibe-coder-app');
    if (app && app.canvas) {
        const components = app.canvas.getComponents();
        localStorage.setItem('vibe-coder-canvas-instances', JSON.stringify(components));
    }
}

function loadFromStorage() {
    const saved = localStorage.getItem('vibe-coder-components');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            Object.keys(data).forEach(tag => {
                register(data[tag].code, false);
            });
        } catch (e) {
            console.error('Failed to load components from storage', e);
        }
    }

    // Restore canvas instances
    const savedInstances = localStorage.getItem('vibe-coder-canvas-instances');
    if (savedInstances) {
        try {
            const instances = JSON.parse(savedInstances);
            const app = document.querySelector('vibe-coder-app');
            if (app && app.canvas) {
                app.canvas.clear();
                instances.forEach(inst => {
                    app.canvas.addTag(inst.tag, inst.id, inst.attributes);
                });
            }
        } catch (e) {
            console.error('Failed to load canvas instances from storage', e);
        }
    }
}

function getInputType(attr) {
    const lower = attr.toLowerCase();
    if (lower.includes('color')) return 'color';
    if (lower.includes('number') || lower.includes('size') || lower.includes('width') || lower.includes('height') || lower.includes('duration')) return 'number';
    if (lower.includes('date')) return 'date';
    if (lower.includes('time')) return 'time';
    return 'text';
}

async function fetchAI(prompt) {

    let retries = 0;
    const delays = [1000, 2000, 4000, 8000, 16000];

    let canvasTools = [];
    if (currentMode.useTools) {
        // We need to find the canvas element to build tools from it
        const app = document.querySelector('vibe-coder-app');
        if (app && app.canvas) {
            // The canvas component has a shadowRoot, but buildGeminiTools expects a selector
            // We might need to pass the actual elements or adjust buildGeminiTools
            // For now, let's assume we can get the elements from the canvas stage
            const stage = app.canvas.shadowRoot.querySelector('.canvas-stage');
            if (stage) {
                canvasTools = buildGeminiTools('.canvas-stage', stage);
            }
        }
    }

    while (retries < 5) {
        try {
            const data = await fetchGemini(prompt, currentMode.systemPrompt || SYSTEM_PROMPT, null, canvasTools);
            return data;
        } catch (e) {
            await new Promise(res => setTimeout(res, delays[retries]));
            retries++;
        }
    }
    return null;
}

function register(js, shouldSave = true) {
    try {
        const match = js.match(/customElements\.define\(['"]([^'"]+)['"]/);
        if (!match) return null;
        const tag = match[1];

        if (customElements.get(tag)) {
            const el = document.createElement(tag);
            const attrs = el.constructor.observedAttributes || [];
            componentData[tag] = { attributes: attrs, code: js };
            if (shouldSave) saveToStorage();
            return tag;
        }

        const s = document.createElement('script');
        s.innerHTML = js;
        document.head.appendChild(s);

        const el = document.createElement(tag);
        const attrs = el.constructor.observedAttributes || [];

        componentData[tag] = { attributes: attrs, code: js };
        if (shouldSave) saveToStorage();
        return tag;
    } catch (e) {
        console.error("Registration Error:", e);
        return null;
    }
}

function updateUI(app, tag, id = null) {
    const canvas = app.canvas;

    if (tag) {
        let el;
        if (id) {
            el = canvas.getComponent(id);
        } else {
            const componentId = canvas.addTag(tag);
            el = canvas.getComponent(componentId);
            // saveToStorage(); // Save new instance
        }

    } 
    // else {
    //     canvas.clear();
    //     controls.hide();
    //     saveToStorage(); // Save cleared state
    // }
}

// function syncLibrary(app, active) {
//     const canvas = app.canvas;
//     const tags = Object.keys(componentData);
//     canvas.syncSelector(tags, active);
// }

function restoreFromHistory(app, history) {
    const codeRegex = /```(?:javascript|js)?\n?(.*?)```/gs;
    let lastTag = null;
    
    history.forEach(msg => {
        if (msg.role === 'ai') {
            const matches = msg.text.match(codeRegex);
            if (matches) {
                const code = matches[0].replace(/```(?:javascript|js)?/g, '').replace(/```$/g, '').trim();
                const tag = register(code);
                if (tag) lastTag = tag;
            }
        }
    });

    if (lastTag) {
        // syncLibrary(app, lastTag);
        updateUI(app, lastTag);
    } 
    // else {
    //     syncLibrary(app, null);
    // }
}

async function onSend(app, prompt) {
    console.log('onSend called with prompt:', prompt);
    const chat = app.chat;
    const canvas = app.canvas;

    chat.addMessage('user', prompt);
    chat.setSendDisabled(true);

    const loader = chat.addMessage('ai', '<i class="fas fa-circle-notch animate-spin mr-2"></i> Vibing...', true);

    try {
        const response = await fetchAI(prompt);
        loader.remove();

        if (!response) {
            chat.addMessage('ai', 'Error: Failed to fetch response from AI.');
            return;
        }

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
            
            // Update controls if the active component was modified
            //todo, persist and restore all tags and their attributes with values in localStorage as json
            const activeTag = localStorage.getItem('vibe-coder-active-tag');
            if (activeTag) {
                updateUI(app, activeTag);
            }
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
                updateUI(app, tag);
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

function init() {
    const app = document.querySelector('vibe-coder-app');
    console.log('init called, app:', app);

    loadFromStorage();

    // Event listeners
    app.addEventListener('send-message', (e) => {
        console.log('send-message event received', e.detail);
        onSend(app, e.detail.text);
    });

    app.addEventListener('mode-change', (e) => {
        currentMode = e.detail.mode;
        console.log('Mode changed to:', currentMode.title);
        // app.chat.addMessage('ai', `Mode switched to **${currentMode.title}**: ${currentMode.description}`, false, true);
    });

    app.addEventListener('chat-restored', (e) => {
        restoreFromHistory(app, e.detail.history);
    });

    app.addEventListener('clear-chat', () => {
        const canvas = app.canvas;
        const controls = app.controls;

        canvas.clear();
        controls.hide();
    });

    app.addEventListener('vibe-coder-play-code', (e) => {
        let code = e.detail.code;

        const tag = register(code);
        if (tag) {
            // syncLibrary(app, tag);
            updateUI(app, tag);
            // app.canvas.backup();
            saveToStorage();
        }
    });
    //component-removed
    app.canvas.addEventListener('component-removed', (e) => {
        saveToStorage();
    })
    app.canvas.addEventListener('component-selected', (e) => {
        const tag = e.detail.tag;
        // const id = e.detail.id;
        // When selecting from the library, we add a new instance
        // updateUI(app, tag);
        // app.canvas.backup();
        // saveToStorage();
        const el = e.detail.element;
        if (el) {
            const controls = app.controls;
            controls.hide();
            controls.setTag(tag);
            const attrs = el.attributes;
            controls.renderAttributes(el);
            controls.show();
            
            // Listen for attribute changes to trigger backup
            controls.addEventListener('attribute-changed', () => {
                // canvas.backup();
                saveToStorage(); // Save attribute changes
            });
        }
    });

    app.addEventListener('reset-canvas', () => {
        const canvas = app.canvas;
        canvas.clear();
        canvas.restore();
        saveToStorage();
    });

    // Initial restore
    setTimeout(() => {
        // app.canvas.restore(); // Removed in favor of loadFromStorage logic
    }, 100);

    // Prepopulate from localStorage if available
    // const saved = localStorage.getItem('vibe-coder-chat-history');
    // if (saved) {
    //     try {
    //         const history = JSON.parse(saved);
    //         restoreFromHistory(app, history);
    //     } catch (e) {
    //         console.error('Failed to parse chat history for prepopulation', e);
    //     }
    // }
    //todo, persist and restore all tags and their attributes with values in localStorage as json
    // const activeTag = localStorage.getItem('vibe-coder-active-tag');
    // if (activeTag && componentData[activeTag]) {
    //     syncLibrary(app, activeTag);
    //     updateUI(app, activeTag);
    // } else {
    //     syncLibrary(app, null);
    // }
}

// Initialize the app
init();