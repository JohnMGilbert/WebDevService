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
