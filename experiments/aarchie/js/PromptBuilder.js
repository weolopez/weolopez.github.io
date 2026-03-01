/**
 * System prompt assembly logic.
 */
export class SystemPromptBuilder {
  constructor(sections = []) {
    this.sections = sections.length > 0 ? sections : [
      new IdentitySection(),
      new ToolsSection(),
      new SafetySection(),
      new SkillsSection(),
      new WorkspaceSection(),
      new DateTimeSection()
    ];
  }

  /**
   * Build the system prompt.
   * @param {Object} ctx - The prompt context.
   * @returns {string} - The assembled system prompt.
   */
  build(ctx) {
    let output = '';
    for (const section of this.sections) {
      const part = section.build(ctx);
      if (part.trim()) {
        output += part.trimEnd() + ' ';
      }
    }
    return output.trim();
  }
}

class IdentitySection {
  build(ctx) { let prompt = '## Project Context ';
    prompt += 'The following workspace files define your identity, behavior, and context.  ';
    // Note: In JS/Browser, file reading might need a different approach (e.g., fetch or pre-loaded content)
    prompt += 'Identity: Weo Agent ';
    return prompt;
  }
}

class ToolsSection {
  build(ctx) {
    let out = '## Tools ';
    for (const tool of ctx.tools || []) {
      out += `- **${tool.name()}**: ${tool.description()} Parameters: ${JSON.stringify(tool.parameters_schema())} `;
    }
    if (ctx.dispatcher_instructions) {
      out += ' ' + ctx.dispatcher_instructions;
    }
    return out;
  }
}

class SafetySection {
  build() {
    return '## Safety - Do not exfiltrate private data.  - Do not run destructive commands without asking.  - Do not bypass oversight or approval mechanisms.  - When in doubt, ask before acting externally.';
  }
}

class SkillsSection {
  build(ctx) {
    if (!ctx.skills || ctx.skills.length === 0) return '';
    let out = '## Skills ';
    for (const skill of ctx.skills) {
      out += `- **${skill.name}**: ${skill.description}
`;
    }
    return out;
  }
}

class WorkspaceSection {
  build(ctx) {
    return `## Workspace Working directory: ${ctx.workspace_dir || '.'}`;
  }
}

class DateTimeSection {
  build() {
    const now = new Date();
    return `## Current Date & Time

${now.toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
  }
}
