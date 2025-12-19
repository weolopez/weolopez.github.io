class TaskList extends HTMLElement {
  static get observedAttributes() {
    return ['add-task-list-item', 'clear-task-list', 'delete-task-list-item'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tasks = ["Review logs", "System check"];
  }

  get taskListItems() {
    return this._tasks;
  }

  set taskListItems(value) {
    this._tasks = value;
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || newValue === null) return;

    if (name === 'add-task-list-item') {
      this.manage_tasks({ action: 'add', task: newValue });
      this.removeAttribute('add-task-list-item');
    } else if (name === 'clear-task-list') {
      this.manage_tasks({ action: 'clear' });
      this.removeAttribute('clear-task-list');
    } else if (name === 'delete-task-list-item') {
      this.manage_tasks({ action: 'delete', task: newValue });
      this.removeAttribute('delete-task-list-item');
    }
  }

  manage_tasks({ action, task }) {
    const currentTasks = [...this._tasks];
    if (action === "add" && task) {
      currentTasks.push(task);
      this.taskListItems = currentTasks;
    } else if (action === "clear") {
      this.taskListItems = [];
    } else if (action === "delete" && task) {
      this.taskListItems = currentTasks.filter(t => t !== task);
    }
    return `Task list modified: ${action}`;
  }

  connectedCallback() { this.render(); }

  render() {
    const tasks = this.taskListItems;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; background: #1e1e1e; border: 1px solid #333; padding: 15px; border-radius: 12px; width: 200px; color: white; }
        ul { list-style: none; padding: 0; margin: 10px 0 0 0; font-size: 0.9rem; }
        li { padding: 5px 0; border-bottom: 1px solid #222; color: #4ade80; }
        .title { font-size: 0.7rem; color: #888; font-weight: bold; }
      </style>
      <div class="title">ACTIVE TASKS</div>
      <ul>${tasks.map(t => `<li>• ${t}</li>`).join('')}</ul>
    `;
  }
}
customElements.define('task-list', TaskList);
