class CustomModalOpener extends HTMLElement {
  constructor() {
    super();
    // Initialize properties if needed
    this.opener = this.querySelector("button[aria-haspopup='dialog']");

  }

  connectedCallback() {
    // Runs when the element is added to the DOM
    if (!this.opener) return;
    this.opener.addEventListener('click', () => {
      const openerId = this.opener.id.replace('QuickAdd-button-', '');
      const modal = document.querySelector(`.custom-quick-add-modal__main[id="quick-add-modal-${openerId}"]`);
      if (modal) modal.openModal(this.opener);
    });
  }

  disconnectedCallback() {
    // Runs when the element is removed from the DOM
    this.opener.removeEventListener('click', this.openModal.bind(this));
  }
}

customElements.define('custom-modal-opener', CustomModalOpener);
