import { templates } from "../wikiike/templates.js";
import { DB, drop } from "../js/db.js";

/***********************
 * Main WYSIWYG Editor Component
 ***********************/
class WysiwygEditor extends HTMLElement {
  constructor() {
    super();

    this.db = new DB(true);

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = /*html*/ `
        <style>
          .editor-container {
            overflow: scroll;
            max-height: 96vh;
            max-width: 100vw;
            margin: 0 auto;
            background: #fff;
            border: 1px solid #ccc;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
          }
        </style>
        <div class="editor-container">
          <!--wysiwyg-toolbar></wysiwyg-toolbar-->
          <wysiwyg-canvas></wysiwyg-canvas>
        </div>
      `;

    // Keep track of the currently active (selected) section.
    this.activeSection = null;
    this.hash = window.location.hash.replace(/^#/, "").toLowerCase();
  }
  async connectedCallback() {
    this.canvas = this.shadowRoot.querySelector("wysiwyg-canvas");
    this.toolbar = document.getElementById("myToolbar");

    await this.db.init(this.dbName, ["Pages"]); //, mySchema, 10);
    this.Pages = this.db.Pages;
    this.page = await this.Pages.find({ title: this.hash });
    if (!this.page) {
      this.page = await getOpenAIResponse(
        `Create a wikipedia like page about ${this.hash}`,
        "Respond only in HTML as a fragment that will be inserted into a main element. Do not use triple quotes or markdown notation"
      );
      this.page = marked.parse(this.page);
      this.Pages.add({ title: this.hash, content: this.page });
    }
    else {
//this.page is a string remove all \n and \t
      // this.page.content = this.page.content.replace(/\n/g, "").replace(/\t/g, "");
      // this.page.update()
      this.page = this.page.content;
    }

    // Select: configuration "Label | ActionName | Option1, Option2, Option3"
    const templateOptions = Object.keys(templates.page).map((key) =>
      key.charAt(0).toUpperCase() + key.slice(1)
    ).join(", ");
    toolbar.addComponent(
      "select",
      `Choose Template | doGlobalTemplate | ${templateOptions}`,
    );

    toolbar.addEventListener("toolbar-action", (e) => {
      if (e.detail.action === "doGlobalTemplate") {
        this.setGlobalTemplate(e.detail.value.toLowerCase());
      }
    });

    // this.toolbar = this.shadowRoot.querySelector('wysiwyg-toolbar');
    // Listen for toolbar actions.
    // this.toolbar.addEventListener('toolbarAction', (e) => {
    //   this.handleToolbarAction(e.detail.action);
    // });
    // // Listen for template changes.
    // this.toolbar.addEventListener('templateChange', (e) => {
    //   this.setGlobalTemplate(e.detail.value);
    // });
    // Listen for section selection/deselection events from the canvas.
    this.canvas.addEventListener("sectionSelected", (e) => {
      this.setActiveSection(e.detail.section);
    });
    this.canvas.addEventListener("sectionDeselected", () => {
      this.clearActiveSection();
    });
    // Load the initial global template.
    
    this.canvas.value = this.page;
    this.clearActiveSection();
  }
  setGlobalTemplate(templateKey) {
    const html = templates.page[templateKey] || templates.page.blank;
    this.canvas.value = html;
  }
  setActiveSection(section) {
    if (this.activeSection && this.activeSection !== section) {
      this.activeSection.classList.remove("active-section");
    }
    this.activeSection = section;
    this.activeSection.classList.add("active-section");
    // Enable the Section Template button.
    this.toolbar.setSectionTemplateEnabled(true);
  }
  clearActiveSection() {
    if (this.activeSection) {
      this.activeSection.classList.remove("active-section");
      this.activeSection = null;
    }
    // this.toolbar.setSectionTemplateEnabled(false);
  }
  handleToolbarAction(action) {
    switch (action) {
      case "bold":
        this.canvas.applyTextStyle("bold");
        break;
      case "italic":
        this.canvas.applyTextStyle("italic");
        break;
      case "underline":
        this.canvas.applyTextStyle("underline");
        break;
      case "addSection":
        const sectionHTML = `
            <section contenteditable="true" style="border:1px dashed #999; padding:10px; margin:10px 0;">
              <h2>New Section</h2>
              <p>Section content here...</p>
            </section>`;
        this.canvas.insertHTMLAtCursor(sectionHTML);
        break;
      case "addHeading":
        const headingHTML = `<h2 contenteditable="true">New Heading</h2>`;
        this.canvas.insertHTMLAtCursor(headingHTML);
        break;
      case "addParagraph":
        const paragraphHTML = `<p contenteditable="true">New paragraph...</p>`;
        this.canvas.insertHTMLAtCursor(paragraphHTML);
        break;
      case "addImage":
        {
          const imageUrl = prompt("Enter image URL:");
          if (imageUrl) {
            const altText = prompt("Enter alt text (optional):", "");
            const imageHTML =
              `<img src="${imageUrl}" alt="${altText}" style="max-width:100%; display:block; margin:10px 0;" />`;
            this.canvas.insertHTMLAtCursor(imageHTML);
          }
        }
        break;
      case "addList":
        {
          const listHTML = `
              <ul contenteditable="true">
                <li>List item 1</li>
                <li>List item 2</li>
              </ul>`;
          this.canvas.insertHTMLAtCursor(listHTML);
        }
        break;
      case "addCustom":
        {
          const customHTML = prompt("Enter custom HTML to insert:");
          if (customHTML) {
            this.canvas.insertHTMLAtCursor(customHTML);
          }
        }
        break;
      case "sectionTemplate":
        if (this.activeSection) {
          const templateType = prompt(
            "Enter section template type (simple, twoColumn, imageSection):",
            "simple",
          );
          if (templateType && this.sectionTemplates[templateType]) {
            this.activeSection.innerHTML = template.section[templateType];
          } else {
            alert("Invalid template type.");
          }
        }
        break;
    }
  }
}
customElements.define("wysiwyg-editor", WysiwygEditor);
export default WysiwygEditor;

/***********************
 * WYSIWYG Canvas Component
 ***********************/
class WysiwygCanvas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            outline: 1px solid #ccc;
            min-height: 400px;
            padding: 20px;
            background: #fff;
          }
          /* Style for active (selected) section */
          .active-section {
            outline: 2px dashed blue;
          }
        </style>
        <div id="editor" contenteditable="true"></div>
      `;
  }
  connectedCallback() {
    this.editor = this.shadowRoot.getElementById("editor");

    this.addEventListener("click", (e) => {
      console.log(e.target);
      // Toggle border style of the editor
      this.editorSelected = !this.editorSelected;
      this.style.outline = this.editorSelected ? "2px dashed blue" : "";
    });

    // Listen for clicks to detect active section (a clicked element with tag SECTION)
    this.editor.addEventListener("click", (e) => {
      this.editorSelected = false;
      this.style.outline = this.editorSelected ? "2px dashed blue" : "";
      let section = e.target;
      while (section && section !== this.editor) {
        if (section.tagName === "SECTION") {
          this.dispatchEvent(
            new CustomEvent("sectionSelected", {
              detail: { section },
              bubbles: true,
              composed: true,
            }),
          );
          return;
        }
        section = section.parentNode;
      }
      this.dispatchEvent(
        new CustomEvent("sectionDeselected", {
          bubbles: true,
          composed: true,
        }),
      );
      e.stopPropagation();
    });
  }
  get value() {
    return this.editor.innerHTML;
  }
  set value(val) {
    if (!this.editor) return;
    this.editor.innerHTML = val;
  }
  focus() {
    this.editor.focus();
  }
  insertHTMLAtCursor(html) {
    this.focus();
    if (document.queryCommandSupported("insertHTML")) {
      document.execCommand("insertHTML", false, html);
    } else {
      let sel, range;
      if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
          range = sel.getRangeAt(0);
          range.deleteContents();
          const el = document.createElement("div");
          el.innerHTML = html;
          const frag = document.createDocumentFragment();
          let node, lastNode;
          while ((node = el.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);
          if (lastNode) {
            range = range.cloneRange();
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    }
  }
  applyTextStyle(command) {
    this.editor.focus();
    document.execCommand(command, false, null);
  }
  insertAtLineStart(prefix) {
    // For simplicity, we use execCommand to insert the prefix.
    this.editor.focus();
    document.execCommand("insertHTML", false, prefix);
  }
}
customElements.define("wysiwyg-canvas", WysiwygCanvas);

/***********************
 * WYSIWYG Toolbar Component
 ***********************/
// class WysiwygToolbar extends HTMLElement {
//   constructor() {
//     super();
//     this.attachShadow({ mode: "open" });
//     this.shadowRoot.innerHTML = `
//         <style>
//           :host {
//             display: block;
//             background: #eee;
//             padding: 10px;
//           }
//           label {
//             margin-right: 5px;
//             font-size: 14px;
//           }
//           select, button {
//             padding: 5px 10px;
//             margin-right: 5px;
//             font-size: 14px;
//             cursor: pointer;
//           }
//           button:disabled {
//             opacity: 0.5;
//             cursor: not-allowed;
//           }
//         </style>
//         <div>
//           <label for="globalTemplate">Global Template:</label>
//           <select id="globalTemplate">
//             <option value="blank">Blank</option>
//             <option value="simple">Simple Document</option>
//             <option value="twoColumn">Two Column Layout</option>
//           </select>
//           <!-- Formatting buttons -->
//           <button data-action="bold" title="Bold">B</button>
//           <button data-action="italic" title="Italic">I</button>
//           <button data-action="underline" title="Underline">U</button>
//           <!-- Insertion buttons -->
//           <button data-action="addSection" title="Add Section">Add Section</button>
//           <button data-action="addHeading" title="Add Heading">Add Heading</button>
//           <button data-action="addParagraph" title="Add Paragraph">Add Paragraph</button>
//           <button data-action="addImage" title="Add Image">Add Image</button>
//           <button data-action="addList" title="Add List">Add List</button>
//           <button data-action="addCustom" title="Add Custom HTML">Add Custom HTML</button>
//           <!-- Section Template (only enabled if a section is selected) -->
//           <button data-action="sectionTemplate" title="Apply Section Template" disabled>Section Template</button>
//         </div>
//       `;
//   }
//   connectedCallback() {
//     // Listen for clicks on both buttons and changes on the select
//     const select = this.shadowRoot.getElementById("globalTemplate");
//     select.addEventListener("change", (e) => {
//       this.dispatchEvent(
//         new CustomEvent("templateChange", {
//           detail: { value: e.target.value },
//           bubbles: true,
//           composed: true,
//         }),
//       );
//     });
//     this.shadowRoot.querySelectorAll("button").forEach((btn) => {
//       btn.addEventListener("click", () => {
//         const action = btn.getAttribute("data-action");
//         this.dispatchEvent(
//           new CustomEvent("toolbarAction", {
//             detail: { action },
//             bubbles: true,
//             composed: true,
//           }),
//         );
//       });
//     });
//   }
//   setSectionTemplateEnabled(enabled) {
//     const btn = this.shadowRoot.querySelector(
//       'button[data-action="sectionTemplate"]',
//     );
//     if (btn) btn.disabled = !enabled;
//   }
// }
// customElements.define("wysiwyg-toolbar", WysiwygToolbar);
