const paperGardenStyles = [
  { id: "paper", label: "Paper" },
  { id: "index-card", label: "Index Card" },
  { id: "midnight", label: "Midnight" },
  { id: "signal", label: "Signal" },
];

window.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector(".paper-garden-page");
  const button = document.querySelector("[data-paper-garden-style-toggle]");

  if (!(page instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
    return;
  }

  const storageKey = "paperGardenStyle";
  const styleIds = new Set(paperGardenStyles.map((style) => style.id));
  const savedStyle = localStorage.getItem(storageKey);
  let activeStyle = styleIds.has(savedStyle) ? savedStyle : page.dataset.paperGardenStyle || "paper";

  const syncButtonLabel = () => {
    const activeConfig =
      paperGardenStyles.find((style) => style.id === activeStyle) || paperGardenStyles[0];
    button.textContent = `Style: ${activeConfig.label}`;
  };

  const applyStyle = (styleId) => {
    activeStyle = styleId;
    page.dataset.paperGardenStyle = styleId;
    localStorage.setItem(storageKey, styleId);
    syncButtonLabel();
  };

  applyStyle(activeStyle);

  button.addEventListener("click", () => {
    const currentIndex = paperGardenStyles.findIndex((style) => style.id === activeStyle);
    const nextStyle = paperGardenStyles[(currentIndex + 1) % paperGardenStyles.length];
    applyStyle(nextStyle.id);
  });
});
