
import { DB, drop } from "../js/db.js";

class DbButtons extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        button {
          margin: 5px;
        }
      </style>
      <button id="create">Create</button>
      <button id="read">Read</button>
      <button id="update">Update</button>
      <button id="delete">Delete</button>
      <button id="drop">Drop All Tables</button>
      <button id="deleteWorker">Delete Worker</button>
      <button id="createWorker">Create Worker</button>
    `;

    this.shadowRoot.getElementById('create').addEventListener('click', this.createRecord);
    this.shadowRoot.getElementById('read').addEventListener('click', this.readRecord);
    this.shadowRoot.getElementById('update').addEventListener('click', this.updateRecord);
    this.shadowRoot.getElementById('delete').addEventListener('click', this.deleteRecord);
    this.shadowRoot.getElementById('drop').addEventListener('click', this.dropAllTables);
    this.shadowRoot.getElementById('deleteWorker').addEventListener('click', this.deleteWorker);
    this.shadowRoot.getElementById('createWorker').addEventListener('click', this.createWorker);

    this.setDbName("JSONDB");
  }

    setDbName(value) {
      this.dbName = value;
      const label = document.querySelector('label[for="dbName"]');
      label.textContent = `Database Name: ${value}`;
      //hide input
      const input = document.getElementById('dbName');
      input.style.display = 'none';
    }
  async createRecord() {
    await db.Users.add({
      name: "New User",
      email: "newuser@example.com"
    });
    alert("Record created!");
  }

  async readRecord() {
    const db = new DB("../js/advanced-db-engine-worker.js");
    await db.init("MyComplexDB", mySchema, 1);
    const users = await db.Users.find({});
    console.log(users);
    alert("Check console for records.");
  }

  async updateRecord() {
    const db = new DB("../js/advanced-db-engine-worker.js");
    await db.init("MyComplexDB", mySchema, 1);
    const user = await db.Users.find({ name: "New User" });
    if (user) {
      user.email = "updateduser@example.com";
      await db.Users.put(user);
      alert("Record updated!");
    } else {
      alert("User not found!");
    }
  }

  async deleteRecord() {
    const db = new DB("../js/advanced-db-engine-worker.js");
    await db.init("MyComplexDB", mySchema, 1);
    const user = await db.Users.find({ name: "New User" });
    if (user) {
      await db.Users.delete(user.id);
      alert("Record deleted!");
    } else {
      alert("User not found!");
    }
  }

  async dropAllTables() {
    await drop("MyComplexDB");
    alert("All tables dropped!");
  }

  async deleteWorker() {
    // Implement worker deletion logic if needed
    alert("Worker deleted!");
  }

  async createWorker() {
    // 1) The schema is defined externally here in the main thread
    const mySchema = [
      {
        name: "Users",
        type: "Users",
        parentID: "",
        parentType: "",
        keyPath: "id",
        autoIncrement: true,
        indexes: [
          { name: "NameIndex", keyPath: "name" },
          { name: "EmailIndex", keyPath: "Email", options: { unique: true } }
        ],
        //validate: (data) => {
        //  if (!data.Name) throw new Error("User must have a name.");
        //  if (!data.Email) throw new Error("User must have an Email.");
        //}
      },
      {
        name: "Orders",
        type: "Users",
        parentID: "",
        parentType: "",
        keyPath: "id",
        autoIncrement: true,
        indexes: [
          { name: "NameIndex", keyPath: "name" }
        ],
        //validate: (data) => {
        //   if (!data.OrderName) throw new Error("Order must have an OrderName.");
        //}
      }
    ];
    const db = new DB("../js/advanced-db-engine-worker.js", true);

    if (await db.isWorkerRunning()) {
      alert("Worker is already running!");
      return;
    } else {
      await db.init(this.dbName, mySchema, 10);
      alert("Worker created!");
    }
  }
}

customElements.define('db-buttons', DbButtons);