(() => {
  const database = window.truePageDatabase;
  const forms = Array.from(document.querySelectorAll("[data-contact-form]"));
  const contactEmail = "truepagewebdesign@gmail.com";

  if (!forms.length) {
    return;
  }

  const setStatus = (element, message, tone = "neutral") => {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.dataset.tone = tone;
  };

  const getUtmParams = () => {
    const params = new URLSearchParams(window.location.search);

    return {
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmTerm: params.get("utm_term") || "",
      utmContent: params.get("utm_content") || "",
    };
  };

  const buildMailto = (payload) => {
    const subject = `Website project inquiry from ${String(payload.name).trim() || "a website lead"}`;
    const body = [
      `Name: ${payload.name || ""}`,
      `Business: ${payload.business || ""}`,
      `Email: ${payload.email || ""}`,
      "",
      "Project details:",
      payload.message || "",
      "",
      `Source page: ${payload.sourcePageTitle || ""} (${payload.sourcePagePath || ""})`,
      `Referrer: ${payload.referrer || ""}`,
      `UTM source: ${payload.utmSource || ""}`,
      `UTM medium: ${payload.utmMedium || ""}`,
      `UTM campaign: ${payload.utmCampaign || ""}`,
      `UTM term: ${payload.utmTerm || ""}`,
      `UTM content: ${payload.utmContent || ""}`,
    ].join("\n");

    return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  forms.forEach((form) => {
    const status = form.querySelector("[data-contact-form-status]");
    const submitButton = form.querySelector('button[type="submit"]');
    const honeypot = form.querySelector('input[name="website"]');

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus(status, "");

      if (honeypot?.value) {
        form.reset();
        setStatus(status, "Thanks. Opening your email app now.", "success");
        return;
      }

      const formData = new FormData(form);
      const payload = {
        name: formData.get("name") || "",
        email: formData.get("email") || "",
        business: formData.get("business") || "",
        message: formData.get("message") || "",
        sourcePagePath: window.location.pathname,
        sourcePageTitle: document.title,
        referrer: document.referrer || "",
        userAgent: navigator.userAgent || "",
        ...getUtmParams(),
      };

      if (!String(payload.name).trim() || !String(payload.email).trim() || !String(payload.message).trim()) {
        setStatus(status, "Please fill out your name, email, and project details.", "error");
        return;
      }

      const mailtoUrl = buildMailto(payload);

      const originalLabel = submitButton?.textContent || "";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      try {
        if (database?.isConfigured && typeof database.submitContactLead === "function") {
          await database.submitContactLead(payload);
        }

        form.reset();
        setStatus(status, "Opening your email app with your project details.", "success");
        window.location.href = mailtoUrl;
      } catch (error) {
        setStatus(status, "Opening your email app. Lead tracking was unavailable.", "error");
        window.location.href = mailtoUrl;
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });
  });
})();
