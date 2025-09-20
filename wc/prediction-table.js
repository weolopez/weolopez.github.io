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
        
        /* Desktop table styles */
        .table-container { overflow-x: auto; }
        table { width:100%; border-collapse: collapse; font-size:14px; }
        thead th { text-align:left; padding:10px 8px; background:#f7f7f9; border-bottom:1px solid #e6e6e9; }
        tbody td { padding:10px 8px; border-bottom:1px solid #f0f0f2; }
        tbody tr:nth-child(odd) { background: #fff; }
        tbody tr:nth-child(even) { background: #fbfbfc; }
        td[contenteditable="true"] { background: #fffbe6; border-radius:4px; padding:8px; min-width:60px; }
        
        /* Mobile card layout - hidden by default */
        .mobile-cards { display: none; }
        .match-card {
          background: #fff;
          border: 1px solid #e6e6e9;
          border-radius: 8px;
          margin-bottom: 16px;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        .match-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0f0f2;
        }
        .teams { font-weight: 600; font-size: 16px; }
        .datetime { font-size: 12px; color: #666; }
        .predictions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        .prediction-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px;
          border-radius: 6px;
          background: #f8f9fa;
        }
        .prediction-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
          text-transform: uppercase;
          font-weight: 500;
        }
        .prediction-value {
          font-size: 16px;
          font-weight: 600;
          min-height: 24px;
          min-width: 40px;
          text-align: center;
          border: none;
          background: transparent;
          border-radius: 4px;
          padding: 4px;
        }
        .prediction-value[contenteditable="true"]:focus {
          outline: 2px solid #0078d4;
          background: #fff;
        }
        
        .edit-glow { box-shadow: 0 0 0 3px rgba(255,0,0,0.12); transition: box-shadow .2s ease-out; }
        .modified { border: 2px solid red; }
        
        /* Highlight colors - work for both table and cards */
        [contenteditable="true"].exact-match {
          background-color: #198754 !important;
          color: #fff !important;
          font-weight: 600 !important;
        }
        [contenteditable="true"].winner-match {
          background-color: #ffc107 !important;
          color: #000 !important;
          font-weight: 600 !important;
        }
        [contenteditable="true"].home-correct {
          background-color: #e7f3ff !important;
          border-left: 6px solid #0d6efd !important;
          color: #0d6efd !important;
          font-weight: 600 !important;
        }
        [contenteditable="true"].away-correct {
          background-color: #e7f3ff !important;
          border-right: 6px solid #0d6efd !important;
          color: #0d6efd !important;
          font-weight: 600 !important;
        }
        .muted { color:#666; font-size:13px; }

        /* Mobile layout classes - applied via JavaScript based on component width */
        :host(.mobile-layout) .card { margin: 8px; padding: 16px; border-radius: 12px; }
        
        :host(.mobile-layout) .controls {
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
        }
        :host(.mobile-layout) .controls > * { width: 100%; }
        :host(.mobile-layout) .actions {
          margin-left: 0;
          justify-content: center;
          order: 3;
        }
        :host(.mobile-layout) .title {
          text-align: center;
          margin: 0;
          font-size: 18px;
          order: 2;
        }
        :host(.mobile-layout) select {
          padding: 12px 16px;
          font-size: 16px;
          order: 1;
        }
        :host(.mobile-layout) button {
          padding: 12px 20px;
          font-size: 16px;
          min-height: 48px;
          flex: 1;
        }
        
        :host(.mobile-layout) .table-container { display: none; }
        :host(.mobile-layout) .mobile-cards { display: block; }
        
        :host(.mobile-layout) .predictions-grid {
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 6px;
        }
        :host(.mobile-layout) .prediction-value {
          font-size: 18px;
          min-height: 32px;
          padding: 8px;
        }
        
        :host(.mobile-layout) .csv-area textarea {
          min-height: 120px;
          font-size: 16px;
          padding: 12px;
        }

        /* Ultra-compact layout for very narrow components */
        :host(.compact-layout) .card { margin: 4px; padding: 12px; }
        :host(.compact-layout) .predictions-grid { grid-template-columns: 1fr 1fr; }
        :host(.compact-layout) .match-header { flex-direction: column; align-items: flex-start; gap: 4px; }
        :host(.compact-layout) .teams { font-size: 14px; }
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

        <!-- Desktop table view -->
        <div class="table-container">
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

        <!-- Mobile card view -->
        <div class="mobile-cards" id="mobile-cards">
          <!-- Cards will be populated here -->
        </div>
      </div>
    `;
    this.shadowRoot.innerHTML = html;
    this.renderWeeksDropdown(weeks);
    
    // Set up responsive behavior based on component width
    this.setupResponsiveLayout();
    
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

  setupResponsiveLayout() {
    // Set up ResizeObserver to watch component width
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const width = entry.contentRect.width;
          this.updateLayoutClasses(width);
        }
      });
      this.resizeObserver.observe(this);
    } else {
      // Fallback for browsers without ResizeObserver
      this.checkLayoutTimeout = setInterval(() => {
        const width = this.offsetWidth;
        this.updateLayoutClasses(width);
      }, 500);
    }
    
    // Initial layout check
    setTimeout(() => {
      const width = this.offsetWidth;
      this.updateLayoutClasses(width);
    }, 100);
  }

  updateLayoutClasses(width) {
    // Remove existing layout classes
    this.classList.remove('mobile-layout', 'compact-layout');
    
    // Apply layout based on component width
    if (width <= 480) {
      this.classList.add('mobile-layout', 'compact-layout');
    } else if (width <= 768) {
      this.classList.add('mobile-layout');
    }
    // Default desktop layout when no classes are applied
  }

  disconnectedCallback() {
    // Clean up observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.checkLayoutTimeout) {
      clearInterval(this.checkLayoutTimeout);
    }
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
    
    // Render desktop table
    const tbody = this.shadowRoot.querySelector('tbody');
    tbody.innerHTML = '';
    
    // Render mobile cards
    const mobileCards = this.shadowRoot.querySelector('#mobile-cards');
    mobileCards.innerHTML = '';
    
    this.data.matches.forEach((match, index) => {
      // Desktop table row
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

      // Mobile card
      const card = document.createElement('div');
      card.className = 'match-card';
      card.innerHTML = `
        <div class="match-header">
          <div class="teams">${match.home} vs ${match.away}</div>
          <div class="datetime">${match['date/time'] || ''}</div>
        </div>
        <div class="predictions-grid">
          <div class="prediction-item">
            <div class="prediction-label">Quique</div>
            <div class="prediction-value" contenteditable="true" data-key="quique" data-index="${index}" data-original="${match.original_quique || match.quique}" title="Original: ${match.original_quique || match.quique}">${match.quique || ''}</div>
          </div>
          <div class="prediction-item">
            <div class="prediction-label">Weo</div>
            <div class="prediction-value" contenteditable="true" data-key="weo" data-index="${index}" data-original="${match.original_weo || match.weo}" title="Original: ${match.original_weo || match.weo}">${match.weo || ''}</div>
          </div>
          <div class="prediction-item">
            <div class="prediction-label">AI</div>
            <div class="prediction-value" contenteditable="true" data-key="ai" data-index="${index}" data-original="${match.original_ai || match.ai}" title="Original: ${match.original_ai || match.ai}">${match.ai || ''}</div>
          </div>
          <div class="prediction-item">
            <div class="prediction-label">Actual</div>
            <div class="prediction-value" contenteditable="true" data-key="actual" data-index="${index}" data-original="${match.original_actual || match.actual}" title="Original: ${match.original_actual || match.actual}">${match.actual || ''}</div>
          </div>
        </div>
      `;
      
      // Add event listeners to mobile card inputs
      card.querySelectorAll('.prediction-value').forEach(input => {
        input.addEventListener('input', (e) => {
          const index = parseInt(e.target.dataset.index);
          const key = e.target.dataset.key;
          this.handleEdit(e, index, key);
        });
      });
      
      mobileCards.appendChild(card);

      // Apply styling updates for both views
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

  clearHighlights(index) {
    // Clear table view highlights
    const tableRow = this.shadowRoot.querySelectorAll('tbody tr')[index];
    if (tableRow) {
      ['quique', 'weo', 'ai'].forEach((_, colIndex) => {
        const td = tableRow.querySelectorAll('td')[3 + colIndex];
        if (td) td.classList.remove('exact-match', 'winner-match', 'home-correct', 'away-correct');
      });
    }

    // Clear mobile view highlights
    const mobileCard = this.shadowRoot.querySelectorAll('.match-card')[index];
    if (mobileCard) {
      ['quique', 'weo', 'ai'].forEach((predKey) => {
        const input = mobileCard.querySelector(`[data-key="${predKey}"]`);
        if (input) input.classList.remove('exact-match', 'winner-match', 'home-correct', 'away-correct');
      });
    }
  }

  applyHighlight(index, predKey, pred, actual, homePred, homeAct, awayPred, awayAct, winnerPred, winnerAct) {
    const elements = [];
    
    // Get table element
    const tableRow = this.shadowRoot.querySelectorAll('tbody tr')[index];
    if (tableRow) {
      const colIndex = ['quique', 'weo', 'ai'].indexOf(predKey);
      const td = tableRow.querySelectorAll('td')[3 + colIndex];
      if (td) elements.push(td);
    }

    // Get mobile element
    const mobileCard = this.shadowRoot.querySelectorAll('.match-card')[index];
    if (mobileCard) {
      const input = mobileCard.querySelector(`[data-key="${predKey}"]`);
      if (input) elements.push(input);
    }

    // Apply classes to both elements
    elements.forEach(element => {
      element.classList.remove('exact-match', 'winner-match', 'home-correct', 'away-correct');
      
      if (pred === actual) {
        console.log(`🎯 Row ${index}, ${predKey}: EXACT MATCH!`);
        element.classList.add('exact-match');
      } else {
        if (winnerPred === winnerAct) {
          console.log(`🟡 Row ${index}, ${predKey}: Winner match`);
          element.classList.add('winner-match');
        }
        if (homePred === homeAct) {
          console.log(`🔵 Row ${index}, ${predKey}: Home score correct`);
          element.classList.add('home-correct');
        }
        if (awayPred === awayAct) {
          console.log(`🔵 Row ${index}, ${predKey}: Away score correct`);
          element.classList.add('away-correct');
        }
      }
    });
  }

  updateModifiedClass(rowIndex, key) {
    try {
      // Update table view
      const rows = this.shadowRoot.querySelectorAll('tbody tr');
      const row = rows[rowIndex];
      if (row) {
        const tdIndex = 3 + ['quique', 'weo', 'ai', 'actual'].indexOf(key);
        if (tdIndex >= 3) {
          const td = row.querySelectorAll('td')[tdIndex];
          if (td) {
            const match = this.data?.matches?.[rowIndex];
            if (match) {
              const current = match[key];
              const original = match[`original_${key}`];
              if (current !== original && (key === 'quique' || key === 'weo')) {
                td.classList.add('modified');
              } else {
                td.classList.remove('modified');
              }
            }
          }
        }
      }

      // Update mobile card view
      const cards = this.shadowRoot.querySelectorAll('.match-card');
      const card = cards[rowIndex];
      if (card) {
        const input = card.querySelector(`[data-key="${key}"]`);
        if (input) {
          const match = this.data?.matches?.[rowIndex];
          if (match) {
            const current = match[key];
            const original = match[`original_${key}`];
            if (current !== original && (key === 'quique' || key === 'weo')) {
              input.classList.add('modified');
            } else {
              input.classList.remove('modified');
            }
          }
        }
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