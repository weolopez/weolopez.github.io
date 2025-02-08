class FancyTable extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });

      // Internal state: data and column definitions.
      this._data = [];
      this._columns = [];
      this._sortField = null;
      this._sortDirection = 1; // 1 = ascending, -1 = descending
    }

    // Observe these attributes.
    static get observedAttributes() {
      return ["data", "columns"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "data") {
        try {
          this._data = JSON.parse(newValue);
        } catch (err) {
          console.error("Invalid JSON for data:", err);
          this._data = [];
        }
      } else if (name === "columns") {
        try {
          this._columns = JSON.parse(newValue);
        } catch (err) {
          console.error("Invalid JSON for columns:", err);
          this._columns = [];
        }
      }
      this.render();
    }

    connectedCallback() {
      // Initialize data if not provided.
      if (!this.hasAttribute("data")) {
        this.setAttribute("data", "[]");
      }
      // If columns aren’t provided but data exists, infer columns.
      if (!this.hasAttribute("columns") && this._data.length > 0) {
        const keys = Object.keys(this._data[0]);
        this._columns = keys.map((key) => ({
          field: key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
        }));
      }
      this.render();
    }

    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: sans-serif;
          }
          .toolbar {
            margin-bottom: 10px;
          }
          .toolbar button {
            margin-right: 10px;
            padding: 5px 10px;
            font-size: 0.9rem;
            cursor: pointer;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
          }
          thead {
            background-color: #007BFF;
            color: white;
          }
          th, td {
            padding: 12px 15px;
            border: 1px solid #ddd;
            position: relative;
          }
          th {
            user-select: none;
          }
          th.sortable:hover {
            background-color: #0056b3;
            cursor: pointer;
          }
          tbody tr:hover {
            background-color: #f1f1f1;
          }
          /* Highlight the selected data cell */
          td.selected {
            outline: 2px solid orange;
          }
          /* Styling checkboxes */
          input[type="checkbox"] {
            transform: scale(1.2);
            cursor: pointer;
          }
          input.inline-edit {
            font-size: 1rem;
            padding: 2px;
            width: 100%;
            box-sizing: border-box;
          }
          /* Column header delete button styling */
          th .delete-column {
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 0.8rem;
            display: none;
          }
          th:hover .delete-column {
            display: inline;
          }
          /* Responsive design */
          @media screen and (max-width: 600px) {
            table, thead, tbody, th, td, tr {
              display: block;
            }
            thead {
              display: none;
            }
            tr {
              margin-bottom: 10px;
            }
            td {
              text-align: right;
              padding-left: 50%;
            }
            td::before {
              content: attr(data-label);
              position: absolute;
              left: 0;
              width: 50%;
              padding-left: 15px;
              font-weight: bold;
              text-align: left;
            }
          }
        </style>
        <div class="toolbar">
          <button id="addRow">Add Row</button>
          <button id="addColumn">Add Column</button>
          <button id="deleteSelected">Delete Selected</button>
        </div>
        <table>
          <thead>
            <tr>
              <!-- First column: master checkbox for selection -->
              <th>
                <input type="checkbox" id="selectAll" title="Select All"/>
              </th>
              ${this._columns
                .map(
                  (col, colIndex) => `
                <th class="sortable" data-field="${col.field}" data-col-index="${colIndex}">
                  <span class="col-name" data-field="${col.field}">${col.name}</span>
                  <button class="delete-column" data-field="${col.field}" title="Delete Column">&times;</button>
                </th>
              `
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${this._data
              .map(
                (row, rowIndex) => `
              <tr data-row-index="${rowIndex}">
                <!-- First cell: row selection checkbox -->
                <td>
                  <input type="checkbox" class="select-row" data-row-index="${rowIndex}" />
                </td>
                ${this._columns
                  .map(
                    (col, colIndex) => `
                  <td data-field="${col.field}" data-row-index="${rowIndex}" data-col-index="${colIndex}" data-label="${col.name}" tabindex="0">
                    ${row[col.field]}
                  </td>
                `
                  )
                  .join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      // --- Toolbar Listeners ---
      this.shadowRoot
        .getElementById("addRow")
        .addEventListener("click", () => this.addRow());
      this.shadowRoot
        .getElementById("addColumn")
        .addEventListener("click", () => this.promptAddColumn());
      this.shadowRoot
        .getElementById("deleteSelected")
        .addEventListener("click", () => this.deleteSelectedRows());

      // --- Master "Select All" Checkbox Listener ---
      const selectAllCheckbox = this.shadowRoot.getElementById("selectAll");
      selectAllCheckbox.addEventListener("change", (e) => {
        const checked = e.target.checked;
        const rowCheckboxes =
          this.shadowRoot.querySelectorAll("input.select-row");
        rowCheckboxes.forEach((chk) => (chk.checked = checked));
      });

      // --- Header: Sorting, Column Deletion, and Header Editing ---
      const headers = this.shadowRoot.querySelectorAll("th.sortable");
      headers.forEach((th) => {
        // Sort when clicking on header (but not when clicking the delete button)
        th.addEventListener("click", (e) => {
          if (e.target.classList.contains("delete-column")) return;
          const field = th.getAttribute("data-field");
          if (this._sortField === field) {
            this._sortDirection = -this._sortDirection;
          } else {
            this._sortField = field;
            this._sortDirection = 1;
          }
          this.sortData();
          this.dispatchEvent(
            new CustomEvent("sort-changed", {
              detail: { field, direction: this._sortDirection },
              bubbles: true,
              composed: true,
            })
          );
          this.renderBody();
        });

        // Delete column listener
        const delBtn = th.querySelector("button.delete-column");
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const field = delBtn.getAttribute("data-field");
          const colIndex = this._columns.findIndex((c) => c.field === field);
          if (colIndex >= 0) {
            const deletedCol = this._columns.splice(colIndex, 1)[0];
            // Remove the field from every row.
            this._data.forEach((row) => {
              delete row[field];
            });
            this.dispatchEvent(
              new CustomEvent("column-deleted", {
                detail: { column: deletedCol, index: colIndex },
                bubbles: true,
                composed: true,
              })
            );
            this.render();
          }
        });

        // Column header editing (double‑click the header text)
        const headerSpan = th.querySelector("span.col-name");
        headerSpan.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          if (headerSpan.querySelector("input")) return;
          const field = headerSpan.getAttribute("data-field");
          const colIndex = this._columns.findIndex((c) => c.field === field);
          const oldName = headerSpan.textContent;
          const input = document.createElement("input");
          input.type = "text";
          input.value = oldName;
          input.classList.add("inline-edit");
          headerSpan.textContent = "";
          headerSpan.appendChild(input);
          input.focus();

          const commitHeader = () => {
            const newName = input.value;
            headerSpan.removeChild(input);
            headerSpan.textContent = newName;
            const previous = this._columns[colIndex].name;
            this._columns[colIndex].name = newName;
            if (newName !== previous) {
              this.dispatchEvent(
                new CustomEvent("column-edited", {
                  detail: {
                    columnIndex: colIndex,
                    field,
                    oldName: previous,
                    newName,
                  },
                  bubbles: true,
                  composed: true,
                })
              );
            }
            // Update each cell's data-label for this column.
            const tds = this.shadowRoot.querySelectorAll(
              `td[data-field="${field}"]`
            );
            tds.forEach((td) => td.setAttribute("data-label", newName));
          };

          input.addEventListener("blur", commitHeader);
          input.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
              commitHeader();
            } else if (ev.key === "Escape") {
              headerSpan.removeChild(input);
              headerSpan.textContent = oldName;
            }
          });
        });
      });

      // --- Attach Listeners to Data Cells for Click, Double‑Click (Edit), & Key Navigation ---
      this.attachCellListeners();

      // Optionally, attach listeners to each row's checkbox if you need additional behavior.
      const rowCheckboxes =
        this.shadowRoot.querySelectorAll("input.select-row");
      rowCheckboxes.forEach((chk) => {
        chk.addEventListener("change", (e) => {
          // For example, you might add a visual cue when a row is selected.
          // (This demo simply leaves the checkbox state.)
        });
      });
    }

    renderBody() {
      const tbody = this.shadowRoot.querySelector("tbody");
      if (tbody) {
        tbody.innerHTML = this._data
          .map(
            (row, rowIndex) => `
            <tr data-row-index="${rowIndex}">
              <td>
                <input type="checkbox" class="select-row" data-row-index="${rowIndex}" />
              </td>
              ${this._columns
                .map(
                  (col, colIndex) => `
                <td data-field="${col.field}" data-row-index="${rowIndex}" data-col-index="${colIndex}" data-label="${col.name}" tabindex="0">
                  ${row[col.field]}
                </td>
              `
                )
                .join("")}
            </tr>
          `
          )
          .join("");
        this.attachCellListeners();
        // Reattach row checkbox listeners if needed.
        const rowCheckboxes =
          this.shadowRoot.querySelectorAll("input.select-row");
        rowCheckboxes.forEach((chk) => {
          chk.addEventListener("change", (e) => {});
        });
      }
    }

    attachCellListeners() {
      // Attach click, double‑click (for editing), and keydown (for arrow navigation) to each data cell.
      const cells = this.shadowRoot.querySelectorAll("td[data-field]");
      cells.forEach((cell) => {
        cell.addEventListener("click", (e) => this.selectCell(cell));
        cell.addEventListener("dblclick", (e) => {
          if (cell.querySelector("input")) return;
          const rowIndex = parseInt(
            cell.getAttribute("data-row-index"),
            10
          );
          const field = cell.getAttribute("data-field");
          const oldValue = cell.textContent;
          const input = document.createElement("input");
          input.type = "text";
          input.value = oldValue;
          input.classList.add("inline-edit");
          cell.textContent = "";
          cell.appendChild(input);
          input.focus();

          const commit = () => {
            const newValue = input.value;
            cell.removeChild(input);
            cell.textContent = newValue;
            const previous = this._data[rowIndex][field];
            this._data[rowIndex][field] = newValue;
            if (newValue !== previous) {
              this.dispatchEvent(
                new CustomEvent("cell-edited", {
                  detail: {
                    rowIndex,
                    field,
                    oldValue: previous,
                    newValue,
                  },
                  bubbles: true,
                  composed: true,
                })
              );
            }
          };

          input.addEventListener("blur", commit);
          input.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") commit();
            else if (ev.key === "Escape") {
              cell.removeChild(input);
              cell.textContent = oldValue;
            }
          });
        });
        cell.addEventListener("keydown", (e) => this.handleCellKeyDown(e, cell));
      });
    }

    selectCell(cell) {
      // Remove the "selected" styling from any previously selected cell.
      const prev = this.shadowRoot.querySelector("td.selected");
      if (prev) prev.classList.remove("selected");
      cell.classList.add("selected");
      cell.focus();
    }

    handleCellKeyDown(e, cell) {
      // Only process arrow keys when not editing.
      if (cell.querySelector("input")) return;

      const key = e.key;
      if (
        key !== "ArrowUp" &&
        key !== "ArrowDown" &&
        key !== "ArrowLeft" &&
        key !== "ArrowRight"
      )
        return;

      e.preventDefault(); // Prevent default scrolling.

      let row = parseInt(cell.getAttribute("data-row-index"), 10);
      let col = parseInt(cell.getAttribute("data-col-index"), 10);
      let newRow = row;
      let newCol = col;

      switch (key) {
        case "ArrowUp":
          newRow = row - 1;
          break;
        case "ArrowDown":
          newRow = row + 1;
          break;
        case "ArrowLeft":
          newCol = col - 1;
          break;
        case "ArrowRight":
          newCol = col + 1;
          break;
      }

      // Do nothing if moving outside the top or left boundaries.
      if (newRow < 0 || newCol < 0) return;

      // Auto‑add a row if moving below the last row.
      if (newRow >= this._data.length) {
        this.addRow();
        newRow = this._data.length - 1;
      }
      // Auto‑add a column if moving beyond the last column.
      if (newCol >= this._columns.length) {
        this.autoAddColumn();
        newCol = this._columns.length - 1;
      }

      // Allow time for the table to re-render.
      setTimeout(() => {
        const newCell = this.shadowRoot.querySelector(
          `td[data-row-index="${newRow}"][data-col-index="${newCol}"]`
        );
        if (newCell) this.selectCell(newCell);
      }, 0);
    }

    sortData() {
      if (!this._sortField) return;
      this._data.sort((a, b) => {
        const aVal = a[this._sortField];
        const bVal = b[this._sortField];

        // If both values are numeric, sort numerically.
        if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
          return (
            (parseFloat(aVal) - parseFloat(bVal)) * this._sortDirection
          );
        }
        // Otherwise, sort as strings.
        return (
          ("" + aVal).localeCompare("" + bVal) * this._sortDirection
        );
      });
    }

    addRow() {
      // Create an empty row with a property for each column.
      const newRow = {};
      this._columns.forEach((col) => {
        newRow[col.field] = "";
      });
      this._data.push(newRow);
      const rowIndex = this._data.length - 1;
      this.dispatchEvent(
        new CustomEvent("row-added", {
          detail: { rowData: newRow, index: rowIndex },
          bubbles: true,
          composed: true,
        })
      );
      this.renderBody();
    }

    promptAddColumn() {
      let colName = prompt("Enter column header name:");
      if (!colName) return;
      let field = prompt(
        "Enter column field name (optional):",
        colName.toLowerCase().replace(/\s+/g, "_")
      );
      if (!field) field = colName.toLowerCase().replace(/\s+/g, "_");
      const newCol = { name: colName, field: field };
      this._columns.push(newCol);
      // Add the new column property to every row.
      this._data.forEach((row) => {
        row[field] = "";
      });
      this.dispatchEvent(
        new CustomEvent("column-added", {
          detail: { column: newCol, index: this._columns.length - 1 },
          bubbles: true,
          composed: true,
        })
      );
      this.render();
    }

    autoAddColumn() {
      const newIndex = this._columns.length;
      const newField = "column_" + (newIndex + 1);
      const newCol = { name: "Column " + (newIndex + 1), field: newField };
      this._columns.push(newCol);
      this._data.forEach((row) => {
        row[newField] = "";
      });
      this.dispatchEvent(
        new CustomEvent("column-added", {
          detail: { column: newCol, index: newIndex },
          bubbles: true,
          composed: true,
        })
      );
      this.render();
    }

    deleteSelectedRows() {
      // Find all selected rows via their checkboxes.
      const checkboxes = this.shadowRoot.querySelectorAll(
        "input.select-row:checked"
      );
      const indexes = Array.from(checkboxes).map((chk) =>
        parseInt(chk.getAttribute("data-row-index"), 10)
      );
      // Remove rows from the highest index down to avoid reindexing issues.
      indexes.sort((a, b) => b - a);
      indexes.forEach((idx) => {
        const removed = this._data.splice(idx, 1)[0];
        this.dispatchEvent(
          new CustomEvent("row-deleted", {
            detail: { rowData: removed, index: idx },
            bubbles: true,
            composed: true,
          })
        );
      });
      this.renderBody();
    }

    // Public getter/setter for data.
    set data(value) {
      this._data = value;
      this.setAttribute("data", JSON.stringify(value));
      this.render();
    }
    get data() {
      return this._data;
    }

    // Public getter/setter for columns.
    set columns(value) {
      this._columns = value;
      this.setAttribute("columns", JSON.stringify(value));
      this.render();
    }
    get columns() {
      return this._columns;
    }
  }

  customElements.define("fancy-table", FancyTable);