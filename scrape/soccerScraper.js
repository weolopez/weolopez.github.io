/**
 * Fetches and parses soccer game data from livesoccertv.com using a proxy.
 * @param {string} livesoccertvUrl - The URL of the livesoccertv.com page to scrape.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of game objects.
 */
export async function getSoccerData(livesoccertvUrl) {
    const proxyUrl = `/proxy?url=${encodeURIComponent(livesoccertvUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Proxy server returned status ${response.status}: ${response.statusText}`);
        }
        const htmlContent = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        const games = [];
        const scheduleTable = doc.querySelector('table.schedules');
        let currentCompetition = 'Unknown Competition';

        if (scheduleTable) {
            scheduleTable.querySelectorAll('tr').forEach(row => {
                if (row.classList.contains('r_comprow')) {
                    // This row contains competition information
                    const competitionSpan = row.querySelector('span.flag');
                    if (competitionSpan) {
                        currentCompetition = competitionSpan.textContent.trim();
                    }
                } else if (row.classList.contains('matchrow')) {
                    // This row contains match information
                    try {
                        const matchLinkElement = row.querySelector('td#match a');
                        const fullMatchName = matchLinkElement?.textContent.trim();
                        const matchUrl = matchLinkElement?.href;

                        let homeTeam = 'N/A';
                        let awayTeam = 'N/A';
                        if (fullMatchName) {
                            const teams = fullMatchName.split(' vs ');
                            if (teams.length === 2) {
                                homeTeam = teams[0].trim();
                                awayTeam = teams[1].trim();
                            } else if (fullMatchName.includes(' - ')) { // Handle score format like "Team A 0 - 0 Team B"
                                const scoreSplit = fullMatchName.split(' - ');
                                if (scoreSplit.length === 2) {
                                    const team1Parts = scoreSplit[0].split(' ');
                                    homeTeam = team1Parts.slice(0, team1Parts.length - 1).join(' ').trim();
                                    const team2Parts = scoreSplit[1].split(' ');
                                    awayTeam = team2Parts.slice(1).join(' ').trim();
                                }
                            } else {
                                // Fallback for other formats, might need more specific regex
                                homeTeam = fullMatchName;
                                awayTeam = 'N/A';
                            }
                        }

                        const timeSpan = row.querySelector('.timecell .ts');
                        const dateTimeMillis = timeSpan?.getAttribute('dv');
                        let dateTime = null;
                        if (dateTimeMillis) {
                            dateTime = new Date(parseInt(dateTimeMillis, 10));
                        }

                        const channelElements = row.querySelectorAll('.mchannels a');
                        const channels = Array.from(channelElements).map(a => a.title.replace('(live stream available)', '').trim());

                        if (homeTeam && awayTeam && dateTime) {
                            games.push({
                                homeTeam,
                                awayTeam,
                                dateTime: dateTime ? dateTime.toISOString() : null,
                                competition: currentCompetition,
                                channels,
                                matchUrl,
                            });
                        }
                    } catch (parseError) {
                        console.error("Error parsing individual game row:", parseError, row.outerHTML);
                    }
                }
            });
        }

        return games;

    } catch (error) {
        console.error("Error fetching or parsing soccer data:", error);
        return [];
    }
}