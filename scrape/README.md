# Soccer Data Scraper Integration

This directory contains the soccer data scraping and integration system for the prediction table.

## Features

- **Grok API Integration**: Uses Grok 4 API with real-time search capabilities for Premier League fixtures
- **CSV Integration**: Converts fixture data to CSV format for the prediction table
- **Responsive UI**: "Load Premier League" button added to prediction table
- **Flexible API Key Support**: Environment variables, localStorage, multiple sources

## Setup

1. **Get Grok API Key**:
   Visit https://console.x.ai/ to get your Grok API key

2. **Configure API Key**:
   ```bash
   cp .env.example .env
   # Edit .env and add your Grok API key
   # GROK_API_KEY=your_key_here
   ```

   Or set via browser console:
   ```javascript
   import { setGrokApiKey } from './scrape/grokSoccerService.js';
   setGrokApiKey('your_api_key_here');
   ```

3. **Server Running**:
   Make sure the Deno server is running:
   ```bash
   deno run --allow-net --allow-read static-server.ts
   ```

## Usage

### In Prediction Table
- Click the "Load Premier League" button to fetch fixtures
- Data will be loaded into the table automatically
- Existing predictions will be preserved

### Testing
Open `scrape/test-integration.html` in your browser to test:
- Web scraping functionality
- Grok API integration
- CSV conversion
- Full end-to-end integration

## API Keys

The system supports multiple ways to provide the Grok API key:

1. **Environment Variable**: `GROK_API_KEY`
2. **Client-side**: `VITE_GROK_API_KEY` (for Vite builds)
3. **localStorage**: `grok_api_key` or `GROK_API_KEY`

## Architecture

```
getSoccerData() → Use Grok API → Return fixture data
                        ↓ (fails)
              Return empty array
```

## API Key Sources (in order of priority)

1. `localStorage.getItem('grok_api_key')`
2. `process.env.GROK_API_KEY` (Node/Deno)
3. `import.meta.env.VITE_GROK_API_KEY` (Vite)
4. `globalThis.process.env.GROK_API_KEY`

## Current Status

- ✅ Web scraping implemented (but blocked by Cloudflare)
- ✅ Grok API fallback implemented
- ✅ CSV conversion working
- ✅ Prediction table integration complete
- ✅ Testing framework in place

## Next Steps

1. Obtain Grok API key from https://console.x.ai/
2. Test the integration with real API calls
3. Consider additional data sources if Grok API proves insufficient