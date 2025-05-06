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
            .flip-container {
                width: 100%;
                height: 100%;
                perspective: 1000px; /* Remove this if you don't want the 3D effect */
            }

            .flip-container.flipped .flipper {
                transform: rotateY(180deg);
            }

            .flipper {
                position: relative;
                width: 100%;
                height: 100%;
                transition: 0.6s;
                transform-style: preserve-3d;
            }

            .front, .back {
                position: absolute;
                width: 100%;
                height: 100%;
                backface-visibility: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .front {
                z-index: 2;
                /* background-color: #000; */
            }

            .back {
                transform: rotateY(180deg);
                background-color: #000;
                color: white;
                text-align: center;
                padding: 20px;
                box-sizing: border-box;
                overflow-y: auto;
            }

            .description-panel {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                padding: 10px;
                box-sizing: border-box;
                display: flex;
                justify-content: space-around;
                z-index: 3;
                visibility: hidden; /* Initially hidden */
            }

            .description-panel button {
                padding: 10px 20px;
                cursor: pointer;
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

            const flipContainer = document.createElement('div');
            flipContainer.classList.add('flip-container');

            const flipper = document.createElement('div');
            flipper.classList.add('flipper');

            const front = document.createElement('div');
            front.classList.add('front');

            const back = document.createElement('div');
            back.classList.add('back');
            back.textContent = picture.description; // Description goes in the back

            const img = document.createElement('img');
            img.src = picture.image;
            img.alt = 'Picture';

            front.appendChild(img);
            flipper.appendChild(front);
            flipper.appendChild(back);
            flipContainer.appendChild(flipper);
            slide.appendChild(flipContainer);

            const descriptionPanel = document.createElement('div');
            descriptionPanel.classList.add('description-panel');

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the click from bubbling up to the back element
                // TODO: Implement delete functionality
                console.log('Delete button clicked for picture:', picture);
            });

            descriptionPanel.appendChild(deleteButton);
            slide.appendChild(descriptionPanel);

            // Add event listener to flip the card on image touch
            img.addEventListener('click', () => {
                 flipContainer.classList.add('flipped');
                 descriptionPanel.style.visibility = 'hidden'; // Hide panel when flipping back to image
            });

            // Add event listener to show the panel on description touch
            back.addEventListener('click', (event) => {
                // Check if the click target is the delete button
                if (event.target !== deleteButton) {
                    flipContainer.classList.remove('flipped'); // Flip back to image
                    descriptionPanel.style.visibility = 'hidden'; // Hide the panel
                }
            });

            // Remove the contextmenu listener
            // back.addEventListener('contextmenu', (event) => {
            //     event.preventDefault(); // Prevent default context menu
            //     descriptionPanel.style.visibility = 'visible'; // Show panel on right-click/long-press
            // });

            // Long press functionality for delete confirmation
            let pressTimer;
            back.addEventListener('touchstart', (event) => {
                // Start a timer on touch start
                pressTimer = setTimeout(() => {
                    // If the timer completes, it's a long press
                    const confirmDelete = confirm('Are you sure you want to delete this picture?');
                    if (confirmDelete) {
                        // TODO: Implement actual delete functionality
                        console.log('Picture deleted:', picture);
                        // You might want to remove the slide from the DOM and update the pictures array here
                    }
                }, 500); // Adjust the time (in milliseconds) for what you consider a "long press"
            });

            back.addEventListener('touchend', () => {
                // Clear the timer if the touch ends before the long press time
                clearTimeout(pressTimer);
            });

            back.addEventListener('touchmove', () => {
                // Clear the timer if the touch moves significantly
                clearTimeout(pressTimer);
            });

            // Also handle mouse events for long press on non-touch devices
            let mouseDownTimer;
            back.addEventListener('mousedown', (event) => {
                if (event.button === 0) { // Left mouse button
                     mouseDownTimer = setTimeout(() => {
                        const confirmDelete = confirm('Are you sure you want to delete this picture?');
                        if (confirmDelete) {
                            // TODO: Implement actual delete functionality
                            console.log('Picture deleted:', picture);
                            // You might want to remove the slide from the DOM and update the pictures array here
                        }
                    }, 500); // Adjust the time (in milliseconds) for what you consider a "long press"
                }
            });

            back.addEventListener('mouseup', () => {
                clearTimeout(mouseDownTimer);
            });

             back.addEventListener('mousemove', () => {
                clearTimeout(mouseDownTimer);
            });


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