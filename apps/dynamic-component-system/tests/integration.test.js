import { DynamicComponentSystem, MIME_TYPES } from '../src/index.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
};

const runTests = async () => {
    console.log('Running integration tests...');

    const system = new DynamicComponentSystem();
    system.init();

    // Test 1: Register and render a component from a URL
    let innerHtmlPromise = new Promise(resolve => {
        document.addEventListener('INNER_HTML', e => resolve(e.detail.html), { once: true });
    });

    document.dispatchEvent(new CustomEvent('PUBLISH_COMPONENT', {
        detail: { url: '../components/markdown-renderer.js', mimeType: MIME_TYPES.MARKDOWN }
    }));

    // Wait for registration
    await new Promise(resolve => {
        document.addEventListener('COMPONENT_REGISTERED', e => {
            if (e.detail.mimeType === MIME_TYPES.MARKDOWN) resolve();
        }, { once: true });
    });

    document.dispatchEvent(new CustomEvent('PUBLISH_TEXT', {
        detail: { mimeType: MIME_TYPES.MARKDOWN, texts: ['# Hello'] }
    }));

    let renderedHtml = await innerHtmlPromise;
    assert(renderedHtml.includes('<h1 id="hello">Hello</h1>'), 'Markdown component did not render correctly');
    console.log('Test 1 passed: Register and render from URL');

    // Test 2: Register and render from a code string
    innerHtmlPromise = new Promise(resolve => {
        document.addEventListener('INNER_HTML', e => resolve(e.detail.html), { once: true });
    });

    const componentCode = `
        class TestComponent extends HTMLElement {
            set textContent(value) { this.innerHTML = \`<strong>\${value}</strong>\`; }
        }
        customElements.define('test-component', TestComponent);
    `;
    document.dispatchEvent(new CustomEvent('PUBLISH_COMPONENT', {
        detail: { code: componentCode, mimeType: 'text/custom' }
    }));

    // Wait for registration
    await new Promise(resolve => {
        document.addEventListener('COMPONENT_REGISTERED', e => {
            if (e.detail.mimeType === 'text/custom') resolve();
        }, { once: true });
    });

    document.dispatchEvent(new CustomEvent('PUBLISH_TEXT', {
        detail: { mimeType: 'text/custom', texts: ['Custom Test'] }
    }));

    renderedHtml = await innerHtmlPromise;
    assert(renderedHtml.includes('<strong>Custom Test</strong>'), 'Component from code did not render correctly');
    console.log('Test 2 passed: Register and render from code string');

    console.log('All integration tests passed!');
};

runTests();