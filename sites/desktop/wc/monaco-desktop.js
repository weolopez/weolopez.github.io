/**
 * Component: <monaco-desktop>
 * Root container managing window instances
 */
let zIndexCounter = 1000;

export class MonacoDesktop extends HTMLElement {
    constructor() {
        super();
        this.windowCount = 0;
    }

    connectedCallback() {
        this.addEventListener('window-focus', (e) => this.focusWindow(e.target));
        this.addEventListener('window-minimize', () => this.updateTaskbar());
    }

    createWindow(title, lang, content) {
        this.windowCount++;
        const win = document.createElement('desktop-window');
        win.setAttribute('title', title || `Script_${this.windowCount}.js`);
        
        const editor = document.createElement('monaco-editor-instance');
        editor.setAttribute('language', lang || 'javascript');
        editor.setAttribute('value', content || '');
        win.appendChild(editor);
        
        // Initial positioning
        win.style.width = '600px';
        win.style.height = '400px';
        win.style.left = `${60 + (this.windowCount * 25) % 300}px`;
        win.style.top = `${60 + (this.windowCount * 25) % 200}px`;
        //get body tag
        let body = document.body;
        body.appendChild(win);
        this.focusWindow(win);
        this.updateTaskbar();
        return win;
    }

    focusWindow(targetWin) {
        this.querySelectorAll('desktop-window').forEach(w => w.classList.remove('active'));
        targetWin.classList.add('active');
        targetWin.style.zIndex = ++zIndexCounter;
        targetWin.style.display = 'flex';
        
        const editor = targetWin.querySelector('monaco-editor-instance');
        if (editor) editor.focus();
        
        this.updateTaskbar();
    }

    updateTaskbar() {
        const taskList = document.getElementById('task-list');
        if (!taskList) return;
        taskList.innerHTML = '';
        
        this.querySelectorAll('desktop-window').forEach(win => {
            const item = document.createElement('div');
            item.className = `task-item ${win.classList.contains('active') ? 'active' : ''}`;
            item.innerText = win.getAttribute('title');
            item.onclick = () => this.focusWindow(win);
            taskList.appendChild(item);
        });
    }
}

customElements.define('monaco-desktop', MonacoDesktop);
