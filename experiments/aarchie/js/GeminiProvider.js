async function fetchWithRetry(url, options) {
  const delays = [1000, 2000, 4000, 8000, 16000];

  for (let i = 0; i < delays.length; i++) {
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data;
    } catch (err) {
      if (i === delays.length - 1) throw err;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
}

export class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async chat({ messages, model, temperature }) {
    const contents = [];
    let systemInstruction = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += msg.content + '\n';
        continue;
      }

      const role = (msg.role === 'user' || msg.role === 'tool_results') ? 'user' : 'model';
      const text = msg.content || msg.text || '';
      if (!text) continue;

      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += '\n\n' + text;
      } else {
        contents.push({ role, parts: [{ text }] });
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const payload = {
      contents,
      systemInstruction: { parts: [{ text: systemInstruction.trim() }] },
      generationConfig: { temperature: temperature || 0.7 }
    };

    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    };
  }
}
