class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById('cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
      closeButton.addEventListener('click', this.close.bind(this))
    );
  }

  open() {
    this.notification.classList.add('animate', 'active');

    this.notification.addEventListener(
      'transitionend',
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.notification.classList.remove('active');
    document.body.removeEventListener('click', this.onBodyClick);

    removeTrapFocus(this.activeElement);
  }

  renderContents(parsedState) {
    this.cartItemKey = parsedState.key;
    this.getSectionsToRender().forEach((section) => {
      const element = document.getElementById(section.id);
      if (!element) {
        console.warn(`Cart notification element ${section.id} not found`);
        return;
      }

      const sectionHtml = parsedState.sections && parsedState.sections[section.id];
      if (!sectionHtml) {
        console.warn(`Cart notification section ${section.id} not found in response`);
        return;
      }

      const innerHTML = this.getSectionInnerHTML(sectionHtml, section.selector);
      if (innerHTML !== null) {
        element.innerHTML = innerHTML;
      } else {
        console.warn(`Could not parse section content for ${section.id}`);
      }
    });

    if (this.header) this.header.reveal();
    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-notification-product',
        selector: `[id="cart-notification-product-${this.cartItemKey}"]`,
      },
      {
        id: 'cart-notification-button',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    if (!html) return null;

    try {
      const parsedDoc = new DOMParser().parseFromString(html, 'text/html');
      const element = parsedDoc.querySelector(selector);
      return element ? element.innerHTML : null;
    } catch (error) {
      console.error('Error parsing section HTML:', error);
      return null;
    }
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest('cart-notification')) {
      const disclosure = target.closest('details-disclosure, header-menu');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-notification', CartNotification);
