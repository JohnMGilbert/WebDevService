(() => {
  const config = window.truePageSupabaseConfig || {};
  const hasSupabaseSdk = Boolean(window.supabase?.createClient);
  const isConfigured =
    hasSupabaseSdk &&
    typeof config.url === "string" &&
    typeof config.anonKey === "string" &&
    config.url.includes(".supabase.co") &&
    !config.url.includes("YOUR_PROJECT_ID") &&
    !config.anonKey.includes("YOUR_SUPABASE");

  const client = isConfigured
    ? window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  const requireClient = () => {
    if (!client) {
      throw new Error("Supabase is not configured. Copy supabase-config.example.js to supabase-config.js and fill in your project values.");
    }

    return client;
  };

  const getUser = async () => {
    const supabaseClient = requireClient();
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) {
      throw error;
    }

    return data.user;
  };

  const formatDate = (value) => {
    if (!value) {
      return "";
    }

    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const upsertProfile = async (profile) => {
    const supabaseClient = requireClient();
    const user = await getUser();
    const { data, error } = await supabaseClient
      .from("profiles")
      .upsert(
        {
          id: user.id,
          first_name: profile.firstName || "",
          last_name: profile.lastName || "",
          email: profile.email || user.email || "",
          business: profile.business || "",
          phone: profile.phone || "",
          address: profile.address || "",
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  };

  const uploadTicketScreenshot = async (file) => {
    if (!file) {
      return null;
    }

    const supabaseClient = requireClient();
    const user = await getUser();
    const cleanName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
    const path = `${user.id}/${Date.now()}-${cleanName}`;
    const { error } = await supabaseClient.storage.from(config.screenshotBucket || "ticket-screenshots").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw error;
    }

    return path;
  };

  window.truePageDatabase = {
    isConfigured,
    client,

    async getUser() {
      return getUser();
    },

    async signUp({ email, password, firstName, lastName, business, plan }) {
      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            business,
            initial_plan: plan,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        await upsertProfile({ firstName, lastName, business, email });

        if (plan) {
          await supabaseClient.from("client_plans").insert({
            client_id: data.user.id,
            plan,
            status: "active",
            member_since: new Date().toISOString().slice(0, 10),
            next_billing: plan === "care-plan" ? "Monthly" : "Project billing",
            payment_status: plan === "care-plan" ? "Monthly active" : "Project billing",
          });
        }
      }

      return {
        ...data,
        needsEmailConfirmation: Boolean(data.user && !data.session),
      };
    },

    async signIn(email, password) {
      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      return data;
    },

    async signOut() {
      const supabaseClient = requireClient();
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        throw error;
      }
    },

    async getProfile() {
      const supabaseClient = requireClient();
      const user = await getUser();
      const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", user.id).single();

      if (error) {
        throw error;
      }

      return data;
    },

    upsertProfile,

    async updateProfile(profile) {
      return upsertProfile(profile);
    },

    async getCurrentPlan() {
      const supabaseClient = requireClient();
      const user = await getUser();
      const { data, error } = await supabaseClient
        .from("client_plans")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },

    async getClientWorkspace() {
      const supabaseClient = requireClient();
      const user = await getUser();

      if (!user) {
        return null;
      }

      let createdProfile = false;
      let { data: profile, error: profileError } = await supabaseClient.from("profiles").select("*").eq("id", user.id).maybeSingle();

      if (!profile && !profileError) {
        profile = await upsertProfile({
          firstName: user.user_metadata?.first_name || "",
          lastName: user.user_metadata?.last_name || "",
          business: user.user_metadata?.business || "",
          email: user.email || "",
        });
        createdProfile = true;
      }

      if (createdProfile && user.user_metadata?.initial_plan) {
        await supabaseClient.from("client_plans").insert({
          client_id: user.id,
          plan: user.user_metadata.initial_plan,
          status: "active",
          member_since: new Date().toISOString().slice(0, 10),
          next_billing: user.user_metadata.initial_plan === "care-plan" ? "Monthly" : "Project billing",
          payment_status: user.user_metadata.initial_plan === "care-plan" ? "Monthly active" : "Project billing",
        });
      }

      const [{ data: currentPlan, error: planError }, { data: tickets, error: ticketsError }, { data: planRequests, error: requestsError }] =
        await Promise.all([
          supabaseClient
            .from("client_plans")
            .select("*")
            .eq("client_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseClient.from("tickets").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
          supabaseClient.from("plan_requests").select("*").eq("client_id", user.id).order("created_at", { ascending: false }),
        ]);

      if (profileError || planError || ticketsError || requestsError) {
        throw profileError || planError || ticketsError || requestsError;
      }

      return { user, profile, currentPlan, tickets: tickets || [], planRequests: planRequests || [] };
    },

    async createTicket({ title, type, priority, details, billingNotice, screenshotFile }) {
      const supabaseClient = requireClient();
      const user = await getUser();
      const screenshotPath = await uploadTicketScreenshot(screenshotFile);
      const { data, error } = await supabaseClient
        .from("tickets")
        .insert({
          client_id: user.id,
          title,
          type,
          priority,
          details,
          billing_notice: billingNotice,
          screenshot_path: screenshotPath,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async createPlanRequest({ plan, notes }) {
      const supabaseClient = requireClient();
      const user = await getUser();
      const { data, error } = await supabaseClient
        .from("plan_requests")
        .insert({
          client_id: user.id,
          requested_plan: plan,
          notes,
          status: "Requested",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async cancelCurrentPlan() {
      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient.rpc("cancel_current_plan");

      if (error) {
        throw error;
      }

      return data;
    },

    async listClientTickets() {
      const supabaseClient = requireClient();
      const user = await getUser();
      const { data, error } = await supabaseClient
        .from("tickets")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    },

    async createSignedScreenshotUrl(path) {
      if (!path) {
        return null;
      }

      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient.storage
        .from(config.screenshotBucket || "ticket-screenshots")
        .createSignedUrl(path, 60 * 10);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    },

    async listAdminTickets() {
      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient
        .from("tickets")
        .select("*, profiles(first_name, last_name, email, business, phone, address)")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    },

    async listAdminClients() {
      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("*, client_plans(*), tickets(*), plan_requests(*)")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    },

    async updateAdminClientNotes(clientId, notes) {
      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient
        .from("profiles")
        .update({ internal_notes: notes })
        .eq("id", clientId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async getAdminTicket(ticketId) {
      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient
        .from("tickets")
        .select("*, profiles(first_name, last_name, email, business, phone, address, client_plans(*))")
        .eq("id", ticketId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    async updateTicketStatus(ticketId, status) {
      const supabaseClient = requireClient();
      const patch = {
        status,
        closed_at: status === "Closed" ? new Date().toISOString() : null,
      };
      const { data, error } = await supabaseClient.from("tickets").update(patch).eq("id", ticketId).select().single();

      if (error) {
        throw error;
      }

      return data;
    },

    async markPlanPaidCurrent(planId, paymentStatus = "Paid/current") {
      const supabaseClient = requireClient();
      const { data, error } = await supabaseClient
        .from("client_plans")
        .update({
          payment_status: paymentStatus,
          last_payment_update: new Date().toISOString(),
        })
        .eq("id", planId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },

    mapClientWorkspace(workspace) {
      if (!workspace?.profile) {
        return null;
      }

      const profile = workspace.profile;
      const currentPlan = workspace.currentPlan;

      return {
        id: profile.id,
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim(),
        business: profile.business || "",
        email: profile.email || workspace.user?.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        internalNotes: profile.internal_notes || "",
        plan: currentPlan?.plan || "",
        planStatus: currentPlan?.status || "none",
        planEnrolledAt: formatDate(currentPlan?.member_since || currentPlan?.created_at),
        nextBilling: currentPlan?.next_billing || "",
        paymentStatus: currentPlan?.payment_status || "",
        lastPaymentUpdate: formatDate(currentPlan?.last_payment_update),
        tickets: (workspace.tickets || []).map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          type: ticket.type,
          priority: ticket.priority,
          details: ticket.details,
          status: ticket.status,
          billingNotice: ticket.billing_notice,
          screenshotPath: ticket.screenshot_path,
          closedAt: ticket.closed_at ? new Date(ticket.closed_at).getTime() : 0,
          createdAt: formatDate(ticket.created_at),
        })),
        planRequests: (workspace.planRequests || []).map((request) => ({
          id: request.id,
          plan: request.requested_plan,
          notes: request.notes,
          status: request.status,
          createdAt: formatDate(request.created_at),
        })),
        createdAt: formatDate(profile.created_at),
        updatedAt: formatDate(profile.updated_at),
      };
    },

    mapAdminClient(profile) {
      const latestPlan = (profile.client_plans || [])
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      return {
        id: profile.id,
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim(),
        business: profile.business || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: profile.address || "",
        internalNotes: profile.internal_notes || "",
        plan: latestPlan?.plan || "",
        planStatus: latestPlan?.status || "none",
        planId: latestPlan?.id || "",
        paymentStatus: latestPlan?.payment_status || "",
        nextPayment: latestPlan?.next_billing || "",
        lastPaymentUpdate: formatDate(latestPlan?.last_payment_update),
        tickets: (profile.tickets || []).map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          type: ticket.type,
          priority: ticket.priority,
          details: ticket.details,
          status: ticket.status,
          billingNotice: ticket.billing_notice,
          screenshotPath: ticket.screenshot_path,
          closedAt: ticket.closed_at ? new Date(ticket.closed_at).getTime() : 0,
          createdAt: formatDate(ticket.created_at),
        })),
        planRequests: (profile.plan_requests || []).map((request) => ({
          id: request.id,
          plan: request.requested_plan,
          notes: request.notes,
          status: request.status,
          createdAt: formatDate(request.created_at),
        })),
        createdAt: formatDate(profile.created_at),
        updatedAt: formatDate(profile.updated_at),
      };
    },
  };
})();
