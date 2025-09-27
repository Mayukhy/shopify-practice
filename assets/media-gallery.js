if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.mediaSliderDotsContainer = this.querySelector('.media-slider-dots');
        this.initializeDots();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();

        this.addEventListener('click', (event) => {
          if (!event.target.closest('.media-slider-dot')) return;
          else {
            this.onChangeListMedia(event);
          }
        });

        this.addEventListener('click', this.onChangeMediaByButtons.bind(this));
      }
      /**
       * Initialize dots for media slider navigation
       * Sets up data attributes for each dot to correspond with media items
       *
       * @memberof MediaGallery
       * @returns {void}
       */
      initializeDots() {
        if (!this.mediaSliderDotsContainer) return;
        const sliderDots = this.mediaSliderDotsContainer.querySelectorAll('.media-slider-dot');
        const mediaItems = this.querySelectorAll('.product__media-item');
        sliderDots.forEach((dot, index) => {
          const mediaId = mediaItems[index].dataset.mediaId;
          dot.setAttribute('data-slide-mediaId', mediaId);
        });
      }

      /**
       * Handle media change when product variants are selected
       * Updates the active media based on the selected variant's featured media
       *
       * @memberof MediaGallery
       * @param {Event} event - The change event from variant selection
       * @returns {void}
       */
      onChangeMediaByVariants(event) {
        if (!event.target.closest('.flavor-option input[type="radio"]:checked')) return;
        const sectionId = this.dataset.sectionId;
        const selectedVariant = JSON.parse(event.target.closest('.flavor-option input[type="radio"]:checked').value);
        if (!selectedVariant) return;
        const mediaId = selectedVariant.featured_media.id;
        this.setActiveMedia(`${sectionId}-${mediaId}`, true);
      }

      /**
       * Handle media navigation using next/previous buttons
       * Cycles through media items and updates active states for media, thumbnails, and dots
       *
       * @memberof MediaGallery
       * @param {Event} event - The click event from navigation buttons
       * @returns {void}
       */
      onChangeMediaByButtons(event) {
        const isNext = event.target.closest('.media-slider-next');
        const isPrev = event.target.closest('.media-slider-prev');
        if (!isNext && !isPrev) return;

        const activeMediaItem = this.querySelector('.product__media-item.is-active');
        const mediaItems = Array.from(this.querySelectorAll('.product__media-item'));
        let currentIndex = mediaItems.indexOf(activeMediaItem);

        if (isNext) {
          currentIndex = (currentIndex + 1) % mediaItems.length;
        } else if (isPrev) {
          currentIndex = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
        }

        const targetMediaItem = mediaItems[currentIndex];
        const targetMediaId = targetMediaItem.dataset.mediaId;

        // Update media items active state
        mediaItems.forEach((item, index) => {
          if (index === currentIndex) {
            item.classList.add('is-active');
          } else {
            item.classList.remove('is-active');
          }
        });

        // Update thumbnails active state
        const thumbnailBtns = this.querySelectorAll('.thumbnail-list__item');
        thumbnailBtns.forEach((btn) => {
          const button = btn.querySelector('button');
          if (btn.dataset.target === targetMediaId) {
            button.classList.add('is-active');
            button.setAttribute('aria-current', true);
          } else {
            button.classList.remove('is-active');
            button.removeAttribute('aria-current');
          }
        });

        // Update dots active state
        this.updateDots(currentIndex);
      }

      /**
       * Handle media change when clicking on slider dots
       * Updates active states for media items, thumbnails based on dot selection
       *
       * @memberof MediaGallery
       * @param {Event} event - The click event from media slider dot
       * @returns {void}
       */
      onChangeListMedia(event) {
        const slideIndex = parseInt(event.target.closest('.media-slider-dot').dataset.slideIndex);
        const mediaItems = this.querySelectorAll('.product__media-item');
        this.updateDots(slideIndex);
        // Ensure slideIndex is valid
        if (slideIndex < 0 || slideIndex >= mediaItems.length) {
          console.error('Invalid slide index:', slideIndex);
          return;
        }

        const targetMediaItem = mediaItems[slideIndex];
        const targetMediaId = targetMediaItem.dataset.mediaId;

        // Update media items active state
        mediaItems.forEach((item, index) => {
          if (index === slideIndex) {
            item.classList.add('is-active');
          } else {
            item.classList.remove('is-active');
          }
        });

        // Update thumbnails active state
        const thumbnailBtns = this.querySelectorAll('.thumbnail-list__item');
        thumbnailBtns.forEach((btn) => {
          const button = btn.querySelector('button');
          if (btn.dataset.target === targetMediaId) {
            button.classList.add('is-active');
            button.setAttribute('aria-current', true);
          } else {
            button.classList.remove('is-active');
            button.removeAttribute('aria-current');
          }
        });

        // Use the existing setActiveMedia method for proper functionality
        this.setActiveMedia(targetMediaId, false);
      }

      /**
       * Update the active state of slider dots
       * Toggles 'is-active' class on dots based on the current slide index
       *
       * @memberof MediaGallery
       * @param {number} slideIndex - The index of the currently active slide
       * @returns {void}
       */
      updateDots(slideIndex) {
        if (!this.mediaSliderDotsContainer) return;
        const dots = this.mediaSliderDotsContainer.querySelectorAll('.media-slider-dot');
        dots.forEach((dot, index) => {
          dot.classList.toggle('is-active', index === slideIndex);
        });
      }

      /**
       * Handle slide change events from the media slider
       * Updates the active thumbnail when slide changes
       *
       * @memberof MediaGallery
       * @param {Event} event - The slideChanged event with detail containing current element
       * @param {Object} event.detail - Event detail object
       * @param {HTMLElement} event.detail.currentElement - The currently active slide element
       * @returns {void}
       */
      onSlideChanged(event) {
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }

      /**
       * Set the active media item in the gallery
       * Updates active states, handles DOM reordering, scrolling, and media playback
       *
       * @memberof MediaGallery
       * @param {string} mediaId - The ID of the media item to activate
       * @param {boolean} prepend - Whether to move the active media to the beginning of the container
       * @returns {void}
       */
      setActiveMedia(mediaId, prepend) {
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');
        if (!activeMedia) {
          return;
        }
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia?.classList?.add('is-active');

        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia);

          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.firstChild !== activeThumbnail &&
              activeThumbnail.parentElement.prepend(activeThumbnail);
          }

          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          // Don't scroll if the image is already in view
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        this.playActiveMedia(activeMedia);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);

        const activeMediaItem = this.querySelector('.product__media-item.is-active');
        const mediaItems = Array.from(this.querySelectorAll('.product__media-item'));
        let currentIndex = mediaItems.indexOf(activeMediaItem);
        this.updateDots(currentIndex);
      }

      /**
       * Set the active thumbnail and handle thumbnail navigation
       * Updates aria-current attributes and scrolls thumbnail container if needed
       *
       * @memberof MediaGallery
       * @param {HTMLElement} thumbnail - The thumbnail element to activate
       * @returns {void}
       */
      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      /**
       * Announce media availability to screen readers
       * Updates live region with accessibility information when image loads
       *
       * @memberof MediaGallery
       * @param {HTMLElement} activeItem - The currently active media item
       * @param {string} position - The position/index of the media item for announcement
       * @returns {void}
       */
      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      /**
       * Play the active media content (videos, etc.)
       * Pauses all other media and loads deferred content for the active item
       *
       * @memberof MediaGallery
       * @param {HTMLElement} activeItem - The media item to play
       * @returns {void}
       */
      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      /**
       * Prevent sticky header from revealing during media gallery interactions
       * Dispatches event to keep sticky header hidden during scrolling
       *
       * @memberof MediaGallery
       * @returns {void}
       */
      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      /**
       * Remove list semantic roles for accessibility when in thumbnail layout
       * Changes slider to presentation role to prevent screen readers from announcing list items
       *
       * @memberof MediaGallery
       * @returns {void}
       */
      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}
