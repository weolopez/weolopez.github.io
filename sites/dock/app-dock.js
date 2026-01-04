// Shared styles injected once
const DOCK_STYLES = `
  app-dock { position: fixed; background: rgba(255,255,255,0.15); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 8px 32px rgba(0,0,0,0.3); transition: transform 0.3s ease; z-index: 9999; border-radius: 20px; }
  app-dock[position="bottom"] { bottom: 20px; left: 50%; transform: translateX(-50%) scale(var(--dock-scale, 1)); padding: 8px 12px; }
  app-dock[position="left"] { left: 20px; top: 50%; transform: translateY(-50%) scale(var(--dock-scale, 1)); padding: 12px 8px; }
  app-dock[position="right"] { right: 20px; top: 50%; transform: translateY(-50%) scale(var(--dock-scale, 1)); padding: 12px 8px; }
  app-dock:hover { --dock-scale: 1; }
  app-dock[position="bottom"][hidden] { transform: translateX(-50%) translateY(calc(100% + 20px)) scale(var(--dock-scale, 1)) !important; }
  app-dock[position="left"][hidden] { transform: translateY(-50%) translateX(calc(-100% - 20px)) scale(var(--dock-scale, 1)) !important; }
  app-dock[position="right"][hidden] { transform: translateY(-50%) translateX(calc(100% + 20px)) scale(var(--dock-scale, 1)) !important; }
  .dock-container { display: flex; align-items: center; gap: 8px; }
  app-dock[position="bottom"] .dock-container { flex-direction: row; height: 80px; align-items: flex-end; }
  app-dock[position="left"] .dock-container, app-dock[position="right"] .dock-container { flex-direction: column; width: 80px; }
  dock-icon { display: block; cursor: pointer; transition: transform 0.2s ease; position: relative; }
  app-dock[position="bottom"] dock-icon { transform-origin: center bottom; }
  app-dock[position="left"] dock-icon { transform-origin: left center; }
  app-dock[position="right"] dock-icon { transform-origin: right center; }
  dock-icon:hover { z-index: 10; }
  app-dock[position="bottom"] dock-icon:hover { transform: scale(1.5) translateY(-10px); }
  app-dock[position="left"] dock-icon:hover { transform: scale(1.5) translateX(-10px); }
  app-dock[position="right"] dock-icon:hover { transform: scale(1.5) translateX(10px); }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
  @keyframes bounceX { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(var(--bounce-dir, -20px)); } }
  dock-icon.bouncing .icon { animation: bounce 0.6s ease-in-out infinite; }
  app-dock[position="left"] dock-icon.bouncing .icon { --bounce-dir: -20px; animation-name: bounceX; }
  app-dock[position="right"] dock-icon.bouncing .icon { --bounce-dir: 20px; animation-name: bounceX; }
  dock-icon.new-app { animation: popIn 0.3s ease; }
  @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
  .icon { width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  .running-indicator { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #fff; opacity: 0; transition: opacity 0.2s; }
  app-dock[position="bottom"] .running-indicator { bottom: -6px; left: 50%; transform: translateX(-50%); }
  app-dock[position="left"] .running-indicator { left: -6px; top: 50%; transform: translateY(-50%); }
  app-dock[position="right"] .running-indicator { right: -6px; top: 50%; transform: translateY(-50%); }
  .running-indicator.visible { opacity: 1; }
  context-menu { display: none; position: fixed; background: rgba(40,40,40,0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 4px; min-width: 180px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 10000; }
  context-menu.visible { display: block; }
  .menu-item { padding: 8px 12px; cursor: pointer; border-radius: 4px; color: #fff; font-size: 13px; transition: background 0.15s; white-space: nowrap; }
  .menu-item:hover { background: rgba(255,255,255,0.1); }
  .menu-item.disabled { opacity: 0.4; cursor: default; }
  .menu-item.disabled:hover { background: none; }
  .menu-item.checked::before { content: '✓ '; }
  .menu-separator { height: 1px; background: rgba(255,255,255,0.1); margin: 4px 0; }
`;

// Inject styles once
if (!document.getElementById('dock-styles')) {
  const style = Object.assign(document.createElement('style'), { id: 'dock-styles', textContent: DOCK_STYLES });
  document.head.appendChild(style);
}

// Helper to get/create context menu
const getContextMenu = () => {
  let menu = document.querySelector('context-menu');
  if (!menu) {
    menu = document.createElement('context-menu');
    (document.body || document.documentElement).appendChild(menu);
  }
  return menu;
};

class DockIcon extends HTMLElement {
  connectedCallback() {
    const icon = this.getAttribute('icon') || '📦';
    const running = this.hasAttribute('running');
    this.innerHTML = `<div class="icon">${icon}</div><div class="running-indicator ${running ? 'visible' : ''}"></div>`;
    this.addEventListener('click', () => this.launch());
    this.addEventListener('contextmenu', e => this.showMenu(e));
  }
  
  launch() {
    this.dispatchEvent(new CustomEvent('app-launch', { bubbles: true, detail: { name: this.getAttribute('app-name') } }));
  }
  
  startBounce(duration) {
    this.classList.add('bouncing');
    clearTimeout(this.bounceTimeout);
    if (duration) this.bounceTimeout = setTimeout(() => this.stopBounce(), duration);
  }
  
  stopBounce() {
    this.classList.remove('bouncing');
    clearTimeout(this.bounceTimeout);
  }
  
  showMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    const running = this.hasAttribute('running');
    getContextMenu().show(e.clientX, e.clientY, [
      { label: running ? 'Quit' : 'Open', action: () => this.launch() },
      { separator: true },
      { label: 'Remove from Dock', action: () => this.remove() },
      { label: 'Show in Finder', disabled: true }
    ]);
  }
}

class AppDock extends HTMLElement {
  connectedCallback() {
    this.position = this.getAttribute('position') || 'bottom';
    this.autoHide = false;
    this.magnification = 0.5;
    this.innerHTML = '<div class="dock-container"></div>';
    this.container = this.querySelector('.dock-container');
    
    ['📁 Finder', '🧭 Safari', '✉️ Mail', '🎵 Music', '📷 Photos'].forEach(app => {
      const [icon, name] = app.split(' ');
      this.addApp(name, icon);
    });
    
    this.addEventListener('contextmenu', e => this.showMenu(e));
    this.addEventListener('app-launch', e => this.handleLaunch(e));
    window.addEventListener('application-launching', e => this.handleAppLaunching(e));
    window.addEventListener('application-launched', e => this.handleAppLaunched(e));
    this.setupAutoHide();
    this.updateScale();
  }
  
  setupAutoHide() {
    let hideTimeout;
    this.addEventListener('mouseenter', () => { clearTimeout(hideTimeout); if (this.autoHide) this.removeAttribute('hidden'); });
    this.addEventListener('mouseleave', () => { if (this.autoHide) hideTimeout = setTimeout(() => this.setAttribute('hidden', ''), 500); });
    document.addEventListener('mousemove', e => {
      if (!this.autoHide || !this.hasAttribute('hidden')) return;
      const { clientX: x, clientY: y } = e, { innerWidth: w, innerHeight: h } = window;
      if ((this.position === 'bottom' && y > h - 5) || (this.position === 'left' && x < 5) || (this.position === 'right' && x > w - 5))
        this.removeAttribute('hidden');
    });
  }
  
  updateScale() { this.style.setProperty('--dock-scale', this.magnification); }
  
  addApp(name, icon) {
    const el = document.createElement('dock-icon');
    el.setAttribute('app-name', name);
    el.setAttribute('icon', icon);
    el.classList.add('new-app');
    this.container.appendChild(el);
  }
  
  handleLaunch(e) {
    e.target.setAttribute('running', '');
    e.target.querySelector('.running-indicator').classList.add('visible');
  }
  
  handleAppLaunching(e) {
    const { name, duration, icon } = e.detail;
    let el = this.querySelector(`[app-name="${name}"]`);
    if (!el && icon) { this.addApp(name, icon); el = this.querySelector(`[app-name="${name}"]`); }
    el?.startBounce(duration);
  }
  
  handleAppLaunched(e) {
    const el = this.querySelector(`[app-name="${e.detail.name}"]`);
    if (el) { el.stopBounce(); el.setAttribute('running', ''); el.querySelector('.running-indicator').classList.add('visible'); }
  }
  
  setPosition(pos) { this.position = pos; this.setAttribute('position', pos); }
  setMagnification(scale) { this.magnification = scale; this.updateScale(); }
  
  showMenu(e) {
    if (e.target !== this && e.target !== this.container) return;
    e.preventDefault();
    e.stopPropagation();
    getContextMenu().show(e.clientX, e.clientY, [
      { label: 'Position', separator: true },
      { label: 'Left', action: () => this.setPosition('left'), checked: this.position === 'left' },
      { label: 'Bottom', action: () => this.setPosition('bottom'), checked: this.position === 'bottom' },
      { label: 'Right', action: () => this.setPosition('right'), checked: this.position === 'right' },
      { separator: true },
      { label: 'Magnification', separator: true },
      ...[[0.4, 'Small'], [0.6, 'Medium'], [0.8, 'Large'], [1, 'Full Size']].map(([v, l]) => 
        ({ label: `${l} (${v*100}%)`, action: () => this.setMagnification(v), checked: this.magnification === v })),
      { separator: true },
      { label: 'Turn Hiding On', action: () => { this.autoHide = !this.autoHide; if (!this.autoHide) this.removeAttribute('hidden'); }, checked: this.autoHide },
      { separator: true },
      { label: 'Dock Preferences...', action: () => alert('Preferences') }
    ]);
  }
}

class ContextMenu extends HTMLElement {
  connectedCallback() {
    document.addEventListener('click', () => this.classList.remove('visible'));
  }
  
  show(x, y, items) {
    this.innerHTML = items.map(item => 
      item.separator && !item.label ? '<div class="menu-separator"></div>'
        : `<div class="menu-item${item.disabled ? ' disabled' : ''}${item.checked ? ' checked' : ''}">${item.label}</div>`
    ).join('');
    
    const labelItems = items.filter(it => it.label && !it.disabled);
    this.querySelectorAll('.menu-item:not(.disabled)').forEach((el, i) => {
      if (labelItems[i]?.action) el.onclick = e => { e.stopPropagation(); labelItems[i].action(); this.classList.remove('visible'); };
    });
    
    Object.assign(this.style, { left: x + 'px', top: y + 'px' });
    this.classList.add('visible');
    
    requestAnimationFrame(() => {
      const r = this.getBoundingClientRect(), { innerWidth: w, innerHeight: h } = window;
      if (r.right > w) this.style.left = (w - r.width - 10) + 'px';
      if (r.bottom > h) this.style.top = (h - r.height - 10) + 'px';
    });
  }
}

customElements.define('dock-icon', DockIcon);
customElements.define('app-dock', AppDock);
customElements.define('context-menu', ContextMenu);
