const lockedStyle = "slate";

document.documentElement.dataset.siteStyle = lockedStyle;

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.siteStyle = lockedStyle;
  localStorage.setItem("sharpSitesStyle", lockedStyle);

  document.querySelectorAll("[data-nav-toggle]").forEach((button) => {
    const header = button.closest(".site-header");
    const nav = header?.querySelector(".nav");

    if (!header || !nav) {
      return;
    }

    button.addEventListener("click", () => {
      const isOpen = header.classList.toggle("is-menu-open");

      button.setAttribute("aria-expanded", String(isOpen));
      button.setAttribute("aria-label", `${isOpen ? "Close" : "Open"} navigation menu`);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("is-menu-open");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Open navigation menu");
      });
    });
  });
});
