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
    // Load last selected week from localStorage, fallback to attribute or '1'
    this.currentWeek = localStorage.getItem('predictionTableLastWeek') || this.getAttribute('data-week') || '1';
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
        :host { display:block; box-sizing:border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
        .card { max-width: 980px; margin: 12px auto; padding: 12px; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.08); background: #fff; }
        .controls { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
        select { padding:8px 10px; border-radius:6px; border:1px solid #ccc; background:#fafafa; }
        .title { font-weight:600; margin-left:8px; }
        .actions { margin-left:auto; display:flex; gap:8px; }
        button { padding:8px 12px; border-radius:6px; border: none; background: #0078d4; color: #fff; cursor:pointer; box-shadow: 0 1px 0 rgba(0,0,0,0.04); }
        button.secondary { background: #efefef; color:#222; border:1px solid #ddd; }
        .csv-area { display:none; margin-top:12px; }
        textarea { width:100%; min-height:140px; padding:8px; border-radius:6px; border:1px solid #ddd; box-sizing:border-box; font-family: monospace; }
        table { width:100%; border-collapse: collapse; font-size:14px; }
        thead th { text-align:left; padding:10px 8px; background:#f7f7f9; border-bottom:1px solid #e6e6e9; }
        tbody td { padding:10px 8px; border-bottom:1px solid #f0f0f2; }
        tbody tr:nth-child(odd) { background: #fff; }
        tbody tr:nth-child(even) { background: #fbfbfc; }
        td[contenteditable="true"] { background: #fffbe6; border-radius:4px; padding:8px; min-width:60px; }
        .edit-glow { box-shadow: 0 0 0 3px rgba(255,0,0,0.12); transition: box-shadow .2s ease-out; }
        .modified { border: 2px solid red; }
        /* Clear, accessible highlight colors when actuals are present - high specificity */
        td[contenteditable="true"].exact-match {
          background-color: #198754 !important;
          color: #fff !important;
          font-weight: 600 !important;
        }
        td[contenteditable="true"].winner-match {
          background-color: #ffc107 !important;
          color: #000 !important;
          font-weight: 600 !important;
        }
        td[contenteditable="true"].home-correct {
          background-color: #e7f3ff !important;
          color: #0d6efd !important;
          font-weight: 600 !important;
        }
        td[contenteditable="true"].away-correct {
          background-color: #e7f3ff !important;
          color: #0d6efd !important;
          font-weight: 600 !important;
        }
        .muted { color:#666; font-size:13px; }
      </style>
    `;
    const html = `
      ${style}
      <div class="card">
        <div class="controls">
          <label for="week-dropdown" class="muted">Week</label>
          <select id="week-dropdown"></select>
          <div id="week-title" class="title"></div>
          <div class="actions">
            <button id="save-btn" class="secondary">Save</button>
            <button id="load-paste" class="">Load CSV</button>
          </div>
        </div>

        <div class="csv-area" id="csv-area">
          <textarea id="paste-csv" placeholder="Paste CSV here"></textarea>
        </div>

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
      </div>
    `;
    this.shadowRoot.innerHTML = html;
    this.renderWeeksDropdown(weeks);
    // wire controls
    const weekDropdown = this.shadowRoot.querySelector('#week-dropdown');
    const saveBtn = this.shadowRoot.querySelector('#save-btn');
    const loadBtn = this.shadowRoot.querySelector('#load-paste');
    const csvArea = this.shadowRoot.querySelector('#csv-area');

    weekDropdown.addEventListener('change', (e) => { this.switchWeek(e.target.value); this.toggleNewMode(e.target.value); });
    saveBtn.addEventListener('click', () => this.saveData());
    loadBtn.addEventListener('click', () => {
      // if in New mode, show textarea; otherwise trigger paste load flow
      if (weekDropdown.value === 'new') {
        csvArea.style.display = 'block';
      } else {
        this.loadPastedCSV();
      }
    });
  }

  async renderWeeksDropdown(weeks = null) {
    if (!weeks) weeks = await this.getWeeks();
    const dropdown = this.shadowRoot.querySelector('#week-dropdown');
    // include a 'New' option at the top and mark selected if currentWeek === 'new'
    const newSelected = this.currentWeek === 'new' ? 'selected' : '';
    const options = [`<option value="new" ${newSelected}>New</option>`].concat((weeks || []).map(w => `<option value="${w}" ${w === this.currentWeek ? 'selected' : ''}>Week ${w}</option>`));
    dropdown.innerHTML = options.join('');
  }

  switchWeek(week) {
    this.currentWeek = week;
    // Persist the selected week to localStorage
    localStorage.setItem('predictionTableLastWeek', week);
    const csvArea = this.shadowRoot.querySelector('#csv-area');
    if (week === 'new') {
      if (csvArea) csvArea.style.display = 'block';
      this.shadowRoot.querySelector('#week-title').textContent = 'New Week (paste CSV)';
      // clear current table for new data
      this.data = { week: 'new', matches: [] };
      this.renderTable();
      return;
    } else {
      if (csvArea) csvArea.style.display = 'none';
    }
    this.loadData(week);
    this.shadowRoot.querySelector('#week-title').textContent = `Match Week ${week}`;
  }

  toggleNewMode(value) {
    const csvArea = this.shadowRoot.querySelector('#csv-area');
    if (!csvArea) return;
    csvArea.style.display = value === 'new' ? 'block' : 'none';
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
    console.log('🎯 updateHighlights called');
    const rows = this.shadowRoot.querySelectorAll('tbody tr');
    console.log('Found', rows.length, 'rows');
    
    rows.forEach((tr, index) => {
      const match = this.data?.matches?.[index];
      if (!match) {
        console.debug('updateHighlights: no match for row', index);
        return;
      }
      
      const actual = match.actual;
      console.log(`Row ${index}: actual="${actual}"`);
      
      if (!actual || !/^\d+-\d+$/.test(actual)) {
        console.log(`Row ${index}: No valid actual score, clearing highlights`);
        // clear any previous highlight classes on prediction cells
        ['quique', 'weo', 'ai'].forEach((_, colIndex) => {
          const td = tr.querySelectorAll('td')[3 + colIndex];
          if (td) td.classList.remove('exact-match', 'winner-match', 'home-correct', 'away-correct');
        });
        return;
      }
      
      const [homeAct, awayAct] = actual.split('-').map(Number);
      const winnerAct = Math.sign(homeAct - awayAct);
      console.log(`Row ${index}: Actual ${homeAct}-${awayAct}, winner: ${winnerAct}`);
      
      ['quique', 'weo', 'ai'].forEach((predKey, colIndex) => {
        try {
          const td = tr.querySelectorAll('td')[3 + colIndex];
          if (!td) {
            console.debug('updateHighlights: missing td for', predKey, 'row', index);
            return;
          }
          
          // Clear previous classes
          td.classList.remove('exact-match', 'winner-match', 'home-correct', 'away-correct');
          
          const pred = match[predKey];
          console.log(`Row ${index}, ${predKey}: prediction="${pred}"`);
          
          if (!pred || !/^\d+-\d+$/.test(pred)) {
            console.log(`Row ${index}, ${predKey}: No valid prediction`);
            return;
          }
          
          const [homePred, awayPred] = pred.split('-').map(Number);
          const winnerPred = Math.sign(homePred - awayPred);
          
          console.log(`Row ${index}, ${predKey}: Predicted ${homePred}-${awayPred}, winner: ${winnerPred}`);
          
          if (pred === actual) {
            console.log(`🎯 Row ${index}, ${predKey}: EXACT MATCH!`);
            td.classList.add('exact-match');
          } else {
            if (winnerPred === winnerAct) {
              console.log(`🟡 Row ${index}, ${predKey}: Winner match`);
              td.classList.add('winner-match');
            }
            if (homePred === homeAct) {
              console.log(`🔵 Row ${index}, ${predKey}: Home score correct`);
              td.classList.add('home-correct');
            }
            if (awayPred === awayAct) {
              console.log(`🔵 Row ${index}, ${predKey}: Away score correct`);
              td.classList.add('away-correct');
            }
          }
          
          // Log final classes
          console.log(`Row ${index}, ${predKey}: Final classes:`, td.className);
          
        } catch (err) {
          console.error('updateHighlights error at row', index, 'predKey', predKey, err);
        }
      });
    });
  }

  updateModifiedClass(rowIndex, key) {
    try {
      const rows = this.shadowRoot.querySelectorAll('tbody tr');
      const row = rows[rowIndex];
      if (!row) {
        console.debug('updateModifiedClass: missing row', rowIndex, key);
        return;
      }
      const tdIndex = 3 + ['quique', 'weo', 'ai', 'actual'].indexOf(key);
      if (tdIndex < 3) {
        console.debug('updateModifiedClass: invalid key', key);
        return;
      }
      const td = row.querySelectorAll('td')[tdIndex];
      if (!td) {
        console.debug('updateModifiedClass: missing td at', tdIndex, 'for', key, 'row', rowIndex);
        return;
      }
      const match = this.data?.matches?.[rowIndex];
      if (!match) {
        console.debug('updateModifiedClass: missing match data', rowIndex);
        return;
      }
      const current = match[key];
      const original = match[`original_${key}`];
      if (current !== original && (key === 'quique' || key === 'weo')) {
        td.classList.add('modified');
      } else {
        td.classList.remove('modified');
      }
    } catch (err) {
      console.error('updateModifiedClass error', err);
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
