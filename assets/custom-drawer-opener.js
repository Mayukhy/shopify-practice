class CustomDrawerOpener extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('click', (event) => this.handleClick(event));
    document.addEventListener('click', (event) => this.handleDocumentClick(event));
  }
  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    document.removeEventListener('click', this.handleDocumentClick);
  }

  handleClick(event) {
    const drawer = document.querySelector('custom-desktop-drawer');
    event.stopPropagation();
    drawer.open();
  }

  handleDocumentClick = (event) => {
    const drawer = document.querySelector('custom-desktop-drawer');
    const parentLink = event.target.closest('li.list-menu__item');
    if (
      !drawer.contains(event.target) ||
      !event.target.classList.contains('custom-drawer__opener') ||
      !event.target.classList.contains('list-menu__item')
    ) {
      drawer.close();
    }
    if (event.target.classList.contains('list-menu__item-link')) {
      event.preventDefault();
      drawer.open();
      if (parentLink) {
        drawer.showSubmenu(parentLink.dataset.link, null);
        drawer.showArrowIcon(parentLink.dataset.link, null);
      }
    }
  };
}

customElements.define('custom-drawer-opener', CustomDrawerOpener);
