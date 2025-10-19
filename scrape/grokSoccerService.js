/**
 * Service for fetching soccer data using Grok 4 API with real-time search
 */
export class GrokSoccerService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.x.ai/v1'; // Grok API endpoint
  }

  async getPremierLeagueFixtures() {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [{
          role: 'user',
          content: `Get the upcoming Premier League fixtures for the next 2 weeks. Return them as a JSON array of objects with exactly these properties: homeTeam, awayTeam, dateTime (ISO string), competition (set to "Premier League"). Format your response as a JSON code block like this:

\`\`\`json
[
  {
    "homeTeam": "Manchester United",
    "awayTeam": "Liverpool",
    "dateTime": "2025-10-20T15:00:00.000Z",
    "competition": "Premier League"
  }
]
\`\`\`

Only include the JSON code block, no other text or explanation.`
        }],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Grok API');
    }

    try {
      // First try to extract JSON from markdown code blocks
      let jsonContent = content;

      // Check for markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }

      // Try to parse as JSON
      const fixtures = JSON.parse(jsonContent);

      // Validate the structure
      if (Array.isArray(fixtures)) {
        return fixtures.map(fixture => ({
          homeTeam: fixture.homeTeam || 'Unknown',
          awayTeam: fixture.awayTeam || 'Unknown',
          dateTime: fixture.dateTime ? new Date(fixture.dateTime).toISOString() : new Date().toISOString(),
          competition: fixture.competition || 'Premier League',
          channels: [] // Grok might not provide channels
        }));
      }
    } catch (parseError) {
      console.warn('Failed to parse Grok response as JSON, trying text extraction:', parseError);
      console.log('Raw content:', content);
    }

    // Fallback: try to extract fixtures from text response
    return this.extractFixturesFromText(content);
  }

  extractFixturesFromText(text) {
    // Simple text parsing fallback if JSON parsing fails
    const fixtures = [];
    const lines = text.split('\n');

    console.log('Extracting fixtures from text, lines:', lines.length);

    for (const line of lines) {
      // Look for various patterns:
      // 1. "Team A vs Team B - Date"
      // 2. "Team A - Team B: Date"
      // 3. "Date: Team A vs Team B"

      let match = line.match(/^(.+?)\s+vs\s+(.+?)\s*[-:]\s*(.+)$/);
      if (!match) {
        match = line.match(/^(.+?)\s*-\s*(.+?):\s*(.+)$/);
      }
      if (!match) {
        match = line.match(/^(.+?):\s*(.+?)\s+vs\s+(.+)$/);
      }

      if (match) {
        const parts = match.slice(1).map(p => p.trim());
        let homeTeam, awayTeam, dateStr;

        if (match[0].includes('vs')) {
          // Pattern 1 or 3
          if (parts.length === 3) {
            [homeTeam, awayTeam, dateStr] = parts;
          } else {
            [homeTeam, awayTeam] = parts;
            dateStr = 'TBD';
          }
        } else {
          // Pattern 2
          [homeTeam, awayTeam, dateStr] = parts;
        }

        if (homeTeam && awayTeam) {
          fixtures.push({
            homeTeam: homeTeam.trim(),
            awayTeam: awayTeam.trim(),
            dateTime: this.parseDateString(dateStr),
            competition: 'Premier League',
            channels: []
          });
          console.log(`Extracted fixture: ${homeTeam} vs ${awayTeam}`);
        }
      }
    }

    console.log(`Extracted ${fixtures.length} fixtures from text`);
    return fixtures;
  }

  parseDateString(dateStr) {
    try {
      // Try various date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      console.warn('Could not parse date:', dateStr);
    }
    return new Date().toISOString();
  }

  async searchSoccerData(query) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [{
          role: 'user',
          content: `Search for: ${query}. Provide the most current and accurate soccer fixture information available.`
        }],
        temperature: 0.1,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

/**
 * Factory function to create Grok service with API key from environment
 */
export function createGrokSoccerService() {
  // Try multiple sources for the API key
  let apiKey;

  // Browser environment - check localStorage first
  if (typeof localStorage !== 'undefined') {
    apiKey = localStorage.getItem('grok_api_key') || localStorage.getItem('GROK_API_KEY');
  }

  // Node.js/Deno environment
  if (!apiKey && typeof process !== 'undefined' && process?.env) {
    apiKey = process.env.GROK_API_KEY;
  }

  // Vite environment
  if (!apiKey && typeof globalThis !== 'undefined' && globalThis?.import?.meta?.env) {
    apiKey = globalThis.import.meta.env.VITE_GROK_API_KEY || globalThis.import.meta.env.GROK_API_KEY;
  }

  // Global this
  if (!apiKey && typeof globalThis !== 'undefined' && globalThis?.process?.env) {
    apiKey = globalThis.process.env.GROK_API_KEY;
  }

  if (!apiKey) {
    console.warn('No Grok API key found. Set GROK_API_KEY environment variable, VITE_GROK_API_KEY for client-side, or add to localStorage as "grok_api_key"');
    console.warn('Create a .env file with: GROK_API_KEY=your_key_here');
    return null;
  }

  return new GrokSoccerService(apiKey);
}

/**
 * Helper function to set API key in localStorage (client-side only)
 */
export function setGrokApiKey(apiKey) {
  localStorage.setItem('grok_api_key', apiKey);
  console.log('Grok API key saved to localStorage');
}

/**
 * Helper function to check if Grok service is configured
 */
export function isGrokConfigured() {
  const service = createGrokSoccerService();
  return service !== null;
}