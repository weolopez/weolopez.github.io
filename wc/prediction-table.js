import { createReactiveMap, createReactiveArray } from '../js/hocuspocus-provider.js';

class PredictionTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.data = null;
    this.currentWeek = null;
    // Reactive collaborative documents
    this.weeksMap = null; // ReactiveYMap for managing available weeks
    this.matchesArray = null; // ReactiveYArray for current week's matches
  }

  async connectedCallback() {
    // Initialize reactive collaborative documents
    await this.initReactiveDocs();

    // Load last selected week from localStorage, fallback to attribute or '1'
    this.currentWeek = localStorage.getItem('predictionTableLastWeek') || this.getAttribute('data-week') || '1';
    const csv = this.getAttribute('data-csv');

    // Wait for initial sync, then render
    setTimeout(async () => {
      const weeks = await this.getWeeks();
      this.render(weeks);

      if (csv) {
        await this.loadFromCSV(csv, this.currentWeek);
      } else {
        await this.loadWeekData(this.currentWeek);
      }
    }, 2000);
  }

  async initReactiveDocs() {
    console.log(`[PredictionTable] Initializing reactive collaborative documents`);

    try {
      // Create reactive documents for collaborative data management
      this.weeksMap = createReactiveMap('prediction-weeks');
      this.matchesArray = createReactiveArray('prediction-matches');

      // Subscribe to changes in the weeks map to update UI when collaborative changes occur
      this.weeksMap.subscribe('weeks', (value, key) => {
        if (key === 'weeks') {
          console.log(`[PredictionTable] Weeks list updated collaboratively:`, value);
          this.renderWeeksDropdown();
        }
      });

      // Subscribe to week data changes to refresh table when data is updated by others
      this.weeksMap.subscribe('currentWeek', (value, key) => {
        if (key === 'currentWeek' && value !== this.currentWeek) {
          console.log(`[PredictionTable] Current week changed collaboratively to:`, value);
          this.currentWeek = value;
          this.loadWeekData(value);
          this.updateWeekDropdownSelection();
        }
      });

      // Subscribe to individual week data changes
      const observer = (event, transaction) => {
        if (!transaction.local) {
          event.keysChanged.forEach(key => {
            if (key === this.currentWeek) {
              console.log(`[PredictionTable] Current week data updated by another user`);
              this.loadWeekData(this.currentWeek);
            }
          });
        }
      };
      this.weeksMap._ymap.observe(observer);

      console.log(`[PredictionTable] Reactive documents initialized successfully`);
    } catch (error) {
      console.error('[PredictionTable] Failed to initialize reactive docs:', error);
    }
  }

  

  async getWeeks() {
    // Get available weeks from reactive map
    try {
      const weeksData = this.weeksMap.weeks || [];
      return Array.isArray(weeksData) ? weeksData.filter(w => w && w !== 'new').sort() : [];
    } catch (error) {
      console.error('[PredictionTable] Error getting weeks:', error);
      return [];
    }
  }

  async loadWeekData(week) {
    try {
      const weekData = this.weeksMap[week];
      if (weekData && weekData.matches && Array.isArray(weekData.matches)) {
        this.data = weekData;
        this.renderTable();
      } else {
        this.data = { week, matches: [] };
        this.renderTable();
      }
    } catch (error) {
      console.error('[PredictionTable] Error loading week data:', error);
      this.data = { week, matches: [] };
      this.renderTable();
    }
  }

  async loadFromCSV(csv, week) {
    const parsedMatches = this.parseCSV(csv);
    if (parsedMatches.length === 0) {
      alert('No matches parsed from CSV. Check the format and try again.');
      return;
    }

    // Initialize with parsed data
    this.data = { week, matches: parsedMatches };
    this.data.matches.forEach((match, i) => {
      match.original_quique = match.quique || '';
      match.original_weo = match.weo || '';
      match.original_ai = match.ai || '';
      match.actual = match.actual || '';
    });

    // Save to reactive documents
    await this.saveData();
    this.renderTable();
  }

  

  async saveData() {
    if (!this.data || !this.data.week) {
      console.warn('[PredictionTable] No data or week to save');
      return;
    }

    try {
      this.weeksMap[this.data.week] = this.data;

      const currentWeeks = this.weeksMap.weeks || [];
      if (!currentWeeks.includes(this.data.week)) {
        this.weeksMap.weeks = [...currentWeeks, this.data.week].sort();
      }

      console.log(`💾 Saved and synced week ${this.data.week} successfully`);
    } catch (error) {
      console.error('[PredictionTable] Failed to save data:', error);
    }

    this.renderWeeksDropdown();
  }

  parseCSV(csvString) {
    console.log(`[PredictionTable] parseCSV called with raw input:\n${csvString.substring(0, 500)}...`);
    try {
      const lines = csvString.trim().split('\n').filter(line => line.trim().length > 0);
      console.log(`[PredictionTable] Raw lines (filtered):`, lines.map((l, i) => `Line ${i}: "${l}"`));
      if (lines.length < 1) {
        console.warn('[PredictionTable] CSV has no lines');
        return [];
      }

      let headers;
      let dataLines = lines;
      const potentialHeader = lines[0];
      const hasScoreInFirstLine = /\d+-\d+/.test(potentialHeader); // Detect if first line looks like data (contains score)
      if (hasScoreInFirstLine) {
        console.log('[PredictionTable] First line appears to be data (contains score), using default headers');
        headers = ['home', 'away', 'date/time', 'quique', 'weo', 'ai', 'actual']; // Default expected headers
        dataLines = lines; // All lines are data
      } else {
        console.log('[PredictionTable] First line appears to be headers, parsing as such');
        headers = potentialHeader.split(',').map(h => h.trim()).map(h => h.toLowerCase().replace(/\s+/g, '_'));
        dataLines = lines.slice(1);
      }
      console.log('[PredictionTable] Using headers:', headers);

      if (dataLines.length === 0) {
        console.warn('[PredictionTable] No data lines after header detection');
        return [];
      }

      const matches = dataLines.map((line, rowIndex) => {
        console.log(`[PredictionTable] Processing data row ${rowIndex} raw: "${line}"`);
        const values = line.split(',').map(v => v.trim());
        console.log(`[PredictionTable] Row ${rowIndex} split values:`, values);
        if (values.length < headers.length) {
          console.warn(`[PredictionTable] Row ${rowIndex} has fewer values (${values.length}) than headers (${headers.length})`);
        }
        const match = {};
        headers.forEach((header, index) => {
          const value = values[index] || '';
          // Map to expected keys
          let normalizedKey = header;
          if (header.includes('home') || header === 'liverpool' || header.includes('team1')) normalizedKey = 'home';
          else if (header.includes('away') || header === 'everton' || header.includes('team2')) normalizedKey = 'away';
          else if (header.includes('date') || header.includes('time') || header.includes('sat') || header.includes('sun')) normalizedKey = 'date/time';
          else if (header.includes('quique') || header.includes('prediction1')) normalizedKey = 'quique';
          else if (header.includes('weo') || header.includes('prediction2')) normalizedKey = 'weo';
          else if (header.includes('ai') || header.includes('prediction3')) normalizedKey = 'ai';
          else if (header.includes('actual') || header.includes('result')) normalizedKey = 'actual';
          match[normalizedKey] = value;
        });
        console.log(`[PredictionTable] Row ${rowIndex} parsed match:`, match);
        return match;
      });
      console.log(`[PredictionTable] parseCSV completed, returning ${matches.length} matches:`, matches);
      return matches;
    } catch (error) {
      console.error('[PredictionTable] parseCSV error:', error);
      return [];
    }
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
        input[type="file"] { display: none; }
        .file-input-label { padding: 8px 12px; border-radius: 6px; border: 1px solid #ddd; background: #fafafa; cursor: pointer; display: inline-block; }
        .file-input-label:hover { background: #f0f0f0; }
        
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
            <button id="backup-btn" class="secondary">Backup All</button>
            <button id="restore-btn" class="secondary">Restore All</button>
            <button id="load-paste" class="">Load CSV</button>
          </div>
        </div>

        <div class="csv-area" id="csv-area">
          <textarea id="paste-csv" placeholder="Paste your CSV data here (headers: home,away,date/time,quique,weo,ai&#10;Example: home,away,date/time,quique,weo,ai&#10;Arsenal,Man City,2024-09-22 12:30,2-1,1-2,1-1)"></textarea>
          <div class="csv-actions" style="margin-top: 8px; display: flex; gap: 8px;">
            <button id="parse-csv-btn" class="secondary">Parse & Load CSV</button>
            <button id="cancel-csv-btn" class="secondary">Cancel</button>
          </div>
        </div>

        <div class="backup-restore-area" id="backup-restore-area" style="display: none; margin-top: 12px; padding: 12px; border: 1px solid #ddd; border-radius: 6px; background: #fafafa;">
          <div style="margin-bottom: 8px; font-weight: 500;">Backup & Restore</div>
          <input type="file" id="restore-file-input" accept=".json">
          <label for="restore-file-input" class="file-input-label">Choose backup file...</label>
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
    const backupBtn = this.shadowRoot.querySelector('#backup-btn');
    const restoreBtn = this.shadowRoot.querySelector('#restore-btn');
    const loadBtn = this.shadowRoot.querySelector('#load-paste');
    const csvArea = this.shadowRoot.querySelector('#csv-area');
    const backupRestoreArea = this.shadowRoot.querySelector('#backup-restore-area');
    const textarea = this.shadowRoot.querySelector('#paste-csv');
    const parseBtn = this.shadowRoot.querySelector('#parse-csv-btn');
    const cancelBtn = this.shadowRoot.querySelector('#cancel-csv-btn');
    const restoreFileInput = this.shadowRoot.querySelector('#restore-file-input');

    console.log('[PredictionTable] render() selectors:', { csvArea: !!csvArea, textarea: !!textarea, parseBtn: !!parseBtn, cancelBtn: !!cancelBtn });

    weekDropdown.addEventListener('change', (e) => { this.switchWeek(e.target.value); this.toggleNewMode(e.target.value); });
    this.updateWeekDropdownSelection();
    backupBtn.addEventListener('click', () => this.backupAllData());
    restoreBtn.addEventListener('click', () => {
      const area = this.shadowRoot.querySelector('#backup-restore-area');
      area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });
    restoreFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.restoreAllData(file);
        // Hide the area after selection
        this.shadowRoot.querySelector('#backup-restore-area').style.display = 'none';
        // Clear the input
        e.target.value = '';
      }
    });
    loadBtn.addEventListener('click', () => {
      console.log(`[PredictionTable] Load CSV clicked, current week: ${weekDropdown.value}, csvArea display: ${csvArea ? csvArea.style.display : 'null'}`);
      if (csvArea) csvArea.style.display = 'block';
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
      if (weekDropdown.value !== 'new') {
        console.log('[PredictionTable] Not in new mode, but showing CSV area for pasting');
      }
    });

    // Add listeners for CSV area
    if (parseBtn) {
      console.log('[PredictionTable] Adding listener to parseBtn');
      parseBtn.addEventListener('click', () => {
        console.log('[PredictionTable] Parse CSV button clicked');
        this.loadPastedCSV();
      });
    } else {
      console.warn('[PredictionTable] parseBtn not found, cannot add listener');
    }
    if (cancelBtn) {
      console.log('[PredictionTable] Adding listener to cancelBtn');
      cancelBtn.addEventListener('click', () => {
        console.log('[PredictionTable] Cancel CSV clicked');
        if (csvArea) csvArea.style.display = 'none';
        if (textarea) textarea.value = '';
      });
    } else {
      console.warn('[PredictionTable] cancelBtn not found, cannot add listener');
    }

    // Optional: Auto-parse on paste event for better UX
    if (textarea) {
      textarea.addEventListener('paste', () => {
        setTimeout(() => {
          console.log('[PredictionTable] Paste detected, auto-parsing...');
          this.loadPastedCSV();
        }, 100); // Small delay to allow paste to complete
      });
    }
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

  updateWeekDropdownSelection() {
    const dropdown = this.shadowRoot.querySelector('#week-dropdown');
    if (dropdown) {
      dropdown.value = this.currentWeek;
    }
  }

  backupAllData() {
    try {
      // Create a complete backup of all prediction data
      const backupData = {
        timestamp: new Date().toISOString(),
        weeks: this.weeksMap.weeks || [],
        currentWeek: this.weeksMap.currentWeek || null,
        weekData: {}
      };

      // Collect data for each week
      const weeks = this.weeksMap.weeks || [];
      weeks.forEach(week => {
        const weekData = this.weeksMap[week];
        if (weekData) {
          backupData.weekData[week] = weekData;
        }
      });

      // Convert to JSON and download as file
      const backupJson = JSON.stringify(backupData, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `prediction-table-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Backup completed successfully');
      alert('Backup completed! File downloaded.');
    } catch (error) {
      console.error('❌ Backup failed:', error);
      alert('Backup failed: ' + error.message);
    }
  }

  async restoreAllData(file) {
    try {
      if (!file) {
        alert('Please select a backup file to restore');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);

          // Validate backup format
          if (!backupData.weeks || !backupData.weekData) {
            throw new Error('Invalid backup file format');
          }

          // Confirm restoration
          const confirmMessage = `This will replace all current prediction data with the backup from ${backupData.timestamp}. Continue?`;
          if (!confirm(confirmMessage)) {
            return;
          }

          // Restore weeks list
          this.weeksMap.weeks = backupData.weeks;

          // Restore current week if available
          if (backupData.currentWeek) {
            this.weeksMap.currentWeek = backupData.currentWeek;
            this.currentWeek = backupData.currentWeek;
          }

          // Restore all week data
          Object.keys(backupData.weekData).forEach(week => {
            this.weeksMap[week] = backupData.weekData[week];
          });

          // Refresh UI
          const weeks = await this.getWeeks();
          this.render(weeks);
          this.loadWeekData(this.currentWeek);

          console.log('✅ Restore completed successfully');
          alert(`Restore completed! Restored ${backupData.weeks.length} weeks from backup.`);
        } catch (error) {
          console.error('❌ Restore failed:', error);
          alert('Restore failed: Invalid backup file or parsing error');
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('❌ Restore failed:', error);
      alert('Restore failed: ' + error.message);
    }
  }

  switchWeek(week) {
    this.currentWeek = week;
    // Persist the selected week to localStorage
    localStorage.setItem('predictionTableLastWeek', week);

    // Sync the current week selection across browsers
    this.weeksMap.currentWeek = week;

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
    this.loadWeekData(week);
    this.shadowRoot.querySelector('#week-title').textContent = `Match Week ${week}`;
  }

  toggleNewMode(value) {
    const csvArea = this.shadowRoot.querySelector('#csv-area');
    if (!csvArea) return;
    csvArea.style.display = value === 'new' ? 'block' : 'none';
  }

  renderTable() {
    if (!this.data || !this.data.matches) {
      return;
    }
    this.shadowRoot.querySelector('#week-title').textContent = `Match Week ${this.currentWeek}`;

    // Render desktop table
    const tbody = this.shadowRoot.querySelector('tbody');
    tbody.innerHTML = '';

    // Render mobile cards
    const mobileCards = this.shadowRoot.querySelector('#mobile-cards');
    mobileCards.innerHTML = '';

    this.data.matches.forEach((match, index) => {
      if (!match.home || !match.away) {
        return;
      }

      // Desktop table row
      const tr = document.createElement('tr');
      ['home', 'away', 'date/time'].forEach(key => {
        const td = document.createElement('td');
        td.textContent = match[key] || '';
        tr.appendChild(td);
      });
      ['quique', 'weo', 'ai', 'actual'].forEach(key => {
        const td = document.createElement('td');
        td.contentEditable = true;
        const value = match[key] || '';
        td.textContent = value;
        td.dataset.original = match[`original_${key}`] || value;
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
          <div class="teams">${match.home || ''} vs ${match.away || ''}</div>
          <div class="datetime">${match['date/time'] || ''}</div>
        </div>
        <div class="predictions-grid">
          <div class="prediction-item">
            <div class="prediction-label">Quique</div>
            <div class="prediction-value" contenteditable="true" data-key="quique" data-index="${index}" data-original="${match.original_quique || (match.quique || '')}" title="Original: ${match.original_quique || (match.quique || '')}">${match.quique || ''}</div>
          </div>
          <div class="prediction-item">
            <div class="prediction-label">Weo</div>
            <div class="prediction-value" contenteditable="true" data-key="weo" data-index="${index}" data-original="${match.original_weo || (match.weo || '')}" title="Original: ${match.original_weo || (match.weo || '')}">${match.weo || ''}</div>
          </div>
          <div class="prediction-item">
            <div class="prediction-label">AI</div>
            <div class="prediction-value" contenteditable="true" data-key="ai" data-index="${index}" data-original="${match.original_ai || (match.ai || '')}" title="Original: ${match.original_ai || (match.ai || '')}">${match.ai || ''}</div>
          </div>
          <div class="prediction-item">
            <div class="prediction-label">Actual</div>
            <div class="prediction-value" contenteditable="true" data-key="actual" data-index="${index}" data-original="${match.original_actual || (match.actual || '')}" title="Original: ${match.original_actual || (match.actual || '')}">${match.actual || ''}</div>
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
    
    console.log(`[PredictionTable] renderTable completed, tbody rows: ${tbody.children.length}, mobile cards: ${mobileCards.children.length}`);
    this.updateHighlights();
  }

  handleEdit(event, rowIndex, key) {
    const td = event.target;
    const newValue = td.textContent.trim();

    // Update local data
    this.data.matches[rowIndex][key] = newValue;

    // Auto-save to reactive docs
    this.saveData();

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
      const match = this.data?.matches?.[index];
      if (!match) return;

      const actual = match.actual;
      if (!actual || !/^\d+-\d+$/.test(actual)) {
        ['quique', 'weo', 'ai'].forEach((_, colIndex) => {
          const td = tr.querySelectorAll('td')[3 + colIndex];
          if (td) td.classList.remove('exact-match', 'winner-match', 'home-correct', 'away-correct');
        });
        return;
      }

      const [homeAct, awayAct] = actual.split('-').map(Number);
      const winnerAct = Math.sign(homeAct - awayAct);

      ['quique', 'weo', 'ai'].forEach((predKey, colIndex) => {
        const td = tr.querySelectorAll('td')[3 + colIndex];
        if (!td) return;

        td.classList.remove('exact-match', 'winner-match', 'home-correct', 'away-correct');

        const pred = match[predKey];
        if (!pred || !/^\d+-\d+$/.test(pred)) return;

        const [homePred, awayPred] = pred.split('-').map(Number);
        const winnerPred = Math.sign(homePred - awayPred);

        if (pred === actual) {
          td.classList.add('exact-match');
        } else {
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

  async loadPastedCSV() {
    console.log('[PredictionTable] loadPastedCSV called');
    const textarea = this.shadowRoot.querySelector('#paste-csv');
    const csvArea = this.shadowRoot.querySelector('#csv-area');
    const csv = (textarea ? textarea.value.trim() : '');
    console.log(`[PredictionTable] CSV input length: ${csv.length}, first 100 chars: ${csv.substring(0, 100)}`);
    if (!csv) {
      alert('Please paste CSV into the textarea first.');
      return;
    }
    let newWeek;
    if (this.currentWeek === 'new') {
      newWeek = prompt('Enter week number for this new CSV:', '1');
    } else {
      newWeek = prompt('Enter week number to load this CSV into (or enter new number):', this.currentWeek);
    }
    if (!newWeek || newWeek.trim() === '' || newWeek === 'new') {
      alert('Invalid week number. Please enter a valid number.');
      return;
    }
    newWeek = newWeek.trim();
    console.log(`[PredictionTable] Loading CSV for week: ${newWeek}`);
    const parsedMatches = this.parseCSV(csv);
    console.log(`[PredictionTable] Parsed ${parsedMatches.length} matches from CSV`);
    if (parsedMatches.length === 0) {
      alert('No matches parsed from CSV. Check the format and try again.');
      return;
    }
    this.currentWeek = newWeek;
    // Update dropdown to select the new/existing week
    const dropdown = this.shadowRoot.querySelector('#week-dropdown');
    if (dropdown) {
      dropdown.value = this.currentWeek ;
    }
    this.data = { week: newWeek, matches: parsedMatches };
    this.data.matches.forEach((match, i) => {
      match.original_quique = match.quique || '';
      match.original_weo = match.weo || '';
      match.original_ai = match.ai || '';
      match.actual = match.actual || '';
    });
    this.renderTable();
    // Auto-save after successful load to persist immediately
    await this.saveData();
    this.renderWeeksDropdown();
    // Clear and hide textarea after successful loading
    if (textarea) textarea.value = '';
    if (csvArea) csvArea.style.display = 'none';
    if (this.shadowRoot.querySelector('#week-title')) {
      this.shadowRoot.querySelector('#week-title').textContent = `Match Week ${newWeek}`;
    }
    alert(`CSV loaded and saved successfully for week ${newWeek} (${parsedMatches.length} matches). Data is now synced across browsers.`);
  }
}

customElements.define('prediction-table', PredictionTable);