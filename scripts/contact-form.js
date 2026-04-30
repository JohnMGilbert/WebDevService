(() => {
  const database = window.truePageDatabase;
  const forms = Array.from(document.querySelectorAll("[data-contact-form]"));
  const contactEmail = "jmgilbert23@gmail.com";
  const formSubmitEndpoint = `https://formsubmit.co/ajax/${encodeURIComponent(contactEmail)}`;

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

  const sendViaFormSubmit = async (payload) => {
    const submission = new FormData();

    submission.append("name", payload.name || "");
    submission.append("business", payload.business || "");
    submission.append("email", payload.email || "");
    submission.append("message", payload.message || "");
    submission.append("source_page_title", payload.sourcePageTitle || "");
    submission.append("source_page_path", payload.sourcePagePath || "");
    submission.append("source_page_url", payload.sourcePageUrl || "");
    submission.append("referrer", payload.referrer || "");
    submission.append("utm_source", payload.utmSource || "");
    submission.append("utm_medium", payload.utmMedium || "");
    submission.append("utm_campaign", payload.utmCampaign || "");
    submission.append("utm_term", payload.utmTerm || "");
    submission.append("utm_content", payload.utmContent || "");
    submission.append("_subject", `Website project inquiry from ${String(payload.name).trim() || "a website lead"}`);
    submission.append("_replyto", payload.email || "");
    submission.append("_template", "table");
    submission.append("_url", payload.sourcePageUrl || "");

    const response = await fetch(formSubmitEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: submission,
    });

    let responseBody = null;

    try {
      responseBody = await response.json();
    } catch (error) {
      responseBody = null;
    }

    if (!response.ok || responseBody?.success === false) {
      throw new Error(responseBody?.message || "The form could not be sent.");
    }
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
        setStatus(status, "Thanks. Your message was received.", "success");
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
        sourcePageUrl: window.location.href,
        referrer: document.referrer || "",
        userAgent: navigator.userAgent || "",
        ...getUtmParams(),
      };

      if (!String(payload.name).trim() || !String(payload.email).trim() || !String(payload.message).trim()) {
        setStatus(status, "Please fill out your name, email, and project details.", "error");
        return;
      }

      const originalLabel = submitButton?.textContent || "";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      try {
        const tasks = [sendViaFormSubmit(payload)];

        if (database?.isConfigured && typeof database.submitContactLead === "function") {
          tasks.push(
            database.submitContactLead(payload).catch((error) => {
              console.error("Lead tracking was unavailable.", error);
            })
          );
        }

        await Promise.all(tasks);

        form.reset();
        setStatus(status, "Thanks. Your message was sent successfully.", "success");
      } catch (error) {
        console.error("Contact form submission failed.", error);
        setStatus(status, "Your message could not be sent right now. Please try again in a moment.", "error");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });
  });
})();
