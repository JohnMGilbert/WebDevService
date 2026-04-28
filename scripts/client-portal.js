(() => {
  const clientKey = "truePageClientAccounts";
  const sessionKey = "truePageClientSession";
  const database = window.truePageDatabase;
  const useDatabase = Boolean(database?.isConfigured);

  const plans = {
    "local-launch": {
      title: "Local Launch",
      price: "Starting at $1,500",
      shortDescription: "A focused one-page website for a clean, credible local launch.",
      description: "Starter website build with launch support and basic local SEO setup.",
      response: "Project responses are handled during the active build window.",
      details: [
        "One polished homepage with hero, service, proof, and contact sections.",
        "Mobile-first layout, launch checklist, and basic local SEO setup.",
        "Best for new businesses or simple service offers that need a fast, professional presence.",
      ],
    },
    "growth-website": {
      title: "Growth Website",
      price: "Starting at $2,800",
      shortDescription: "A stronger multi-page website built around leads and trust.",
      description: "Multi-page website build with lead paths, service structure, and proof sections.",
      response: "Project responses are handled during the active build window.",
      details: [
        "Up to five core pages with service, about, proof, FAQ, and contact content.",
        "Lead form, click-to-call actions, testimonial placement, and SEO-ready page structure.",
        "Best for service businesses with multiple services, audiences, or growth goals.",
      ],
    },
    "care-plan": {
      title: "Care Plan",
      price: "From $125/mo",
      shortDescription: "Ongoing support for updates, fixes, checks, and small improvements.",
      description: "Ongoing support for updates, checks, small edits, and priority help.",
      response: "Within 1 business day",
      details: [
        "Monthly content updates, small page edits, and minor design improvements.",
        "Basic performance checks, broken-link review, form checks, and priority support.",
        "Best for businesses that want their website maintained without chasing every small task.",
      ],
    },
    "website-partner": {
      title: "Website Partner Plan",
      price: "$0 down, $200/mo for 24 months",
      shortDescription: "A full website build with no upfront payment and unlimited ongoing updates.",
      description: "Any type of website with zero down, monthly billing, unlimited updates, and a 2-year service agreement.",
      response: "Within 1 business day",
      details: [
        "Zero down to get the project started, then $200 per month for 24 months.",
        "Flexible website scope built around the business, whether the site is simple or more involved.",
        "Unlimited website updates during the active 2-year agreement.",
      ],
    },
  };

  const isMonthlySupportPlan = (planId) => ["care-plan", "website-partner"].includes(planId);

  const fallbackId = () => `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const makeId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : fallbackId());
  const today = () => new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const normalizeEmail = (email) => email.trim().toLowerCase();
  const fullName = (firstName, lastName) => [firstName, lastName].filter(Boolean).join(" ").trim();
  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "0 KB";
    }

    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const readScreenshotFile = (file) =>
    new Promise((resolve, reject) => {
      if (!file) {
        resolve(null);
        return;
      }

      if (!file.type.startsWith("image/")) {
        reject(new Error("Please upload an image file for the screenshot."));
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        reject(new Error("Screenshots must be 2 MB or smaller for this local prototype."));
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve({
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type || "image",
          dataUrl: reader.result,
        });
      });
      reader.addEventListener("error", () => reject(new Error("The screenshot could not be read.")));
      reader.readAsDataURL(file);
    });
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const readClients = () => {
    try {
      return JSON.parse(localStorage.getItem(clientKey)) || [];
    } catch {
      return [];
    }
  };

  const writeClients = (clients) => {
    localStorage.setItem(clientKey, JSON.stringify(clients));
  };

  const readSession = () => {
    try {
      return JSON.parse(localStorage.getItem(sessionKey) || "null");
    } catch {
      return null;
    }
  };

  const seedDemoClient = () => {
    const clients = readClients();
    const demoEmail = "demo@truepageweb.com";

    if (clients.some((client) => client.email === demoEmail)) {
      return clients;
    }

    clients.push({
      id: makeId(),
      firstName: "Riley",
      lastName: "Parker",
      name: "Riley Parker",
      business: "Parker Home Services",
      email: demoEmail,
      password: "demo123",
      phone: "(575) 555-0142",
      address: "102 Market Street, Las Cruces, NM 88001",
      plan: "care-plan",
      planStatus: "active",
      planEnrolledAt: "Jan 15, 2026",
      nextBilling: "May 1, 2026",
      tickets: [
        {
          id: "TP-1042",
          title: "Swap spring photos on services page",
          type: "Content update",
          priority: "Normal",
          details: "Replace the three service cards with the new images from our shared folder.",
          status: "Open",
          createdAt: today(),
        },
      ],
      planRequests: [],
      createdAt: today(),
      updatedAt: today(),
    });

    writeClients(clients);
    return clients;
  };

  const getSessionClient = () => {
    const session = readSession();
    const clients = readClients();
    return clients.find((client) => client.id === session?.clientId) || null;
  };

  const saveClient = (updatedClient) => {
    const clients = readClients();
    const nextClients = clients.map((client) =>
      client.id === updatedClient.id ? { ...updatedClient, updatedAt: today() } : client
    );

    writeClients(nextClients);
    return nextClients.find((client) => client.id === updatedClient.id);
  };

  const setSession = (clientId) => {
    localStorage.setItem(sessionKey, JSON.stringify({ clientId }));
  };

  const setMessage = (element, message, tone = "neutral") => {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.dataset.tone = tone;
  };

  const friendlyAuthError = (error, fallback) => {
    const message = error?.message || "";

    if (/email rate limit exceeded/i.test(message)) {
      return "Too many account emails were sent recently. Wait a few minutes, then try again.";
    }

    return message || fallback;
  };

  const runMockBackendPasswordChecks = (password) => {
    const checks = [
      {
        valid: password.length >= 9,
        message: "Password must be at least 9 characters.",
      },
      {
        valid: /[A-Za-z0-9]/.test(password),
        message: "Password must contain at least one letter or number.",
      },
      {
        valid: /[^A-Za-z0-9]/.test(password),
        message: "Password must contain at least one special character.",
      },
    ];

    return checks.filter((check) => !check.valid).map((check) => check.message);
  };

  const initAuth = () => {
    if (!useDatabase) {
      seedDemoClient();
    }

    const tabs = Array.from(document.querySelectorAll("[data-auth-tab]"));
    const forms = Array.from(document.querySelectorAll("[data-auth-form]"));
    const message = document.querySelector("[data-auth-message]");

    const showForm = (target) => {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.authTab === target;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      });

      forms.forEach((form) => {
        form.classList.toggle("is-hidden", form.dataset.authForm !== target);
      });

      setMessage(message, "");
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => showForm(tab.dataset.authTab));
    });

    document.querySelector("[data-demo-login]")?.addEventListener("click", () => {
      if (useDatabase) {
        setMessage(message, "Demo client login is local-only. Use a Supabase client account.", "error");
        return;
      }

      const demoClient = seedDemoClient().find((client) => client.email === "demo@truepageweb.com");

      setSession(demoClient.id);
      window.location.href = "/client/portal.html";
    });

    document.querySelector('[data-auth-form="login"]')?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const email = normalizeEmail(form.email.value);
      const password = form.password.value;

      if (useDatabase) {
        try {
          await database.signIn(email, password);
          window.location.href = "/client/portal.html";
        } catch (error) {
          setMessage(message, friendlyAuthError(error, "Email or password did not match a Supabase account."), "error");
        }

        return;
      }

      const client = readClients().find((account) => account.email === email);

      if (!client || client.password !== password) {
        setMessage(message, "Email or password did not match a local account.", "error");
        return;
      }

      setSession(client.id);
      window.location.href = "/client/portal.html";
    });

    document.querySelector('[data-auth-form="create"]')?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const clients = readClients();
      const email = normalizeEmail(form.email.value);
      const password = form.password.value;
      const confirmPassword = form.confirmPassword.value;

      if (!useDatabase && clients.some((client) => client.email === email)) {
        setMessage(message, "That email already has a local account.", "error");
        return;
      }

      if (password !== confirmPassword) {
        setMessage(message, "Passwords do not match.", "error");
        return;
      }

      const passwordErrors = runMockBackendPasswordChecks(password);

      if (passwordErrors.length > 0) {
        setMessage(message, passwordErrors[0], "error");
        return;
      }

      const selectedPlan = form.plan.value;
      const firstName = form.firstName.value.trim();
      const lastName = form.lastName.value.trim();

      if (useDatabase) {
        try {
          const result = await database.signUp({
            email,
            password,
            firstName,
            lastName,
            business: form.business.value.trim(),
            plan: selectedPlan,
          });

          if (result.needsEmailConfirmation) {
            setMessage(message, "Account created. Check your email to confirm the account, then log in.", "success");
            return;
          }

          window.location.href = "/client/portal.html";
        } catch (error) {
          setMessage(message, friendlyAuthError(error, "The account could not be created in Supabase."), "error");
        }

        return;
      }

      const client = {
        id: makeId(),
        firstName,
        lastName,
        name: fullName(firstName, lastName),
        business: form.business.value.trim(),
        email,
        password,
        phone: "",
        address: "",
        plan: selectedPlan,
        planStatus: selectedPlan ? "active" : "none",
        planEnrolledAt: selectedPlan ? today() : "",
        nextBilling: isMonthlySupportPlan(selectedPlan) ? "Monthly" : selectedPlan ? "Project billing" : "",
        tickets: [],
        planRequests: [],
        createdAt: today(),
        updatedAt: today(),
      };

      writeClients([...clients, client]);
      setSession(client.id);
      window.location.href = "/client/portal.html";
    });
  };

  const initDashboard = async () => {
    let client = useDatabase ? null : getSessionClient();

    if (useDatabase) {
      try {
        const workspace = await database.getClientWorkspace();
        client = database.mapClientWorkspace(workspace);
      } catch {
        await database.signOut().catch(() => {});
        window.location.href = "/client/login.html";
        return;
      }
    }

    if (!client) {
      localStorage.removeItem(sessionKey);
      window.location.href = "/client/login.html";
      return;
    }

    const dashboardMessage = document.querySelector("[data-dashboard-message]");
    const ticketForm = document.querySelector("[data-ticket-form]");
    const profileForm = document.querySelector("[data-profile-form]");
    const planChangeForm = document.querySelector("[data-plan-change-form]");
    const planDetailsDialog = document.querySelector("[data-plan-details-dialog]");
    const profileDialog = document.querySelector("[data-profile-dialog]");
    const ticketChargeDialog = document.querySelector("[data-ticket-charge-dialog]");
    const cancelDialog = document.querySelector("[data-cancel-dialog]");
    const cancelButton = document.querySelector("[data-cancel-confirm-button]");
    const cancelCheckbox = document.querySelector("[data-cancel-confirm]");

    const hasActivePlan = () => Boolean(client.plan && client.planStatus === "active");

    const renderTickets = () => {
      const ticketList = document.querySelector("[data-ticket-list]");
      const tickets = client.tickets || [];
      const openTicketCount = tickets.filter((ticket) => ticket.status !== "Closed").length;
      const ticketCoverage = isMonthlySupportPlan(client.plan) && client.planStatus === "active"
        ? { label: `Ticket covered by ${plans[client.plan]?.title || "active support plan"}`, className: "is-covered" }
        : { label: "Ticket not covered", className: "is-not-covered" };

      document.querySelector("[data-open-ticket-count]").textContent = String(openTicketCount);

      if (!tickets.length) {
        ticketList.innerHTML = '<p class="client-empty-state">No tickets submitted yet.</p>';
        return;
      }

      ticketList.innerHTML = tickets
        .slice()
        .reverse()
        .map(
          (ticket) => `
            <article class="client-ticket-item">
              <div>
                <span>${escapeHtml(ticket.id)} · ${escapeHtml(ticket.priority)}</span>
                <h3>${escapeHtml(ticket.title)}</h3>
                <p>${escapeHtml(ticket.type)} · ${escapeHtml(ticket.createdAt)}</p>
                <p class="client-ticket-billing ${ticketCoverage.className}">${ticketCoverage.label}</p>
                ${
                  ticket.screenshot
                    ? `<p class="client-ticket-attachment">Screenshot: ${escapeHtml(ticket.screenshot.name)} (${escapeHtml(ticket.screenshot.size)})</p>`
                    : ticket.screenshotPath
                      ? '<p class="client-ticket-attachment">Screenshot uploaded.</p>'
                    : ""
                }
              </div>
              <strong>${escapeHtml(ticket.status)}</strong>
            </article>
          `
        )
        .join("");
    };

    const render = () => {
      const plan = plans[client.plan];
      const activePlan = hasActivePlan();
      const hasIncludedUpdates = activePlan && isMonthlySupportPlan(client.plan);

      document.querySelector("[data-client-name]").textContent = client.name || "client";
      document.querySelector("[data-client-business]").textContent =
        client.business || "True Page client workspace";
      document.querySelector("[data-plan-title]").textContent = plan?.title || "Choose a plan";
      document.querySelector("[data-plan-description]").textContent =
        activePlan && plan ? plan.shortDescription : "Select a plan to unlock work tickets.";
      document.querySelector("[data-plan-price]").textContent =
        activePlan && plan ? plan.price : "Pricing available after plan selection.";
      document.querySelector("[data-plan-status]").textContent = activePlan
        ? "Active plan"
        : client.planStatus === "cancelled"
          ? "Cancelled"
          : "Plan needed";
      document.querySelector("[data-plan-member-since]").textContent =
        activePlan ? client.planEnrolledAt || client.createdAt || "Not recorded" : "Not enrolled";
      document.querySelector("[data-plan-next-billing]").textContent =
        activePlan ? client.nextBilling || (hasIncludedUpdates ? "Monthly" : "Project billing") : "Not scheduled";
      document.querySelector("[data-plan-ticket-coverage]").textContent =
        activePlan && hasIncludedUpdates ? `Included with ${plan?.title || "active support plan"}` : activePlan ? "Quoted per ticket" : "Plan required";
      document.querySelector("[data-plan-open-tickets]").textContent = String(
        (client.tickets || []).filter((ticket) => ticket.status !== "Closed").length
      );
      document.querySelector("[data-ticket-access]").textContent = activePlan ? "Tickets open" : "Plan required";
      document.querySelector("[data-paid-ticket-notice]").classList.toggle("is-hidden", !activePlan || hasIncludedUpdates);
      document.querySelector("[data-preferred-response]").textContent = activePlan && plan ? plan.response : "After plan setup";
      document.querySelector("[data-last-saved]").textContent = client.updatedAt || "Not saved yet";
      document.querySelector("[data-no-plan-panel]").classList.toggle("is-hidden", activePlan);
      document.querySelector("[data-plan-details-open]").disabled = !plan;

      ticketForm.querySelectorAll("input, select, textarea, button").forEach((field) => {
        field.disabled = !activePlan;
      });

      document.querySelector("[data-cancel-open]").disabled = !activePlan;

      document.querySelector("[data-profile-name]").textContent = client.name || "Not provided";
      document.querySelector("[data-profile-business]").textContent = client.business || "Not provided";
      document.querySelector("[data-profile-email]").textContent = client.email || "Not provided";
      document.querySelector("[data-profile-phone]").textContent = client.phone || "Not provided";
      document.querySelector("[data-profile-address]").textContent = client.address || "Not provided";

      document.querySelector("[data-plan-details-title]").textContent = plan?.title || "Choose a plan";
      document.querySelector("[data-plan-details-price]").textContent =
        plan?.price || "Pricing available after plan selection.";
      document.querySelector("[data-plan-details-description]").textContent =
        plan?.description || "Select a plan to see pricing, included services, and expected response details.";
      document.querySelector("[data-plan-details-list]").innerHTML = (plan?.details || [
        "Ticket access begins after a plan is active.",
        "Use the plan request buttons to contact me about setup.",
      ])
        .map((detail) => `<li>${escapeHtml(detail)}</li>`)
        .join("");

      profileForm.firstName.value = client.firstName || client.name?.split(" ")[0] || "";
      profileForm.lastName.value = client.lastName || client.name?.split(" ").slice(1).join(" ") || "";
      profileForm.business.value = client.business || "";
      profileForm.email.value = client.email || "";
      profileForm.phone.value = client.phone || "";
      profileForm.address.value = client.address || "";

      renderTickets();
    };

    const reloadDatabaseClient = async () => {
      const workspace = await database.getClientWorkspace();
      client = database.mapClientWorkspace(workspace);
      render();
    };

    const refreshClient = (updatedClient) => {
      client = useDatabase ? updatedClient : saveClient(updatedClient);
      render();
    };

    document.querySelector("[data-client-logout]")?.addEventListener("click", async () => {
      if (useDatabase) {
        await database.signOut().catch(() => {});
      }

      localStorage.removeItem(sessionKey);
      window.location.href = "/client/login.html";
    });

    document.querySelector("[data-plan-details-open]")?.addEventListener("click", () => {
      if (planDetailsDialog instanceof HTMLDialogElement) {
        planDetailsDialog.showModal();
      }
    });

    document.querySelectorAll("[data-plan-details-close]").forEach((button) => {
      button.addEventListener("click", () => planDetailsDialog?.close());
    });

    document.querySelector("[data-profile-edit-open]")?.addEventListener("click", () => {
      render();

      if (profileDialog instanceof HTMLDialogElement) {
        profileDialog.showModal();
      }
    });

    document.querySelectorAll("[data-profile-edit-close]").forEach((button) => {
      button.addEventListener("click", () => profileDialog?.close());
    });

    document.querySelector("[data-ticket-charge-open]")?.addEventListener("click", () => {
      if (ticketChargeDialog instanceof HTMLDialogElement) {
        ticketChargeDialog.showModal();
      }
    });

    document.querySelectorAll("[data-ticket-charge-close]").forEach((button) => {
      button.addEventListener("click", () => ticketChargeDialog?.close());
    });

    ticketForm?.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!hasActivePlan()) {
        setMessage(dashboardMessage, "Choose a plan before submitting work tickets.", "error");
        return;
      }

      const form = event.currentTarget;
      const screenshotFile = form.elements.screenshot.files[0];
      let screenshot = null;

      if (useDatabase) {
        const billingNotice =
          isMonthlySupportPlan(client.plan)
            ? "Ticket covered by active support plan"
            : "Ticket not covered";

        try {
          await database.createTicket({
            title: form.title.value.trim(),
            type: form.type.value,
            priority: form.priority.value,
            details: form.details.value.trim(),
            billingNotice,
            screenshotFile,
          });
          await reloadDatabaseClient();
          form.reset();
          setMessage(
            dashboardMessage,
            isMonthlySupportPlan(client.plan)
              ? "Ticket submitted."
              : "Ticket submitted. Because you do not have an unlimited support plan, this request will be reviewed and an additional charge will be requested before paid work begins.",
            "success"
          );
        } catch (error) {
          setMessage(dashboardMessage, error.message || "The ticket could not be submitted.", "error");
        }

        return;
      }

      try {
        screenshot = await readScreenshotFile(screenshotFile);
      } catch (error) {
        setMessage(dashboardMessage, error.message, "error");
        return;
      }

      const ticket = {
        id: `TP-${String(Date.now()).slice(-6)}`,
        title: form.title.value.trim(),
        type: form.type.value,
        priority: form.priority.value,
        details: form.details.value.trim(),
        screenshot,
        billingNotice:
          isMonthlySupportPlan(client.plan)
            ? "Ticket covered by active support plan"
            : "Ticket not covered",
        status: "Open",
        createdAt: today(),
      };

      refreshClient({ ...client, tickets: [...(client.tickets || []), ticket] });
      form.reset();
      setMessage(
        dashboardMessage,
        isMonthlySupportPlan(client.plan)
          ? "Ticket submitted locally."
          : "Ticket submitted locally. Because you do not have an unlimited support plan, this request will be reviewed and an additional charge will be requested before paid work begins.",
        "success"
      );
    });

    profileForm?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const email = normalizeEmail(form.email.value);

      if (useDatabase) {
        try {
          await database.updateProfile({
            firstName: form.firstName.value.trim(),
            lastName: form.lastName.value.trim(),
            business: form.business.value.trim(),
            email,
            phone: form.phone.value.trim(),
            address: form.address.value.trim(),
          });
          await reloadDatabaseClient();
          profileDialog?.close();
          setMessage(dashboardMessage, "Personal information saved.", "success");
        } catch (error) {
          setMessage(dashboardMessage, error.message || "Personal information could not be saved.", "error");
        }

        return;
      }

      const emailBelongsToOtherClient = readClients().some(
        (account) => account.id !== client.id && account.email === email
      );

      if (emailBelongsToOtherClient) {
        setMessage(dashboardMessage, "That email is already used by another local account.", "error");
        return;
      }

      refreshClient({
        ...client,
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        name: fullName(form.firstName.value.trim(), form.lastName.value.trim()),
        business: form.business.value.trim(),
        email,
        phone: form.phone.value.trim(),
        address: form.address.value.trim(),
      });
      profileDialog?.close();
      setMessage(dashboardMessage, "Personal information saved.", "success");
    });

    planChangeForm?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const request = {
        id: makeId(),
        plan: form.plan.value,
        notes: form.notes.value.trim(),
        createdAt: today(),
        status: "Requested",
      };

      if (useDatabase) {
        try {
          await database.createPlanRequest({ plan: request.plan, notes: request.notes });
          await reloadDatabaseClient();
          form.reset();
          setMessage(dashboardMessage, `Plan request sent for ${plans[request.plan].title}.`, "success");
        } catch (error) {
          setMessage(dashboardMessage, error.message || "Plan request could not be sent.", "error");
        }

        return;
      }

      refreshClient({
        ...client,
        planRequests: [...(client.planRequests || []), request],
        plan: request.plan,
        planStatus: "active",
        planEnrolledAt: client.planEnrolledAt || today(),
        nextBilling: isMonthlySupportPlan(request.plan) ? "Monthly" : "Project billing",
      });
      form.reset();
      setMessage(dashboardMessage, `Plan request saved for ${plans[request.plan].title}.`, "success");
    });

    document.querySelectorAll("[data-plan-request]").forEach((button) => {
      button.addEventListener("click", async () => {
        const planId = button.dataset.planRequest;

        if (useDatabase) {
          try {
            await database.createPlanRequest({ plan: planId, notes: "Requested from client home." });
            await reloadDatabaseClient();
            setMessage(dashboardMessage, `${plans[planId].title} request sent.`, "success");
          } catch (error) {
            setMessage(dashboardMessage, error.message || "Plan request could not be sent.", "error");
          }

          return;
        }

        refreshClient({
          ...client,
          plan: planId,
          planStatus: "active",
          planEnrolledAt: client.planEnrolledAt || today(),
          nextBilling: isMonthlySupportPlan(planId) ? "Monthly" : "Project billing",
          planRequests: [
            ...(client.planRequests || []),
            { id: makeId(), plan: planId, notes: "Requested from client home.", createdAt: today(), status: "Requested" },
          ],
        });
        setMessage(dashboardMessage, `${plans[planId].title} request saved.`, "success");
      });
    });

    document.querySelector("[data-cancel-open]")?.addEventListener("click", () => {
      if (cancelDialog instanceof HTMLDialogElement) {
        cancelCheckbox.checked = false;
        cancelButton.disabled = true;
        cancelDialog.showModal();
      }
    });

    document.querySelectorAll("[data-cancel-close]").forEach((button) => {
      button.addEventListener("click", () => cancelDialog?.close());
    });

    cancelCheckbox?.addEventListener("change", () => {
      cancelButton.disabled = !cancelCheckbox.checked;
    });

    cancelButton?.addEventListener("click", async () => {
      if (useDatabase) {
        try {
          await database.cancelCurrentPlan();
          await reloadDatabaseClient();
          cancelDialog?.close();
          setMessage(dashboardMessage, "Plan cancelled. Ticket access is now paused.", "success");
        } catch (error) {
          setMessage(dashboardMessage, error.message || "Plan could not be cancelled.", "error");
        }

        return;
      }

      refreshClient({ ...client, planStatus: "cancelled" });
      cancelDialog?.close();
      setMessage(dashboardMessage, "Plan cancelled locally. Ticket access is now paused.", "success");
    });

    render();
  };

  const view = document.body.dataset.clientView;

  if (view === "auth") {
    initAuth();
  }

  if (view === "dashboard") {
    initDashboard();
  }
})();
