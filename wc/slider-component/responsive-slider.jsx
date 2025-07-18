
class ResponsiveSlider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --slider-arrow-color: #000;
          --slider-arrow-background: #fff;
          --slider-tab-color: #ccc;
          --slider-tab-active-color: #000;
          --slider-header-padding: 10px;
          --slider-gap-between-items: 10px;
        }
        .slider-container {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
          gap: var(--slider-gap-between-items);
        }
        .slider-container.vertical {
          flex-direction: column;
          overflow-y: auto;
          scroll-snap-type: y mandatory;
        }
        ::slotted(*) {
          scroll-snap-align: start;
          flex-shrink: 0;
        }
        .slider-container.horizontal ::slotted(*) {
          width: var(--max-item-size);
          height: 100%;
        }
        .slider-container.vertical ::slotted(*) {
          height: var(--max-item-size);
          width: 100%;
        }
        .header {
          padding: var(--slider-header-padding);
        }
        #prevButton, #nextButton {
          color: var(--slider-arrow-color);
          background-color: var(--slider-arrow-background);
          border: none;
          padding: 5px 10px;
          cursor: pointer;
        }
        #prevButton:disabled, #nextButton:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .tabs {
          display: flex;
          gap: 5px;
        }
        .tab {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: var(--slider-tab-color);
          border: none;
          cursor: pointer;
        }
        .tab.active {
          background-color: var(--slider-tab-active-color);
        }
      </style>
      <div class="header">
        <slot name="header"></slot>
        <div class="default-header" id="defaultHeader"></div>
      </div>
      <div class="slider-container">
        <slot></slot>
      </div>
    `;
    this.autoplayTimer = null;
  }

  static get observedAttributes() {
    return [
      'orientation', 'header-mode', 'slider-title', 'loop', 
      'max-item-size', 'autoplay', 'pause-on-hover', 'initial-slide'
    ];
  }

  connectedCallback() {
    this.updateOrientation();
    this.updateMaxItemSize();
    this.updateHeader();
    this.setupEventListeners();
    this.setupAutoplay();
    this.scrollToInitialSlide();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-roledescription', 'carousel');
    this.setAttribute('tabindex', '0');
  }

  disconnectedCallback() {
    if (this.autoplayTimer) clearInterval(this.autoplayTimer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case 'orientation':
        this.updateOrientation();
        break;
      case 'header-mode':
        this.updateHeader();
        break;
      case 'max-item-size':
        this.updateMaxItemSize();
        break;
      case 'autoplay':
        this.setupAutoplay();
        break;
      case 'initial-slide':
        this.scrollToInitialSlide();
        break;
    }
  }

  // Helper Methods
  getScrollProp() {
    return this.getAttribute('orientation') === 'vertical' ? 'scrollTop' : 'scrollLeft';
  }

  getSizeProp() {
    return this.getAttribute('orientation') === 'vertical' ? 'clientHeight' : 'clientWidth';
  }

  getTotalSize() {
    const container = this.shadowRoot.querySelector('.slider-container');
    return this.getAttribute('orientation') === 'vertical' ? container.scrollHeight : container.scrollWidth;
  }

  // Updates
  updateOrientation() {
    const container = this.shadowRoot.querySelector('.slider-container');
    container.classList.toggle('vertical', this.getAttribute('orientation') === 'vertical');
  }

  updateMaxItemSize() {
    const maxItemSize = this.getAttribute('max-item-size') || '300px';
    this.style.setProperty('--max-item-size', maxItemSize);
  }

  updateHeader() {
    const customHeaderSlot = this.shadowRoot.querySelector('slot[name="header"]');
    const hasCustomHeader = customHeaderSlot.assignedElements().length > 0;
    const defaultHeader = this.shadowRoot.querySelector('#defaultHeader');
    
    if (hasCustomHeader) {
      defaultHeader.style.display = 'none';
      return;
    }
    
    defaultHeader.style.display = 'block';
    const headerMode = this.getAttribute('header-mode') || 'arrows';
    const slides = this.shadowRoot.querySelector('slot').assignedElements();

    if (headerMode === 'arrows') {
      defaultHeader.innerHTML = `
        <button id="prevButton" aria-label="Previous slide">Previous</button>
        <button id="nextButton" aria-label="Next slide">Next</button>
      `;
      this.updateArrowStates();
    } else if (headerMode === 'tabs') {
      const tabsHtml = slides.map((_, i) => `<button class="tab" data-index="${i}" aria-label="Slide ${i + 1}"></button>`).join('');
      defaultHeader.innerHTML = `<div class="tabs" role="tablist">${tabsHtml}</div>`;
      this.updateTabStates();
    } else if (headerMode === 'title') {
      const title = this.getAttribute('slider-title') || 'Slider';
      defaultHeader.innerHTML = `<h2>${title}</h2>`;
    }
  }

  // Event Listeners
  setupEventListeners() {
    const container = this.shadowRoot.querySelector('.slider-container');
    let scrollTimeout;
    
    container.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.updateArrowStates();
        this.updateTabStates();
        this.dispatchSlideChange();
      }, 100);
    });

    this.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') this.scrollToNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') this.scrollToPrevious();
    });

    if (this.getAttribute('pause-on-hover') === 'true') {
      this.addEventListener('mouseenter', () => this.pauseAutoplay());
      this.addEventListener('mouseleave', () => this.resumeAutoplay());
    }

    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.id === 'prevButton') {
        this.dispatchEvent(new CustomEvent('prevClick'));
        this.scrollToPrevious();
      } else if (e.target.id === 'nextButton') {
        this.dispatchEvent(new CustomEvent('nextClick'));
        this.scrollToNext();
      } else if (e.target.classList.contains('tab')) {
        this.scrollToSlide(parseInt(e.target.dataset.index));
      }
    });
  }

  // Autoplay
  setupAutoplay() {
    if (this.autoplayTimer) clearInterval(this.autoplayTimer);
    const autoplay = parseInt(this.getAttribute('autoplay')) || 0;
    if (autoplay > 0) {
      this.autoplayTimer = setInterval(() => this.scrollToNext(), autoplay);
    }
  }

  pauseAutoplay() {
    if (this.autoplayTimer) clearInterval(this.autoplayTimer);
  }

  resumeAutoplay() {
    this.setupAutoplay();
  }

  // Scrolling Logic
  scrollToPrevious() {
    const container = this.shadowRoot.querySelector('.slider-container');
    const scrollProp = this.getScrollProp();
    const sizeProp = this.getSizeProp();
    const itemSize = parseFloat(getComputedStyle(container).getPropertyValue('--max-item-size'));
    const containerSize = container[sizeProp];
    const visibleItems = Math.floor(containerSize / itemSize);
    const scrollAmount = visibleItems * itemSize;
    let prevScroll = container[scrollProp] - scrollAmount;

    const totalSize = this.getTotalSize();
    const maxScroll = totalSize - containerSize;
    if (prevScroll < 0) {
      if (this.hasAttribute('loop')) {
        prevScroll = maxScroll;
      } else {
        prevScroll = 0;
        this.dispatchEvent(new CustomEvent('reachBeginning'));
      }
    }
    container.scrollTo({ [scrollProp]: prevScroll, behavior: 'smooth' });
  }

  scrollToNext() {
    const container = this.shadowRoot.querySelector('.slider-container');
    const scrollProp = this.getScrollProp();
    const sizeProp = this.getSizeProp();
    const itemSize = parseFloat(getComputedStyle(container).getPropertyValue('--max-item-size'));
    const containerSize = container[sizeProp];
    const visibleItems = Math.floor(containerSize / itemSize);
    const scrollAmount = visibleItems * itemSize;
    let nextScroll = container[scrollProp] + scrollAmount;

    const totalSize = this.getTotalSize();
    const maxScroll = totalSize - containerSize;
    if (nextScroll > maxScroll) {
      if (this.hasAttribute('loop')) {
        nextScroll = 0;
      } else {
        nextScroll = maxScroll;
        this.dispatchEvent(new CustomEvent('reachEnd'));
      }
    }
    container.scrollTo({ [scrollProp]: nextScroll, behavior: 'smooth' });
  }

  scrollToSlide(index) {
    const container = this.shadowRoot.querySelector('.slider-container');
    const scrollProp = this.getScrollProp();
    const itemSize = parseFloat(getComputedStyle(container).getPropertyValue('--max-item-size'));
    const scrollPosition = index * itemSize;
    container.scrollTo({ [scrollProp]: scrollPosition, behavior: 'smooth' });
  }

  scrollToInitialSlide() {
    const initialSlide = parseInt(this.getAttribute('initial-slide')) || 0;
    if (initialSlide > 0) this.scrollToSlide(initialSlide);
  }

  // State Updates
  updateArrowStates() {
    const container = this.shadowRoot.querySelector('.slider-container');
    const scrollProp = this.getScrollProp();
    const totalSize = this.getTotalSize();
    const containerSize = container[this.getSizeProp()];
    const maxScroll = totalSize - containerSize;
    const currentScroll = container[scrollProp];

    const prevButton = this.shadowRoot.querySelector('#prevButton');
    const nextButton = this.shadowRoot.querySelector('#nextButton');
    if (!prevButton || !nextButton) return;

    const isLooping = this.hasAttribute('loop');
    prevButton.disabled = !isLooping && currentScroll <= 0;
    nextButton.disabled = !isLooping && currentScroll >= maxScroll;
  }

  updateTabStates() {
    const container = this.shadowRoot.querySelector('.slider-container');
    const scrollProp = this.getScrollProp();
    const itemSize = parseFloat(getComputedStyle(container).getPropertyValue('--max-item-size'));
    const currentIndex = Math.round(container[scrollProp] / itemSize);
    
    this.shadowRoot.querySelectorAll('.tab').forEach((tab, i) => {
      tab.classList.toggle('active', i === currentIndex);
      tab.setAttribute('aria-selected', i === currentIndex);
    });
  }

  dispatchSlideChange() {
    const container = this.shadowRoot.querySelector('.slider-container');
    const scrollProp = this.getScrollProp();
    const itemSize = parseFloat(getComputedStyle(container).getPropertyValue('--max-item-size'));
    const currentIndex = Math.round(container[scrollProp] / itemSize);
    const slides = this.shadowRoot.querySelector('slot').assignedElements();
    const currentSlideElement = slides[currentIndex] || null;

    this.dispatchEvent(new CustomEvent('slideChange', {
      detail: { currentIndex, currentSlideElement }
    }));
  }
}

customElements.define('responsive-slider', ResponsiveSlider);