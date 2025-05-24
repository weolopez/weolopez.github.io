### Detailed Plan for Soccer Data Scraper (Revised for CORS)

**Goal:** Develop a robust JavaScript function to scrape soccer game data from `https://www.livesoccertv.com` within a web browser environment, supporting various URL patterns and extracting comprehensive game details, by utilizing a server-side proxy to bypass CORS.

**Phase 1: Information Gathering and Initial Setup (Architect Mode)**

1.  **Analyze Website Structure:**
    *   Examine the HTML structure of `https://www.livesoccertv.com` for different URL patterns (homepage, date-specific, competition-specific) to identify common elements and unique identifiers for game listings, team names, times, competitions, and channels.
    *   Pay close attention to how the data is rendered (server-side rendered HTML vs. client-side rendered JavaScript) as this impacts the scraping approach.
    *   Identify potential anti-scraping measures (e.g., CAPTCHAs, IP blocking, dynamic content loading).

**Phase 2: Plan Development (Architect Mode)**

1.  **Function Design:**
    *   Define a main asynchronous JavaScript function, e.g., `getSoccerData(url)`.
    *   This function will take a `livesoccertv.com` URL as input and return a structured array of game objects.
    *   Each game object will contain properties like `homeTeam`, `awayTeam`, `dateTime` (parsed into a `Date` object), `competition`, `channels`, and any other relevant details found.

2.  **Data Fetching Strategy (UPDATED for CORS):**
    *   **Prerequisite:** A **server-side proxy** will be required, implemented in **Deno 2**. This proxy will expose an endpoint (e.g., `/proxy?url=`) that your browser-side JavaScript function will call.
    *   The browser-side `getSoccerData` function will make a `fetch` request to your Deno proxy server, passing the desired `https://www.livesoccertv.com` URL as a query parameter.
    *   The Deno proxy server will then make the actual request to `https://www.livesoccertv.com`, retrieve the HTML content, and send it back to your browser-side script.

3.  **HTML Parsing and Data Extraction:**
    *   Once the HTML content is received from your proxy, use `DOMParser` to parse the HTML string into a `Document` object.
    *   Utilize DOM manipulation methods (e.g., `querySelector`, `querySelectorAll`, `textContent`, `getAttribute`) to navigate the parsed HTML and extract the required data points.
    *   Develop specific selectors for different data points (team names, time, competition, channels). These selectors might need to be robust to handle slight variations across different URL patterns.
    *   Implement error handling for missing elements or unexpected HTML structures.

4.  **Data Normalization and Structuring:**
    *   Parse game times into `Date` objects, considering the local time zone aspect mentioned by the user.
    *   Clean and normalize extracted text data (e.g., trim whitespace, handle special characters).
    *   Structure the extracted data into a consistent JavaScript object format for each game.

5.  **Error Handling and Robustness:**
    *   Implement `try-catch` blocks for network requests (to your proxy) and DOM parsing.
    *   Handle cases where the proxy fails to fetch content, no games are found, or specific data points are missing.
    *   Consider rate limiting on your proxy server if you anticipate many requests.

**Phase 3: Implementation (Code Mode - after plan approval)**

1.  **Implement Proxy Server in Deno 2:**
    *   Create a new Deno module (e.g., `server/src/proxy.ts`) that handles proxy requests.
    *   Modify `server/src/main.ts` or create a new entry point to expose the proxy endpoint.
    *   This endpoint will accept a URL, fetch content from that URL, and return it.
2.  **Create Client-Side Files in `/scrape/`:**
    *   Create `scrape/soccerScraper.js`: A standalone JavaScript file containing the `getSoccerData` function for the browser.
    *   Create `scrape/index.html`: A test HTML file to validate the `soccerScraper.js` file, demonstrating its usage and displaying the scraped data.
3.  **Implement `getSoccerData` in `scrape/soccerScraper.js`:**
    *   Make a `fetch` request to your Deno proxy server, passing the `livesoccertv.com` URL.
    *   Parse the HTML content received from the proxy.
    *   Extract data using identified selectors.
    *   Structure and return the data.
4.  **Testing:**
    *   Write test cases for different `livesoccertv.com` URL patterns within `scrape/index.html`.
    *   Verify that all required data points are extracted correctly.
    *   Test error handling for both proxy communication and data extraction.

**Mermaid Diagram: Soccer Data Scraper Flow (with Deno Proxy)**

```mermaid
graph TD
    A[Web Page Script (scrape/index.html)] --> B{Call getSoccerData(livesoccertv_url)};
    B --> C{Construct Proxy URL};
    C --> D[Fetch HTML Content from Deno Proxy Server];
    D -- Success --> E{Parse HTML using DOMParser};
    D -- Failure --> F[Return Error: Proxy/Network Failed];
    E -- Success --> G{Extract Game Elements};
    E -- Failure --> H[Return Error: HTML Parsing Failed];
    G --> I{Loop through each Game Element};
    I --> J[Extract Home Team, Away Team, Date/Time, Competition, Channels];
    J --> K[Normalize and Structure Game Data];
    K --> L[Add Game Object to Results Array];
    I -- All Games Processed --> M[Return Results Array];
    F --> N[End];
    H --> N;
    M --> N;

    subgraph Deno Proxy Server
        O[Deno Proxy Server (server/src/proxy.ts)] --> P{Receive Request with livesoccertv_url};
        P --> Q[Fetch HTML from livesoccertv_url];
        Q -- Success --> R[Return HTML to Web Page Script];
        Q -- Failure --> S[Return Error to Web Page Script];
    end

    D -- Request --> O;
    R -- Response --> E;
    S -- Error --> F;