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
                    background-color: #000; /* Host background */
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
                    transition: transform 0.5s ease-in-out;
                    overflow: hidden; /* Clip internal views */
                    background-color: #000;
                }

                .image-view, .description-view {
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    top: 0;
                    left: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    transition: transform 0.5s ease-in-out;
                }

                .image-view img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .description-view {
                    background-color: #000;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    overflow-y: auto;
                }

                .delete-confirm-modal {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: rgba(50, 50, 50, 0.9);
                    color: white;
                    padding: 30px;
                    border-radius: 10px;
                    z-index: 100;
                    text-align: center;
                    box-shadow: 0 0 15px rgba(0,0,0,0.5);
                }
                .delete-confirm-modal p {
                    margin-bottom: 20px;
                    font-size: 1.2em;
                }
                .delete-confirm-modal button {
                    padding: 10px 20px;
                    margin: 0 10px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1em;
                }
                .confirm-delete-btn {
                    background-color: #d9534f;
                    color: white;
                }
                .cancel-delete-btn {
                    background-color: #5bc0de;
                    color: white;
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
            slide.style.transform = `translateY(${(index - this.currentIndex) * 100}%)`;
            slide.dataset.view = 'image'; // Default view

            // Image View
            const imageView = document.createElement('div');
            imageView.classList.add('image-view');
            const img = document.createElement('img');
            img.src = picture.image;
            img.alt = picture.description || 'Picture';
            imageView.appendChild(img);
            imageView.style.transform = 'translateX(0%)'; // Initially visible

            // Description View
            const descriptionView = document.createElement('div');
            descriptionView.classList.add('description-view');
            descriptionView.textContent = picture.description;
            descriptionView.style.transform = 'translateX(100%)'; // Initially off-screen to the right

            // Delete Confirmation Modal
            const deleteModal = document.createElement('div');
            deleteModal.classList.add('delete-confirm-modal');
            deleteModal.style.display = 'none'; // Initially hidden
            const modalText = document.createElement('p');
            modalText.textContent = 'Are you sure you want to delete this picture?';
            const confirmBtn = document.createElement('button');
            confirmBtn.classList.add('confirm-delete-btn');
            confirmBtn.textContent = 'Yes, Delete';
            confirmBtn.onclick = () => {
                this.deletePicture(picture.id);
                deleteModal.style.display = 'none';
            };
            const cancelBtn = document.createElement('button');
            cancelBtn.classList.add('cancel-delete-btn');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = () => {
                deleteModal.style.display = 'none';
            };
            deleteModal.appendChild(modalText);
            deleteModal.appendChild(confirmBtn);
            deleteModal.appendChild(cancelBtn);

            slide.appendChild(imageView);
            slide.appendChild(descriptionView);
            slide.appendChild(deleteModal);
            this.swiperWrapper.appendChild(slide);
        });
    }

    addSwipeListeners() {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        const swiperContainer = this.shadowRoot.querySelector('.swiper-container');

        swiperContainer.addEventListener('touchstart', (e) => {
            if (e.target.closest('.delete-confirm-modal')) return; // Ignore swipes on modal

            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = true;

            const currentSlide = this.shadowRoot.querySelectorAll('.swiper-slide')[this.currentIndex];
            if (!currentSlide) return;
            // Disable transitions during drag for smoother visual feedback
            currentSlide.style.transition = 'none'; // For vertical movement
            currentSlide.querySelector('.image-view').style.transition = 'none';
            currentSlide.querySelector('.description-view').style.transition = 'none';
        }, { passive: false });

        swiperContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            if (e.target.closest('.delete-confirm-modal')) return;

            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            const currentSlide = this.shadowRoot.querySelectorAll('.swiper-slide')[this.currentIndex];
            if (!currentSlide) return;

            const imageView = currentSlide.querySelector('.image-view');
            const descriptionView = currentSlide.querySelector('.description-view');

            if (Math.abs(deltaX) > Math.abs(deltaY)) { // Primarily horizontal swipe
                e.preventDefault();
                const viewState = currentSlide.dataset.view;
                let baseTranslateImage = viewState === 'image' ? 0 : -100;
                let baseTranslateDesc = viewState === 'description' ? 0 : 100;

                // Allow dragging a bit beyond the edges for a "pull" effect, but snap back.
                // For simplicity here, we'll just move with the finger.
                // The actual translation will be capped/snapped in touchend.
                imageView.style.transform = `translateX(${baseTranslateImage + (deltaX / currentSlide.offsetWidth) * 100}%)`;
                descriptionView.style.transform = `translateX(${baseTranslateDesc + (deltaX / currentSlide.offsetWidth) * 100}%)`;

            } else { // Primarily vertical swipe
                // Allow default vertical swipe behavior (handled by touchend's next/prev slide)
                // but apply transform for visual feedback during drag
                 currentSlide.style.transform = `translateY(${(this.currentIndex - this.currentIndex) * 100 + (deltaY / swiperContainer.offsetHeight) * 100}%)`;
            }
        }, { passive: false });

        swiperContainer.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;

            const currentSlide = this.shadowRoot.querySelectorAll('.swiper-slide')[this.currentIndex];
            if (!currentSlide) return;

            // Re-enable transitions
            currentSlide.style.transition = 'transform 0.5s ease-in-out';
            const imageView = currentSlide.querySelector('.image-view');
            const descriptionView = currentSlide.querySelector('.description-view');
            imageView.style.transition = 'transform 0.5s ease-in-out';
            descriptionView.style.transition = 'transform 0.5s ease-in-out';

            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            const threshold = 25; // Swipe threshold in pixels (reduced for better sensitivity)

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) { // Horizontal swipe
                const viewState = currentSlide.dataset.view;
                if (deltaX < 0) { // Swipe Left (finger R to L) - NOW TRIGGERS "SHOW DESCRIPTION"
                    if (viewState === 'image') {
                        // Show description
                        imageView.style.transform = 'translateX(-100%)';
                        descriptionView.style.transform = 'translateX(0%)';
                        currentSlide.dataset.view = 'description';
                    } else { // viewState === 'description'
                        // Description is already visible, snap back to this state if dragged
                        imageView.style.transform = 'translateX(-100%)';
                        descriptionView.style.transform = 'translateX(0%)';
                    }
                } else { // Swipe Right (deltaX > 0) (finger L to R) - NOW TRIGGERS "SHOW DELETE/IMAGE"
                    if (viewState === 'image') {
                        // Show delete confirmation
                        const deleteModal = currentSlide.querySelector('.delete-confirm-modal');
                        deleteModal.style.display = 'block';
                        // Snap image/description back if they were dragged
                        imageView.style.transform = 'translateX(0%)';
                        descriptionView.style.transform = 'translateX(100%)';
                    } else { // viewState === 'description'
                        // Show image
                        imageView.style.transform = 'translateX(0%)';
                        descriptionView.style.transform = 'translateX(100%)';
                        currentSlide.dataset.view = 'image';
                    }
                }
            } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > threshold) { // Vertical swipe
                if (deltaY < 0) { // Swipe Up
                    this.nextSlide();
                } else { // Swipe Down
                    this.prevSlide();
                }
            } else {
                // Not a strong enough swipe, snap back
                const viewState = currentSlide.dataset.view;
                if (viewState === 'image') {
                    imageView.style.transform = 'translateX(0%)';
                    descriptionView.style.transform = 'translateX(100%)';
                } else { // viewState === 'description'
                    imageView.style.transform = 'translateX(-100%)';
                    descriptionView.style.transform = 'translateX(0%)';
                }
                 // Snap back vertical position if it was dragged
                currentSlide.style.transform = `translateY(${(this.currentIndex - this.currentIndex) * 100}%)`;
            }

            startX = 0; startY = 0; currentX = 0; currentY = 0;
        });
    }

    addScrollListener() {
        const swiperContainer = this.shadowRoot.querySelector('.swiper-container');
        swiperContainer.addEventListener('wheel', (e) => {
            // Don't prevent default for vertical scroll if modal is open, to allow scrolling modal content if any
            if (!e.target.closest('.delete-confirm-modal')) {
                 e.preventDefault();
            }


            const currentSlide = this.shadowRoot.querySelectorAll('.swiper-slide')[this.currentIndex];
            if (!currentSlide) return;
            if (e.target.closest('.delete-confirm-modal')) return; // Ignore scroll on modal itself

            const imageView = currentSlide.querySelector('.image-view');
            const descriptionView = currentSlide.querySelector('.description-view');
            const viewState = currentSlide.dataset.view;

            // Prioritize vertical scroll for next/prev slide
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                if (e.deltaY > 0) { // Scrolling down
                    this.nextSlide();
                } else if (e.deltaY < 0) { // Scrolling up
                    this.prevSlide();
                }
            } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { // Horizontal scroll
                if (e.deltaX < 0) { // Scrolling left
                    if (viewState === 'image') {
                        const deleteModal = currentSlide.querySelector('.delete-confirm-modal');
                        deleteModal.style.display = 'block';
                    } else { // viewState === 'description'
                        imageView.style.transform = 'translateX(0%)';
                        descriptionView.style.transform = 'translateX(100%)';
                        currentSlide.dataset.view = 'image';
                    }
                } else if (e.deltaX > 0) { // Scrolling right
                    if (viewState === 'image') {
                        imageView.style.transform = 'translateX(-100%)';
                        descriptionView.style.transform = 'translateX(0%)';
                        currentSlide.dataset.view = 'description';
                    }
                }
            }
        }, { passive: false });
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
            slide.style.opacity = '1'; // Ensure opacity is reset

            // Reset to image view for all slides when navigating vertically
            const imageView = slide.querySelector('.image-view');
            const descriptionView = slide.querySelector('.description-view');
            const deleteModal = slide.querySelector('.delete-confirm-modal');

            if (imageView) imageView.style.transform = 'translateX(0%)';
            if (descriptionView) descriptionView.style.transform = 'translateX(100%)';
            if (deleteModal) deleteModal.style.display = 'none';
            slide.dataset.view = 'image';
        });
    }

    deletePicture(id) {
        if (!this.db) {
            console.error('Database not initialized.');
            return;
        }

        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const objectStore = transaction.objectStore(this.storeName);
        const request = objectStore.delete(id);

        request.onsuccess = () => {
            console.log('Picture deleted from DB:', id);
            // Remove the picture from the local array and re-render
            this.pictures = this.pictures.filter(picture => picture.id !== id);
            this.currentIndex = Math.max(0, Math.min(this.currentIndex, this.pictures.length - 1)); // Adjust index if necessary
            this.renderSlides();
        };

        request.onerror = (event) => {
            console.error('Error deleting picture from DB:', event.target.error);
        };
    }
}

customElements.define('picture-swiper', PictureSwiper);