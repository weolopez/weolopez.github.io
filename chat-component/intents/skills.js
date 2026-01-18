export const SKILL_REGISTRY = {
    'about': {
        content: `---\nname: about\ndescription: Retrieve personal information, work experience, skills, and projects from the user's resume.\nversion: 1.0.0\n---\n\n## Instructions\n1. Fetch the resume data from \`/chat-component/knowledge/resume.json\`.\n2. Return the JSON content as a string to be used as context.\n\n\`\`\`javascript\nconst data = context.memory.resumeData || await fetch('/chat-component/knowledge/resume.json').then(r => r.json());\nreturn JSON.stringify(data);\n\`\`\``
    },
    'create-component': {
        content: `---\nname: create-component\ndescription: Generate instructions and code for a standalone, vanilla Web Component without Shadow DOM.\nversion: 1.0.0\n---\n\n## Role\nYou are a Senior Web Engineer specializing in modular, framework-less architecture.\n\n## Instructions\n1. Target environment: Modern Browsers (ES6+).\n2. Framework: NONE. Use standard Web APIs only.\n3. Shadow DOM: DISABLED. Use global CSS or scoped-by-class CSS within the component.\n4. Structure: Use a class extending \`HTMLElement\`.\n5. Lifecycle: Implement \`connectedCallback\` for initialization.\n6. Registration: Always include \`customElements.define('component-tag', ClassName);\`.\n\n\`\`\`javascript\nclass MyStandaloneComponent extends HTMLElement {\n  connectedCallback() {\n    this.render();\n  }\n\n  render() {\n    this.innerHTML = \\\`\\\n      <style>\\\n        .my-component { font-family: sans-serif; padding: 1rem; }\\\n      </style>\\\n      <div class="my-component">\\\n        <h1>Hello World</h1>\\\n      </div>\\\n    \\\`;\n  }\n}\ncustomElements.define('my-standalone-component', MyStandaloneComponent);\n\`\`\``
    },
    'modify-component': {
        content: `---\nname: modify-component\ndescription: Update an existing Web Component by modifying its attributes or properties.\nversion: 1.0.0\n---\n\n## Role\nYou are a Refactoring Specialist. Your goal is to modify existing vanilla Web Components to reflect requested changes.\n\n## Instructions\n1. Determine which attributes need to change based on the user request.\n2. Implement \`static get observedAttributes()\` to list target attributes.\n3. Use \`attributeChangedCallback(name, oldValue, newValue)\` to trigger updates when those attributes change.\n4. Ensure internal state or DOM is updated reactively when attributes are set via \`element.setAttribute()\`.\n5. Provide the JavaScript code to both update the component class and the code to invoke the change.\n\n\`\`\`javascript\n// Inside the component class:\nstatic get observedAttributes() { return ['data-theme', 'data-label']; }\n\nattributeChangedCallback(name, oldValue, newValue) {\n  if (oldValue !== newValue) {\n    this.render(); // Or perform specific DOM updates\n  }\n}\n\n// To trigger the change:\ndocument.querySelector('my-component').setAttribute('data-label', 'New Value');\n\`\`\``
    },
    'wikipedia-search': {
        content: `---\nname: wikipedia-search\ndescription: Search Wikipedia for summary information.\nversion: 1.0.0\n---\n\nWrite JavaScript to fetch data from Wikipedia API. Return the summary extract.`
    },
    'data-analyst': {
        content: `---\nname: data-analyst\ndescription: Analyze text to extract key entities.\nversion: 1.0.0\n---\n\nWrite JavaScript to process context.previousResult and return a JSON summary.`
    },
    'weather-mock': {
        content: `---\nname: weather-mock\ndescription: Get current weather.\n---\n\nReturn a mocked weather string.`
    },
    'github-search': {
        content: `---\nname: github-search\ndescription: Search GitHub for repositories and return metadata.\nversion: 1.0.0\n---\n\n## Instructions\n1. Extract search query from user request.\n2. Fetch \`https://api.github.com/search/repositories?q={query}&per_page=5\`.\n3. Return a JSON string containing an array of objects with {name, description, stars, url}.\n\n\`\`\`javascript\nconst query = "react state management";\nconst res = await fetch(\`https://api.github.com/search/repositories?q=\${encodeURIComponent(query)}&per_page=5\`);\nconst data = await res.json();\nreturn JSON.stringify(data.items.map(i => ({ name: i.full_name, description: i.description, stars: i.stargazers_count, url: i.html_url })));\n\`\`\``
    },
    'text-translator': {
        content: `---\nname: text-translator\ndescription: Translate text.\n---\n\nSimulate translation or use a free API.`
    },
    'currency-converter': {
        content: `---\nname: currency-converter\ndescription: Convert currency values.\n---\n\nPerform math on context.previousResult numerical values.`
    },
    'sentiment-analyzer': {
        content: `---\nname: sentiment-analyzer\ndescription: Analyze the emotional tone (positive/negative) of text.\nversion: 1.0.0\n---\n\n## Instructions\n1. Take \`context.previousResult\` as input.\n2. Ensure it is a string (if object, stringify it).\n3. Analyze for positive and negative keywords.\n4. Return a JSON object: { score: number (-1 to 1), label: string }.\n\n\`\`\`javascript\nconst text = typeof context.previousResult === 'string' ? context.previousResult : JSON.stringify(context.previousResult || "");\nconst positive = ["great", "popular", "fast", "easy", "native", "interface"].filter(w => text.toLowerCase().includes(w)).length;\nconst negative = ["slow", "hard", "complex", "bloated"].filter(w => text.toLowerCase().includes(w)).length;\nconst score = (positive - negative) / (positive + negative || 1);\nreturn JSON.stringify({ score, label: score >= 0 ? "Positive" : "Negative" });\n\`\`\``
    },
    'pro-con-generator': {
        content: `---\nname: pro-con-generator\ndescription: Generates a comparison of Pros and Cons based on input data.\nversion: 1.0.0\n---\n\n## Instructions\n1. Review \`context.previousResult\`.\n2. Identify 3 Pros and 3 Cons.\n3. Return them as a bulleted list string.\n\n\`\`\`javascript\nreturn "PROS:\\n- Fast\\n- Popular\\n- Scalable\\n\\nCONS:\\n- Steep learning curve\\n- Large bundle size\\n- Frequent updates";\n\`\`\``
    },
    'image-prompt-gen': {
        content: `---\nname: image-prompt-gen\ndescription: Create detailed image prompts.\n---\n\nExpand a short description into a Midjourney style prompt.`
    },
    'code-explainer': {
        content: `---\nname: code-explainer\ndescription: Explain code snippets.\n---\n\nBreak down logic in context.previousResult.`
    },
    'unit-converter': {
        content: `---\nname: unit-converter\ndescription: Convert units (e.g. km to miles).\n---\n\nPerform unit conversion math.`
    },
    'date-formatter': {
        content: `---\nname: date-formatter\ndescription: Format dates into ISO or Human readable.\n---\n\nUse new Date().toLocaleString().`
    },
    'json-validator': {
        content: `---\nname: json-validator\ndescription: Validate if text is valid JSON.\n---\n\nTry JSON.parse(context.previousResult).`
    },
    'news-fetcher': {
        content: `---\nname: news-fetcher\ndescription: Fetch latest news headlines.\n---\n\nFetch from a news API or RSS.`
    },
    'slack-notifier': {
        content: `---\nname: slack-notifier\ndescription: Format result for Slack.\n---\n\nReturn a Slack block-kit compatible JSON string.`
    },
    'jira-formatter': {
        content: `---\nname: jira-formatter\ndescription: Format result for Jira.\n---\n\nReturn Jira markdown.`
    },
    'browser-storage-sync': {
        content: `---\nname: browser-storage-sync\ndescription: Save data to localStorage.\n---\n\nWrite context.previousResult to localStorage.`
    },
    'math-evaluator': {
        content: `---\nname: math-evaluator\ndescription: Evaluate mathematical expressions.\n---\n\nUse safe eval / math.js.`
    },
    'validator': {
        content: `---\nname: validator\ndescription: Check if data is consistent.\n---\n\nVerify properties in context.memory.`
    },
    'markdown-table-formatter': {
        content: `---\nname: markdown-table-formatter\ndescription: Convert a list of objects into a formatted Markdown table.\nversion: 1.0.0\n---\n\n## Instructions\n1. Take \`context.previousResult\`.\n2. Ensure it is an array of objects. (If it's a JSON string, parse it).\n3. Return a string representing a Markdown table.\n\n\`\`\`javascript\nlet data = context.previousResult;\nif (typeof data === 'string') {\n    try { data = JSON.parse(data); } catch(e) { return "Error: Invalid JSON input for table."; }\n}\nif (!Array.isArray(data) || data.length === 0) return "No data to display in table.";\n\nconst headers = Object.keys(data[0]);\nconst headerRow = "| " + headers.join(" | ") + " |";\nconst dividerRow = "| " + headers.map(() => "---").join(" | ") + " |";\nconst rows = data.map(obj => "| " + headers.map(h => obj[h]).join(" | ") + " |").join("\\n");\nreturn headerRow + "\\n" + dividerRow + "\\n" + rows;\n\`\`\``
    },
    'orchestrator': {
        content: `---\nname: orchestrator\ndescription: Use this when a user request is complex, multi-step, or requires combining multiple specialized skills (e.g., "search for X and then analyze it" or "fetch data and format as table").\nversion: 1.0.0\n---\n\n## Role\nYou are the Logic Coordinator. Your goal is to decompose a complex request into a sequence of atomic skill calls.\n\n## Instructions\n1. Identify the chain of skills needed from the Registry.\n2. Return a JSON array representing the execution plan.\n\n\`\`\`javascript\n// Example for "Find github repos about AI and summarize them in a table"\nreturn JSON.stringify([\n  { skill: "github-search", args: { query: "AI" } },\n  { skill: "markdown-table-formatter" }\n]);\n\`\`\``
    }
};
