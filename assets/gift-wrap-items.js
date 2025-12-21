/**
 * Gift Wrap Items Custom Element
 *
 * Handles gift wrap selection functionality including:
 * - Checkbox selection management (single selection only)
 * - Dynamic price updates with 5% discount
 * - Product variant switching
 * - Visual price display with original and discounted prices
 *
 * @class GiftWrapItems
 * @extends {HTMLElement}
 *
 * @example
 * <gift-wrap-items
 *   data-main-product-id="123456"
 *   data-main-product-price="2500">
 *   <!-- gift wrap options -->
 * </gift-wrap-items>
 */
class GiftWrapItems extends HTMLElement {
  /**
   * Creates an instance of GiftWrapItems
   * Initializes main product data from dataset attributes
   *
   * @constructor
   */
  constructor() {
    super();
    /** @type {string} Main product variant ID */
    this.mainProductId = this.dataset.mainProductId;
    /** @type {string} Main product price in cents */
    this.mainProductPrice = this.dataset.mainProductPrice;
    /** @type {string} Bundle discount percentage (if any) */
    this.bundleDiscount = this.dataset.bundleDiscount; // Default to 5% if not provided
  }

  /**
   * Called when element is connected to DOM
   * Sets up event listeners and initializes component state
   *
   * @memberof GiftWrapItems
   */
  connectedCallback() {
    // Add change event listener for gift wrap selection
    this.addEventListener('change', this.changeGiftWrap.bind(this));

    // Initialize discount pricing display
    this && this.bundleDiscount && this.initDiscountedPrice();

    // Reset checkboxes after DOM is ready
    this &&
      setTimeout(() => {
        this.initCheckBoxes();
      }, 200);
  }

  /**
   * Called when element is disconnected from DOM
   * Cleans up event listeners to prevent memory leaks
   *
   * @memberof GiftWrapItems
   */
  disconnectedCallback() {
    this.removeEventListener('change', this.changeGiftWrap.bind(this));
  }

  /**
   * Initializes all gift wrap checkboxes to unchecked state
   * Ensures clean initial state on page load
   *
   * @memberof GiftWrapItems
   */
  initCheckBoxes() {
    const checkedInputs = this.querySelectorAll('input[name="gift-wrap"]');
    checkedInputs.forEach((input) => {
      input.checked = false;
    });
  }

  /**
   * Handles gift wrap selection change events
   * Manages single selection behavior and updates pricing
   *
   * @param {Event} event - The change event from checkbox input
   * @param {HTMLInputElement} event.target - The checkbox that was changed
   * @memberof GiftWrapItems
   */
  changeGiftWrap(event) {
    if (event.target.name === 'gift-wrap') {
      const selectedValue = event.target.value;

      // Update the hidden variant ID input for cart operations
      this.variantIdInput.value = selectedValue;

      // Update price display with selected gift wrap
      this.updatePrice(event);

      // Uncheck other gift wrap options (single selection only)
      this.querySelectorAll('input[name="gift-wrap"]').forEach((input) => {
        if (input.value !== selectedValue) {
          input.checked = false;
        }
      });
    }

    // Refresh discount pricing
    this.bundleDiscount && this.initDiscountedPrice();
  }

  /**
   * Initializes discounted price display
   * Gets price elements and triggers price display update
   *
   * @memberof GiftWrapItems
   */
  initDiscountedPrice() {
    const priceItem = document.querySelector('.product__info-wrapper .price__container .price-item--regular');
    const btnPrice = document.querySelector('product-form .price--show-badge');
    this.updatePriceDisplay(priceItem, btnPrice);
  }

  /**
   * Updates price display elements with discount pricing
   * Shows original price crossed out and discounted price
   *
   * @param {HTMLElement} priceItem - Main price display element
   * @param {HTMLElement} btnPrice - Button price display element
   * @memberof GiftWrapItems
   */
  updatePriceDisplay(priceItem, btnPrice) {
    const checkedInputs = this.querySelectorAll('input[name="gift-wrap"]:checked');

    if (checkedInputs.length === 0) {
      // Restore to main product when no gift wrap selected
      this.variantIdInput.value = this.mainProductId;

      const totalPrice = Number(this.mainProductPrice) / 100;
      const discountedPrice = totalPrice * (1 - (this.bundleDiscount / 100)); // Apply bundle discount
      const originalFormattedPrice = this.formatPrice(Number(this.mainProductPrice) / 100);
      const formattedDiscountedPrice = this.formatPrice(discountedPrice);

      // Update main price display with strikethrough and discount
      priceItem.innerHTML = `<span class="price-original" style="text-decoration: line-through; color: #999; margin-right: 8px;">$${originalFormattedPrice} ${window.currency.code}</span><span class="price-discounted" style="color: #e53e3e; font-weight: bold;">$${formattedDiscountedPrice} ${window.currency.code}</span> <span class="discount-badge" style="background: #e53e3e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 4px;">${this.bundleDiscount}% OFF</span>`;

      // Update button price
      btnPrice.innerHTML = `<span>$${formattedDiscountedPrice} ${window.currency.code}</span>`;
    }
  }

  /**
   * Updates price when gift wrap is selected
   * Calculates total with gift wrap price and applies discount
   *
   * @param {Event} event - The change event from gift wrap selection
   * @param {HTMLInputElement} event.target - The selected gift wrap checkbox
   * @param {string} event.target.dataset.price - Price of selected gift wrap
   * @memberof GiftWrapItems
   */
  updatePrice(event) {
    const priceItem = document.querySelector('.product__info-wrapper .price__container .price-item--regular');
    const btnPrice = document.querySelector('product-form .price--show-badge');
    const selectedInput = event.target;
    const selectedPrice = selectedInput.dataset.price;
    const totalPrice = Number(this.mainProductPrice) / 100 + Number(selectedPrice);

    /**
     * Discounts are coming from product metafields
     * Apply {{this.bundleDiscount}}% discount when gift wrap is selected (frontend display only)
     * Real discount will be applied by shopify discounts or discount app
     */
    const discountedPrice = totalPrice * (1 - (this.bundleDiscount / 100)); // Apply bundle discount
    const formattedPrice = this.formatPrice(discountedPrice);
    const originalFormattedPrice = this.formatPrice(totalPrice);

    // Update price display with original and discounted prices
    priceItem.innerHTML = `<span class="price-original" style="text-decoration: line-through; color: #999; margin-right: 8px;">$${originalFormattedPrice} ${window.currency.code}</span><span class="price-discounted" style="color: #e53e3e; font-weight: bold;">$${formattedPrice} ${window.currency.code}</span> <span class="discount-badge" style="background: #e53e3e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 4px;">${this.bundleDiscount}% OFF</span>`;

    // Update button price with discount styling
    btnPrice.innerHTML = `<span style="color: #e53e3e;">$${formattedPrice} ${window.currency.code}</span>`;
  }

  /**
   * Formats price number with proper currency formatting
   * Uses Intl.NumberFormat for consistent number display
   *
   * @param {number} price - Price amount to format
   * @returns {string} Formatted price string with commas and 2 decimal places
   * @example
   * formatPrice(1234.56) // Returns "1,234.56"
   * @memberof GiftWrapItems
   */
  formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  /**
   * Gets the variant ID input element from the product form
   * Used to update the selected variant for cart operations
   *
   * @returns {HTMLInputElement} The hidden input field containing variant ID
   * @memberof GiftWrapItems
   */
  get variantIdInput() {
    const form = document.querySelector('product-form form');
    return form.querySelector('[name=id]');
  }
}
customElements.define('gift-wrap-items', GiftWrapItems);
