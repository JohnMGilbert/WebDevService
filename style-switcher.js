const styleModes = [
  { id: "pop", label: "Pop" },
  { id: "studio", label: "Studio" },
  { id: "night", label: "Night" },
  { id: "southwest", label: "Southwest" },
];

const savedStyle = localStorage.getItem("sharpSitesStyle");
const initialStyle = styleModes.some((mode) => mode.id === savedStyle) ? savedStyle : "pop";

function applyStyle(modeId) {
  const mode = styleModes.find((item) => item.id === modeId) || styleModes[0];
  document.documentElement.dataset.siteStyle = mode.id;
  localStorage.setItem("sharpSitesStyle", mode.id);

  document.querySelectorAll("[data-style-switcher]").forEach((button) => {
    button.textContent = `Style: ${mode.label}`;
    button.setAttribute("aria-label", `Current style is ${mode.label}. Switch website style.`);
  });
}

document.documentElement.dataset.siteStyle = initialStyle;

window.addEventListener("DOMContentLoaded", () => {
  applyStyle(initialStyle);

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

  document.querySelectorAll("[data-style-switcher]").forEach((button) => {
    button.addEventListener("click", () => {
      const currentIndex = styleModes.findIndex(
        (mode) => mode.id === document.documentElement.dataset.siteStyle
      );
      const nextMode = styleModes[(currentIndex + 1) % styleModes.length];
      applyStyle(nextMode.id);
    });
  });
});
