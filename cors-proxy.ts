/**
 * CORS Proxy for isomorphic-git
 * Based on https://github.com/isomorphic-git/cors-proxy
 */

export async function handleCorsProxyRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // isomorphic-git sends requests in different formats:
  // 1. /cors-proxy/https://github.com/...
  // 2. /cors-proxy/github.com/... (missing protocol)
  // Extract the target URL from the path
  let pathWithoutProxy = url.pathname.replace('/cors-proxy/', '').replace('/cors-proxy', '');
  
  // Preserve query parameters from the original request
  if (url.search) {
    pathWithoutProxy += url.search;
  }
  
  let targetUrl = pathWithoutProxy;
  
  // Handle both path-based and query parameter formats
  if (!targetUrl) {
    targetUrl = url.searchParams.get('url') || '';
  }
  
  // Add https:// if missing
  if (targetUrl && !targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }
  
  if (!targetUrl || !targetUrl.startsWith('http')) {
    console.error('Invalid target URL:', targetUrl, 'from request:', request.url);
    return new Response(`Missing or invalid target URL. Got: ${targetUrl}`, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // Validate that the target URL is an allowed endpoint
  const allowedHosts = [
    'api.github.com',
    'github.com',
    'gitlab.com',
    'api.gitlab.com',
    'www.livesoccertv.com',
    'livesoccertv.com',
    'httpbin.org' // For testing
  ];
  
  let targetURL: URL;
  try {
    targetURL = new URL(targetUrl);
  } catch (error) {
    return new Response('Invalid target URL', { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  if (!allowedHosts.includes(targetURL.hostname)) {
    return new Response(`Host ${targetURL.hostname} not allowed`, { 
      status: 403,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Forward the request to the target URL
    const proxyHeaders = new Headers();
    
    // Copy relevant headers from the original request
    const headersToForward = [
      'authorization',
      'content-type',
      'user-agent',
      'accept',
      'accept-encoding',
      'accept-language',
    ];

    for (const headerName of headersToForward) {
      const headerValue = request.headers.get(headerName);
      if (headerValue) {
        proxyHeaders.set(headerName, headerValue);
      }
    }

    // Add required headers for GitHub API
    if (targetURL.hostname === 'api.github.com') {
      proxyHeaders.set('Accept', 'application/vnd.github.v3+json');
      if (!proxyHeaders.has('User-Agent')) {
        proxyHeaders.set('User-Agent', 'isomorphic-git-cors-proxy');
      }
    }

    // Make the request to the target URL
    const response = await fetch(targetURL.toString(), {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    });

    // Create response headers with CORS
    const responseHeaders = new Headers();
    
    // Copy response headers
    for (const [key, value] of response.headers.entries()) {
      // Skip headers that might cause issues
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }

    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Expose-Headers', '*');

    // Handle different content types appropriately
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json') || contentType.includes('text/')) {
      // For JSON and text responses, read as text to avoid encoding issues
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } else {
      // For binary content, pass through as-is
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

  } catch (error) {
    console.error('CORS proxy error:', error);
    
    return new Response(`Proxy error: ${error.message}`, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }
}