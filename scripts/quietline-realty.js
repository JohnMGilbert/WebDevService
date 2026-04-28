(() => {
  const root = document.documentElement;
  const body = document.body;
  const story = document.querySelector("[data-ql-story]");
  const scenes = Array.from(document.querySelectorAll("[data-ql-scene]"));
  const navLinks = Array.from(document.querySelectorAll("[data-ql-link]"));
  const progressFill = document.querySelector("[data-ql-progress]");
  const canvas = document.querySelector("[data-ql-canvas]");
  const track = document.querySelector(".ql-track");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!story || !scenes.length) {
    return;
  }

  let storyTop = 0;
  let storyRange = 1;
  let currentProgress = 0;
  let activeIndex = 0;
  let ticking = false;
  let settleTimer = 0;
  let settleLockUntil = 0;

  const settleDelayMs = 140;
  const settleLockMs = 460;
  const settleThreshold = 0.025;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const setActiveNav = (index) => {
    navLinks.forEach((link) => {
      const targetIndex = Number(link.dataset.qlLink);
      link.setAttribute("aria-current", targetIndex === index ? "true" : "false");
    });
  };

  if (track) {
    track.innerHTML = "";

    for (let index = 0; index < scenes.length - 1; index += 1) {
      const stop = document.createElement("span");
      stop.className = "ql-stop";
      track.append(stop);
    }
  }

  const measureStory = () => {
    storyTop = story.offsetTop;
    storyRange = Math.max(1, story.offsetHeight - window.innerHeight);
  };

  const scrollToScene = (index) => {
    const target = storyTop + index * window.innerHeight;
    settleLockUntil = window.performance.now() + settleLockMs;
    window.scrollTo({
      top: target,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const getNearestSceneIndex = () => {
    if (scenes.length <= 1) {
      return 0;
    }

    return clamp(Math.round(currentProgress * (scenes.length - 1)), 0, scenes.length - 1);
  };

  const settleToNearestScene = () => {
    const now = window.performance.now();

    if (now < settleLockUntil) {
      return;
    }

    if (window.scrollY < storyTop || window.scrollY > storyTop + storyRange) {
      return;
    }

    const nearestIndex = getNearestSceneIndex();
    const target = storyTop + nearestIndex * window.innerHeight;

    if (Math.abs(window.scrollY - target) <= window.innerHeight * settleThreshold) {
      return;
    }

    scrollToScene(nearestIndex);
  };

  const updateScenes = () => {
    const scrollDelta = clamp(window.scrollY - storyTop, 0, storyRange);
    currentProgress = storyRange ? scrollDelta / storyRange : 0;
    const segment = currentProgress * (scenes.length - 1);
    activeIndex = Math.round(segment);

    root.style.setProperty("--ql-global-progress", currentProgress.toFixed(4));

    scenes.forEach((scene, index) => {
      const distance = Math.abs(segment - index);
      const sceneProgress = clamp(1 - distance, 0, 1);
      scene.style.setProperty("--scene-progress", sceneProgress.toFixed(4));
      scene.classList.toggle("is-active", distance < 0.95);
    });

    setActiveNav(activeIndex);

    if (progressFill) {
      progressFill.style.transform = `scaleY(${Math.max(0.001, currentProgress)})`;
    }
  };

  const requestUpdate = () => {
    if (ticking) {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settleToNearestScene, settleDelayMs);
      return;
    }

    ticking = true;
    window.requestAnimationFrame(() => {
      updateScenes();
      ticking = false;
    });

    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(settleToNearestScene, settleDelayMs);
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetIndex = Number(link.dataset.qlLink);

      if (Number.isNaN(targetIndex)) {
        return;
      }

      if (!prefersReducedMotion) {
        event.preventDefault();
        scrollToScene(targetIndex);
      }
    });
  });

  const initCanvas = () => {
    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const points = Array.from({ length: 28 }, (_, index) => ({
      x: ((index % 7) + 0.75) / 7,
      y: (Math.floor(index / 7) + 0.8) / 4,
      depth: 0.5 + ((index * 17) % 100) / 100,
      phase: index * 0.8,
      speed: 0.8 + (((index * 19) % 100) / 100) * 0.8,
    }));

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (timestamp) => {
      const time = timestamp * 0.00022;
      const progress = currentProgress;

      context.clearRect(0, 0, width, height);

      const resolved = points.map((point) => {
        const driftX = Math.sin(time * point.speed + point.phase) * (18 + point.depth * 16);
        const driftY = Math.cos(time * point.speed * 0.9 + point.phase) * (12 + point.depth * 10);

        return {
          x: point.x * width + driftX + (progress - 0.5) * point.depth * 180,
          y: point.y * height + driftY - progress * point.depth * 90,
          depth: point.depth,
        };
      });

      for (let index = 0; index < resolved.length; index += 1) {
        const source = resolved[index];

        for (let targetIndex = index + 1; targetIndex < resolved.length; targetIndex += 1) {
          const target = resolved[targetIndex];
          const dx = source.x - target.x;
          const dy = source.y - target.y;
          const distance = Math.hypot(dx, dy);

          if (distance > 180) {
            continue;
          }

          const alpha = (1 - distance / 180) * 0.18;
          context.strokeStyle = `rgba(137, 216, 255, ${alpha})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(source.x, source.y);
          context.lineTo(target.x, target.y);
          context.stroke();
        }
      }

      resolved.forEach((point, index) => {
        const radius = 1.2 + point.depth * 2.1;
        const warm = index % 4 === 0;
        context.fillStyle = warm
          ? "rgba(214, 165, 107, 0.75)"
          : "rgba(244, 239, 231, 0.85)";
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
      });

      context.strokeStyle = "rgba(255, 255, 255, 0.06)";
      context.lineWidth = 1;

      for (let x = 0; x <= width; x += 120) {
        context.beginPath();
        context.moveTo(x + progress * 18, 0);
        context.lineTo(x - progress * 28, height);
        context.stroke();
      }

      window.requestAnimationFrame(draw);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.requestAnimationFrame(draw);
  };

  measureStory();
  setActiveNav(0);

  if (!prefersReducedMotion) {
    initCanvas();
    body.classList.add("ql-enhanced");
    measureStory();
    updateScenes();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", () => {
      measureStory();
      updateScenes();
    });
  } else {
    root.style.setProperty("--ql-global-progress", "0");
    scenes.forEach((scene) => {
      scene.style.setProperty("--scene-progress", "1");
    });
  }
})();
