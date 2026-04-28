const lockedStyle = "slate";

document.documentElement.dataset.siteStyle = lockedStyle;

window.addEventListener("DOMContentLoaded", () => {
  const headerScrollMediaQuery = window.matchMedia("(min-width: 921px)");
  const headerScrollRange = 140;

  const syncHeaderScrollState = () => {
    const progress = headerScrollMediaQuery.matches
      ? Math.min(window.scrollY / headerScrollRange, 1)
      : 0;

    document.querySelectorAll(".site-header").forEach((header) => {
      header.style.setProperty("--header-scroll-progress", progress.toFixed(3));
    });
  };

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

  syncHeaderScrollState();

  let headerScrollTicking = false;

  window.addEventListener(
    "scroll",
    () => {
      if (headerScrollTicking) {
        return;
      }

      headerScrollTicking = true;

      window.requestAnimationFrame(() => {
        syncHeaderScrollState();
        headerScrollTicking = false;
      });
    },
    { passive: true }
  );

  if (typeof headerScrollMediaQuery.addEventListener === "function") {
    headerScrollMediaQuery.addEventListener("change", syncHeaderScrollState);
  } else if (typeof headerScrollMediaQuery.addListener === "function") {
    headerScrollMediaQuery.addListener(syncHeaderScrollState);
  }
});
