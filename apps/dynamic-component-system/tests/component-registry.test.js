import { ComponentRegistry } from '../src/component-registry.js';

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
};

const runTests = () => {
    console.log('Running ComponentRegistry tests...');

    // Test 1: Initialization
    const registry = new ComponentRegistry();
    assert(registry.components instanceof Map, 'components should be a Map');
    assert(registry.acceptedMimeTypes instanceof Set, 'acceptedMimeTypes should be a Set');
    console.log('Test 1 passed: Initialization');

    // Test 2: Registration
    const componentInfo = { tagName: 'test-component', sourceUrl: '/test.js' };
    registry.register('text/test', componentInfo);
    assert(registry.hasComponent('text/test'), 'hasComponent should return true for registered component');
    assert(registry.getComponent('text/test') === componentInfo, 'getComponent should return the correct component info');
    console.log('Test 2 passed: Registration');

    // Test 3: Unregistration
    registry.unregister('text/test');
    assert(!registry.hasComponent('text/test'), 'hasComponent should return false for unregistered component');
    console.log('Test 3 passed: Unregistration');

    // Test 4: List registered
    registry.register('text/test1', { tagName: 'test-1' });
    registry.register('text/test2', { tagName: 'test-2' });
    const registered = registry.listRegistered();
    assert(registered.size === 2, 'listRegistered should return a map with all registered components');
    assert(registered.get('text/test1').tagName === 'test-1', 'listRegistered map is incorrect');
    console.log('Test 4 passed: List registered');

    // Test 5: Invalid registration
    const initialSize = registry.components.size;
    registry.register(null, { tagName: 'invalid-comp' });
    assert(registry.components.size === initialSize, 'Invalid registration should not add a component');
    console.log('Test 5 passed: Invalid registration');

    console.log('All ComponentRegistry tests passed!');
};

runTests();