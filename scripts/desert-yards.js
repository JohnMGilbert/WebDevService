(() => {
  const carousels = document.querySelectorAll("[data-dy-carousel]");

  const syncRange = (range) => {
    const comparison = range.closest("[data-dy-compare]");
    const value = Number(range.value || 50);

    comparison?.style.setProperty("--split", `${value}%`);
    range.setAttribute("aria-valuetext", `${value} percent after image`);
  };

  document.querySelectorAll("[data-dy-range]").forEach((range) => {
    syncRange(range);
    range.addEventListener("input", () => syncRange(range));
  });

  carousels.forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll("[data-dy-slide]"));
    const dots = Array.from(carousel.querySelectorAll("[data-dy-dot]"));
    const previousButton = carousel.querySelector("[data-dy-prev]");
    const nextButton = carousel.querySelector("[data-dy-next]");
    let activeIndex = 0;

    if (slides.length < 2) {
      previousButton?.setAttribute("hidden", "");
      nextButton?.setAttribute("hidden", "");
      return;
    }

    const showSlide = (nextIndex) => {
      activeIndex = (nextIndex + slides.length) % slides.length;

      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });

      dots.forEach((dot, index) => {
        dot.setAttribute("aria-pressed", String(index === activeIndex));
      });
    };

    previousButton?.addEventListener("click", () => showSlide(activeIndex - 1));
    nextButton?.addEventListener("click", () => showSlide(activeIndex + 1));

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => showSlide(index));
    });

    showSlide(activeIndex);
  });
})();
