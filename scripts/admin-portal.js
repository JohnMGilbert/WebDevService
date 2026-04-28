(() => {
  const clientKey = "truePageClientAccounts";
  const adminSessionKey = "truePageAdminSession";
  const ownerEmail = "owner@truepageweb.com";
  const ownerPassword = "Admin-demo!9";
  const closedGraceMs = 60 * 60 * 1000;
  const database = window.truePageDatabase;
  const useDatabase = Boolean(database?.isConfigured);

  const plans = {
    "local-launch": { title: "Local Launch", price: "Starting at $750" },
    "growth-website": { title: "Growth Website", price: "Starting at $1,400" },
    "care-plan": { title: "Care Plan", price: "From $62.50/mo" },
  };

  const today = () => new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const now = () => Date.now();
  const normalizeEmail = (email) => email.trim().toLowerCase();
  const escapeHtml = (value) =>
    String(value ?? "")
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

  const setMessage = (element, message, tone = "neutral") => {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.dataset.tone = tone;
  };

  const planTitle = (client) => {
    if (client.planStatus === "cancelled") {
      return "Cancelled";
    }

    return plans[client.plan]?.title || "No plan";
  };

  const paymentStatus = (client) => {
    if (client.planStatus === "cancelled") {
      return "Cancelled";
    }

    if (!client.plan) {
      return "Plan needed";
    }

    return client.paymentStatus || (client.plan === "care-plan" ? "Monthly active" : "Project billing");
  };

  const ticketCoverage = (client) =>
    client.plan === "care-plan" && client.planStatus === "active"
      ? { label: "Ticket covered by Care Plan", className: "is-covered" }
      : { label: "Ticket not covered", className: "is-not-covered" };

  const ticketDetailUrl = (clientId, ticketId) =>
    `/admin/ticket.html?client=${encodeURIComponent(clientId)}&ticket=${encodeURIComponent(ticketId)}`;

  const findTicketRecord = (clients, clientId, ticketId) => {
    const client = clients.find((item) => item.id === clientId);
    const ticket = client?.tickets?.find((item) => item.id === ticketId);

    return { client, ticket };
  };

  const ticketClosedAt = (ticket) => Number(ticket.closedAt || 0);
  const isTicketClosed = (ticket) => ticket.status === "Closed";
  const isTicketInUndoWindow = (ticket) => isTicketClosed(ticket) && ticketClosedAt(ticket) > 0 && now() - ticketClosedAt(ticket) < closedGraceMs;
  const closedMinutesRemaining = (ticket) => Math.max(1, Math.ceil((closedGraceMs - (now() - ticketClosedAt(ticket))) / 60000));

  const updateTicketStatus = (client, ticketId, status) => ({
    ...client,
    tickets: (client.tickets || []).map((ticket) => {
      if (ticket.id !== ticketId) {
        return ticket;
      }

      if (status === "Closed") {
        return { ...ticket, status, closedAt: now() };
      }

      const { closedAt, ...ticketWithoutClosedAt } = ticket;
      return { ...ticketWithoutClosedAt, status };
    }),
  });

  const confirmTicketClose = () =>
    window.confirm(
      "Close this ticket? It will be greyed out for one hour with an undo option before leaving the active queue."
    );

  const markClientPaidCurrent = (client) => {
    if (client.planStatus === "cancelled") {
      return {
        ...client,
        paymentStatus: "Cancelled",
        nextPayment: "Not scheduled",
        lastPaymentUpdate: today(),
      };
    }

    if (!client.plan) {
      return {
        ...client,
        paymentStatus: "Plan needed",
        nextPayment: "Not scheduled",
        lastPaymentUpdate: today(),
      };
    }

    return {
      ...client,
      paymentStatus: client.plan === "care-plan" ? "Monthly active" : "Paid/current",
      nextPayment: client.plan === "care-plan" ? client.nextPayment || "Next monthly billing cycle" : "No balance due",
      lastPaymentUpdate: today(),
    };
  };

  const fulfillLocalPlanRequest = (client, requestId) => {
    const request = (client.planRequests || []).find((item) => item.id === requestId);

    if (!request) {
      return client;
    }

    return {
      ...client,
      plan: request.plan,
      planStatus: "active",
      planEnrolledAt: today(),
      nextPayment: request.plan === "care-plan" ? "Monthly" : "Project billing",
      paymentStatus: request.plan === "care-plan" ? "Monthly active" : "Paid/current",
      lastPaymentUpdate: today(),
      planRequests: (client.planRequests || []).map((item) =>
        item.id === requestId ? { ...item, status: "Fulfilled" } : item
      ),
    };
  };

  const seedAdminDemoClients = () => {
    const clients = readClients();
    const existingEmails = new Set(clients.map((client) => client.email));
    const demoClients = [
      {
        id: "admin-demo-care",
        firstName: "Riley",
        lastName: "Parker",
        name: "Riley Parker",
        business: "Parker Home Services",
        email: "demo@truepageweb.com",
        password: "demo123",
        phone: "(575) 555-0142",
        address: "102 Market Street, Las Cruces, NM 88001",
        plan: "care-plan",
        planStatus: "active",
        paymentStatus: "Monthly active",
        nextPayment: "May 1, 2026",
        internalNotes: "Prefers email. Usually sends photo assets before tickets.",
        tickets: [
          {
            id: "TP-1042",
            title: "Swap spring photos on services page",
            type: "Content update",
            priority: "Normal",
            details: "Replace the three service cards with the new images from our shared folder.",
            billingNotice: "Ticket covered by Care Plan",
            status: "Open",
            createdAt: today(),
          },
        ],
        planRequests: [],
        createdAt: today(),
        updatedAt: today(),
      },
      {
        id: "admin-demo-growth",
        firstName: "Morgan",
        lastName: "Lee",
        name: "Morgan Lee",
        business: "Mesa Verde Therapy",
        email: "morgan@example.com",
        password: "Local-demo!9",
        phone: "(505) 555-0188",
        address: "18 Cottonwood Lane, Albuquerque, NM 87104",
        plan: "growth-website",
        planStatus: "active",
        paymentStatus: "Deposit paid",
        nextPayment: "Final invoice pending",
        internalNotes: "Needs HIPAA-conscious wording review before launch.",
        tickets: [
          {
            id: "TP-2091",
            title: "Add telehealth callout",
            type: "New page or section",
            priority: "High",
            details: "Add a visible telehealth section to the services page.",
            screenshot: { name: "services-markup.png", size: "318 KB", type: "image/png" },
            billingNotice: "Ticket not covered",
            status: "Open",
            createdAt: today(),
          },
        ],
        planRequests: [{ id: "request-2091", plan: "care-plan", notes: "Considering care plan after launch.", createdAt: today(), status: "Requested" }],
        createdAt: today(),
        updatedAt: today(),
      },
      {
        id: "admin-demo-none",
        firstName: "Avery",
        lastName: "Stone",
        name: "Avery Stone",
        business: "Stone Desert Goods",
        email: "avery@example.com",
        password: "Local-demo!9",
        phone: "(520) 555-0164",
        address: "711 Agave Road, Tucson, AZ 85701",
        plan: "",
        planStatus: "none",
        paymentStatus: "Plan needed",
        nextPayment: "Not scheduled",
        internalNotes: "New lead. Wants pricing clarity before first project.",
        tickets: [],
        planRequests: [],
        createdAt: today(),
        updatedAt: today(),
      },
    ];

    const nextClients = [...clients];

    demoClients.forEach((client) => {
      if (!existingEmails.has(client.email)) {
        nextClients.push(client);
      }
    });

    writeClients(nextClients);
    return nextClients;
  };

  const flattenTickets = (clients) =>
    clients.flatMap((client) =>
      (client.tickets || []).map((ticket) => ({
        ...ticket,
        clientId: client.id,
        clientName: client.name || "Unnamed client",
        business: client.business || "No business",
        plan: client.plan,
        planTitle: planTitle(client),
        coverage: ticketCoverage(client),
      }))
    );

  const requireAdmin = () => {
    const session = localStorage.getItem(adminSessionKey);

    if (session !== "active") {
      window.location.href = "/admin/login.html";
      return false;
    }

    return true;
  };

  const requireAdminAccess = async () => {
    if (!useDatabase) {
      return requireAdmin();
    }

    try {
      const profile = await database.getProfile();

      if (profile.role !== "admin") {
        await database.signOut().catch(() => {});
        localStorage.removeItem(adminSessionKey);
        window.location.href = "/admin/login.html";
        return false;
      }

      localStorage.setItem(adminSessionKey, "active");
      return true;
    } catch {
      localStorage.removeItem(adminSessionKey);
      window.location.href = "/admin/login.html";
      return false;
    }
  };

  const initAuth = () => {
    if (!useDatabase) {
      seedAdminDemoClients();
    }

    const message = document.querySelector("[data-admin-auth-message]");

    document.querySelector("[data-admin-demo-login]")?.addEventListener("click", () => {
      if (useDatabase) {
        setMessage(message, "Demo owner login is local-only. Use your Supabase admin account.", "error");
        return;
      }

      localStorage.setItem(adminSessionKey, "active");
      window.location.href = "/admin/dashboard.html";
    });

    document.querySelector("[data-admin-login-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      const email = normalizeEmail(form.email.value);
      const password = form.password.value;

      if (useDatabase) {
        try {
          await database.signIn(email, password);
          const profile = await database.getProfile();

          if (profile.role !== "admin") {
            await database.signOut().catch(() => {});
            setMessage(message, "That account is not marked as an admin in Supabase.", "error");
            return;
          }

          localStorage.setItem(adminSessionKey, "active");
          window.location.href = "/admin/dashboard.html";
        } catch (error) {
          setMessage(message, error.message || "Owner email or password did not match Supabase.", "error");
        }

        return;
      }

      if (email !== ownerEmail || password !== ownerPassword) {
        setMessage(message, "Owner email or password did not match the local admin account.", "error");
        return;
      }

      localStorage.setItem(adminSessionKey, "active");
      window.location.href = "/admin/dashboard.html";
    });
  };

  const initDashboard = async () => {
    if (!(await requireAdminAccess())) {
      return;
    }

    let clients = useDatabase ? [] : seedAdminDemoClients();
    let selectedClientId = clients[0]?.id || "";

    const clientList = document.querySelector("[data-admin-client-list]");
    const ticketList = document.querySelector("[data-admin-ticket-list]");
    const paymentList = document.querySelector("[data-admin-payment-list]");
    const selectedPanel = document.querySelector("[data-admin-selected-client]");
    const selectedName = document.querySelector("[data-admin-selected-name]");
    const searchInput = document.querySelector("[data-admin-client-search]");
    const planFilter = document.querySelector("[data-admin-plan-filter]");
    const ticketFilter = document.querySelector("[data-admin-ticket-filter]");
    const ticketClientFilter = document.querySelector("[data-admin-ticket-client-filter]");

    const loadDatabaseClients = async () => {
      if (!useDatabase) {
        return;
      }

      clients = (await database.listAdminClients()).map((profile) => database.mapAdminClient(profile));

      if (!clients.some((client) => client.id === selectedClientId)) {
        selectedClientId = clients[0]?.id || "";
      }
    };

    const saveClient = (updatedClient) => {
      clients = clients.map((client) => (client.id === updatedClient.id ? { ...updatedClient, updatedAt: today() } : client));
      writeClients(clients);
      render();
    };

    const filteredClients = () => {
      const searchTerm = searchInput.value.trim().toLowerCase();
      const selectedPlan = planFilter.value;

      return clients.filter((client) => {
        const text = `${client.name || ""} ${client.business || ""} ${client.email || ""}`.toLowerCase();
        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesPlan =
          selectedPlan === "all" ||
          (selectedPlan === "none" && !client.plan && client.planStatus !== "cancelled") ||
          (selectedPlan === "cancelled" && client.planStatus === "cancelled") ||
          client.plan === selectedPlan;

        return matchesSearch && matchesPlan;
      });
    };

    const filteredTickets = () => {
      const selectedStatus = ticketFilter.value;
      const selectedClient = ticketClientFilter.value;

      return flattenTickets(clients)
        .filter((ticket) => selectedClient === "all" || ticket.clientId === selectedClient)
        .filter((ticket) => {
          if (selectedStatus === "all") {
            return true;
          }

          if (selectedStatus === "paid-review") {
            return ticket.coverage.className === "is-not-covered" && (!isTicketClosed(ticket) || isTicketInUndoWindow(ticket));
          }

          if (selectedStatus === "closed") {
            return isTicketClosed(ticket);
          }

          return !isTicketClosed(ticket) || isTicketInUndoWindow(ticket);
        })
        .reverse();
    };

    const renderTicketClientFilter = () => {
      const currentValue = ticketClientFilter.value || "all";
      const sortedClients = [...clients].sort((a, b) =>
        (a.business || a.name || "").localeCompare(b.business || b.name || "")
      );

      ticketClientFilter.innerHTML = [
        '<option value="all">All clients</option>',
        ...sortedClients.map((client) => {
          const label = client.business || client.name || client.email || "Unnamed client";
          return `<option value="${escapeHtml(client.id)}">${escapeHtml(label)}</option>`;
        }),
      ].join("");

      ticketClientFilter.value = clients.some((client) => client.id === currentValue) ? currentValue : "all";
    };

    const renderStats = () => {
      const tickets = flattenTickets(clients);

      document.querySelector("[data-admin-total-clients]").textContent = String(clients.length);
      document.querySelector("[data-admin-open-tickets]").textContent = String(tickets.filter((ticket) => !isTicketClosed(ticket)).length);
      document.querySelector("[data-admin-care-plans]").textContent = String(
        clients.filter((client) => client.plan === "care-plan" && client.planStatus === "active").length
      );
      document.querySelector("[data-admin-payment-followups]").textContent = String(
        clients.filter((client) => paymentStatus(client).toLowerCase().includes("pending") || paymentStatus(client).toLowerCase().includes("needed")).length
      );
    };

    const renderClients = () => {
      const visibleClients = filteredClients();

      if (!visibleClients.length) {
        clientList.innerHTML = '<p class="client-empty-state">No clients match those filters.</p>';
        return;
      }

      clientList.innerHTML = visibleClients
        .map(
          (client) => `
            <button class="admin-client-card ${client.id === selectedClientId ? "is-selected" : ""}" type="button" data-admin-select-client="${escapeHtml(client.id)}">
              <span>${escapeHtml(planTitle(client))}</span>
              <strong>${escapeHtml(client.name || "Unnamed client")}</strong>
              <small>${escapeHtml(client.business || "No business")} · ${escapeHtml(client.email || "No email")}</small>
            </button>
          `
        )
        .join("");
    };

    const renderTickets = () => {
      const tickets = filteredTickets();

      if (!tickets.length) {
        ticketList.innerHTML = '<p class="client-empty-state">No tickets in this view.</p>';
        return;
      }

      ticketList.innerHTML = tickets
        .map(
          (ticket) => {
            const isClosing = isTicketInUndoWindow(ticket);

            return `
            <article class="admin-ticket-card ${isClosing ? "is-closing" : ""}">
              <div>
                <span>${escapeHtml(ticket.id)} · ${escapeHtml(ticket.priority)} · ${escapeHtml(ticket.planTitle)}</span>
                <h3>${escapeHtml(ticket.title)}</h3>
                <p>${escapeHtml(ticket.business)} · ${escapeHtml(ticket.clientName)}</p>
                <p class="client-ticket-billing ${ticket.coverage.className}">${escapeHtml(ticket.coverage.label)}</p>
                ${ticket.screenshot ? `<p class="client-ticket-attachment">Screenshot: ${escapeHtml(ticket.screenshot.name)} (${escapeHtml(ticket.screenshot.size)})</p>` : ticket.screenshotPath ? '<p class="client-ticket-attachment">Screenshot uploaded.</p>' : ""}
                ${isClosing ? `<p class="admin-ticket-closing-note">Closed. Leaves the active queue in about ${closedMinutesRemaining(ticket)} minutes.</p>` : ""}
              </div>
              <div class="admin-ticket-actions">
                <a class="admin-action-link" href="${ticketDetailUrl(ticket.clientId, ticket.id)}">View details</a>
                ${isClosing ? `<button type="button" data-admin-undo-close="${escapeHtml(ticket.clientId)}::${escapeHtml(ticket.id)}">Undo close</button>` : ""}
                <label>
                  Status
                  <select data-admin-ticket-status="${escapeHtml(ticket.clientId)}::${escapeHtml(ticket.id)}">
                    <option value="Open" ${ticket.status === "Open" ? "selected" : ""}>Open</option>
                    <option value="In Progress" ${ticket.status === "In Progress" ? "selected" : ""}>In Progress</option>
                    <option value="Closed" ${ticket.status === "Closed" ? "selected" : ""}>Closed</option>
                  </select>
                </label>
              </div>
            </article>
          `;
          }
        )
        .join("");
    };

    const renderSelectedClient = () => {
      const client = clients.find((item) => item.id === selectedClientId) || clients[0];

      if (!client) {
        selectedName.textContent = "No clients yet.";
        selectedPanel.innerHTML = '<p class="client-empty-state">Create a client account to populate this dashboard.</p>';
        return;
      }

      selectedClientId = client.id;
      selectedName.textContent = client.name || "Unnamed client";

      const tickets = client.tickets || [];
      const planRequests = client.planRequests || [];

      selectedPanel.innerHTML = `
        <div class="admin-detail-stack">
          <section>
            <h3>Personal information</h3>
            <ul class="admin-info-list">
              <li><span>Business</span><strong>${escapeHtml(client.business || "Not provided")}</strong></li>
              <li><span>Email</span><strong>${escapeHtml(client.email || "Not provided")}</strong></li>
              <li><span>Phone</span><strong>${escapeHtml(client.phone || "Not provided")}</strong></li>
              <li><span>Address</span><strong>${escapeHtml(client.address || "Not provided")}</strong></li>
            </ul>
          </section>
          <section>
            <h3>Plan and payment</h3>
            <ul class="admin-info-list">
              <li><span>Plan</span><strong>${escapeHtml(planTitle(client))}</strong></li>
              <li><span>Pricing</span><strong>${escapeHtml(plans[client.plan]?.price || "Not set")}</strong></li>
              <li><span>Payment</span><strong>${escapeHtml(paymentStatus(client))}</strong></li>
              <li><span>Next payment</span><strong>${escapeHtml(client.nextPayment || "Not scheduled")}</strong></li>
              <li><span>Last update</span><strong>${escapeHtml(client.lastPaymentUpdate || client.updatedAt || "Not recorded")}</strong></li>
            </ul>
          </section>
          <section>
            <h3>Plan requests</h3>
            ${
              planRequests.length
                ? `<ul class="admin-mini-list">${planRequests
                    .map(
                      (request) => `
                        <li>
                          <span>${escapeHtml(plans[request.plan]?.title || request.plan)} · ${escapeHtml(request.status)} · ${escapeHtml(request.createdAt)}</span>
                          ${
                            request.status === "Requested"
                              ? `<button type="button" data-admin-fulfill-plan="${escapeHtml(client.id)}::${escapeHtml(request.id)}">Fulfill</button>`
                              : ""
                          }
                        </li>
                      `
                    )
                    .join("")}</ul>`
                : '<p class="client-empty-state">No plan requests.</p>'
            }
          </section>
          <section>
            <h3>Internal notes</h3>
            <form class="client-form" data-admin-note-form="${escapeHtml(client.id)}">
              <textarea name="notes" rows="4">${escapeHtml(client.internalNotes || "")}</textarea>
              <button class="client-button client-button-secondary" type="submit">Save owner notes</button>
            </form>
          </section>
          <section>
            <h3>Tickets</h3>
            ${
              tickets.length
                ? `<ul class="admin-mini-list">${tickets
                    .map((ticket) => `<li>${escapeHtml(ticket.id)} · ${escapeHtml(ticket.title)} · ${escapeHtml(ticket.status)}</li>`)
                    .join("")}</ul>`
                : '<p class="client-empty-state">No tickets yet.</p>'
            }
          </section>
        </div>
      `;
    };

    const renderPayments = () => {
      paymentList.innerHTML = clients
        .map(
          (client) => `
            <article class="admin-payment-row">
              <div>
                <span>${escapeHtml(planTitle(client))}</span>
                <strong>${escapeHtml(client.business || client.name || "Unnamed client")}</strong>
                <small>${escapeHtml(plans[client.plan]?.price || "No pricing")} · ${escapeHtml(paymentStatus(client))} · Updated ${escapeHtml(client.lastPaymentUpdate || client.updatedAt || "not recorded")}</small>
              </div>
              <button type="button" data-admin-mark-paid="${escapeHtml(client.id)}">Mark paid/current</button>
            </article>
          `
        )
        .join("");
    };

    const render = () => {
      renderStats();
      renderClients();
      renderTicketClientFilter();
      renderTickets();
      renderSelectedClient();
      renderPayments();
    };

    document.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
      if (useDatabase) {
        await database.signOut().catch(() => {});
      }

      localStorage.removeItem(adminSessionKey);
      window.location.href = "/admin/login.html";
    });

    searchInput.addEventListener("input", renderClients);
    planFilter.addEventListener("change", renderClients);
    ticketFilter.addEventListener("change", renderTickets);
    ticketClientFilter.addEventListener("change", renderTickets);

    document.addEventListener("click", async (event) => {
      const selectButton = event.target.closest("[data-admin-select-client]");
      const paidButton = event.target.closest("[data-admin-mark-paid]");
      const fulfillButton = event.target.closest("[data-admin-fulfill-plan]");
      const undoButton = event.target.closest("[data-admin-undo-close]");

      if (selectButton) {
        selectedClientId = selectButton.dataset.adminSelectClient;
        render();
      }

      if (paidButton) {
        const client = clients.find((item) => item.id === paidButton.dataset.adminMarkPaid);

        if (!client) {
          return;
        }

        if (useDatabase) {
          if (!client.planId) {
            return;
          }

          await database.markPlanPaidCurrent(client.planId, client.plan === "care-plan" ? "Monthly active" : "Paid/current");
          selectedClientId = client.id;
          await loadDatabaseClients();
          render();
          return;
        }

        selectedClientId = client.id;
        saveClient(markClientPaidCurrent(client));
      }

      if (fulfillButton) {
        const [clientId, requestId] = fulfillButton.dataset.adminFulfillPlan.split("::");
        const client = clients.find((item) => item.id === clientId);
        const request = client?.planRequests?.find((item) => item.id === requestId);

        if (!client || !request) {
          return;
        }

        if (useDatabase) {
          await database.fulfillPlanRequest({ clientId, requestId, plan: request.plan });
          selectedClientId = clientId;
          await loadDatabaseClients();
          render();
          return;
        }

        selectedClientId = clientId;
        saveClient(fulfillLocalPlanRequest(client, requestId));
      }

      if (undoButton) {
        const [clientId, ticketId] = undoButton.dataset.adminUndoClose.split("::");
        const client = clients.find((item) => item.id === clientId);

        if (client) {
          if (useDatabase) {
            await database.updateTicketStatus(ticketId, "Open");
            await loadDatabaseClients();
            render();
            return;
          }

          saveClient(updateTicketStatus(client, ticketId, "Open"));
        }
      }
    });

    document.addEventListener("change", async (event) => {
      const statusSelect = event.target.closest("[data-admin-ticket-status]");

      if (statusSelect) {
        const [clientId, ticketId] = statusSelect.dataset.adminTicketStatus.split("::");
        const client = clients.find((item) => item.id === clientId);

        if (!client) {
          return;
        }

        if (statusSelect.value === "Closed" && !confirmTicketClose()) {
          render();
          return;
        }

        if (useDatabase) {
          await database.updateTicketStatus(ticketId, statusSelect.value);
          await loadDatabaseClients();
          render();
          return;
        }

        saveClient(updateTicketStatus(client, ticketId, statusSelect.value));
      }
    });

    document.addEventListener("submit", async (event) => {
      const noteForm = event.target.closest("[data-admin-note-form]");

      if (!noteForm) {
        return;
      }

      event.preventDefault();

      const client = clients.find((item) => item.id === noteForm.dataset.adminNoteForm);

      if (client) {
        if (useDatabase) {
          await database.updateAdminClientNotes(client.id, noteForm.notes.value.trim());
          await loadDatabaseClients();
          render();
          return;
        }

        saveClient({ ...client, internalNotes: noteForm.notes.value.trim() });
      }
    });

    const renderInterval = window.setInterval(render, 60000);
    window.addEventListener("pagehide", () => window.clearInterval(renderInterval));

    if (useDatabase) {
      try {
        await loadDatabaseClients();
      } catch (error) {
        ticketList.innerHTML = `<p class="client-empty-state">${escapeHtml(error.message || "Could not load Supabase admin data.")}</p>`;
      }
    }

    render();
  };

  const initTicketDetail = async () => {
    if (!(await requireAdminAccess())) {
      return;
    }

    let clients = useDatabase ? [] : seedAdminDemoClients();
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get("client") || "";
    const ticketId = params.get("ticket") || "";
    const content = document.querySelector("[data-admin-ticket-detail]");
    const title = document.querySelector("[data-admin-ticket-title]");

    const loadDatabaseClients = async () => {
      if (!useDatabase) {
        return;
      }

      clients = (await database.listAdminClients()).map((profile) => database.mapAdminClient(profile));
    };

    const saveClient = (updatedClient) => {
      clients = clients.map((client) => (client.id === updatedClient.id ? { ...updatedClient, updatedAt: today() } : client));
      writeClients(clients);
      render();
    };

    const renderScreenshot = (ticket) => {
      if (!ticket.screenshot && !ticket.screenshotPath) {
        return '<p class="client-empty-state">No screenshot was attached to this ticket.</p>';
      }

      if (ticket.screenshotPath) {
        return `
          <figure class="admin-ticket-media">
            <img src="" alt="Uploaded screenshot for ${escapeHtml(ticket.title)}" data-admin-screenshot-preview hidden />
            <figcaption>
              <span>Private Supabase file</span>
              <a class="admin-action-link" href="#" data-admin-screenshot-link download="ticket-screenshot">Download image</a>
            </figcaption>
          </figure>
        `;
      }

      const screenshotName = escapeHtml(ticket.screenshot.name || "ticket-screenshot");
      const screenshotSize = escapeHtml(ticket.screenshot.size || "Unknown size");

      if (!ticket.screenshot.dataUrl) {
        return `
          <div class="admin-ticket-media-empty">
            <strong>${screenshotName}</strong>
            <span>${screenshotSize}</span>
            <p>This ticket was created before screenshot previews were stored. New uploaded images will display here.</p>
          </div>
        `;
      }

      return `
        <figure class="admin-ticket-media">
          <img src="${escapeHtml(ticket.screenshot.dataUrl)}" alt="Uploaded screenshot for ${escapeHtml(ticket.title)}" />
          <figcaption>
            <span>${screenshotName} · ${screenshotSize}</span>
            <a class="admin-action-link" href="${escapeHtml(ticket.screenshot.dataUrl)}" download="${screenshotName}">Download image</a>
          </figcaption>
        </figure>
      `;
    };

    const render = () => {
      const { client, ticket } = findTicketRecord(clients, clientId, ticketId);

      if (!client || !ticket) {
        title.textContent = "Ticket not found";
        content.innerHTML = `
          <section class="admin-panel">
            <p class="client-empty-state">This ticket could not be found in local storage.</p>
            <a class="admin-back-link" href="/admin/dashboard.html#tickets">Back to tickets</a>
          </section>
        `;
        return;
      }

      const coverage = ticketCoverage(client);
      const isClosing = isTicketInUndoWindow(ticket);
      title.textContent = ticket.title || ticket.id;

      content.innerHTML = `
        <section class="admin-panel admin-ticket-main ${isClosing ? "is-closing" : ""}">
          <div class="admin-panel-heading">
            <div>
              <p class="client-eyebrow">${escapeHtml(ticket.id)} · ${escapeHtml(ticket.priority || "Normal")}</p>
              <h2>${escapeHtml(ticket.title || "Untitled ticket")}</h2>
            </div>
            <a class="admin-back-link" href="/admin/dashboard.html#tickets">Back to tickets</a>
          </div>
          <p class="client-ticket-billing ${coverage.className}">${escapeHtml(coverage.label)}</p>
          ${isClosing ? `<p class="admin-ticket-closing-note">Closed. This ticket leaves the active queue in about ${closedMinutesRemaining(ticket)} minutes. You can undo it until then.</p>` : ""}
          <dl class="admin-ticket-meta">
            <div><dt>Status</dt><dd>${escapeHtml(ticket.status || "Open")}</dd></div>
            <div><dt>Type</dt><dd>${escapeHtml(ticket.type || "General request")}</dd></div>
            <div><dt>Created</dt><dd>${escapeHtml(ticket.createdAt || "Not recorded")}</dd></div>
            <div><dt>Billing</dt><dd>${escapeHtml(ticket.billingNotice || coverage.label)}</dd></div>
          </dl>
          <div class="admin-ticket-description">
            <h3>Request details</h3>
            <p>${escapeHtml(ticket.details || "No details provided.")}</p>
          </div>
          <div>
            <h3>Uploaded image</h3>
            ${renderScreenshot(ticket)}
          </div>
        </section>

        <aside class="admin-panel admin-ticket-side">
          <section>
            <h2>Client</h2>
            <ul class="admin-info-list">
              <li><span>Name</span><strong>${escapeHtml(client.name || "Unnamed client")}</strong></li>
              <li><span>Business</span><strong>${escapeHtml(client.business || "Not provided")}</strong></li>
              <li><span>Email</span><strong>${escapeHtml(client.email || "Not provided")}</strong></li>
              <li><span>Phone</span><strong>${escapeHtml(client.phone || "Not provided")}</strong></li>
              <li><span>Plan</span><strong>${escapeHtml(planTitle(client))}</strong></li>
              <li><span>Payment</span><strong>${escapeHtml(paymentStatus(client))}</strong></li>
            </ul>
          </section>
          <section>
            <h2>Ticket status</h2>
            <label class="admin-compact-filter">
              Current status
              <select data-admin-detail-ticket-status>
                <option value="Open" ${ticket.status === "Open" ? "selected" : ""}>Open</option>
                <option value="In Progress" ${ticket.status === "In Progress" ? "selected" : ""}>In Progress</option>
                <option value="Closed" ${ticket.status === "Closed" ? "selected" : ""}>Closed</option>
              </select>
            </label>
            ${isClosing ? `<button class="client-button client-button-secondary" type="button" data-admin-detail-undo-close>Undo close</button>` : ""}
          </section>
          <section>
            <h2>Payment</h2>
            <p class="admin-ticket-side-copy">${escapeHtml(plans[client.plan]?.price || "No pricing")} · ${escapeHtml(client.nextPayment || "Not scheduled")}</p>
            <button class="client-button client-button-secondary" type="button" data-admin-detail-mark-paid>Mark paid/current</button>
          </section>
        </aside>
      `;

      if (useDatabase && ticket.screenshotPath) {
        database.createSignedScreenshotUrl(ticket.screenshotPath).then((url) => {
          const preview = document.querySelector("[data-admin-screenshot-preview]");
          const link = document.querySelector("[data-admin-screenshot-link]");

          if (preview) {
            preview.src = url;
            preview.hidden = false;
          }

          if (link) {
            link.href = url;
          }
        });
      }
    };

    document.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
      if (useDatabase) {
        await database.signOut().catch(() => {});
      }

      localStorage.removeItem(adminSessionKey);
      window.location.href = "/admin/login.html";
    });

    document.addEventListener("change", async (event) => {
      const statusSelect = event.target.closest("[data-admin-detail-ticket-status]");

      if (!statusSelect) {
        return;
      }

      const { client, ticket } = findTicketRecord(clients, clientId, ticketId);

      if (!client || !ticket) {
        return;
      }

      if (statusSelect.value === "Closed" && !confirmTicketClose()) {
        render();
        return;
      }

      if (useDatabase) {
        await database.updateTicketStatus(ticket.id, statusSelect.value);
        await loadDatabaseClients();
        render();
        return;
      }

      saveClient(updateTicketStatus(client, ticket.id, statusSelect.value));
    });

    document.addEventListener("click", async (event) => {
      const paidButton = event.target.closest("[data-admin-detail-mark-paid]");
      const undoButton = event.target.closest("[data-admin-detail-undo-close]");

      if (paidButton) {
        const { client } = findTicketRecord(clients, clientId, ticketId);

        if (client) {
          if (useDatabase) {
            if (!client.planId) {
              return;
            }

            await database.markPlanPaidCurrent(client.planId, client.plan === "care-plan" ? "Monthly active" : "Paid/current");
            await loadDatabaseClients();
            render();
            return;
          }

          saveClient(markClientPaidCurrent(client));
        }
      }

      if (undoButton) {
        const { client, ticket } = findTicketRecord(clients, clientId, ticketId);

        if (client && ticket) {
          if (useDatabase) {
            await database.updateTicketStatus(ticket.id, "Open");
            await loadDatabaseClients();
            render();
            return;
          }

          saveClient(updateTicketStatus(client, ticket.id, "Open"));
        }
      }

    });

    const renderInterval = window.setInterval(render, 60000);
    window.addEventListener("pagehide", () => window.clearInterval(renderInterval));

    if (useDatabase) {
      try {
        await loadDatabaseClients();
      } catch (error) {
        title.textContent = "Ticket not found";
        content.innerHTML = `<section class="admin-panel"><p class="client-empty-state">${escapeHtml(error.message || "Could not load Supabase ticket data.")}</p></section>`;
        return;
      }
    }

    render();
  };

  const view = document.body.dataset.adminView;

  if (view === "auth") {
    initAuth();
  }

  if (view === "dashboard") {
    initDashboard();
  }

  if (view === "ticket") {
    initTicketDetail();
  }
})();
