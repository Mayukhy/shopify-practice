/**
 * VariantSubcriptions Custom Element
 *
 * Handles subscription product variant selection and pricing updates.
 * Manages single and double subscription options with dynamic price calculation.
 *
 * @extends HTMLElement
 */
class VariantSubcriptions extends HTMLElement {
  /**
   * Initialize the VariantSubcriptions custom element
   *
   * @constructor
   */
  constructor() {
    super();
    this.subscriptionOptions = this.querySelectorAll('.subscription-radio:checked');
    this.subscriptionTitle = this.querySelector('.subscription-title');
    this.flavorOptions = this.querySelector('.flavor-options');
    this.accordions = this.querySelectorAll('.subscription-accordion');
    this.selectedSubscriptionType = 'single';
    this.subscribedvariants = []; // array of selected product variants
  }

  /**
   * Called when the element is connected to the DOM
   * Sets up event listeners and initializes subscription state
   *
   * @memberof VariantSubcriptions
   * @returns {void}
   */
  connectedCallback() {
    this.addEventListener('change', this.onSubscriptionContainerChange.bind(this));
    this.addEventListener('change', this.changeSelectedSubscriptionVariants.bind(this));
    this.handleSingleSubscriptionChange();
    this.handleDoubleSubscriptionChange();
    this.initializeSubscriptionType();

    this.addEventListener('change', (event) => {
      const mediaGallery = document.querySelector('media-gallery');
      if (!mediaGallery) return;
      mediaGallery.onChangeMediaByVariants(event);
    });
  }

  /**
   * Initialize subscription type attribute on product form
   * Sets data-subscription-type attribute for form processing
   *
   * @memberof VariantSubcriptions
   * @returns {void}
   */
  initializeSubscriptionType() {
    const productForm = document.querySelector('.product__info-wrapper product-form');
    productForm.setAttribute('data-subscription-type', this.selectedSubscriptionType);
  }
  /**
   * Handle subscription type changes (single/double)
   * Updates accordion states, clears variant selections, and triggers price updates
   *
   * @memberof VariantSubcriptions
   * @param {Event} event - The change event from subscription radio buttons
   * @returns {void}
   */
  onSubscriptionContainerChange(event) {
    const productForm = document.querySelector('.product__info-wrapper product-form');
    if (event.target.classList.contains('subscription-radio')) {
      const selectedOption = event.target.value;
      this.accordions.forEach((a) => {
        a.querySelector("input[name='subscription-type']").value !== selectedOption
          ? a.removeAttribute('open')
          : a.setAttribute('open', 'true');
      });
      this.subscribedvariants = [];
      this.selectedSubscriptionType = selectedOption;
      productForm.setAttribute('data-subscription-type', this.selectedSubscriptionType);
      if (this.selectedSubscriptionType === 'single') {
        this.handleSingleSubscriptionChange();
      } else this.handleDoubleSubscriptionChange();
    }
  }

  /**
   * Handle variant selection changes for different subscription types
   * Clears previous selections and updates price displays
   *
   * @memberof VariantSubcriptions
   * @param {Event} event - The change event from flavor selection inputs
   * @returns {void}
   */
  changeSelectedSubscriptionVariants(event) {
    if (this.selectedSubscriptionType === 'single') {
      if (event.target.name === 'single-flavor') {
        console.log('single flavor changed');
        // Clear previous selections before adding new one
        this.subscribedvariants = [];
        this.handleSingleSubscriptionChange();
      }
    } else if (event.target.name === 'double-flavor1' || event.target.name === 'double-flavor2') {
      // Clear previous selections before adding new ones
      this.subscribedvariants = [];
      this.handleDoubleSubscriptionChange();
    }
  }

  /**
   * Handle single subscription variant selection
   * Updates variant ID input and calculates pricing for single flavor selection
   *
   * @memberof VariantSubcriptions
   * @returns {void}
   */
  handleSingleSubscriptionChange() {
    // Get the single selected flavor
    this.querySelectorAll('input[name^="single-"]:checked').forEach((el) => {
      this.variantIdInput.value = JSON.parse(el.value).id;
      this.changeCurrentPrice({
        selector: '.subscription-option[data-subscription="single"] .current-price',
        compareAtSelector: '.subscription-option[data-subscription="single"] .original-price',
        variantPrice: JSON.parse(el.value).price,
        variantCompareAtPrice: JSON.parse(el.value).compare_at_price,
        priceArr: null,
        compareAtPriceArr: null,
      });
    });
    console.log(this.subscribedvariants);
  }

