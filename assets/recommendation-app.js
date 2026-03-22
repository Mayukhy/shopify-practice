/**
 * RecommendationApp - A custom HTML element that tracks user events for product recommendations.
 * Captures product views, page views, and add-to-cart actions, sending them to a recommendation API.
 * @extends HTMLElement
 */
class RecommendationApp extends HTMLElement {
  /** @static @type {string} API endpoint for event tracking */
  static API_URL = 'https://sci-flux-weekends-tasks.trycloudflare.com/api/event';

  /** @static @type {string} Current Shopify store domain */
  static STORE_DOMAIN = Shopify.shop;

  constructor() {
    super();
    this.recommendationsData = {};
    this.sliderContainer = this.querySelector('slider-component');
    this.sectionId = this.dataset.sectionId;
    this.eventType = this.dataset.eventType || 'PAGE_VIEW';
  }

  /**
   * Lifecycle hook called when element is inserted into the DOM.
   * Initializes event tracking for product views, add-to-cart, and page views.
   */
  connectedCallback() {
    this.getSessionId();

    /*
   PRODUCT VIEW
  */
    if (window.meta && window.meta.product) {
      this.sendEvent('PRODUCT_VIEW', window.meta.product.id.toString(), {
        title: window.meta.product?.title,
        vendor: window.meta.product.vendor,
      });
    }

    /*
   ADD TO CART
  */
    document.addEventListener('cart:response', this.handleAddToCart.bind(this) )

    /*
   PAGE VIEW
  */
    this.sendEvent('PAGE_VIEW', null, {
      url: window.location.href,
      referrer: document.referrer,
    });

    this.fetchRecommendations();
  }

  /**
   * Lifecycle hook called when element is removed from the DOM.
   */
  disconnectedCallback() {}

  /**
   * Retrieves or generates a unique session ID stored in localStorage.
   * @returns {string} The session ID (UUID)
   */
  getSessionId() {
    let sessionId = localStorage.getItem('ps_session_id');

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('ps_session_id', sessionId);
    }

