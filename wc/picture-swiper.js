class PictureSwiper extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentIndex = 0;
        this.pictures = [];
        this.db = null;
        this.dbName = 'what_db';
        this.storeName = 'Pictures';
        this.dbVersion = 1;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100vh;
                    overflow: hidden;
                    position: relative;
                }
                .swiper-container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    overflow: hidden;
                }
                .swiper-slide {
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.5s ease-in-out;
                    background-color: #000; /* Ensure black background for slides */
                }
                .swiper-slide img {
                    max-width: 90%;
                    max-height: 70vh;
                    object-fit: contain;
                    margin-bottom: 20px;
                }
                .swiper-slide .description {
                    color: white;
                    text-align: center;
                    padding: 0 20px;
                    max-height: 20vh;
                    overflow-y: auto;
                }
            </style>
            <div class="swiper-container">
                <div class="swiper-wrapper">
                    <!-- Slides will be added here -->
                </div>
            </div>
        `;

        this.swiperWrapper = this.shadowRoot.querySelector('.swiper-wrapper');
        this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB opened successfully');
                this.loadPictures();
                resolve();
            };

            request.onerror = (event) => {
                console.error('Error opening IndexedDB:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    loadPictures() {
        if (!this.db) {
            console.error('Database not initialized.');
            return;
        }

        const transaction = this.db.transaction([this.storeName], 'readonly');
        const objectStore = transaction.objectStore(this.storeName);
        const request = objectStore.openCursor();

        this.pictures = []; // Clear existing pictures

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                this.pictures.push(cursor.value);
                cursor.continue();
            } else {
                console.log('Loaded pictures from DB:', this.pictures);
                this.renderSlides();
                this.addSwipeListeners();
                this.addScrollListener();
            }
        };

        request.onerror = (event) => {
            console.error('Error loading pictures from DB:', event.target.error);
        };
    }

    renderSlides() {
        this.swiperWrapper.innerHTML = ''; // Clear existing slides
        this.pictures.forEach((picture, index) => {
            const slide = document.createElement('div');
            slide.classList.add('swiper-slide');
            slide.style.transform = `translateY(${(index - this.currentIndex) * 100}%)`; // Initial vertical positioning

            const img = document.createElement('img');
            img.src = picture.image;
            img.alt = 'Picture';

            const description = document.createElement('div');
            description.classList.add('description');
            description.textContent = picture.description;

            slide.appendChild(img);
            slide.appendChild(description);
            this.swiperWrapper.appendChild(slide);
        });
    }

    addSwipeListeners() {
        let startY = 0;
        let endY = 0;
        const swiperContainer = this.shadowRoot.querySelector('.swiper-container');

        swiperContainer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });

        swiperContainer.addEventListener('touchmove', (e) => {
            endY = e.touches[0].clientY;
        });

        swiperContainer.addEventListener('touchend', () => {
            const deltaY = endY - startY;
            if (deltaY > 50) { // Swipe down
                this.prevSlide();
            } else if (deltaY < -50) { // Swipe up
                this.nextSlide();
            }
            startY = 0;
            endY = 0;
        });
    }

    addScrollListener() {
        const swiperContainer = this.shadowRoot.querySelector('.swiper-container');
        swiperContainer.addEventListener('wheel', (e) => {
            e.preventDefault(); // Prevent default scroll behavior
            if (e.deltaY > 0) { // Scrolling down
                this.nextSlide();
            } else if (e.deltaY < 0) { // Scrolling up
                this.prevSlide();
            }
        });
    }

    nextSlide() {
        if (this.currentIndex < this.pictures.length - 1) {
            this.currentIndex++;
            this.updateSlidePositions();
        }
    }

    prevSlide() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateSlidePositions();
        }
    }

    updateSlidePositions() {
        const slides = this.shadowRoot.querySelectorAll('.swiper-slide');
        slides.forEach((slide, index) => {
            slide.style.transform = `translateY(${(index - this.currentIndex) * 100}%)`;
        });
    }
}

customElements.define('picture-swiper', PictureSwiper);