/**
 * Fetches and parses soccer game data from livesoccertv.com using a proxy.
 * Falls back to Grok API if web scraping fails.
 * @param {string} livesoccertvUrl - The URL of the livesoccertv.com page to scrape.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of game objects.
 */
export async function getSoccerData(livesoccertvUrl) {
  // Use Grok API as the primary method (Option 2)
  try {
    console.log('Using Grok API for Premier League fixtures');
    const { createGrokSoccerService } = await import('./grokSoccerService.js');
    const grokService = createGrokSoccerService();

    if (!grokService) {
      console.error('No Grok API key configured');
      return [];
    }

    const games = await grokService.getPremierLeagueFixtures();
    console.log(`Successfully fetched ${games.length} games from Grok API`);
    return games;

  } catch (error) {
    console.error("Grok API failed:", error);
    return [];
  }
}

/**
 * Converts scraped soccer data to CSV format suitable for prediction table.
 * @param {Array<Object>} games - Array of game objects from getSoccerData.
 * @returns {string} CSV string with headers: home,away,date/time,quique,weo,ai,actual
 */
export function convertGamesToCSV(games) {
  const csvLines = ['home,away,date/time,quique,weo,ai,actual'];

  games.forEach(game => {
    const dateStr = game.dateTime ? new Date(game.dateTime).toLocaleString() : '';
    const csvLine = `"${game.homeTeam}","${game.awayTeam}","${dateStr}",,,,"`;
    csvLines.push(csvLine);
  });

  return csvLines.join('\n');
}

/**
 * Integrates soccer scraper with prediction table by fetching data and loading it as CSV.
 * @param {string} livesoccertvUrl - URL to scrape (e.g., Premier League URL).
 * @param {string} weekName - Name for the week (e.g., "premier-league-2025").
 * @returns {Promise<string>} CSV string that was loaded into the table.
 */
export async function loadSoccerDataIntoPredictionTable(livesoccertvUrl, weekName) {
  try {
    console.log(`Fetching soccer data from: ${livesoccertvUrl}`);
    const games = await getSoccerData(livesoccertvUrl);

    if (games.length === 0) {
      throw new Error('No games found at the provided URL');
    }

    console.log(`Found ${games.length} games, converting to CSV`);
    const csv = convertGamesToCSV(games);

    // Find prediction table element - search in shadow DOM if needed
    let predictionTable = document.querySelector('prediction-table');

    // If not found in document root, try searching in shadow roots
    if (!predictionTable) {
      const allElements = document.querySelectorAll('*');
      for (const element of allElements) {
        if (element.tagName === 'PREDICTION-TABLE') {
          predictionTable = element;
          break;
        }
        // Also check shadow root
        if (element.shadowRoot) {
          predictionTable = element.shadowRoot.querySelector('prediction-table');
          if (predictionTable) break;
        }
      }
    }

    if (!predictionTable) {
      throw new Error('No prediction-table element found in the document');
    }

    // Set the data attributes to load the CSV
    predictionTable.setAttribute('data-csv', csv);
    predictionTable.setAttribute('data-week', weekName);

    console.log(`Loaded ${games.length} games into prediction table for week: ${weekName}`);
    return csv;

  } catch (error) {
    console.error('Error loading soccer data into prediction table:', error);
    throw error;
  }
}

