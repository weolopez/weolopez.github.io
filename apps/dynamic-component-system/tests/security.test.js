import { DynamicComponentSystem } from '../src/index.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
};

const runTests = async () => {
    console.log('Running security tests...');

    const system = new DynamicComponentSystem();
    system.init();

    // Test 1: Attempt to inject script tags via textContent
    let innerHtmlPromise = new Promise(resolve => {
        document.addEventListener('INNER_HTML', e => resolve(e.detail.html), { once: true });
    });

    document.dispatchEvent(new CustomEvent('PUBLISH_TEXT', {
        detail: { mimeType: 'text/plain', texts: ['<script>alert("XSS")</script>'] }
    }));

    let renderedHtml = await innerHtmlPromise;
    assert(!renderedHtml.includes('<script>'), 'Script tags should be escaped or not present in output');
    console.log('Test 1 passed: Script tag injection in textContent');

    // Test 2: Attempt to register a component with malicious code
    const maliciousCode = `
        class MaliciousComponent extends HTMLElement {
            constructor() {
                super();
                window.XSS_SUCCESS = true;
            }
        }
        customElements.define('malicious-component', MaliciousComponent);
    `;

    document.dispatchEvent(new CustomEvent('PUBLISH_COMPONENT', {
        detail: { code: maliciousCode, mimeType: 'text/malicious' }
    }));

    // Wait for registration
    await new Promise(resolve => {
        document.addEventListener('COMPONENT_REGISTERED', e => {
            if (e.detail.mimeType === 'text/malicious') resolve();
        }, { once: true });
    });

    assert(window.XSS_SUCCESS !== true, 'Malicious code should not execute in the global scope');
    console.log('Test 2 passed: Malicious code registration');

    console.log('All security tests passed!');
};

runTests();