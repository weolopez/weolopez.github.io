/**
 * Simple rule-based query classification logic.
 * Inspects user messages for keywords or patterns to provide hints to the model router.
 */
export class Classifier {
  constructor(config = { enabled: false, rules: [] }) {
    this.config = config;
  }

  /**
   * Classify a message against the configured rules.
   * @param {string} message - The user's message.
   * @returns {string|null} - The hint string if a rule matches, otherwise null.
   */
  classify(message) {
    if (!this.config.enabled || !this.config.rules || this.config.rules.length === 0) {
      return null;
    }

    const lower = message.toLowerCase();
    const len = message.length;

    // Sort rules by priority (descending)
    const sortedRules = [...this.config.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of sortedRules) {
      // Length constraints
      if (rule.min_length !== undefined && len < rule.min_length) continue;
      if (rule.max_length !== undefined && len > rule.max_length) continue;

      // Check keywords (case-insensitive)
      const keywordHit = rule.keywords?.some(kw => lower.includes(kw.toLowerCase()));
      
      // Check patterns (case-sensitive)
      const patternHit = rule.patterns?.some(pat => message.includes(pat));

      if (keywordHit || patternHit) {
        return rule.hint;
      }
    }

    return null;
  }
}
