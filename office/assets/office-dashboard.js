(() => {
  const SUPABASE_URL = "https://idurlccrarznnnqixxsd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_JIRAAdzm97xMNN1jIS_idg_oHEObFhT";
  const CONTROL_API = SUPABASE_URL + "/functions/v1/office-control-api";
  const GM_API = SUPABASE_URL + "/functions/v1/office-general-manager";
  const EMPLOYEE_API = SUPABASE_URL + "/functions/v1/office-employee-agent";
  const INTEGRATION_API = SUPABASE_URL + "/functions/v1/office-integration-hub";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const $ = id => document.getElementById(id);
  const status = (message, ok = false) => {
    $("dashboard-status").textContent = message;
    $("dashboard-status").className = "status" + (ok ? " success" : "");
  };
  const node = (tag, className, value) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (value !== undefined && value !== null) item.textContent = String(value);
    return item;
  };
  const dateText = value => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };
  const titleCase = value => String(value || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  async function api(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");

    const response = await fetch(CONTROL_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const messages = {
        owner_access_denied: "This account is not authorized for Office access.",
        invalid_input: "Please check the task details and try again.",
        task_transition_not_allowed: "This task can no longer be changed from its current status.",
        authentication_required: "Please sign in again.",
        mfa_required: "Two-step verification is required. Please sign in again."
      };
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      throw new Error(messages[result.code] || "Office request failed. Please refresh and try again.");
    }
    return result.data || {};
  }

  async function gmApi(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");
    const response = await fetch(GM_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const messages = {
        gemini_gateway_disabled: "Gemini is safely disabled until its Free Tier key and quota limits are configured.",
        gemini_secret_not_configured: "Gemini API key is not configured in Supabase Edge Function Secrets yet.",
        free_tier_confirmation_required: "Free Tier project confirmation is still pending.",
        free_tier_caps_not_configured: "Project-specific Gemini RPM, TPM and daily caps are not configured yet.",
        task_must_be_queued: "Only queued tasks can be planned by the General Manager.",
        gm_plan_validation_failed: "The proposed plan did not pass safety validation. No plan was saved.",
        owner_access_denied: "This account is not authorized for Office access."
      };
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      throw new Error(messages[result.code] || "General Manager request failed. Please try again later.");
    }
    return result.data || {};
  }

  async function employeeApi(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");
    const response = await fetch(EMPLOYEE_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      const messages = {
        gemini_gateway_disabled: "Gemini is safely disabled until its Free Tier key and quota limits are configured.",
        gemini_secret_not_configured: "Gemini API key is not configured in Supabase Edge Function Secrets yet.",
        free_tier_confirmation_required: "Free Tier project confirmation is still pending.",
        free_tier_caps_not_configured: "Project-specific Gemini RPM, TPM and daily caps are not configured yet.",
        quota_guard_disabled: "The Gemini quota guard is currently disabled.",
        paid_billing_mode_forbidden: "Only the Free Tier billing mode is permitted.",
        gm_plan_required: "The General Manager must create a draft plan before an employee can prepare work.",
        role_step_mismatch: "This employee role is not assigned to the selected General Manager step.",
        task_must_be_queued: "Only queued tasks can receive employee drafts.",
        employee_draft_validation_failed: "The employee draft did not pass safety validation. Nothing was saved.",
        employee_role_unavailable: "This employee role is paused or disabled."
      };
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      throw new Error(messages[result.code] || "Employee request failed. Please try again later.");
    }
    return result.data || {};
  }

  async function integrationApi(action, payload = {}) {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) throw new Error("Your session has expired. Please sign in again.");
    const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance?.currentLevel !== "aal2") throw new Error("Two-step verification is required. Please sign in again.");
    const response = await fetch(INTEGRATION_API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      if (response.status === 401 || response.status === 428) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
      throw new Error("Unable to load the secure integration registry.");
    }
    return result.data || {};
  }

  function renderIntegrations(data = {}) {
    const grid = $("integration-grid");
    grid.replaceChildren();
    const integrations = data.integrations || [];
    const actions = data.actions || [];
    $("integration-pending-pill").textContent = (data.pending_approvals ?? 0) + " pending approvals";
    if (!integrations.length) {
      grid.append(node("div", "empty-state", "No integrations are registered."));
      return;
    }
    const actionLabels = {
      read_office_metrics: "Read Office metrics",
      read_listing_aggregates: "Read listing aggregates",
      create_patch_proposal: "Create patch proposal",
      create_pull_request: "Create pull request",
      create_preview_deployment: "Preview deployment",
      deploy_production: "Production deployment",
      create_email_draft: "Email draft",
      send_email_campaign: "Send email campaign",
      create_post_draft: "Instagram post draft",
      publish_post: "Publish Instagram post",
      keyword_research: "Keyword research",
      site_audit: "SEO site audit",
      publish_metadata: "Publish metadata"
    };
    integrations.forEach(integration => {
      const card = node("article", "integration-card");
      const top = node("div", "integration-card-top");
      const heading = node("h3", "", integration.display_name);
      const state = node("span", "integration-state integration-" + integration.connection_status,
        titleCase(integration.connection_status).replace(/_/g, " "));
      top.append(heading, state);
      card.append(top);
      card.append(node("p", "integration-note", integration.notes || ""));
      const meta = node("div", "integration-meta");
      meta.append(node("span", "", "Mode: " + titleCase(integration.access_mode)));
      if (integration.secret_reference) {
        meta.append(node("span", "", "Secret reference: " + integration.secret_reference));
        meta.append(node("span", integration.secret_configured ? "credential-present" : "credential-missing",
          integration.secret_configured ? "Credential present · validation pending" : "Credential missing"));
      } else {
        meta.append(node("span", "credential-present", "Server-managed connection"));
      }
      card.append(meta);
      const scopes = node("div", "integration-scopes");
      (integration.allowed_scopes || []).forEach(scope => scopes.append(node("span", "integration-scope", titleCase(scope))));
      card.append(scopes);
      const providerActions = actions.filter(action => action.provider_key === integration.provider_key);
      if (providerActions.length) {
        const list = node("div", "integration-action-list");
        providerActions.forEach(action => {
          const line = node("div", "integration-action-row");
          line.append(node("span", "integration-action-name", actionLabels[action.action_key] || titleCase(action.action_key)));
          const mode = action.requires_approval ? "Owner approval" : titleCase(action.execution_mode);
          const stateText = action.execution_enabled ? "Enabled" : action.proposal_enabled ? mode + " · proposal only" : mode + " · not enabled";
          line.append(node("small", "integration-action-state", stateText));
          list.append(line);
        });
        card.append(list);
      }
      grid.append(card);
    });
  }

  function renderMetrics(counts = {}) {
    $("metric-total").textContent = counts.total ?? 0;
    $("metric-queued").textContent = counts.queued ?? 0;
    $("metric-running").textContent = counts.running ?? 0;
    $("metric-completed").textContent = counts.completed ?? 0;
  }

  function addAction(parent, label, className, handler) {
    const button = node("button", className, label);
    button.type = "button";
    button.addEventListener("click", () => handler(button));
    parent.append(button);
    return button;
  }

  function renderTasks(tasks = [], plans = [], employeeItems = []) {
    const planMap = new Map((plans || []).map(item => [item.task_id, item.plan]));
    const draftMap = new Map((employeeItems || []).map(item => [item.task_id, item.drafts || []]));
    const list = $("task-list");
    list.replaceChildren();
    $("task-total-pill").textContent = tasks.length + (tasks.length === 1 ? " task" : " tasks");
    if (!tasks.length) {
      list.append(node("div", "empty-state", "No tasks yet. Create your first task to start building the work queue."));
      return;
    }
    tasks.forEach(task => {
      const card = node("article", "task-card");
      const top = node("div", "task-card-top");
      const key = node("span", "task-key", task.task_key);
      const state = node("span", "task-status status-" + task.status, titleCase(task.status));
      top.append(key, state);
      const heading = node("h4", "", task.title);
      const description = node("p", "task-description", task.description || "No additional description provided.");
      const meta = node("div", "task-meta");
      meta.append(node("span", "priority priority-" + task.priority, titleCase(task.priority) + " priority"));
      meta.append(node("span", "", "Created " + dateText(task.created_at)));
      const actions = node("div", "task-actions");
      const gmPlan = planMap.get(task.id);
      if (task.status === "queued" && !gmPlan) {
        addAction(actions, "Plan with GM", "small-action gm-action", button => createGmPlan(task, button));
      }
      if (task.status === "queued" || task.status === "draft") {
        addAction(actions, "Pause", "small-action", () => changeTaskStatus(task.id, "paused"));
        addAction(actions, "Cancel", "small-action danger-action", () => changeTaskStatus(task.id, "cancelled"));
      } else if (task.status === "paused") {
        addAction(actions, "Resume", "small-action", () => changeTaskStatus(task.id, "queued"));
        addAction(actions, "Cancel", "small-action danger-action", () => changeTaskStatus(task.id, "cancelled"));
      }
      addAction(actions, "Activity", "small-action subtle-action", () => loadTaskLogs(task));
      card.append(top, heading, description, meta, actions);
      if (gmPlan) {
        const planBox = node("div", "gm-plan-box");
        const planTop = node("div", "gm-plan-top");
        planTop.append(node("strong", "gm-plan-heading", "General Manager · Draft plan"));
        planTop.append(node("span", "gm-risk risk-" + gmPlan.risk_level, titleCase(gmPlan.risk_level) + " risk"));
        planBox.append(planTop);
        planBox.append(node("p", "gm-plan-summary", gmPlan.summary));
        const steps = node("ol", "gm-plan-steps");
        const taskDrafts = draftMap.get(task.id) || [];
        (gmPlan.steps || []).forEach((step, stepIndex) => {
          const li = node("li", "gm-step-item");
          li.append(node("span", "gm-step-title", step.title + " · " + titleCase(step.role_key)));
          const draft = taskDrafts.find(item => item.role_key === step.role_key && item.step_index === stepIndex);
          if (draft) {
            const draftCard = node("div", "employee-draft-card");
            draftCard.append(node("strong", "employee-draft-title", draft.title));
            draftCard.append(node("p", "employee-draft-summary", draft.summary));
            draftCard.append(node("div", "employee-draft-content", draft.draft_content));
            const checks = node("ul", "employee-draft-checks");
            (draft.checks || []).forEach(check => checks.append(node("li", "", check)));
            draftCard.append(checks);
            draftCard.append(node("small", "gm-approval-note", "Draft only · Owner approval required · Not executed"));
            li.append(draftCard);
          } else if (task.status === "queued") {
            addAction(li, "Generate employee draft", "small-action employee-action", button =>
              createEmployeeDraft(task, step.role_key, stepIndex, button));
          }
          steps.append(li);
        });
        planBox.append(steps);
        planBox.append(node("small", "gm-approval-note", "Proposal only · Owner approval required · No actions executed"));
        card.append(planBox);
      }
      list.append(card);
    });
  }

  async function createGmPlan(task, button) {
    button.disabled = true;
    button.textContent = "Planning…";
    try {
      await gmApi("plan_task", { task_id: task.id });
      status("General Manager draft plan created. Nothing has been executed.", true);
      await loadWorkspace();
    } catch (error) {
      status(error.message);
      button.disabled = false;
      button.textContent = "Plan with GM";
    }
  }

  async function createEmployeeDraft(task, roleKey, stepIndex, button) {
    button.disabled = true;
    button.textContent = "Preparing…";
    try {
      await employeeApi("generate_draft", {
        task_id: task.id, role_key: roleKey, step_index: stepIndex
      });
      status(titleCase(roleKey) + " draft created. No external action was performed.", true);
      await loadWorkspace();
    } catch (error) {
      status(error.message);
      button.disabled = false;
      button.textContent = "Generate employee draft";
    }
  }

  async function changeTaskStatus(taskId, nextStatus) {
    try {
      await api("set_task_status", { task_id: taskId, status: nextStatus });
      status("Task status updated.", true);
      await loadWorkspace();
    } catch (error) { status(error.message); }
  }

  async function loadTaskLogs(task) {
    try {
      const result = await api("list_task_logs", { task_id: task.id });
      $("task-logs-title").textContent = "Activity · " + task.task_key;
      const target = $("task-logs-list");
      target.replaceChildren();
      if (!result.logs?.length) target.append(node("div", "empty-state", "No activity recorded yet."));
      (result.logs || []).forEach(log => {
        const item = node("div", "log-entry");
        item.append(node("strong", "", log.message || titleCase(log.event_type)));
        item.append(node("small", "", dateText(log.created_at) + " · " + titleCase(log.severity)));
        target.append(item);
      });
      $("task-logs-panel").hidden = false;
      $("task-logs-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) { status(error.message); }
  }

  function renderTeam(employees = []) {
    const grid = $("team-grid");
    grid.replaceChildren();
    employees.forEach(employee => {
      const card = node("article", "team-card" + (employee.role_key === "general_manager" ? " manager" : ""));
      const avatar = node("div", "avatar", employee.employee_code);
      const details = node("div", "");
      details.append(node("strong", "", employee.display_name));
      details.append(node("p", "", employee.job_title + " · " + employee.department));
      const state = node("span", "state", titleCase(employee.status));
      card.append(avatar, details, state);
      grid.append(card);
    });
    if (!employees.length) grid.append(node("div", "empty-state", "Team directory is unavailable."));
  }

  async function loadWorkspace() {
    $("refresh-btn").disabled = true;
    try {
      const [overview, taskResult, planResult, employeeResult, integrationResult] = await Promise.all([
        api("overview"),
        api("list_tasks"),
        gmApi("list_plans"),
        employeeApi("list_drafts"),
        integrationApi("overview")
      ]);
      renderMetrics(overview.task_counts);
      renderTasks(taskResult.tasks || [], planResult.plans || [], employeeResult.items || []);
      renderIntegrations(integrationResult);
      renderTeam(overview.employees || []);
      status("Secure owner session verified. Task queue is connected.", true);
    } catch (error) {
      status(error.message || "Unable to load the Office workspace.");
      if (/session has expired|sign in again|Two-step verification/i.test(error.message)) {
        await client.auth.signOut();
        location.replace("./login.html");
      }
    } finally { $("refresh-btn").disabled = false; }
  }

  $("task-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $("create-task-btn");
    const values = new FormData(form);
    button.disabled = true;
    try {
      await api("create_task", {
        title: String(values.get("title") || "").trim(),
        description: String(values.get("description") || "").trim(),
        priority: String(values.get("priority") || "normal")
      });
      form.reset();
      status("Task added to the queue. AI execution remains disabled until later phases.", true);
      await loadWorkspace();
    } catch (error) { status(error.message); }
    finally { button.disabled = false; }
  });

  $("refresh-btn").addEventListener("click", loadWorkspace);
  $("close-logs-btn").addEventListener("click", () => { $("task-logs-panel").hidden = true; });
  $("logout-btn").addEventListener("click", async () => {
    const button = $("logout-btn");
    button.disabled = true;
    await client.auth.signOut();
    location.replace("./login.html");
  });

  loadWorkspace();
})();