  /**
   * Handle double subscription variant selection
   * Updates subscribed variants array and calculates combined pricing for two flavors
   *
   * @memberof VariantSubcriptions
   * @returns {void}
   */
  handleDoubleSubscriptionChange() {
    let priceArr = [];
    let compareAtPriceArr = [];
    this.querySelectorAll('input[name^="double-"]:checked').forEach((el) => {
      this.subscribedvariants.push({
        id: JSON.parse(el.value).id,
        quantity: 1,
      });
      priceArr.push(JSON.parse(el.value).price);
      compareAtPriceArr.push(JSON.parse(el.value).compare_at_price);
    });
    this.changeCurrentPrice({
      selector: '.subscription-option[data-subscription="double"] .current-price',
      compareAtSelector: '.subscription-option[data-subscription="double"] .original-price',
      variantPrice: null,
      variantCompareAtPrice: null,
      priceArr: priceArr,
      compareAtPriceArr: compareAtPriceArr,
    });
    console.log(this.subscribedvariants);
  }

  /**
   * Update current price displays based on variant selection
   * Handles both single variant pricing and multiple variant price summation
   *
   * @memberof VariantSubcriptions
   * @param {Object} priceOptions - Configuration object for price updates
   * @param {string} priceOptions.selector - CSS selector for the current price element
   * @param {string} priceOptions.compareAtSelector - CSS selector for the compare-at price element
   * @param {number|null} priceOptions.variantPrice - Price of a single variant (in cents)
   * @param {number|null} priceOptions.variantCompareAtPrice - Compare-at price of a single variant (in cents)
   * @param {Array<number>|null} priceOptions.priceArr - Array of prices for multiple variants (in cents)
   * @param {Array<number>|null} priceOptions.compareAtPriceArr - Array of compare-at prices for multiple variants (in cents)
   * @returns {void}
   */
  changeCurrentPrice(priceOptions) {
    const { selector, compareAtSelector, variantPrice, variantCompareAtPrice, priceArr, compareAtPriceArr } =
      priceOptions;

    if (!priceArr && variantPrice !== null) {
      document.querySelector(selector).textContent =
        `${window.currency.symbol}` + Math.floor(variantPrice / 100).toFixed(2);
      if (variantCompareAtPrice && variantCompareAtPrice > variantPrice && compareAtSelector) {
        const comparePriceEl = document.querySelector(compareAtSelector);
        comparePriceEl.classList.remove('hidden');
        comparePriceEl.textContent = `${window.currency.symbol}` + Math.floor(variantCompareAtPrice / 100).toFixed(2);
      }
    } else {
      const priceSum = Math.floor(
        priceArr.reduce((val, initialVal) => {
          return val + initialVal;
        }, 0) / 100
      ).toFixed(2);
      document.querySelector(selector).textContent = `${window.currency.symbol}` + priceSum;
      if (compareAtPriceArr && compareAtPriceArr.length > 0 && compareAtSelector) {
        const compareAtPriceSum = Math.floor(
          compareAtPriceArr.reduce((val, initialVal) => {
            return val + initialVal;
          }, 0) / 100
        ).toFixed(2);
        document.querySelector(compareAtSelector).textContent = `${window.currency.symbol}` + compareAtPriceSum;
      }
    }
  }

  /**
   * Get the variant ID input element from the product form
   *
   * @memberof VariantSubcriptions
   * @returns {HTMLInputElement} The hidden input element containing the selected variant ID
   */
  get variantIdInput() {
    const form = document.querySelector('.product__info-wrapper product-form form');
    return form.querySelector('[name=id]');
  }

  /**
   * Called when the element is disconnected from the DOM
   * Cleans up event listeners to prevent memory leaks
   *
   * @memberof VariantSubcriptions
   * @returns {void}
   */
  disconnectedCallback() {
    this.removeEventListener('change', this.onSubscriptionContainerChange.bind(this));
    this.removeEventListener('change', this.changeSelectedSubscriptionVariants.bind(this));
  }
}

customElements.define('variant-subcriptions', VariantSubcriptions);
