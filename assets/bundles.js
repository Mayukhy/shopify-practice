/**
 * Bundle Products Custom Element
 *
 * Handles bundle product selection functionality for both radio and checkbox inputs.
 * Manages card interactions, input states, and bundle data preparation for cart integration.
 *
 * @extends HTMLElement
 *
 * @example
 * <bundle-products data-input-type="checkbox" class="bundle-products-list">
 *   <!-- Bundle product cards -->
 * </bundle-products>
 */
class Bundles extends HTMLElement {
  /**
   * Initialize the Bundles custom element
   *
   * @constructor
   */
  constructor() {
    super();
    /** @type {string} Input type for bundle selection ('radio' or 'checkbox') */
    this.inputType = this.dataset.inputType;
  }
  /**
   * Called when the element is connected to the DOM
   * Sets up event listeners and initializes component state
   *
   * @memberof Bundles
   * @returns {void}
   */
  connectedCallback() {
    this.addCardClickHandlers();
    setTimeout(() => {
      this.initializeBundlesInputs();
    }, 300);
    document.addEventListener('bundle:added', this.initializeBundlesInputs.bind(this));
    this.addEventListener('change', this.changeFormWithBundle.bind(this));
    this.initializeAccordionToggle();
  }
  
    /**
   * Called when the element is disconnected from the DOM
   * Cleans up event listeners and resets component state
   *
   * @memberof Bundles
   * @returns {void}
   */
  disconnectedCallback() {
    this.removeEventListener('change', this.changeFormWithBundle.bind(this));
    document.removeEventListener('bundle:added', this.initializeBundlesInputs.bind(this));
    this.initializeBundlesInputs();
  }

  /**
   * Initialize accordion toggle functionality for caret rotation
   *
   * @memberof Bundles
   * @returns {void}
   */
  initializeAccordionToggle() {
    // Find the details element containing this bundle-products element
    const detailsElement = this.closest('details');
    if (detailsElement) {
      const caretIcon = detailsElement.querySelector('summary svg');

      if (caretIcon) {
        detailsElement.addEventListener('toggle', () => {
          if (detailsElement.open) {
            caretIcon.style.transform = 'rotate(180deg)';
          } else {
            caretIcon.style.transform = 'rotate(0deg)';
          }
        });
      }
    }
  }

  /**
   * Retrieves form data from the main product form
   *
   * @memberof Bundles
   * @returns {FormData} The form data from the product form
   */
  getFormData() {
    const form = document.querySelector('product-info product-form form');
    const formData = new FormData(form);
    return formData;
  }

  /**
   * Initializes all bundle product inputs to unchecked state
   * Called during component setup and cleanup
   *
   * @memberof Bundles
   * @returns {void}
   */
  initializeBundlesInputs() {
    this.querySelectorAll('.bundle-product input').forEach((input) => {
      input.checked = false;
    });
  }

  /**
   * Adds click event handlers to make entire bundle product cards clickable
   * Handles different behavior for radio buttons vs checkboxes
   *
   * @memberof Bundles
   * @returns {void}
   */
  addCardClickHandlers() {
    this.querySelectorAll('.bundle-product').forEach((card) => {
      const input = card.querySelector('.bundle-product__radio');
      if (input) {
        /**
         * Handle card click events
         *
         * @param {Event} e - The click event
         * @returns {void}
         */
        card.addEventListener('click', (e) => {
          if (e.target !== input) {
            if (this.inputType === 'radio') {
              this.querySelectorAll('.bundle-product__radio[type="radio"]').forEach((radio) => {
                radio.checked = false;
              });
              input.checked = true;
            } else {
              input.checked = !input.checked;
            }
            // Trigger change event to update bundle data
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        card.style.cursor = 'pointer';
      }
    });
  }

  /**
   * Handles bundle product selection changes and prepares cart data
   * Creates nested product arrays for single (radio) or multiple (checkbox) selection
   *
   * @memberof Bundles
   * @param {Event} event - The change event from input selection
   * @returns {void}
   */
  changeFormWithBundle(event) {
    if (event.target.name === 'bundle_product') {
      if (this.inputType === 'radio') {
        /** @type {Array<Object>} Bundle products array for radio selection */
        const nestedProducts = [
          // Add your nested product IDs here
          {
            /** @type {string} Main product variant ID */
            id: this.mainProductVariantId.value,
            /** @type {number} Product quantity */
            quantity: 1,
          },
          {
            id: event.target.value,
            quantity: 1,
            parent_id: this.mainProductVariantId.value,
          },
        ];
        // Store bundle data globally for access in product-form
        window.bundleProductsData = nestedProducts;
      } else {
        /** @type {Array<Object>} Bundle products array for checkbox selection */
        const nestedProducts = [
          {
            id: this.mainProductVariantId.value,
            quantity: 1,
          },
        ];
        // Handle checkbox logic if needed
        this.querySelectorAll('.bundle-product__radio[type="checkbox"]:checked').forEach((checkbox) => {
          nestedProducts.push({
            id: checkbox.value,
            quantity: 1,
            parent_id: this.mainProductVariantId.value,
          });
          window.bundleProductsData = nestedProducts;
        });
      }
    }
  }

  /**
   * Gets the main product variant ID from the product form
   *
   * @memberof Bundles
   * @returns {HTMLInputElement} The main product variant ID input element
   */
  get mainProductVariantId() {
    const form = document.querySelector('product-info product-form form');
    return form.querySelector('[name=id]');
  }
}

/**
 * Register the custom element with the browser
 * Enables <bundle-products> tag usage in HTML
 */
customElements.define('bundle-products', Bundles);
