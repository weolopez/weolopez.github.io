class PredictionTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.data = null;
    this.currentWeek = null;
    this.db = null;
  }

  async connectedCallback() {
    this.db = await this.initDB();
    this.currentWeek = this.getAttribute('data-week') || '1';
    const csv = this.getAttribute('data-csv');
    const weeks = await this.getWeeks();
    this.render(weeks);
    await this.loadData(this.currentWeek, csv);
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EPLPredictionsDB', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('weeks', { keyPath: 'week' });
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getWeeks() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['weeks'], 'readonly');
      const store = transaction.objectStore('weeks');
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result.sort());
      request.onerror = () => reject(request.error);
    });
  }

  async loadData(week, csv = null) {
    const data = await this.getDataFromDB(week);
    if (data) {
      this.data = data;
    } else if (csv) {
      this.data = { week, matches: this.parseCSV(csv) };
      this.data.matches.forEach(match => {
        match.original_quique = match.quique;
        match.original_weo = match.weo;
        match.original_ai = match.ai;
        match.actual = match.actual || '';
      });
    } else {
      this.data = { week, matches: [] };
    }
    this.renderTable();
  }

  async getDataFromDB(week) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['weeks'], 'readonly');
      const store = transaction.objectStore('weeks');
      const request = store.get(week);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveData() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['weeks'], 'readwrite');
      const store = transaction.objectStore('weeks');
      const request = store.put(this.data);
      request.onsuccess = () => {
        resolve();
        this.renderWeeksDropdown();
      };
      request.onerror = () => reject(request.error);
    });
  }

  parseCSV(csvString) {
    const lines = csvString.trim().split('\n');
    const headers = lines[0].split(',');
    const matches = lines.slice(1).map(line => {
      const values = line.split(',');
      const match = {};
      headers.forEach((header, index) => {
        match[header.trim().toLowerCase()] = values[index]?.trim();
      });
      return match;
    });
    return matches;
  }

  render(weeks) {
    const style = `
      <style>
        table { width: 100%; border-collapse: collapse; font-family: sans-serif; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        tr:hover { background-color: #f5f5f5; }
        .edit-glow { border: 2px solid red !important; transition: border 2s ease-out; }
        .modified { border: 2px solid red; }
        .exact-match { background-color: green; color: white; }
        .winner-match { background-color: yellow; }
        .home-correct { border-left: 2px solid lightblue; }
        .away-correct { border-right: 2px solid lightblue; }
        select, button, textarea { margin: 10px 0; display: block; }
        textarea { width: 100%; height: 100px; }
      </style>
    `;
    const html = `
      ${style}
      <div>
        <select id="week-dropdown"></select>
        <div id="week-title"></div>
        <table id="prediction-table">
          <thead>
            <tr>
              <th>HOME</th>
              <th>AWAY</th>
              <th>date/time</th>
              <th>quique</th>
              <th>weo</th>
              <th>ai</th>
              <th>actual</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <textarea id="paste-csv" placeholder="Paste CSV here"></textarea>
        <button id="load-paste">Load Pasted CSV</button>
        <button id="save-btn">Save Changes</button>
      </div>
    `;
    this.shadowRoot.innerHTML = html;
    this.renderWeeksDropdown(weeks);
    this.shadowRoot.querySelector('#week-dropdown').addEventListener('change', (e) => this.switchWeek(e.target.value));
    this.shadowRoot.querySelector('#save-btn').addEventListener('click', () => this.saveData());
    this.shadowRoot.querySelector('#load-paste').addEventListener('click', () => this.loadPastedCSV());
  }

  async renderWeeksDropdown(weeks = null) {
    if (!weeks) weeks = await this.getWeeks();
    const dropdown = this.shadowRoot.querySelector('#week-dropdown');
    dropdown.innerHTML = weeks.map(w => `<option value="${w}" ${w === this.currentWeek ? 'selected' : ''}>Week ${w}</option>`).join('');
  }

  switchWeek(week) {
    this.currentWeek = week;
    this.loadData(week);
    this.shadowRoot.querySelector('#week-title').textContent = `Match Week ${week}`;
  }

  renderTable() {
    if (!this.data) return;
    this.shadowRoot.querySelector('#week-title').textContent = `Match Week ${this.currentWeek}`;
    const tbody = this.shadowRoot.querySelector('tbody');
    tbody.innerHTML = '';
    this.data.matches.forEach((match, index) => {
      const tr = document.createElement('tr');
      ['home', 'away', 'date/time'].forEach(key => {
        const td = document.createElement('td');
        td.textContent = match[key];
        tr.appendChild(td);
      });
      ['quique', 'weo', 'ai', 'actual'].forEach(key => {
        const td = document.createElement('td');
        td.contentEditable = true;
        td.textContent = match[key];
        td.dataset.original = match[`original_${key}`] || match[key];
        td.title = `Original: ${td.dataset.original}`;
        td.addEventListener('input', (e) => this.handleEdit(e, index, key));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
      // now that row is in the DOM, update persistent modified marks for quique/weo
      this.updateModifiedClass(index, 'quique');
      this.updateModifiedClass(index, 'weo');
    });
    this.updateHighlights();
  }

  handleEdit(event, rowIndex, key) {
    const td = event.target;
    this.data.matches[rowIndex][key] = td.textContent.trim();
    if (key === 'quique' || key === 'weo') {
      this.updateModifiedClass(rowIndex, key);
    } else {
      td.classList.add('edit-glow');
      setTimeout(() => td.classList.remove('edit-glow'), 2000);
    }
    if (key === 'actual') {
      this.updateHighlights();
    }
  }

  updateHighlights() {
    const rows = this.shadowRoot.querySelectorAll('tbody tr');
    rows.forEach((tr, index) => {
      const match = this.data.matches[index];
      const actual = match.actual;
      if (!actual || !/^\d+-\d+$/.test(actual)) return;
      const [homeAct, awayAct] = actual.split('-').map(Number);
      const winnerAct = Math.sign(homeAct - awayAct);
      ['quique', 'weo', 'ai'].forEach((predKey, colIndex) => {
        const td = tr.querySelectorAll('td')[3 + colIndex];
        td.classList.remove('exact-match', 'winner-match', 'home-correct', 'away-correct');
        const pred = match[predKey];
        if (!pred || !/^\d+-\d+$/.test(pred)) return;
        const [homePred, awayPred] = pred.split('-').map(Number);
        if (pred === actual) {
          td.classList.add('exact-match');
        } else {
          const winnerPred = Math.sign(homePred - awayPred);
          if (winnerPred === winnerAct) {
            td.classList.add('winner-match');
          }
          if (homePred === homeAct) {
            td.classList.add('home-correct');
          }
          if (awayPred === awayAct) {
            td.classList.add('away-correct');
          }
        }
      });
    });
  }

  updateModifiedClass(rowIndex, key) {
    const td = this.shadowRoot.querySelectorAll('tbody tr')[rowIndex].querySelectorAll('td')[3 + ['quique', 'weo', 'ai', 'actual'].indexOf(key)];
    const match = this.data.matches[rowIndex];
    const current = match[key];
    const original = match[`original_${key}`];
    if (current !== original && (key === 'quique' || key === 'weo')) {
      td.classList.add('modified');
    } else {
      td.classList.remove('modified');
    }
  }

  loadPastedCSV() {
    const textarea = this.shadowRoot.querySelector('#paste-csv');
    const csv = textarea.value;
    if (!csv) return alert('No CSV pasted');
    const newWeek = prompt('Enter week number for this CSV:', this.currentWeek);
    if (!newWeek) return;
    this.currentWeek = newWeek;
    this.data = { week: newWeek, matches: this.parseCSV(csv) };
    this.data.matches.forEach(match => {
      match.original_quique = match.quique;
      match.original_weo = match.weo;
      match.original_ai = match.ai;
      match.actual = '';
    });
    this.renderTable();
    this.renderWeeksDropdown();
    alert('CSV loaded. Edit and click Save to persist.');
  }
}

customElements.define('prediction-table', PredictionTable);