(() => {
  const statElements = document.querySelectorAll("[data-mesa-stat]");
  const carousels = document.querySelectorAll("[data-mesa-carousel]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const formatStat = (value, suffix) => `${Math.round(value).toLocaleString()}${suffix}`;

  const animateStat = (stat) => {
    if (stat.dataset.statAnimated === "true") {
      return;
    }

    const target = Number(stat.dataset.statTarget || 0);
    const suffix = stat.dataset.statSuffix || "";
    const duration = Number(stat.dataset.statDuration || 1500);
    const statCard = stat.closest("article");
    const startTime = performance.now();

    stat.dataset.statAnimated = "true";
    statCard?.classList.add("is-counted");

    if (reduceMotion.matches) {
      stat.textContent = formatStat(target, suffix);
      return;
    }

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      stat.textContent = formatStat(target * easedProgress, suffix);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  };

  if (statElements.length > 0) {
    if ("IntersectionObserver" in window) {
      const statObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateStat(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.35 }
      );

      statElements.forEach((stat) => statObserver.observe(stat));
    } else {
      statElements.forEach(animateStat);
    }
  }

  carousels.forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll("[data-carousel-slide]"));
    const previousButton = carousel.querySelector("[data-carousel-prev]");
    const nextButton = carousel.querySelector("[data-carousel-next]");
    let activeIndex = 0;
    let rotationTimer;

    if (slides.length < 2) {
      return;
    }

    const showSlide = (nextIndex) => {
      activeIndex = (nextIndex + slides.length) % slides.length;

      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });
    };

    const stopRotation = () => {
      window.clearInterval(rotationTimer);
    };

    const startRotation = () => {
      stopRotation();

      if (!reduceMotion.matches) {
        rotationTimer = window.setInterval(() => {
          showSlide(activeIndex + 1);
        }, 5200);
      }
    };

    const moveManually = (direction) => {
      showSlide(activeIndex + direction);
      startRotation();
    };

    previousButton?.addEventListener("click", () => moveManually(-1));
    nextButton?.addEventListener("click", () => moveManually(1));
    carousel.addEventListener("mouseenter", stopRotation);
    carousel.addEventListener("mouseleave", startRotation);
    carousel.addEventListener("focusin", stopRotation);
    carousel.addEventListener("focusout", startRotation);
    reduceMotion.addEventListener("change", startRotation);

    showSlide(activeIndex);
    startRotation();
  });
})();
