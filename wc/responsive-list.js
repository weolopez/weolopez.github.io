// responsive-list.js

class ResponsiveList extends HTMLElement {
    constructor() {
      super();
      // Attach shadow DOM.
      this.attachShadow({ mode: 'open' });
      // Set up the inner HTML and styles.
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            font-family: sans-serif;
          }
          .list-container {
            width: 100%;
          }
          .list-item {
            display: flex;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #eee;
            position: relative;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          .list-item:hover {
            background-color: #f5f5f5;
          }
          .item-icon {
            flex: 0 0 40px;
            margin-right: 10px;
          }
          .item-icon img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
          }
          .item-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .item-title {
            font-weight: bold;
            font-size: 1em;
          }
          .item-description {
            font-size: 0.9em;
            color: #666;
            max-height: 0;
            opacity: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, opacity 0.3s ease;
          }
          /* When item is selected, reveal description */
          .list-item.selected .item-description {
            max-height: 60px; /* Adjust if needed */
            opacity: 1;
            margin-top: 5px;
          }
          .item-options {
            flex: 0 0 auto;
            display: flex;
            gap: 5px;
            /* Initially hide by sliding off to right */
            transform: translateX(100%);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
          }
          /* Slide in when selected */
          .list-item.selected .item-options {
            transform: translateX(0);
            opacity: 1;
          }
          .option-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.2em;
            color: #888;
            padding: 5px;
            transition: color 0.3s;
          }
          .option-btn:hover {
            color: #555;
          }
          @media (max-width: 480px) {
            .list-item {
              padding: 8px;
            }
            .item-icon {
              flex: 0 0 32px;
              margin-right: 8px;
            }
            .item-icon img {
              width: 32px;
              height: 32px;
            }
            .option-btn {
              font-size: 1em;
            }
          }
        </style>
        <div class="list-container"></div>
      `;
      this._container = this.shadowRoot.querySelector('.list-container');
    }
  
    /**
     * Public API to add an item to the list.
     * @param {Object} itemData - An object with the following properties:
     *   - icon: URL (or path) to the icon image.
     *   - title: The title text.
     *   - description: The description text (hidden until selected).
     *   - options: (Optional) An array of option objects. Each option is an object:
     *         { icon: string (HTML or text for the icon), action: string }
     */
    addItem(itemData) {
      const { icon, title, description, options } = itemData;
  
      // Create the item container.
      const item = document.createElement('div');
      item.classList.add('list-item');
  
      // Create the icon element.
      const iconDiv = document.createElement('div');
      iconDiv.classList.add('item-icon');
      const img = document.createElement('img');
      img.src = icon;
      img.alt = title;
      iconDiv.appendChild(img);
  
      // Create the content element (title and description).
      const contentDiv = document.createElement('div');
      contentDiv.classList.add('item-content');
      const titleDiv = document.createElement('div');
      titleDiv.classList.add('item-title');
      titleDiv.textContent = title;
      const descDiv = document.createElement('div');
      descDiv.classList.add('item-description');
      descDiv.textContent = description;
      contentDiv.appendChild(titleDiv);
      contentDiv.appendChild(descDiv);
  
      // Create the options element.
      const optionsDiv = document.createElement('div');
      optionsDiv.classList.add('item-options');
      if (Array.isArray(options)) {
        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.classList.add('option-btn');
          // The icon can be an HTML string (for SVG or icon fonts) or plain text.
          btn.innerHTML = opt.icon;
          btn.dataset.action = opt.action;
          // Prevent item toggle when clicking on the option.
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Dispatch a custom event with the option details.
            this.dispatchEvent(new CustomEvent('option-click', {
              detail: {
                action: opt.action,
                title: title
              },
              bubbles: true,
              composed: true
            }));
          });
          optionsDiv.appendChild(btn);
        });
      }
  
      // Assemble the list item.
      item.appendChild(iconDiv);
      item.appendChild(contentDiv);
      item.appendChild(optionsDiv);
  
      // Toggle the "selected" state on item click.
      item.addEventListener('click', () => {
        const isSelected = item.classList.toggle('selected');
        // Dispatch a custom event indicating selection change.
        this.dispatchEvent(new CustomEvent('item-selected', {
          detail: {
            title: title,
            selected: isSelected
          },
          bubbles: true,
          composed: true
        }));
      });
  
      // Append the item to the container.
      this._container.appendChild(item);
    }
  }
  
  customElements.define('responsive-list', ResponsiveList);
  