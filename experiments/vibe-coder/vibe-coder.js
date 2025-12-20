// Import components
import './vibe-coder-header.js';
import './vibe-coder-chat-message.js';
import './vibe-coder-chat-input.js';
import './vibe-coder-chat.js';
import './vibe-coder-canvas.js';
import './vibe-coder-controls.js';
import './vibe-coder-app.js';
import {fetchGemini} from '../js/llm-tools.js';

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

    while (retries < 5) {
        try {
            const data = await fetchGemini(prompt, SYSTEM_PROMPT);
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (e) {
            await new Promise(res => setTimeout(res, delays[retries]));
            retries++;
        }
    }
    return "Error: Failed to fetch response after retries.";
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

function updateUI(app, tag) {
    const canvas = app.canvas;
    const controls = app.controls;

    canvas.updateStage(tag);
    controls.hide();

    if (tag) {
        controls.setTag(tag);
        const attrs = componentData[tag].attributes;
        const el = canvas.canvasStage.querySelector(tag);
        controls.renderAttributes(attrs, el);
        controls.show();
    }
}

function syncLibrary(app, active) {
    const canvas = app.canvas;
    const tags = Object.keys(componentData);
    canvas.syncSelector(tags, active);
}

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
        syncLibrary(app, lastTag);
        updateUI(app, lastTag);
    } else {
        syncLibrary(app, null);
    }
}

async function onSend(app, prompt) {
    console.log('onSend called with prompt:', prompt);
    const chat = app.chat;
    const canvas = app.canvas;

    chat.addMessage('user', prompt);
    chat.setSendDisabled(true);

    const loader = chat.addMessage('ai', '<i class="fas fa-circle-notch animate-spin mr-2"></i> Vibing...', true);

    try {
        const raw = await fetchAI(prompt);
        loader.remove();

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
                syncLibrary(app, tag);
                updateUI(app, tag);
                localStorage.setItem('vibe-coder-active-tag', tag);
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

    app.addEventListener('chat-restored', (e) => {
        restoreFromHistory(app, e.detail.history);
    });

    app.addEventListener('clear-chat', () => {
        const canvas = app.canvas;
        const controls = app.controls;

        canvas.updateStage(null);
        controls.hide();
    });

    app.addEventListener('vibe-coder-play-code', (e) => {
        let code = e.detail.code;

        const tag = register(code);
        if (tag) {
            syncLibrary(app, tag);
            updateUI(app, tag);
            localStorage.setItem('vibe-coder-active-tag', tag);
        }
    });

    app.addEventListener('component-selected', (e) => {
        const tag = e.detail.tag;
        updateUI(app, tag);
        localStorage.setItem('vibe-coder-active-tag', tag);
    });

    app.addEventListener('reset-canvas', () => {
        const activeTag = localStorage.getItem('vibe-coder-active-tag');
        if (activeTag) {
            updateUI(app, activeTag);
        }
    });

    // Prepopulate from localStorage if available
    const saved = localStorage.getItem('vibe-coder-chat-history');
    if (saved) {
        try {
            const history = JSON.parse(saved);
            restoreFromHistory(app, history);
        } catch (e) {
            console.error('Failed to parse chat history for prepopulation', e);
        }
    }

    const activeTag = localStorage.getItem('vibe-coder-active-tag');
    if (activeTag && componentData[activeTag]) {
        syncLibrary(app, activeTag);
        updateUI(app, activeTag);
    } else {
        syncLibrary(app, null);
    }
}

// Initialize the app
init();