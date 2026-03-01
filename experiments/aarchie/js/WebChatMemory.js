import { KVDatabase } from './kv.js';

export class WebChatMemory {
  constructor(type, id) {
    this.memory = [];
    this.db = new KVDatabase('AskArchitect', `project-${type}_${id}`);
    this._loadInitialMemory();
  }

  async _loadInitialMemory() {
    this.memory = await this.db.get('memory') || [];
    this.notifyMemoryChanged();
  }

  async saveEpisode(userPrompt, agentResponse) {
    if (!agentResponse) return;
    if (this.memory.some(mem => mem.agentResponse === agentResponse)) return;

    const episode = {
      id: (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
      timestamp: new Date().toISOString(),
      userPrompt: userPrompt || '',
      agentResponse
    };

    this.memory.push(episode);
    await this.db.set('memory', this.memory);
    this.notifyMemoryChanged();
  }

  async recall(query, limit = 5) {
    const allMemories = await this.db.get('memory') || [];
    if (allMemories.length === 0) return [];

    const keywords = query.toLowerCase().split(/\s+/).filter(kw => kw.length > 2);
    const scored = allMemories
      .map(episode => {
        const searchString = `${episode.userPrompt} ${episode.agentResponse}`.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          score += searchString.split(kw).length - 1;
        }
        return { episode, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(item => ({
      key: item.episode.timestamp,
      content: `User: ${item.episode.userPrompt}\nAgent: ${item.episode.agentResponse}`
    }));
  }

  async clearMemory() {
    this.memory = [];
    await this.db.set('memory', this.memory);
    this.notifyMemoryChanged();
  }

  notifyMemoryChanged() {
    if (typeof window.renderMemoryList === 'function') {
      window.renderMemoryList(this.memory);
    }
  }
}
