
class IndexedDBTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid black;
          padding: 8px;
          text-align: left;
        }
      </style>
      <input type="text" id="tableName" placeholder="Enter table name">
      <button id="refreshButton">Refresh</button>
      <table id="dataTable">
        <thead>
          <tr id="tableHeader"></tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    `;
  }

  connectedCallback() {
    this.shadowRoot.querySelector('#refreshButton').addEventListener('click', () => this.refreshTable());
  }

  get dbName() {
    return this.getAttribute('db-name');
  }

  async refreshTable() {
    const tableName = this.shadowRoot.querySelector('#tableName').value;
    if (!tableName) {
      alert('Please enter a table name');
      return;
    }

    const db = await this.openDatabase(this.dbName);
    const transaction = db.transaction([tableName], 'readonly');
    const store = transaction.objectStore(tableName);
    const request = store.getAll();

    request.onsuccess = (event) => {
      const data = event.target.result;
      this.renderTable(data);
    };

    request.onerror = (event) => {
      console.error('Error fetching data from IndexedDB', event);
    };
  }

  openDatabase(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  renderTable(data) {
    const tableHeader = this.shadowRoot.querySelector('#tableHeader');
    const tableBody = this.shadowRoot.querySelector('#tableBody');

    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        tableHeader.appendChild(th);
      });

      data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
          const td = document.createElement('td');
          td.textContent = row[header];
          tr.appendChild(td);
        });
        tableBody.appendChild(tr);
      });
    }
  }
}

customElements.define('indexeddb-table', IndexedDBTable);