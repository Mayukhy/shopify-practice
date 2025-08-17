class CustomQuickAddModal extends HTMLElement {
  constructor() {
    super();

    // Store bound methods for proper event cleanup
    this.boundCloseModal = this.closeModal.bind(this);
    this.boundCloseDropdown = this.closeDropdown.bind(this);
    this.boundShowVariantSelect = this.showVariantSelect.bind(this);
    this.boundHandleVariantChange = this.handleVariantChange.bind(this);

    // Parse product variants data attribute
    this.productVariants = this.parseProductVariants();
    this.selectedOptions = [];
    this.currentVariant = null;

    // Elements will be initialized in connectedCallback when DOM is ready
  }

  parseProductVariants() {
    try {
      const variantsAttr = this.getAttribute('data-variants');
      return variantsAttr && variantsAttr !== '' ? JSON.parse(variantsAttr) : null;
    } catch (error) {
      console.error('Error parsing variants JSON:', error);
      return null;
    }
  }

  connectedCallback() {
    // Initialize DOM elements
    this.initializeElements();

    // Set up event listeners
    this.setupEventListeners();

    // Initialize variant selections
    this.initVariantListeners();
  }

  disconnectedCallback() {
    // Clean up event listeners
    this.removeEventListeners();
  }

  initializeElements() {
    this.modalCloseButton = this.querySelector('.custom-quick-add-modal__close');
    this.modalContent = this.querySelector('.custom-quick-add-modal__content-info');
    this.variantOpener = this.querySelector('.select-dropdown__variant');
    this.selectVariantsContainer = this.querySelector('.select-dropdown__variant-options');
    this.variantLabel = this.querySelector('.select-dropdown__variant-label');
    this.modalOverlay = document.querySelector('.custom-quick-add-modal__overlay');
  }

  setupEventListeners() {
    // Modal close button
    if (this.modalCloseButton) {
      this.modalCloseButton.addEventListener('click', this.boundCloseModal);
    }

    // Variant select container - stop propagation and hide when clicked
    if (this.selectVariantsContainer) {
      this.selectVariantsContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectVariantsContainer.style.display = 'none';
      });
    }

    // Modal overlay
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', this.boundCloseModal);
    }

    // Variant opener
    if (this.variantOpener) {
      this.variantOpener.addEventListener('click', (e) => {
        e.stopPropagation();
        this.boundShowVariantSelect();
      });
    }

    // Global click listener for dropdown closing
    document.addEventListener('click', this.boundCloseDropdown);

    // Change listener for variant inputs
    this.addEventListener('change', this.boundHandleVariantChange);
  }

  removeEventListeners() {
    if (this.modalCloseButton) {
      this.modalCloseButton.removeEventListener('click', this.boundCloseModal);
    }

    if (this.modalOverlay) {
      this.modalOverlay.removeEventListener('click', this.boundCloseModal);
    }

    if (this.selectVariantsContainer) {
      this.selectVariantsContainer.removeEventListener('click', this.boundCloseDropdown);
    }

    if (this.variantOpener) {
      this.variantOpener.removeEventListener('click', this.boundShowVariantSelect);
    }

    document.removeEventListener('click', this.boundCloseDropdown);
    this.removeEventListener('change', this.boundHandleVariantChange);
  }

  handleVariantChange(event) {
    if (event.target.name && event.target.name.startsWith('option-')) {
      this.updateSelectedVariants();

      // Update dropdown label if it exists
      if (this.variantLabel && this.selectedOptions.length > 0) {
        this.variantLabel.textContent = this.selectedOptions[0];
      }
    }
  }

  openModal(button) {
    this.fetchProductDetails(button);
  }

  showVariantSelect() {
    if (this.selectVariantsContainer) {
      this.selectVariantsContainer.style.display = 'flex';
    }
  }

  closeDropdown(e) {
    if (!this.variantOpener || !this.selectVariantsContainer) return;

    if (!this.variantOpener.contains(e.target)) {
      this.selectVariantsContainer.style.display = 'none';
    }
  }

  fetchProductDetails(button) {
    if (!button) return;

    // Disable button during fetch
    this.setButtonLoading(button, true);

    fetch(button.getAttribute('data-product-url'))
      .then((response) => response.text())
      .finally(() => {
        this.moveModalToContainer();
        this.showModal();
        this.setButtonLoading(button, false);
      });
  }

  setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.setAttribute('aria-disabled', true);
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.removeAttribute('aria-disabled');
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  moveModalToContainer() {
    const container = document.querySelector('.custom-featured-products');
    if (container && this.parentNode) {
      this.parentNode.removeChild(this);
      container.appendChild(this);
    }
  }

  showModal() {
    this.classList.add('is-open');
    document.body.classList.add('overflow-hidden');

    if (this.modalOverlay) {
      this.modalOverlay.classList.add('is-open');
    }
  }

  closeModal() {
    this.classList.remove('is-open');

    if (this.modalOverlay) {
      this.modalOverlay.classList.remove('is-open');
    }

    document.body.classList.remove('overflow-hidden');
  }

  updateSelectedVariants() {
    // Clear previous selections
    this.selectedOptions = [];

    // Get all checked radio buttons
    this.querySelectorAll('input[name^="option-"]:checked').forEach((radio) => {
      this.selectedOptions.push(radio.value);
    });

    // Find matching variant and update UI
    this.findMatchingVariant(this.selectedOptions);
    this.updateVariantUI();
  }

  findMatchingVariant(selectedOptions) {
    if (!this.productVariants) return;

    this.currentVariant = this.productVariants.find((variant) => {
      if (!variant.options || variant.options.length !== selectedOptions.length) return false;
      return variant.options.every((option, index) => option === selectedOptions[index]);
    });

    const variantIdInput = this.querySelector('.product-variant-id');
    if (this.currentVariant && variantIdInput) {
      variantIdInput.value = this.currentVariant.id;
    }
  }

  updateVariantUI() {
    if (!this.currentVariant) return;

    // Update price
    const priceElement = this.querySelector('.variant-price');
    if (priceElement) {
      priceElement.textContent = this.formatMoney(this.currentVariant.price);
    }

    // Update availability
    const addButton = this.querySelector('.add-to-cart-button');
    if (addButton) {
      addButton.disabled = !this.currentVariant.available;
      addButton.textContent = this.currentVariant.available ? 'Add to Cart' : 'Sold Out';
    }
  }

  formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  initVariantListeners() {
    // Initialize with default selected options
    this.updateSelectedVariants();

    // Update dropdown label if possible
    if (this.variantLabel && this.selectedOptions.length > 0) {
      this.variantLabel.textContent = this.selectedOptions[0];
    }
  }
}

customElements.define('custom-quick-add-modal', CustomQuickAddModal);

customElements.define('custom-quick-add-modal', CustomQuickAddModal);
