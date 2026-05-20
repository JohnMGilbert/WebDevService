const slides = Array.from(document.querySelectorAll("[data-slide]"));
const dots = Array.from(document.querySelectorAll("[data-dot]"));
const previousButton = document.querySelector("[data-prev]");
const nextButton = document.querySelector("[data-next]");

let activeIndex = 0;
let autoAdvance;

function showSlide(index) {
  activeIndex = (index + slides.length) % slides.length;

  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === activeIndex);
  });

  dots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === activeIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
}

function queueAutoAdvance() {
  window.clearInterval(autoAdvance);
  autoAdvance = window.setInterval(() => {
    showSlide(activeIndex + 1);
  }, 6500);
}

previousButton?.addEventListener("click", () => {
  showSlide(activeIndex - 1);
  queueAutoAdvance();
});

nextButton?.addEventListener("click", () => {
  showSlide(activeIndex + 1);
  queueAutoAdvance();
});

dots.forEach((dot) => {
  dot.addEventListener("click", () => {
    showSlide(Number(dot.dataset.dot));
    queueAutoAdvance();
  });
});

showSlide(0);
queueAutoAdvance();
