class customDesktopDrawer extends HTMLElement {
  constructor() {
    super();
    this.activeParentLink = null;
    this.activeChildLink = null;
    this.activeGrandChildLink = null;
    this.boundHandleMouseEnter = this.handleMouseEnter.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
  }

  connectedCallback() {
    const menuList = this.querySelector('.custom-drawer__list-menu');
    if (menuList) {
      menuList.addEventListener('mouseenter', this.boundHandleMouseEnter, true);
      menuList.addEventListener('mouseleave', this.boundHandleMouseLeave, true);
    }
  }

  disconnectedCallback() {
    const menuList = this.querySelector('.custom-drawer__list-menu');
    if (menuList) {
      menuList.removeEventListener('mouseenter', this.boundHandleMouseEnter, true);
      menuList.removeEventListener('mouseleave', this.boundHandleMouseLeave, true);
    }
  }

  open() {
    this.classList.toggle('is-open');
  }

  close() {
    this.classList.remove('is-open');
  } 

  handleMouseEnter(event) {
    const parentLink = event.target.closest('li.custom-drawer__list-menu-item');
    const childLink = event.target.closest('li.custom-drawer-child__list-menu-item');
    const grandChildLink = event.target.closest('li.custom-drawer-grand-child__list-menu-item');

    if (parentLink && parentLink.closest('.custom-drawer__list-menu')) {
      this.activeParentLink = parentLink.dataset.link;
      this.activeChildLink = null;
      this.activeGrandChildLink = null;
      this.showSubmenu(this.activeParentLink, this.activeChildLink);
      this.showArrowIcon(this.activeParentLink, this.activeChildLink);
    }

    if (childLink && childLink.closest('.custom-drawer-child__list-menu')) {
      this.activeChildLink = childLink.dataset.link;
      this.activeGrandChildLink = null;
      this.showSubmenu(this.activeParentLink, this.activeChildLink);
      this.showArrowIcon(this.activeParentLink, this.activeChildLink);
    }

    if (grandChildLink && grandChildLink.closest('.custom-drawer-grand-child__list-menu')) {
      this.activeGrandChildLink = grandChildLink.dataset.link;
      this.showSubmenu(this.activeParentLink, this.activeChildLink);
    }
  }

  handleMouseLeave(event) {
    // Hide all if leaving the menu entirely
    if (event.target.classList.contains('custom-drawer__list-menu')) {
      this.hideAllSubmenus();
    }
  }

  showSubmenu(activeParentLink, activeChildLink) {
    // Show child submenu
    const allChildSubmenus = this.querySelectorAll('.custom-drawer-child__list-menu-item-submenu');
    allChildSubmenus.forEach((submenu) => {
      if (submenu.dataset.childLinks === activeParentLink) {
        submenu.classList.add('is-visible');
      } else {
        submenu.classList.remove('is-visible');
      }
    });

    // Show grandchild submenu
    const allGrandChildSubmenus = this.querySelectorAll('.custom-drawer-grand-child__list-menu-item-submenu');
    allGrandChildSubmenus.forEach((submenu) => {
      if (submenu.dataset.grandChildLinks === activeChildLink) {
        submenu.classList.add('is-visible');
      } else {
        submenu.classList.remove('is-visible');
      }
    });
  }

  showArrowIcon(activeParentLink, activeChildLink) {
    const parentLinks = this.querySelectorAll(`a.custom-drawer__list-menu-item-link.parent`);
    const childLinks = this.querySelectorAll(`a.custom-drawer__list-menu-item-link.child`);
    const grandChildLinks = this.querySelectorAll(`a.custom-drawer__list-menu-item-link.grand-child`);

    if (parentLinks) {
      console.log('Parent Link:', activeParentLink);
      parentLinks.forEach((link) =>
        link.dataset.liLink === activeParentLink
          ? link.classList.add('is-visible')
          : link.classList.remove('is-visible')
      );
    }
    if (childLinks) {
      childLinks.forEach((link) =>
        link.dataset.liLink === activeChildLink
          ? link.classList.add('is-visible')
          : link.classList.remove('is-visible')
      );
    }
  }

  hideAllSubmenus() {
    this.activeParentLink = null;
    this.activeChildLink = null;
    this.activeGrandChildLink = null;
    const allChildSubmenus = this.querySelectorAll('.custom-drawer-child__list-menu-item-submenu');
    const allLinks = this.querySelectorAll(`a.custom-drawer__list-menu-item-link`);
    allChildSubmenus.forEach((submenu) => {
      submenu.classList.remove('is-visible');
    });
    const allGrandChildSubmenus = this.querySelectorAll('.custom-drawer-grand-child__list-menu-item-submenu');
    allGrandChildSubmenus.forEach((submenu) => {
      submenu.classList.remove('is-visible');
    });
    allLinks.forEach((link) => link.classList.remove('is-visible'));
  }
}

customElements.define('custom-desktop-drawer', customDesktopDrawer);
