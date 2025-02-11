
    /****************************
     * Wiki Source Editor Component *
     ****************************/
    class WikiSourceEditor extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
          this.shadowRoot.innerHTML = `
            <style>
              textarea {
                width: 100%;
                height: 100%;
                padding: 1rem;
                font-size: 1rem;
                border: none;
                resize: none;
                outline: none;
                background: var(--background, #fff);
                color: var(--text, #000);
              }
            </style>
            <textarea placeholder="Start writing your wiki content here..."></textarea>
          `;
        }
        connectedCallback() {
          this.textarea = this.shadowRoot.querySelector('textarea');
          this.textarea.addEventListener('input', () => {
            this.dispatchEvent(new CustomEvent('sourceInput', { detail: { value: this.value } }));
          });
        }
        get value() {
          return this.textarea.value;
        }
        set value(val) {
          this.textarea.value = val;
        }
        wrapSelection(wrapper) {
          const textarea = this.textarea;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const selectedText = textarea.value.substring(start, end);
          const newText = wrapper + selectedText + wrapper;
          textarea.setRangeText(newText, start, end, "end");
        }
        insertAtLineStart(prefix) {
          const textarea = this.textarea;
          const start = textarea.selectionStart;
          const value = textarea.value;
          const lineStart = value.lastIndexOf('\n', start - 1) + 1;
          textarea.setSelectionRange(lineStart, lineStart);
          textarea.setRangeText(prefix, lineStart, lineStart, "end");
        }
        insertLink() {
          const url = prompt("Enter URL:", "https://");
          if (!url) return;
          const textarea = this.textarea;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const selectedText = textarea.value.substring(start, end) || "link text";
          const markdownLink = `[${selectedText}](${url})`;
          textarea.setRangeText(markdownLink, start, end, "end");
        }
      }
      customElements.define('wiki-source-editor', WikiSourceEditor);
  