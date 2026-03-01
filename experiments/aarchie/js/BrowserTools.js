export class JavaScriptExecuteTool {
  name() { return 'execute_js'; }

  spec() {
    return {
      type: 'function',
      function: {
        name: this.name(),
        description: this.description(),
        parameters: this.parameters_schema()
      }
    };
  }

  description() {
    return 'Executes Javascript in the browser environment. Use it to do math, calculate dates, manipulate data, or run logic. You have access to standard browser APIs including window, navigator, and storage. Code must either return a value or use console.log.';
  }

  parameters_schema() {
    return {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The raw JavaScript code block to execute.' }
      },
      required: ['code']
    };
  }

  async execute(args) {
    const originalLog = console.log;
    const originalAlert = window.alert;

    try {
      const logs = [];
      const safeStringify = (obj) => {
        try { return typeof obj === 'object' ? JSON.stringify(obj) : String(obj); }
        catch (e) { return String(obj); }
      };

      console.log = (...items) => {
        logs.push(items.map(x => safeStringify(x)).join(' '));
        originalLog(...items);
      };

      window.alert = (...items) => {
        logs.push('ALERT: ' + items.join(' '));
      };

      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction(args.code);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('JavaScript execution timed out after 10 seconds.')), 10000);
      });

      const result = await Promise.race([fn(), timeoutPromise]);

      console.log = originalLog;
      window.alert = originalAlert;

      let output = '';
      if (logs.length > 0) output += '[Console Logs]\n' + logs.join('\n') + '\n';
      if (result !== undefined) output += '[Return Value]\n' + safeStringify(result);

      output = output.trim() || 'Script executed successfully with no output.';
      if (output.length > 4000) output = output.substring(0, 4000) + '... [Output Truncated]';

      return { success: true, output };
    } catch (e) {
      console.log = originalLog;
      window.alert = originalAlert;
      return { success: false, output: e.toString() };
    }
  }
}

export class LoadSkillTool {
  name() { return 'load_skill'; }

  spec() {
    return {
      type: 'function',
      function: {
        name: this.name(),
        description: this.description(),
        parameters: this.parameters_schema()
      }
    };
  }

  description() {
    return 'Loads documentation and endpoints for a specific skill.';
  }

  parameters_schema() {
    return {
      type: 'object',
      properties: {
        skill_name: { type: 'string', description: 'Skill to load (e.g., weather_api)' }
      },
      required: ['skill_name']
    };
  }

  async execute(args) {
    if (args.skill_name === 'weather_api') {
      return {
        success: true,
        output: "Weather API loaded. Use execute_js with: return await fetch('https://wttr.in/?format=j1').then(r => r.json());"
      };
    }

    if (args.skill_name === 'web_search') {
      return {
        success: true,
        output: "Web search API loaded. Use execute_js with: return await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent('your query') + '&utf8=&format=json&origin=*').then(r => r.json());"
      };
    }

    return { success: false, output: `Skill '${args.skill_name}' not found.` };
  }
}
