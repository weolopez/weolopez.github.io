import BasePage from './page-template.js';

class WikiPage extends BasePage {
  constructor() {
    super();
    this.isPreviewMode = false;
  }

  componentDidMount() {
    this.setupEventListeners();
  }

  html() {
    return `
      <style>
        .wiki-toolbar {
          margin-bottom: 0.5rem;
        }
        .wiki-toolbar button {
          margin-right: 0.5rem;
        }
        #editor, #preview {
          border: 1px solid #ccc;
          padding: 0.5rem;
          min-height: 200px;
        }
      </style>
      <div id="wiki-container">
        <div class="wiki-toolbar">
          <button id="boldBtn" title="Bold"><strong>B</strong></button>
          <button id="italicBtn" title="Italic"><em>I</em></button>
          <button id="linkBtn" title="Insert Link">Link</button>
          <button id="previewBtn" title="Preview">Preview</button>
          <button id="editBtn" title="Edit" style="display: none;">Edit</button>
          <button id="saveBtn" title="Save">Save</button>
        </div>
        <div id="editor" contenteditable="true">
          <p>Edit your wiki content here...</p>
        </div>
        <div id="preview" style="display:none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const shadow = this.shadowRoot;
    const boldBtn = shadow.getElementById('boldBtn');
    const italicBtn = shadow.getElementById('italicBtn');
    const linkBtn = shadow.getElementById('linkBtn');
    const previewBtn = shadow.getElementById('previewBtn');
    const editBtn = shadow.getElementById('editBtn');
    const saveBtn = shadow.getElementById('saveBtn');
    const editor = shadow.getElementById('editor');
    const preview = shadow.getElementById('preview');

    boldBtn.addEventListener('click', () => {
      document.execCommand('bold', false, null);
      editor.focus();
    });

    italicBtn.addEventListener('click', () => {
      document.execCommand('italic', false, null);
      editor.focus();
    });

    linkBtn.addEventListener('click', () => {
      const url = prompt('Enter the URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
      editor.focus();
    });

    previewBtn.addEventListener('click', () => {
      this.togglePreviewMode(true);
    });

    editBtn.addEventListener('click', () => {
      this.togglePreviewMode(false);
    });

    saveBtn.addEventListener('click', () => {
      // Implement save logic here. For now, just log the content.
      console.log('Wiki content saved:', editor.innerHTML);
      alert('Content saved!');
    });
  }

  togglePreviewMode(isPreview) {
    const shadow = this.shadowRoot;
    const editor = shadow.getElementById('editor');
    const preview = shadow.getElementById('preview');
    const previewBtn = shadow.getElementById('previewBtn');
    const editBtn = shadow.getElementById('editBtn');

    if (isPreview) {
      preview.innerHTML = editor.innerHTML;
      editor.style.display = 'none';
      preview.style.display = 'block';
      previewBtn.style.display = 'none';
      editBtn.style.display = 'inline-block';
      this.isPreviewMode = true;
    } else {
      editor.style.display = 'block';
      preview.style.display = 'none';
      previewBtn.style.display = 'inline-block';
      editBtn.style.display = 'none';
      this.isPreviewMode = false;
    }
  }
}

customElements.define('wiki-page', WikiPage);
export default WikiPage;