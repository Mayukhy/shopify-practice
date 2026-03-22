if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');
        this.messageText = this.querySelector('.product-form__message');
        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        const customOption = document.querySelector(
          '.custom-product-variant-picker__wrapper input[type="radio"]:checked'
        );

        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        // Check if bundle products are selected
        const bundleProducts = window.bundleProductsData;

        if (bundleProducts && bundleProducts.length > 0) {
          // Handle bundle products - send multiple items
          this.handleBundleAddToCart(bundleProducts, customOption);
        } else {
          // Handle single product - original logic
          this.handleSingleAddToCart(customOption);
        }
      }

      handleBundleAddToCart(bundleProducts, customOption) {
        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';

        // Prepare items array for bundle
        const items = bundleProducts.map((product) => {
          const item = {
            id: product.id,
            quantity: product.quantity,
            ...(product.parent_id && { parent_id: product.parent_id }),
          };

          // Add properties if they exist
          if (product.properties) {
            item.properties = product.properties;
          }

          // Add custom option to main product
          if (product.id === this.variantIdInput.value && customOption) {
            if (!item.properties) item.properties = {};
            if (customOption.value) item.properties['Custom Option'] = customOption.value;
            if (this.messageText) item.properties['Message'] = this.messageText.value;
          }

          return item;
        });

        const requestBody = {
          items: items,
        };

        if (this.cart) {
          requestBody.sections = this.cart.getSectionsToRender().map((section) => section.id);
          requestBody.sections_url = window.location.pathname;
        }

        config.body = JSON.stringify(requestBody);

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            // Bundle products might not return sections, so handle differently
            if (response.items && Array.isArray(response.items)) {
              // For bundles, we'll use the first item for notification purposes
              const mainItem = response.items[0];
              if (mainItem) {
                response.key = mainItem.key;
                response.variant_id = mainItem.variant_id;
              }
            }
            this.handleCartResponse(response);
            document.dispatchEvent(new CustomEvent('bundle:added'));
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.handleSubmitFinally();
          });
      }

      handleSingleAddToCart(customOption) {
        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];
        
        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          customOption && formData.append('properties[Custom Option]', customOption.value);
          this.messageText && formData.append('properties[Message]', this.messageText.value);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;
        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            this.handleCartResponse(response);
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.handleSubmitFinally();
          });
      }

      handleCartResponse(response) {
        const event = new CustomEvent('cart:response', { detail: response.product_id.toString() });
        document.dispatchEvent(event);
        
        if (response.status) {
          publish(PUB_SUB_EVENTS.cartError, {
            source: 'product-form',
            productVariantId: this.variantIdInput.value,
            errors: response.errors || response.description,
            message: response.message,
          });
          this.handleErrorMessage(response.description);

          const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
          if (!soldOutMessage) return;
          this.submitButton.setAttribute('aria-disabled', true);
          this.submitButtonText.classList.add('hidden');
          soldOutMessage.classList.remove('hidden');
          this.error = true;
          return;
        } else if (!this.cart) {
          window.location = window.routes.cart_url;
          return;
        }

        // Validate response structure before proceeding
        if (!response || typeof response !== 'object') {
          console.error('Invalid cart response:', response);
          this.handleErrorMessage('Failed to add product to cart');
          return;
        }

        const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
        if (!this.error)
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'product-form',
            productVariantId: this.variantIdInput.value,
            cartData: response,
          }).then(() => {
            CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
          });
        this.error = false;
        const quickAddModal = this.closest('quick-add-modal');
        if (quickAddModal) {
          document.body.addEventListener(
            'modalClosed',
            () => {
              setTimeout(() => {
                CartPerformance.measure('add:paint-updated-sections', () => {
                  this.safeRenderContents(response);
                });
              });
            },
            { once: true }
          );
          quickAddModal.hide(true);
        } else {
          CartPerformance.measure('add:paint-updated-sections', () => {
            this.safeRenderContents(response);
          });
        }
      }

      safeRenderContents(response) {
        try {
          // Check if cart element exists and has renderContents method
          if (this.cart && typeof this.cart.renderContents === 'function') {
            // For bundle products, sections might not be included
            if (response.sections) {
              this.cart.renderContents(response);
            } else if (response.items && Array.isArray(response.items)) {
              // Bundle response - fetch sections manually for the main item
              const mainItem = response.items[0];
              if (mainItem && mainItem.key) {
                this.fetchAndRenderCartSections(mainItem.key);
              } else {
                this.refreshCart();
              }
            } else {
              // Fallback: refresh cart manually
              this.refreshCart();
            }
          } else {
            console.warn('Cart element not found or renderContents method missing');
            this.refreshCart();
          }
        } catch (error) {
          console.error('Error rendering cart contents:', error);
          this.refreshCart();
        }
      }

      fetchAndRenderCartSections(itemKey) {
        // Fetch cart sections manually for bundle products
        const sectionsToRender = this.cart.getSectionsToRender();
        const sectionIds = sectionsToRender.map((section) => section.id);

        const url = `${window.location.pathname}?sections=${sectionIds.join(',')}`;

        fetch(url)
          .then((response) => response.json())
          .then((sections) => {
            const renderData = {
              key: itemKey,
              sections: sections,
            };
            this.cart.renderContents(renderData);
          })
          .catch((error) => {
            console.error('Failed to fetch cart sections:', error);
            this.refreshCart();
          });
      }

      refreshCart() {
        // Fallback method to refresh cart when renderContents fails
        if (this.cart) {
          fetch(`${routes.cart_url}.js`)
            .then((response) => response.json())
            .then((cartData) => {
              // Dispatch cart update event with fresh data
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form-fallback',
                cartData: cartData,
              });
            })
            .catch((error) => {
              console.error('Failed to refresh cart:', error);
            });
        }
      }

      handleSubmitFinally() {
        // Dispatch a custom event for product added to cart
        (async () => {
          const response = await fetch(`${routes.cart_url}.js`);
          const cartData = await response.json();
          const isCustomModal = this.closest('.custom-quick-add-modal__main');
          function matchCondition() {
            let isTrue = false;
            const conditionSelectedVariants = ['md', 'Black'];
            cartData.items.forEach((item) => {
              const condition = item.variant_options.every((option, idx) => option === conditionSelectedVariants[idx]);
              if (condition) isTrue = true;
            });
            return isTrue;
          }
          const isPresent = cartData.items.find(
            (item) => item.id === window.productTobeUpselled.product.variants[0].id
          );

          if (!isPresent && matchCondition() && isCustomModal) {
            const productAddedEvent = new CustomEvent('product:added');
            this.dispatchEvent(productAddedEvent);
          }
        })();

        this.submitButton.classList.remove('loading');
        if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
        if (!this.error) this.submitButton.removeAttribute('aria-disabled');
        this.querySelector('.loading__spinner').classList.add('hidden');

        // Clear bundle data after successful submission
        window.bundleProductsData = null;

        (async () => {
          try {
            // Dispatch a custom event for product added to cart
            const response = await fetch(`${routes.cart_url}.js`);
            const cartData = await response.json();
            const isCustomModal = this.closest('.custom-quick-add-modal__main');

            function matchCondition() {
              let isTrue = false;
              const conditionSelectedVariants = ['md', 'Black'];
              cartData.items.forEach((item) => {
                const condition = item.variant_options.every(
                  (option, idx) => option === conditionSelectedVariants[idx]
                );
                if (condition) isTrue = true;
              });
              return isTrue;
            }

            const isPresent = cartData.items.find(
              (item) => item.id === window.productTobeUpselled?.product?.variants?.[0]?.id
            );

            if (!isPresent && matchCondition() && isCustomModal) {
              const productAddedEvent = new CustomEvent('product:added');
              this.dispatchEvent(productAddedEvent);
            }
          } catch (error) {
            console.error('Error in product added event:', error);
          }
        })();

        this.submitButton.classList.remove('loading');
        if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
        if (!this.error) this.submitButton.removeAttribute('aria-disabled');
        this.querySelector('.loading__spinner').classList.add('hidden');
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}
