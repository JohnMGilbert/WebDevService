const page = document.querySelector(".tb-page");
const apiUrl = page?.dataset.contentApi?.trim() || window.TUTTI_BAMBINI_CONTENT_API_URL || "";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function buildEndpoint(action) {
  if (!apiUrl) {
    return "";
  }

  const endpoint = new URL(apiUrl, window.location.href);
  endpoint.searchParams.set("action", action);
  return endpoint.toString();
}

function safeHref(value) {
  const href = String(value || "").trim();

  if (!href) {
    return "";
  }

  try {
    const url = new URL(href, window.location.origin);
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];

    if (!allowedProtocols.includes(url.protocol)) {
      return "";
    }

    return href.startsWith("/") ? url.pathname + url.search + url.hash : url.href;
  } catch (error) {
    return "";
  }
}

function getGoogleDriveFileId(url) {
  if (!url.hostname.includes("drive.google.com")) {
    return "";
  }

  const filePathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);

  if (filePathMatch) {
    return filePathMatch[1];
  }

  return url.searchParams.get("id") || "";
}

function getGoogleDriveImageSources(fileId) {
  const encodedFileId = encodeURIComponent(fileId);

  return {
    primary: `https://lh3.googleusercontent.com/d/${encodedFileId}=w1200`,
    fallback: `https://drive.google.com/thumbnail?id=${encodedFileId}&sz=w1200`
  };
}

function safeImageSources(value) {
  const src = safeHref(value);

  if (!src) {
    return {
      fallback: "",
      primary: ""
    };
  }

  try {
    const url = new URL(src, window.location.origin);

    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        fallback: "",
        primary: ""
      };
    }

    const googleDriveFileId = getGoogleDriveFileId(url);

    if (googleDriveFileId) {
      return getGoogleDriveImageSources(googleDriveFileId);
    }

    return {
      fallback: "",
      primary: src
    };
  } catch (error) {
    return {
      fallback: "",
      primary: ""
    };
  }
}

function safeImageSrc(value) {
  return safeImageSources(value).primary;
}

function renderItemImage(item) {
  const { fallback, primary } = safeImageSources(item.image);

  if (!primary) {
    return "";
  }

  const alt = item.imagealt || item.title || "";
  const fallbackAttribute = fallback ? ` data-fallback-src="${escapeHtml(fallback)}"` : "";

  return `
    <figure class="tb-card-image">
      <img src="${escapeHtml(primary)}"${fallbackAttribute} alt="${escapeHtml(alt)}" loading="lazy" decoding="async">
    </figure>
  `;
}

function prepareCardImages(list) {
  list.querySelectorAll(".tb-card-image img").forEach((image) => {
    image.addEventListener("error", () => {
      const fallbackSrc = image.dataset.fallbackSrc || "";

      if (fallbackSrc && image.src !== fallbackSrc) {
        image.removeAttribute("data-fallback-src");
        image.src = fallbackSrc;
        return;
      }

      image.closest(".tb-card-image")?.remove();
    }, { once: true });
  });
}

function renderLink(value, label) {
  const href = safeHref(value);

  return href ? `<a class="tb-card-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>` : "";
}

function renderMetadata(items) {
  const visibleItems = items.filter((item) => String(item || "").trim());

  if (!visibleItems.length) {
    return "";
  }

  return `<div class="tb-card-meta">${visibleItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
}

function addFillerImage({ list, section, fillerImage, fillerAlt, fillerPosition }) {
  const body = list.parentElement;

  if (!body || !fillerImage) {
    return;
  }

  body.querySelector(".tb-filler-image")?.remove();

  const figure = document.createElement("figure");
  const image = document.createElement("img");

  figure.className = "tb-filler-image";
  figure.hidden = true;
  image.alt = fillerAlt || "";
  image.decoding = "async";
  image.loading = "lazy";

  image.addEventListener("load", () => {
    figure.hidden = false;
    section.classList.add("tb-dynamic-section-with-filler");
  });

  image.addEventListener("error", () => {
    figure.remove();
    section.classList.remove("tb-dynamic-section-with-filler");
  });

  figure.append(image);

  if (fillerPosition === "before") {
    body.insertBefore(figure, list);
  } else {
    body.append(figure);
  }

  image.src = fillerImage;
}

async function loadSection({ endpoint, sectionId, listId, renderItem, fillerImage, fillerAlt, fillerPosition = "after" }) {
  const section = document.getElementById(sectionId);
  const list = document.getElementById(listId);

  if (!section || !list || !endpoint) {
    return;
  }

  section.hidden = true;
  section.classList.remove("tb-dynamic-section-single", "tb-dynamic-section-with-filler");
  list.parentElement?.querySelector(".tb-filler-image")?.remove();
  list.replaceChildren();

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Content API request failed with ${response.status}`);
    }

    const items = await response.json();

    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const isSingleItem = items.length === 1;

    list.innerHTML = items.map(renderItem).join("");
    prepareCardImages(list);
    section.classList.toggle("tb-dynamic-section-single", isSingleItem);

    if (isSingleItem) {
      addFillerImage({ list, section, fillerImage, fillerAlt, fillerPosition });
    }

    section.hidden = false;
  } catch (error) {
    console.error(`Could not load ${sectionId}.`, error);
  }
}

loadSection({
  endpoint: buildEndpoint("events"),
  sectionId: "events-section",
  listId: "events-list",
  fillerImage: "/assets/tutti-bambini/event_filler_image.png",
  fillerAlt: "Children's community event at Tutti Bambini",
  renderItem: (event) => `
    <article class="tb-content-card">
      ${renderItemImage(event)}
      ${renderMetadata([event.date, event.time, event.address])}
      <h3>${escapeHtml(event.title)}</h3>
      <p>${escapeHtml(event.description)}</p>
      ${renderLink(event.link, "Event details")}
    </article>
  `
});

loadSection({
  endpoint: buildEndpoint("blog"),
  sectionId: "blog-section",
  listId: "blog-list",
  fillerImage: "/assets/tutti-bambini/blog_filler_image.png",
  fillerAlt: "Tutti Bambini news and updates",
  fillerPosition: "before",
  renderItem: (post) => `
    <article class="tb-content-card">
      ${renderItemImage(post)}
      ${renderMetadata([post.date])}
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.summary)}</p>
      ${renderLink(post.link, "Read more")}
    </article>
  `
});

window.tuttiBambiniContent = {
  escapeHtml,
  getGoogleDriveImageSources,
  loadSection,
  getGoogleDriveFileId,
  prepareCardImages,
  renderLink,
  renderItemImage,
  renderMetadata,
  safeImageSources,
  safeImageSrc,
  safeHref
};
