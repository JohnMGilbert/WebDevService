(() => {
  const body = document.body;
  const animatedItems = document.querySelectorAll("[data-flow]");
  const progress = document.querySelector("[data-fr-progress]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  body.classList.add("fr-ready");

  if (reduceMotion) {
    animatedItems.forEach((item) => item.classList.add("is-visible"));
  } else if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    animatedItems.forEach((item) => observer.observe(item));
  } else {
    animatedItems.forEach((item) => item.classList.add("is-visible"));
  }

  const updateProgress = () => {
    if (!progress) {
      return;
    }

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const amount = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, amount))})`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
})();
