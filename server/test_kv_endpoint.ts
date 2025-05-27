// test_kv_endpoint.ts - Simple test script for the KV endpoint

const BASE_URL = 'http://localhost:8081';
const TOKEN = Deno.env.get("TOKEN");

if (!TOKEN) {
  console.error("Error: Environment variable TOKEN is not set.");
  Deno.exit(1);
}

async function makeRequest(method: string, path: string, body?: any): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return await fetch(url, options);
}

async function testKvEndpoint() {
  console.log('🧪 Testing KV Endpoint...\n');

  try {
    // Test 1: Create data with PUT
    console.log('1. Creating user preferences with PUT...');
    const userData = {
      username: "ada",
      theme: "dark",
      language: "en-US"
    };
    
    const putResponse = await makeRequest('PUT', '/v1/kv/preferences/ada', userData);
    console.log(`Status: ${putResponse.status}`);
    console.log(`Response: ${await putResponse.text()}\n`);

    // Test 2: Get the data back
    console.log('2. Retrieving user preferences with GET...');
    const getResponse = await makeRequest('GET', '/v1/kv/preferences/ada');
    console.log(`Status: ${getResponse.status}`);
    console.log(`Response: ${await getResponse.text()}\n`);

    // Test 3: Create another user
    console.log('3. Creating another user with POST...');
    const userData2 = {
      username: "grace",
      theme: "light",
      language: "en-GB"
    };
    
    const postResponse = await makeRequest('POST', '/v1/kv/preferences/grace', userData2);
    console.log(`Status: ${postResponse.status}`);
    console.log(`Response: ${await postResponse.text()}\n`);

    // Test 4: List all preferences with prefix
    console.log('4. Listing all preferences with prefix...');
    const listResponse = await makeRequest('GET', '/v1/kv?prefix=preferences');
    console.log(`Status: ${listResponse.status}`);
    console.log(`Response: ${await listResponse.text()}\n`);

    // Test 5: Update ada's preferences
    console.log('5. Updating ada\'s preferences...');
    const updatedUserData = {
      username: "ada",
      theme: "light",
      language: "en-US",
      notifications: true
    };
    
    const updateResponse = await makeRequest('PUT', '/v1/kv/preferences/ada', updatedUserData);
    console.log(`Status: ${updateResponse.status}`);
    console.log(`Response: ${await updateResponse.text()}\n`);

    // Test 6: Get updated data
    console.log('6. Retrieving updated preferences...');
    const getUpdatedResponse = await makeRequest('GET', '/v1/kv/preferences/ada');
    console.log(`Status: ${getUpdatedResponse.status}`);
    console.log(`Response: ${await getUpdatedResponse.text()}\n`);

    // Test 7: Delete grace's preferences
    console.log('7. Deleting grace\'s preferences...');
    const deleteResponse = await makeRequest('DELETE', '/v1/kv/preferences/grace');
    console.log(`Status: ${deleteResponse.status}`);
    console.log(`Response: ${await deleteResponse.text()}\n`);

    // Test 8: Try to get deleted data (should return 404)
    console.log('8. Trying to get deleted preferences (should be 404)...');
    const getDeletedResponse = await makeRequest('GET', '/v1/kv/preferences/grace');
    console.log(`Status: ${getDeletedResponse.status}`);
    console.log(`Response: ${await getDeletedResponse.text()}\n`);

    // Test 9: List remaining preferences
    console.log('9. Listing remaining preferences...');
    const finalListResponse = await makeRequest('GET', '/v1/kv?prefix=preferences');
    console.log(`Status: ${finalListResponse.status}`);
    console.log(`Response: ${await finalListResponse.text()}\n`);

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
await testKvEndpoint();