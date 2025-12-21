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
    /** @type {Array<Object>} Array to hold selected bundle products */
    this.nestedProducts = [];
  }
  /**
   * Called when the element is connected to the DOM
   * Sets up event listeners and initializes component state
   *
   * @memberof Bundles
   * @returns {void}
   */
  connectedCallback() {
    // this.addCardClickHandlers();
    setTimeout(() => {
      this.nestedProducts = [
        {
          id: this.mainProductVariantId.value,
          quantity: Number(this.mainProductQuantity.value),
        },
      ];
      this.handleQuantityInputsVisibility();
      this.initializeBundlesInputs();
    }, 300);
    this.initializeAccordionToggle();
    document.addEventListener('bundle:added', this.initializeBundlesInputs.bind(this));
    document.addEventListener('bundle:quantity-changed', this.changeBundleProductQuantity.bind(this));
    document.addEventListener('change:mainProductVariant', this.updateBundleMainProduct.bind(this));
    this.addEventListener('change', this.changeFormWithBundle.bind(this));
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
   * Updates the main product variant ID in the bundle products data
   *
   * @memberof Bundles
   * @returns {void}
   */
  updateBundleMainProduct() {
    if (this.nestedProducts.length > 0) {
      this.nestedProducts[0].id = this.mainProductVariantId.value;
    }
    this.nestedProducts.map((product) =>
      product.parent_id ? (product.parent_id = this.mainProductVariantId.value) : product
    );
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
    this.resetBundleQuantityInputs();
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
    if (event.target.classList.contains('quantity__input')) {
      event.stopPropagation();
    }

    if (event.target.name === 'bundle_product') {
      if (this.inputType === 'radio') {
        /** @type {Array<Object>} Bundle products array for radio selection */
        this.nestedProducts = [
          // Add your nested product IDs here
          {
            id: this.mainProductVariantId.value,
            quantity: Number(this.mainProductQuantity.value),
          },
          {
            id: event.target.value,
            quantity: this.fetchCurrentProductQuantity(event.target.value),
            parent_id: this.mainProductVariantId.value,
          },
        ];
        // Store bundle data globally for access in product-form
        window.bundleProductsData = this.nestedProducts;
      } else {
        /** @type {Array<Object>} Bundle products array for checkbox selection */
        this.nestedProducts = [
          {
            id: this.mainProductVariantId.value,
            quantity: Number(this.mainProductQuantity.value),
          },
        ];
        // Handle checkbox logic if needed
        this.querySelectorAll('.bundle-product__radio[type="checkbox"]:checked').forEach((checkbox) => {
          this.nestedProducts.push({
            id: checkbox.value,
            quantity: this.fetchCurrentProductQuantity(checkbox.value),
            parent_id: this.mainProductVariantId.value,
          });
        });
        window.bundleProductsData = this.nestedProducts;
      }
    }
    this.handleQuantityInputsVisibility();
  }

  /**
   * Handles bundle product quantity changes from custom events
   * Updates the quantity of products in the nestedProducts array
   *
   * @memberof Bundles
   * @param {CustomEvent} event - The custom event containing quantity change details
   * @returns {void}
   */
  changeBundleProductQuantity(event) {
    event = event.detail;
    this.nestedProducts = this.nestedProducts.map((product) => {
      if (product.id === event.variantId) {
        return { ...product, quantity: event.quantity };
      }
      else if (!product.parent_id && product.id === this.mainProductVariantId.value) {
        return { ...product, quantity: Number(this.mainProductQuantity.value) };
      }
      else {
        return { ...product };
      }
    });
    window.bundleProductsData = this.nestedProducts;
  }

  /**
   * Controls the visibility and enabled state of quantity inputs based on bundle selection
   * Enables quantity inputs only for selected bundle products
   *
   * @memberof Bundles
   * @returns {void}
   */
  handleQuantityInputsVisibility() {
    const disabledClass = 'bundle-quantity--disabled';
    const enabledClass = 'bundle-quantity--enabled';
    this.querySelectorAll('.bundle-quantity').forEach((quantityInput) => {
      const input = quantityInput.querySelector('input[type="number"].quantity__input');
      const minusButton = quantityInput.querySelector('button[name="minus"]');
      const plusButton = quantityInput.querySelector('button[name="plus"]');
      // Check if this input's variant is in the selected products
      const isSelected = this.nestedProducts.some((product) => product.id == input.dataset.quantityVariantId);

      input.disabled = !isSelected;
      minusButton.disabled = !isSelected;
      plusButton.disabled = !isSelected;
      if (isSelected) {
        quantityInput.classList.add(enabledClass);
        quantityInput.classList.remove(disabledClass);
        minusButton.classList.remove(disabledClass);
        plusButton.classList.remove(disabledClass);
      } else {
        quantityInput.classList.add(disabledClass);
        quantityInput.classList.remove(enabledClass);
        minusButton.classList.add(disabledClass);
        plusButton.classList.add(disabledClass);
      }
    });
  }

  /**
   * Fetches the current quantity value for a specific product variant
   *
   * @memberof Bundles
   * @param {string} variantId - The variant ID to fetch quantity for
   * @returns {number} The current quantity value
   */
  fetchCurrentProductQuantity(variantId) {
    const input = this.querySelector(`input[type="number"]#Quantity-${variantId}`);
    return Number(input.value);
  }

  /**
   * Resets all bundle quantity inputs to their minimum values
   * Reinitializes the nestedProducts array with only the main product
   *
   * @memberof Bundles
   * @returns {void}
   */
  resetBundleQuantityInputs() {
    this.querySelectorAll('.bundle-quantity').forEach((quantityInput) => {
      const input = quantityInput.querySelector('input[type="number"].quantity__input');
      const minQuantity = parseInt(input.dataset.min) || 1;
      input.value = minQuantity;
    });

    this.nestedProducts = [
      {
        id: this.mainProductVariantId.value,
        quantity: Number(this.mainProductQuantity.value),
      },
    ];
    this.handleQuantityInputsVisibility();
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

  /**
   * Gets the main product quantity input element from the product form
   *
   * @memberof Bundles
   * @returns {HTMLInputElement} The main product quantity input element
   */
  get mainProductQuantity() {
    const quantityIpContainer = document.querySelector('product-info .price-per-item__container quantity-input');
    return quantityIpContainer.querySelector('.quantity__input[name=quantity]');
  }
}

/**
 * Register the custom element with the browser
 * Enables <bundle-products> tag usage in HTML
 */
customElements.define('bundle-products', Bundles);
