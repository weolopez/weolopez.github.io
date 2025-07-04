import { DB, drop } from "./db.js";

class DbButtons extends HTMLElement {
  constructor() {
    super();

    this.db = new DB(true);

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        button {
          margin: 5px;
        }
        .visibility-hidden {
          visibility: hidden;
        }
      </style>
        <label for="dbName" >Database Name:</label>
  <input type="text" id="dbName" />
  <br />
      <div id="buttons"></div>
      <button id="update">Update</button>

      <section id="object-ovserver">
        <h3>Object Observer</h3>
        <p>Observe changes to objects in the database.</p>
      </section>
    `;
    this.buttons = ["refreshDB", "initDB", "deleteWorker", "createWorker", "drop", "create", "read", "delete"]//, "update", "", ];
    this.createButtons();
    this.label = this.shadowRoot.querySelector('label[for="dbName"]');
    this.input = this.shadowRoot.getElementById("dbName");
    this.input.addEventListener("blur", () => {
      this.setDbName(this.input.value);
      this.saveDbNameToStorage();
    });
    
    // Load database name from session storage on initialization
    this.loadDbNameFromStorage();
    this.dbTable = document.getElementById("db-table");
    if (!this.dbTable) {
      // Create a default db-table element if not found
      this.dbTable = document.createElement("div");
      this.dbTable.id = "db-table";
      document.body.appendChild(this.dbTable);
    }
    this.updateButton = this.shadowRoot.getElementById("update");
    this.deleteButton = this.shadowRoot.getElementById("delete");
    // this.deleteWorkerButton = this.shadowRoot.getElementById("deleteWorker");
    // this.createWorkerButton = this.shadowRoot.getElementById("createWorker");

    this.updateButton.addEventListener("click", this.updateRecord.bind(this));
    // this.deleteButton.addEventListener("click", this.deleteRecord.bind(this));
    // this.deleteWorkerButton.addEventListener("click", this.deleteWorker.bind(this));
    // this.createWorkerButton.addEventListener("click", this.createWorker.bind(this));

    // Only set default if no saved value exists
    if (!sessionStorage.getItem('dbName')) {
      this.setDbName("MyComplexDB");
    }
    this.initDBAction().then(() => { console.log("initDBAction done") });
    this.isWorkerRunning().then((value) => {console.log('isWorkerRunning== '+ value)})
  }
  createButtons() {
    const buttonsDiv = this.shadowRoot.getElementById("buttons");
    this.buttons.forEach((button) => {
      this[button] = document.createElement("button");
      this[button].textContent = button;
      this[button].addEventListener("click", this[`${button}Action`].bind(this));
      buttonsDiv.appendChild(this[button]);
    });
  }

  // Getter and Setter for isWorkerRunning
  async isWorkerRunning() { 
    const value = await this.db.isWorkerRunning()
    this.deleteWorker.classList.toggle("visibility-hidden", !value);
    this.createWorker.classList.toggle("visibility-hidden", value);
    this.initDB.classList.toggle("visibility-hidden", (this.db.name !== undefined));
    // alert(`Worker ${(value)?'RUNNING':'DELETED' }`);
    return value;
  }

  setDbName(value) {
    this.dbName = value;
    this.input.value = value;
    //hide input
    // this.input.style.display = "none";
   this.dbTable.setAttribute("db-name", value);
  }
  async refreshDBAction() {
    await this.dbTable.refreshDatabase();
  }
  async initDBAction() {
    
    // 1) The schema is defined externally here in the main thread
    const mySchema = [
      {
        name: "Users",
        type: "Users",
        parentID: "",
        parentType: "",
        keyPath: "id",
        autoIncrement: true,
        // indexes: [
        //   { name: "NameIndex", keyPath: "name" },
        //   { name: "EmailIndex", keyPath: "Email", options: { unique: true } },
        // ],
        //validate: (data) => {
        //  if (!data.Name) throw new Error("User must have a name.");
        //  if (!data.Email) throw new Error("User must have an Email.");
        //}
      },
      {
        name: "Orders",
        type: "Orders",
        parentID: "",
        parentType: "Users",
        keyPath: "id",
        autoIncrement: true,
        // indexes: [
        //   { name: "NameIndex", keyPath: "name" },
        // ],
        //validate: (data) => {
        //   if (!data.OrderName) throw new Error("Order must have an OrderName.");
        //}
      },
    ];

    await this.db.init(this.dbName,["Users", "Orders"])//, mySchema, 10);
    this.Users = this.db.Users;
    console.log(await this.isWorkerRunning());
  }
  async dropAction() {
    let result = await this.db.drop();
    alert("All tables dropped? " + JSON.stringify(result));
    console.log(await this.isWorkerRunning());
  }
  async createAction() {
    const UserNames = ["weo", "john", "jane", "doe"];
    const users = await Promise.all(
      UserNames.map(async user => {
        let u = await this.Users.find(
          { name: user }
        );
        if (!u)
        u = this.Users.add({
          name: user,
          email: `${user}@mail.com`,
          nick: `${user}nick`
        })
        return u;
      })
    );

    for (let i = 1; i <= 4; i++) {
      await this.db.Orders.add({
        name: `Order${i}`,
        parentID: users[i - 1].id,
        parentType: "Users",
        orderName: `OrderName${i}`
      });
    }

    users.forEach(async user => {
      let u = await this.Users.find(
        { id: user.id }
      );
      u.add({
        name: `Orderss${u.id}`,
        orderName: `OrdersName${u.id}`,
        type: "Orders"
      })
      u.addy = "addy"
    });

  }

  async readAction() {
    const user = await this.Users.find({name:"jane"});
    const usersString =  this.Users
    console.log(await user.toString());
    console.log(usersString);
    alert("Check console for records.");
  }

  async deleteAction() {
    const user = await this.Users.find({ name: "jane" });
    if (user) {
      await this.Users.remove(user);
      alert("Record deleted!");
    } else {
      alert("User not found!");
    }
  }


  async updateRecord() {
   const user = await this.Users.find({ name: "New User" });
   if (user) {
     user.email = "updateduser@example.com";
     await this.Users.put(user);
     alert("Record updated!");
   } else {
     alert("User not found!");
   }
 }

  async dropAllTables() {
    await drop("MyComplexDB");
    alert("All tables dropped!");
  }

  async deleteWorkerAction() {
    await this.db.close()
    console.log(await this.isWorkerRunning());
  }

  async createWorkerAction() {
    this.db.start()
    console.log(await this.isWorkerRunning());
  }
  async initDB() {
    // if (await this.db.isWorkerRunning()) {
    //   alert("Worker is already running!");
    //   return;
    // } else {
    //   alert("Worker created!");
    // }
  }

  saveDbNameToStorage() {
    const dbName = this.input.value.trim();
    if (dbName) {
      sessionStorage.setItem('dbName', dbName);
      console.log(`[DB-BUTTONS] Database name saved to session storage: ${dbName}`);
    }
  }

  loadDbNameFromStorage() {
    const savedDbName = sessionStorage.getItem('dbName');
    if (savedDbName) {
      this.setDbName(savedDbName);
      console.log(`[DB-BUTTONS] Database name loaded from session storage: ${savedDbName}`);
    }
  }
}

customElements.define("db-buttons", DbButtons);
