import BasePage from './page-template.js';
import WysiwygEditor from '../wc/wysiwyg-editor.js';

class WikiEditorPage extends BasePage {
  // Override the lifecycle hook if additional mount logic is needed.
  componentDidMount() {
    super.componentDidMount();
    console.log('WikiEditorPage mounted.');
    // Additional mount logic can go here.
  }

  // Override the html() method to create a fancy modern marketing page.
  html() {
    return `
      <wysiwyg-editor></wysiwyg-editor>
    `;
  }

  // Override render to include custom styles alongside inherited ones.
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
      </style>
      <div class="page-container">
        ${this.html()}
      </div>
    `;
  }
}

customElements.define('wiki-editor-page', WikiEditorPage);
export default WikiEditorPage;