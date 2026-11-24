(() => {
  const SUPABASE_URL = "https://idurlccrarznnnqixxsd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_JIRAAdzm97xMNN1jIS_idg_oHEObFhT";
  const CONTROL_API = SUPABASE_URL + "/functions/v1/office-control-api";
  const GM_API = SUPABASE_URL + "/functions/v1/office-general-manager";
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

  function renderMetrics(counts = {}) {
    $("metric-total").textContent = counts.total ?? 0;
    $("metric-queued").textContent = counts.queued ?? 0;
    $("metric-running").textContent = counts.running ?? 0;
    $("metric-completed").textContent = counts.completed ?? 0;
  }

  function addAction(parent, label, className, handler) {
    const button = node("button", className, label);
    button.type = "button";
    button.addEventListener("click", handler);
    parent.append(button);
  }

  function renderTasks(tasks = [], plans = []) {\n    const planMap = new Map((plans || []).map(item => [item.task_id, item.plan]));
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
        (gmPlan.steps || []).forEach(step => {
          const li = node("li", "", step.title + " · " + titleCase(step.role_key));
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
      const [overview, taskResult, planResult] = await Promise.all([
        api("overview"),
        api("list_tasks"),
        gmApi("list_plans")
      ]);
      renderMetrics(overview.task_counts);
      renderTasks(taskResult.tasks || [], planResult.plans || []);
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