    return sessionId;
  }

  /**
   * Sends an event to the recommendation API.
   * @param {string} type - Event type (e.g., 'PRODUCT_VIEW', 'ADD_TO_CART', 'PAGE_VIEW')
   * @param {string|null} [productId=null] - Optional product ID associated with the event
   * @param {Object} [metadata={}] - Additional event metadata
   */
  async sendEvent(type, productId = null, metadata = {}) {
    if (!this.eventType || this.eventType !== type) {
      return;
    }
    const payload = {
      storeDomain: RecommendationApp.STORE_DOMAIN,
      storeUserId: this.getSessionId(),
      productId,
      type,
      metadata,
      timestamp: new Date().toISOString(),
      limit: 10,
    };
    try {
      await fetch(`${RecommendationApp.API_URL}/create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      console.error('Event send failed', error);
    } finally {
      this.renderProducts();
    }
  }

  async fetchRecommendations() {
    const apiSubEndPoints = {
      ADD_TO_CART: '/get-cart-recommendations',
      PAGE_VIEW: '/',
      PRODUCT_VIEW: ['/get-most-viewed-recommendations', '/get-related-recommendations'],
    };

    const currentSubEndPoint =
      this.eventType === 'PRODUCT_VIEW'
        ? window.meta.product
          ? apiSubEndPoints[this.eventType][1]
          : apiSubEndPoints[this.eventType][0]
        : this.eventType === 'ADD_TO_CART'
          ? apiSubEndPoints[this.eventType]
          : apiSubEndPoints['PAGE_VIEW'];
    const payload = {
      storeDomain: RecommendationApp.STORE_DOMAIN,
      storeUserId: this.getSessionId(),
      ...(window.meta.product && { productId: window.meta.product.id.toString() }),
      limit: 10,
    };

    const { storeDomain, storeUserId, limit } = payload;
    let productIdParams = payload.productId ? `&productId=${payload.productId}` : '';
    let cartItemVariants = "";
    if (this.eventType === 'ADD_TO_CART') {
      const cartData = await fetch('/cart.js');
      const res = await cartData.json();
      console.log("res", res);
      
      const itmIds = res.items.map((item) => item.id.toString());
      console.log("itms", itmIds);
      productIdParams = this.eventType === 'ADD_TO_CART' ? `&productId=${window.lastCartResponse?.productId || res.items[0].product_id}` : productIdParams;
      cartItemVariants = itmIds.length > 0 ? `&cartItemVariants=${itmIds.join(',')}` : '';
    }
    try {
      const res = await fetch(
        `${RecommendationApp.API_URL}${currentSubEndPoint}?storeDomain=${storeDomain}&storeUserId=${storeUserId}&limit=${limit}${productIdParams}${cartItemVariants}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      const { data } = await res.json();
      this.recommendationsData = data;
    } catch (error) {
      console.error('Event send failed', error);
    } finally {
      this.renderProducts();
    }
  }

  /**
   * Handles click events to detect add-to-cart button clicks.
   * @param {Event} event - The click event object
   */
  async handleAddToCart(event) {
    const productId = event.detail;
    if (productId) {
      await this.sendEvent('ADD_TO_CART',productId);
    }
  }

  /**
   * Renders recommended products to the DOM based on recommendations data.
   * Creates product cards with image, title, vendor, price, and add-to-cart functionality.
   * Also handles slider navigation buttons visibility and counter updates.
   * @returns {void}
   */
  renderProducts() {
    if (!this.recommendationsData?.recommendations) return;

    // Clear the entire slider container
    this.sliderContainer.innerHTML = '';

    // Create the main UL container
    const mainUl = document.createElement('ul');
    mainUl.classList.add(
      'grid',
      'product-grid',
      'contains-card',
      'contains-card--product',
      'grid--3-col-desktop',
      'grid--2-col-tablet-down',
      'slider',
      'slider--desktop',
      'slider--tablet',
      'grid--peek',
      'recommendation-app__ul',
    );
    mainUl.setAttribute('id', `Slider-${this.sectionId}`);
    mainUl.setAttribute('role', 'list');
    mainUl.setAttribute('aria-label', 'Recommended products');

    // Generate product list items
    this.recommendationsData.recommendations.forEach((r, index) => {
      const li = document.createElement('li');
      li.classList.add('grid__item', 'slider__slide', 'scroll-trigger', 'animate--slide-in');
      li.setAttribute('id', `Slide-${this.sectionId}-${index + 1}`);
      li.setAttribute('data-cascade', '');
      li.style.setProperty('--animation-order', index + 1);
      li.innerHTML = `
          <div class="card-wrapper product-card-wrapper underline-links-hover">
    <div class="
        card card--standard
         card--media
        
        
        
        
        
      " style="--ratio-percent: 100.0%;">
      <div class="card__inner color-scheme-2 gradient ratio" style="--ratio-percent: 100.0%;"><div class="card__media">
            <div class="media media--transparent media--hover-effect">
              
              <img srcset="${r.product?.image || r?.image}?width=165 165w,${r.product?.image || r?.image}?width=360 360w,${r.product?.image || r?.image}?width=533 533w,${r.product?.image || r?.image}?width=720 720w,${r.product?.image || r?.image}?width=940 940w,${r.product?.image || r?.image}?width=1066 1066w,${r.product?.image || r?.image} 1600w
                " src="${r.product?.image}?width=533" sizes="(min-width: 1200px) 267px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)" alt="${r.product?.title || r?.title}" class="motion-reduce" loading="lazy" width="1600" height="1600">
              
</div>
          </div><div class="card__content">
          <div class="card__information">
            <h3 class="card__heading">
              <a href="/products/${r.product?.handle || r?.handle}" id="StandardCardNoMediaLink-${this.sectionId}-${r.product?.id || r.id}" class="full-unstyled-link" aria-labelledby="StandardCardNoMediaLink-${this.sectionId}-${r.product?.id || r.id} NoMediaStandardBadge-${this.sectionId}-${r.product?.id || r.id}">
                ${r.product?.title || r?.title}
              </a>
            </h3>
          </div>
          <div class="card__badge bottom left"></div>
        </div>
      </div>
      <div class="card__content">
        <div class="card__information">
          <h3 class="card__heading h5" id="title-${this.sectionId}-${r.product?.id || r.id}">
            <a href="/products/${r.product?.handle || r?.handle}" id="CardLink-${this.sectionId}-${r.product?.id || r.id}" class="full-unstyled-link" aria-labelledby="CardLink-${this.sectionId}-${r.product?.id || r.id} Badge-${this.sectionId}-${r.product?.id || r.id}">
              ${r.product?.title || r?.title}
            </a>
          </h3>
          <div class="card-information">
            ${r.product?.vendor ? `<div class="caption-with-letter-spacing light">${r.product?.vendor}</div>` : ''}
            <span class="caption-large light"></span>
<div class="
      price ">
    <div class="price__container"><div class="price__regular"><span class="visually-hidden visually-hidden--inline">Regular price</span>
          <span class="price-item price-item--regular">
            $${r.product?.price || r?.price || 0}
          </span></div>
      <div class="price__sale">
          <span class="visually-hidden visually-hidden--inline">Regular price</span>
          <span>
            <s class="price-item price-item--regular">
              
                
              
            </s>
          </span><span class="visually-hidden visually-hidden--inline">Sale price</span>
        <span class="price-item price-item--sale price-item--last">
          $${r.product?.price || r?.price || 0}
        </span>
      </div></div></div>


</div>
        </div>
        
        
        <div class="card__badge bottom left"></div>
      </div>
    </div>
  </div>
        `;
      mainUl.appendChild(li);
    });

    // Create slider buttons
    const sliderButtons = document.createElement('div');
    sliderButtons.classList.add('slider-buttons');
    // sliderButtons.style.display = this.recommendationsData.recommendations.length > 3 ? 'flex' : 'none';

    sliderButtons.innerHTML = `
      <button
        type="button"
        class="slider-button slider-button--prev"
        name="previous"
        aria-label="Previous slide"
        aria-controls="Slider-${this.sectionId}"
      >
        <span class="svg-wrapper">
<svg class="icon icon-caret" viewBox="0 0 10 6"><path fill="currentColor" fill-rule="evenodd" d="M9.354.646a.5.5 0 0 0-.708 0L5 4.293 1.354.646a.5.5 0 0 0-.708.708l4 4a.5.5 0 0 0 .708 0l4-4a.5.5 0 0 0 0-.708" clip-rule="evenodd"/></svg>

        </span>
      </button>
      <div class="slider-counter caption">
        <span class="slider-counter--current">1</span>
        <span aria-hidden="true"> / </span>
        <span class="visually-hidden">of</span>
        <span class="slider-counter--total">${this.recommendationsData.recommendations.length}</span>
      </div>
      <button
        type="button"
        class="slider-button slider-button--next"
        name="next"
        aria-label="Next slide"
        aria-controls="Slider-${this.sectionId}"
      >
        <span class="svg-wrapper">
<svg class="icon icon-caret" viewBox="0 0 10 6"><path fill="currentColor" fill-rule="evenodd" d="M9.354.646a.5.5 0 0 0-.708 0L5 4.293 1.354.646a.5.5 0 0 0-.708.708l4 4a.5.5 0 0 0 .708 0l4-4a.5.5 0 0 0 0-.708" clip-rule="evenodd"/></svg>
        </span>
      </button>
    `;

    // Append the UL and slider buttons to the container
    this.sliderContainer.appendChild(mainUl);
    this.sliderContainer.appendChild(sliderButtons);

    // Manually initialize slider functionality
    this.initializeSlider();
  }

  initializeSlider() {
    const sliderContainer = this.sliderContainer;
    const slider = sliderContainer.querySelector('[id^="Slider-"]');
    const sliderItems = sliderContainer.querySelectorAll('[id^="Slide-"]');
    const prevButton = sliderContainer.querySelector('button[name="previous"]');
    const nextButton = sliderContainer.querySelector('button[name="next"]');
    const currentPageElement = sliderContainer.querySelector('.slider-counter--current');
    const pageTotalElement = sliderContainer.querySelector('.slider-counter--total');

    if (!slider || !nextButton || sliderItems.length === 0) {
      console.log('Missing slider elements');
      return;
    }

    // Initialize slider state
    let currentPage = 1;
    let sliderItemOffset = 0;
    let slidesPerPage = 1;
    let totalPages = 1;

    const initPages = () => {
      const sliderItemsToShow = Array.from(sliderItems).filter((element) => element.clientWidth > 0);
      if (sliderItemsToShow.length < 2) return;

      sliderItemOffset = sliderItemsToShow[1].offsetLeft - sliderItemsToShow[0].offsetLeft;
      slidesPerPage = Math.floor((slider.clientWidth - sliderItemsToShow[0].offsetLeft) / sliderItemOffset);
      totalPages = sliderItemsToShow.length - slidesPerPage + 1;
      updateSlider();
    };

    const updateSlider = () => {
      const previousPage = currentPage;
      currentPage = Math.round(slider.scrollLeft / sliderItemOffset) + 1;

      if (currentPageElement && pageTotalElement) {
        currentPageElement.textContent = currentPage;
        pageTotalElement.textContent = totalPages;
      }

      // Update button states
      if (slider.scrollLeft === 0) {
        prevButton.setAttribute('disabled', 'disabled');
      } else {
        prevButton.removeAttribute('disabled');
      }

      const sliderItemsToShow = Array.from(sliderItems).filter((element) => element.clientWidth > 0);
      if (sliderItemsToShow.length > 0) {
        const lastItem = sliderItemsToShow[sliderItemsToShow.length - 1];
        const isLastVisible = lastItem.offsetLeft + lastItem.clientWidth <= slider.clientWidth + slider.scrollLeft;

        if (isLastVisible) {
          nextButton.setAttribute('disabled', 'disabled');
        } else {
          nextButton.removeAttribute('disabled');
        }
      }
    };

    const onButtonClick = (event) => {
      event.preventDefault();
      const step = 1;
      const slideScrollPosition =
        event.currentTarget.name === 'next'
          ? slider.scrollLeft + step * sliderItemOffset
          : slider.scrollLeft - step * sliderItemOffset;

      slider.scrollTo({
        left: slideScrollPosition,
      });
    };

    // Remove existing listeners (if any)
    prevButton.removeEventListener('click', onButtonClick);
    nextButton.removeEventListener('click', onButtonClick);
    slider.removeEventListener('scroll', updateSlider);

    // Add event listeners
    prevButton.addEventListener('click', onButtonClick);
    nextButton.addEventListener('click', onButtonClick);
    slider.addEventListener('scroll', updateSlider);

    // Initialize on DOM ready
    setTimeout(() => {
      initPages();
    }, 100);
  }
}

customElements.define('recommendation-app', RecommendationApp);
