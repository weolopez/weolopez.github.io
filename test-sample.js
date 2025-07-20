/**
 * Test JavaScript File
 * This file tests the finder's ability to read and dispatch events for JS files
 */

function testFunction() {
    console.log('This is a test JavaScript file');
    return {
        message: 'File opening test',
        mimeType: 'application/javascript',
        expectedEvent: 'finder-file-content'
    };
}

// Test various JavaScript features
const testObject = {
    name: 'JavaScript Test File',
    purpose: 'Testing file content events',
    features: ['ES6 syntax', 'Functions', 'Objects', 'Comments']
};

export { testFunction, testObject };