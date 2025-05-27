// kv.ts - Deno KV REST API handler

let kvInstance: Deno.Kv | null = null;

async function getKvInstance(): Promise<Deno.Kv> {
  if (!kvInstance) {
    console.log("=== KV DIAGNOSTIC INFO ===");
    console.log("Deno version:", Deno.version);
    console.log("Type of Deno:", typeof Deno);
    console.log("Deno object keys:", Object.keys(Deno));
    console.log("Type of Deno.openKv:", typeof Deno.openKv);
    console.log("Value of Deno.openKv:", Deno.openKv);
    console.log("Deno.permissions available:", typeof Deno.permissions);
    
    // Check if we're in the right runtime
    if (typeof Deno === 'undefined') {
      throw new Error("Deno runtime not available - are you running this with Deno?");
    }
    
    // Check if openKv exists
    if (typeof Deno.openKv !== 'function') {
      throw new Error(`Deno.openKv is not available. Type: ${typeof Deno.openKv}. This usually means missing --unstable-kv flag or insufficient permissions.`);
    }
    
    console.log("Attempting to open KV...");
    kvInstance = await Deno.openKv();
    console.log("KV instance created successfully");
  }
  return kvInstance;
}

function parseKeyFromPath(pathname: string): string[] {
  // Remove /v1/kv prefix and split into key parts
  const path = pathname.replace(/^\/v1\/kv\/?/, '');
  if (!path) return [];
  
  return path.split('/').filter(part => part.length > 0);
}

function createErrorResponse(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

async function handleGet(url: URL): Promise<Response> {
  const kv = await getKvInstance();
  const key = parseKeyFromPath(url.pathname);
  const prefix = url.searchParams.get('prefix');

  try {
    if (prefix) {
      // List entries with prefix
      const prefixKey = prefix.split('/').filter(part => part.length > 0);
      const entries = [];
      
      for await (const entry of kv.list({ prefix: prefixKey })) {
        entries.push({
          key: entry.key,
          value: entry.value,
          versionstamp: entry.versionstamp
        });
      }
      
      return createSuccessResponse(entries);
    } else if (key.length === 0) {
      // List all top-level keys
      const entries = [];
      
      for await (const entry of kv.list({ prefix: [] })) {
        entries.push({
          key: entry.key,
          value: entry.value,
          versionstamp: entry.versionstamp
        });
      }
      
      return createSuccessResponse(entries);
    } else {
      // Get specific entry
      const entry = await kv.get(key);
      
      if (entry.value === null) {
        return createErrorResponse(404, 'Key not found');
      }
      
      return createSuccessResponse({
        key: entry.key,
        value: entry.value,
        versionstamp: entry.versionstamp
      });
    }
  } catch (error) {
    console.error('KV GET error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

async function handlePost(url: URL, request: Request): Promise<Response> {
  const kv = await getKvInstance();
  const key = parseKeyFromPath(url.pathname);
  
  if (key.length === 0) {
    return createErrorResponse(400, 'Key path is required for POST operations');
  }

  try {
    const body = await request.text();
    let data;
    
    try {
      data = JSON.parse(body);
    } catch {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }

    const result = await kv.set(key, data);
    
    return createSuccessResponse({
      key,
      value: data,
      versionstamp: result.versionstamp
    }, 201);
  } catch (error) {
    console.error('KV POST error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

async function handlePut(url: URL, request: Request): Promise<Response> {
  const kv = await getKvInstance();
  const key = parseKeyFromPath(url.pathname);
  
  if (key.length === 0) {
    return createErrorResponse(400, 'Key path is required for PUT operations');
  }

  try {
    const body = await request.text();
    let data;
    
    try {
      data = JSON.parse(body);
    } catch {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }

    const result = await kv.set(key, data);
    
    return createSuccessResponse({
      key,
      value: data,
      versionstamp: result.versionstamp
    });
  } catch (error) {
    console.error('KV PUT error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

async function handleDelete(url: URL): Promise<Response> {
  const kv = await getKvInstance();
  const key = parseKeyFromPath(url.pathname);
  
  if (key.length === 0) {
    return createErrorResponse(400, 'Key path is required for DELETE operations');
  }

  try {
    // Check if key exists before deletion
    const entry = await kv.get(key);
    if (entry.value === null) {
      return createErrorResponse(404, 'Key not found');
    }

    await kv.delete(key);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('KV DELETE error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

export async function handleKvRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  let response: Response;

  switch (method) {
    case 'GET':
      response = await handleGet(url);
      break;
    case 'POST':
      response = await handlePost(url, request);
      break;
    case 'PUT':
      response = await handlePut(url, request);
      break;
    case 'DELETE':
      response = await handleDelete(url);
      break;
    default:
      response = createErrorResponse(405, `Method ${method} not allowed`);
  }

  // Add CORS headers to response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}