---
name: github-search
description: Search GitHub for repositories and return metadata.
version: 1.0.0
---

# Instructions
1. Extract search query from user request.
2. Fetch `https://api.github.com/search/repositories?q={query}&per_page=5`.
3. Return a JSON string containing an array of objects with {name, description, stars, url}.

```javascript
const query = "react state management";
const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`);
const data = await res.json();
return JSON.stringify(data.items.map(i => ({ 
  name: i.full_name, 
  description: i.description, 
  stars: i.stargazers_count, 
  url: i.html_url 
})));
```

# Examples
- Find the most popular state management libraries on GitHub.
- Search GitHub for "machine learning".
- Show me top repo results for "deno" on GitHub.
- Get github repositories for "vector database".
- Search for "chat component" on GitHub.
