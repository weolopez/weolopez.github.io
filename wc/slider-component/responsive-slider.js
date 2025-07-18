// responsive-slider.js
class ResponsiveSlider extends HTMLElement {
    static get observedAttributes() {
        return [
            "orientation",
            "header-mode",
            "slider-title",
            "loop",
            "max-item-width",
            "autoplay",
            "pause-on-hover",
            "initial-slide",
        ];
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });

        this.currentIndex = 0;
        this.intervalId = null;
        this.autoplayDelay = 0;
        this.paused = false;

        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          overflow: hidden;
          --slider-arrow-color: #fff;
          --slider-arrow-background: rgba(0, 0, 0, 0.5);
          --slider-tab-color: #ccc;
          --slider-tab-active-color: #000;
          --slider-header-padding: 1rem;
          --slider-gap-between-items: 1rem;
        }
        .wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--slider-header-padding);
        }
        .nav-buttons button {
          background: var(--slider-arrow-background);
          color: var(--slider-arrow-color);
          border: none;
          padding: 0.5rem 1rem;
          cursor: pointer;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
        }
        .tabs button {
          background: var(--slider-tab-color);
          border: none;
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
        }
        .tabs button.active {
          background: var(--slider-tab-active-color);
        }
        .viewport {
          flex: 1;
          overflow: auto;
          scroll-behavior: smooth;
          display: flex;
        }
        .items {
          display: flex;
          flex-direction: row;
          gap: var(--slider-gap-between-items);
          scroll-snap-type: x mandatory;
          width: max-content;
        }
        :host([orientation="vertical"]) .viewport {
          flex-direction: column;
        }
        :host([orientation="vertical"]) .items {
          flex-direction: column;
          scroll-snap-type: y mandatory;
        }
        ::slotted(*) {
          scroll-snap-align: start;
          flex-shrink: 0;
        }
      </style>
      <div class="wrapper">
        <slot name="header"></slot>
        <header class="default-header"></header>
        <div class="viewport">
          <div class="items">
            <slot></slot>
          </div>
        </div>
      </div>
    `;

        this.elements = {
            wrapper: this.shadowRoot.querySelector(".wrapper"),
            header: this.shadowRoot.querySelector(".default-header"),
            viewport: this.shadowRoot.querySelector(".viewport"),
            items: this.shadowRoot.querySelector(".items"),
        };

        this.onSlotChange = this.onSlotChange.bind(this);
        this.onScroll = this.onScroll.bind(this);
        this.onResize = this.onResize.bind(this);
    }

    connectedCallback() {
        this.shadowRoot.querySelector("slot").addEventListener(
            "slotchange",
            this.onSlotChange,
        );
        this.elements.viewport.addEventListener("scroll", this.onScroll);
        window.addEventListener("resize", this.onResize);
        this.setup();
    }

    disconnectedCallback() {
        this.shadowRoot.querySelector("slot").removeEventListener(
            "slotchange",
            this.onSlotChange,
        );
        this.elements.viewport.removeEventListener("scroll", this.onScroll);
        window.removeEventListener("resize", this.onResize);
        this.stopAutoplay();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.setup();
        }
    }

    setup() {
        const headerMode = this.getAttribute("header-mode") || "arrows";
        const title = this.getAttribute("slider-title") || "";
        this.orientation = this.getAttribute("orientation") || "horizontal";
        this.loop = this.hasAttribute("loop");
        this.autoplayDelay = parseInt(this.getAttribute("autoplay") || "0", 10);
        this.pauseOnHover = this.hasAttribute("pause-on-hover");
        this.maxItemWidth = this.getAttribute("max-item-width") || "100%";
        this.initialSlide = parseInt(
            this.getAttribute("initial-slide") || "0",
            10,
        );

        // Update orientation styles
        this.setAttribute("orientation", this.orientation);
        this.renderHeader(headerMode, title);
        this.scrollToIndex(this.initialSlide);

        if (this.autoplayDelay > 0) this.startAutoplay();
        this.applyResponsiveLayout();
    }

    renderHeader(mode, title) {
        const header = this.elements.header;
        if (this.querySelector('[slot="header"]')) {
            header.style.display = "none";
            return;
        }

        header.innerHTML = "";
        header.style.display = "flex";

        if (mode === "arrows") {
            const prevBtn = document.createElement("button");
            prevBtn.textContent = "Previous";
            prevBtn.onclick = () => this.prev();

            const nextBtn = document.createElement("button");
            nextBtn.textContent = "Next";
            nextBtn.onclick = () => this.next();

            header.append(prevBtn, nextBtn);
        } else if (mode === "tabs") {
            const tabContainer = document.createElement("div");
            tabContainer.classList.add("tabs");
            this.slides = [...this.querySelectorAll('*:not([slot="header"])')];
            this.slides.forEach((_, i) => {
                const tab = document.createElement("button");
                if (i === this.currentIndex) tab.classList.add("active");
                tab.onclick = () => this.scrollToIndex(i);
                tabContainer.appendChild(tab);
            });
            header.appendChild(tabContainer);
        } else if (mode === "title") {
            const h = document.createElement("h2");
            h.textContent = title;
            header.appendChild(h);
        }
    }
    onScroll() {
        const slotItems = this.shadowRoot.querySelector("slot")
            .assignedElements();
        const scrollLeft = this.elements.viewport.scrollLeft;
        const viewportWidth = this.elements.viewport.clientWidth;
        const itemWidth = slotItems[0]?.clientWidth || 0;
    }

    onSlotChange() {
        this.applyResponsiveLayout();
    }

    onResize() {
        this.applyResponsiveLayout();
    }

    applyResponsiveLayout() {
        const containerWidth = this.clientWidth;
        const maxWidth = parseInt(this.maxItemWidth, 10);
        const count = Math.floor(containerWidth / maxWidth) || 1;
        this.style.setProperty("--visible-items", count);
        const slotItems = this.shadowRoot.querySelector("slot")
            .assignedElements();
        slotItems.forEach((el) => {
            el.style.flex = `0 0 ${Math.floor(100 / count)}%`;
        });
    }

    scrollToIndex(index) {
        const slotItems = this.shadowRoot.querySelector("slot")
            .assignedElements();
        if (index < 0 || index >= slotItems.length) return;
        const el = slotItems[index];
        el.scrollIntoView({
            behavior: "smooth",
            inline: "start",
            block: "start",
        });
        this.currentIndex = index;
        this.dispatchEvent(
            new CustomEvent("slideChange", {
                detail: {
                    currentIndex: index,
                    currentSlideElement: el,
                },
            }),
        );
    }

    next() {
        const slotItems = this.shadowRoot.querySelector("slot")
            .assignedElements();
        const nextIndex = this.currentIndex + 1;
        if (nextIndex >= slotItems.length) {
            if (this.loop) this.scrollToIndex(0);
            else this.dispatchEvent(new CustomEvent("reachEnd"));
        } else {
            this.scrollToIndex(nextIndex);
        }
        this.dispatchEvent(new CustomEvent("nextClick"));
    }

    prev() {
        const prevIndex = this.currentIndex - 1;
        if (prevIndex < 0) {
            if (this.loop) {
                this.scrollToIndex(
                    this.querySelectorAll('*:not([slot="header"])').length - 1,
                );
            } else this.dispatchEvent(new CustomEvent("reachBeginning"));
        } else {
            this.scrollToIndex(prevIndex);
        }
        this.dispatchEvent(new CustomEvent("prevClick"));
    }

    startAutoplay() {
        this.stopAutoplay();
        this.intervalId = setInterval(() => {
            if (!this.pauseOnHover || !this.paused) {
                this.next();
            }
        }, this.autoplayDelay);
    }

    stopAutoplay() {
        if (this.intervalId) clearInterval(this.intervalId);
    }
}

customElements.define("responsive-slider", ResponsiveSlider);
