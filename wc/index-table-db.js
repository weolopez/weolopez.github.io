class IndexedDBTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = /*html*/ `
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
      .spinner-container {
      position: relative;
      width: 100%;
      height: 100%;
      }
      .spinner {
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border: 16px solid #f3f3f3;
      border-radius: 50%;
      border-top: 16px solid #3498db;
      width: 50px;
      height: 50px;
      -webkit-animation: spin 2s linear infinite;
      animation: spin 2s linear infinite;
      }
      @-webkit-keyframes spin {
      0% { -webkit-transform: rotate(0deg); }
      100% { -webkit-transform: rotate(360deg); }
      }
      @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
      }
      </style>
      <!--input type="text" id="tableName" placeholder="Enter table name">
      <button id="refreshButton">Refresh</button-->

      <div class="spinner-container">
      <div class="spinner" id="spinner"></div>
      </div>
      <ul id="tables"></ul>
      <table id="dataTable">
      <thead>
      <tr id="tableHeader"></tr>
      </thead>
      <tbody id="tableBody"></tbody>
      </table>
    `;
    this.tables = this.shadowRoot.querySelector("#tables");
  }

  connectedCallback() {
    // this.shadowRoot
    //   .querySelector("#refreshButton")
    //   .addEventListener("click", () => this.refreshTable());
  }

  get dbName() {
    return this.getAttribute("db-name");
  }
  set dbName(value) {
    this._dbName = value;
    this.refreshDatabase().then(() => {});
  }
  static get observedAttributes() {
    return ["db-name"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "db-name" && oldValue !== newValue) {
      this.dbName = newValue;
    }
  }

  async getTableNames() {
    try {
      const databases = await indexedDB.databases();
      const dbExists = databases.some((db) => db.name === this.dbName);
      if (!dbExists) {
        throw new Error(`Database ${this.dbName} does not exist.`);
      }
      this.db = await this.openDatabase(this.dbName);
      return Array.from(this.db.objectStoreNames);
    } catch (error) {
      console.error("Error opening database:", error);
      return [];
    }
  }
  async refreshDatabase() {
    this.showSpinner();
    let value = this._dbName;
    this.tables.innerHTML = "";
    this.tableNames = await this.getTableNames(value);
    this.tableNames.forEach((table) => {
      const li = document.createElement("li");
      li.id = table;
      this.refreshTable(li, table);
      this.tables.appendChild(li);
    });
    this.hideSpinner();
  }
  async refreshTable(li, table) {
    const transaction = this.db.transaction([table], "readonly");
    const store = transaction.objectStore(table);
    const request = store.getAll();

    request.onsuccess = (event) => {
      const data = event.target.result;
      this.renderTable(li, table, data);
    };

    request.onerror = (event) => {
      console.error("Error fetching data from IndexedDB", event);
    };
  }

  openDatabase(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.warn("Database upgrade needed:", event.target.result);
      };
      request.onblocked = (event) => {
        console.warn("Database blocked:", event);
      };
      console.log(request.readyState);
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  renderTable(li, table, data) {
    const newTable = document.createElement("table");
    const tableHeader = document.createElement("thead");
    const tableBody = document.createElement("tbody");

    tableHeader.innerHTML = "";
    tableBody.innerHTML = "";

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      headers.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        tableHeader.appendChild(th);
      });

      data.forEach((row) => {
        const tr = document.createElement("tr");
        headers.forEach((header) => {
          const td = document.createElement("td");
          td.textContent = row[header];
          tr.appendChild(td);
        });
        tableBody.appendChild(tr);
      });
    }
    const label = document.createElement("label");
    label.textContent = table;
    li.appendChild(label);

    newTable.appendChild(tableHeader);
    newTable.appendChild(tableBody);
    li.appendChild(newTable);
  }

  showSpinner() {
    this.shadowRoot.getElementById("spinner").style.display = "block";
  }

  hideSpinner() {
    this.shadowRoot.getElementById("spinner").style.display = "none";
  }
}

customElements.define("indexeddb-table", IndexedDBTable);
