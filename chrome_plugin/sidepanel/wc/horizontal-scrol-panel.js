class HorizontalScrollPanels extends HTMLElement {

  constructor() {
    super();


    const containerTemplate = document.createElement("template");
    containerTemplate.innerHTML = `
       <slot></slot>
    `;

    const style = document.createElement("style");
    style.textContent = /*css*/ `
            :host {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
                /* Hide overflow to prevent scrollbars */
            }
        
        `;

    const shadowRoot = this.attachShadow(
      {
        mode: "open",
        clonable: true,
        delegatesFocus: true,
        serializable: true,
        slotAssignment: "named",
      });
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(containerTemplate.content.cloneNode(true));
    }
    getCurrentId() {
      for (let i = 0; i < this.children.length; i++) {
        let node = this.children[i];
        if (node.classList.contains('visible')) {
          return node.id;
        }
      }
    }
  switchByID(id) {
    //loop throught this.children which is HTMLChildren
    for (let i = 0; i < this.children.length; i++) {
        let node = this.children[i]
        if (node.id === id) {
          node.classList.remove('hidden');
          node.classList.add('visible');
        } else {
          node.classList.remove('visible');
          node.classList.add('hidden');
        }
    }
  }
}

customElements.define('horizontal-scroll-panels', HorizontalScrollPanels);
