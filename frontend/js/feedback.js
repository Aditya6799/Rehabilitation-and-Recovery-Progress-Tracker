const API_BASE = window.location.origin + "/api";
    function getToken() { return localStorage.getItem("token"); }
    function getUser() { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } }

    async function api(endpoint, options = {}) {
      const token = getToken();
      const config = {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...options,
      };
      const res = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await res.json();
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
        return;
      }
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    }

    function showToast(msg, type = "error") {
      const c = document.getElementById("toastContainer");
      const t = document.createElement("div");
      t.className = `toast ${type}`;
      t.innerHTML = `${type === "success" ? "✓" : "⚠"} ${msg}`;
      c.appendChild(t);
      setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 4000);
    }

    function formatDate(d) {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    const token = getToken();
    const user = getUser();
    if (!token || !user) window.location.href = "login.html";

    // Theme
    (function () {
      if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        document.getElementById("themeToggle").textContent = "☀️";
      }
    })();
    document.getElementById("themeToggle").addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const d = document.body.classList.contains("dark");
      localStorage.setItem("theme", d ? "dark" : "light");
      document.getElementById("themeToggle").textContent = d ? "☀️" : "🌙";
    });

    // Sidebar
    function renderSidebar() {
      const nav = document.getElementById("sidebarNav");
      const pLinks = [
        { icon: "📊", label: "Dashboard", href: "dashboard.html" },
        { icon: "📈", label: "Progress", href: "progress.html" },
        { icon: "🏋️", label: "Exercises", href: "exercises.html" },
        { icon: "📅", label: "Appointments", href: "appointments.html" },
        { icon: "📝", label: "Feedback", href: "feedback.html" },
        { icon: "👤", label: "Profile", href: "profile.html" },
      ];
      const dLinks = [
        { icon: "📊", label: "Dashboard", href: "dashboard.html" },
        { icon: "👥", label: "Patients", href: "progress.html" },
        { icon: "🏋️", label: "Exercises", href: "exercises.html" },
        { icon: "📅", label: "Appointments", href: "appointments.html" },
        { icon: "📝", label: "Feedback", href: "feedback.html" },
        { icon: "👤", label: "Profile", href: "profile.html" },
      ];
      const links = user.role === "doctor" ? dLinks : pLinks;
      const cur = window.location.pathname.split("/").pop();
      nav.innerHTML = links.map(
        (l) => `<a class="sidebar-link ${cur === l.href ? "active" : ""}" href="${l.href}"><span class="sidebar-link-icon">${l.icon}</span>${l.label}</a>`
      ).join("");
      document.getElementById("sidebarAvatar").textContent = user.name
        ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
        : "--";
      document.getElementById("sidebarName").textContent = user.name;
      document.getElementById("sidebarRole").textContent = user.role;
    }
    renderSidebar();
    document.getElementById("mobileToggle").addEventListener("click", () =>
      document.getElementById("sidebar").classList.toggle("open")
    );
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });

    // ---- Main Logic ----
    let allFeedback = [];
    let patients = [];
    let stepCount = 1;

    async function init() {
      const content = document.getElementById("pageContent");
      if (user.role === "doctor") {
        await loadPatients();
        content.innerHTML = renderDoctorView();
        setupDoctorForm();
      } else {
        content.innerHTML = `
          <div class="filter-tabs" id="filterTabs">
            <button class="filter-tab active" onclick="filterFeedback('all', this)">All</button>
            <button class="filter-tab" onclick="filterFeedback('unread', this)">🔵 Unread</button>
            <button class="filter-tab" onclick="filterFeedback('milestone', this)">🏆 Milestones</button>
            <button class="filter-tab" onclick="filterFeedback('exercise', this)">🏋️ Exercise</button>
            <button class="filter-tab" onclick="filterFeedback('motivation', this)">💪 Motivation</button>
          </div>
          <div class="feedback-grid" id="feedbackGrid"></div>
        `;
      }
      await loadFeedback();
    }

    async function loadPatients() {
      try {
        patients = await api("/patients");
      } catch (err) {
        console.error(err);
      }
    }

    async function loadFeedback() {
      try {
        allFeedback = await api("/feedback");
        renderFeedback(allFeedback);
      } catch (err) {
        document.getElementById("feedbackGrid").innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">📝</div><p>Failed to load feedback.</p></div>';
      }
    }

    function renderDoctorView() {
      return `
        <div class="doctor-form-card">
          <h3>✉️ Send Actionable Feedback</h3>
          <form id="feedbackForm">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Patient</label>
                <select class="form-select" id="fbPatient" required>
                  <option value="">Select a patient…</option>
                  ${patients.map(p => `<option value="${p._id}">${p.name} (${p.email})</option>`).join("")}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="fbCategory">
                  <option value="general">General</option>
                  <option value="milestone">Milestone</option>
                  <option value="exercise">Exercise</option>
                  <option value="pain-management">Pain Management</option>
                  <option value="motivation">Motivation</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-select" id="fbPriority">
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Feedback Message</label>
              <textarea class="form-textarea" id="fbContent" placeholder="Write actionable recovery feedback for the patient…" required></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Actionable Steps (Recovery Milestones)</label>
              <div class="steps-builder" id="stepsBuilder">
                <div class="step-input-row">
                  <input type="text" placeholder="e.g. Complete 3 sets of stretching daily" class="step-input" />
                  <button type="button" class="step-remove-btn" onclick="removeStep(this)" title="Remove">✕</button>
                </div>
              </div>
              <button type="button" class="add-step-btn" onclick="addStep()">＋ Add another step</button>
            </div>
            <button type="submit" class="btn btn-primary">📩 Send Feedback</button>
          </form>
        </div>

        <h3 style="font-family: var(--font-headline); font-weight: 700; margin-bottom: 16px;">📋 Sent Feedback History</h3>

        <div class="filter-bar" id="filterBar">
          <span class="filter-bar-label">Filter by Patient:</span>
          <select class="filter-select" id="patientFilter" onchange="filterByPatient(this.value)">
            <option value="all">All Patients</option>
            ${patients.map(p => `<option value="${p._id}">${p.name}</option>`).join("")}
          </select>
        </div>

        <div class="feedback-grid" id="feedbackGrid"></div>
      `;
    }

    function addStep() {
      const builder = document.getElementById("stepsBuilder");
      const row = document.createElement("div");
      row.className = "step-input-row";
      row.innerHTML = `
        <input type="text" placeholder="e.g. Walk 20 minutes without support" class="step-input" />
        <button type="button" class="step-remove-btn" onclick="removeStep(this)" title="Remove">✕</button>
      `;
      builder.appendChild(row);
    }

    function removeStep(btn) {
      const builder = document.getElementById("stepsBuilder");
      if (builder.children.length > 1) {
        btn.parentElement.remove();
      }
    }

    function setupDoctorForm() {
      document.getElementById("feedbackForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const patientId = document.getElementById("fbPatient").value;
        const content = document.getElementById("fbContent").value;
        const category = document.getElementById("fbCategory").value;
        const priority = document.getElementById("fbPriority").value;
        const stepInputs = document.querySelectorAll(".step-input");
        const actionableSteps = Array.from(stepInputs).map(i => i.value).filter(v => v.trim());

        if (!patientId) return showToast("Please select a patient.");
        if (!content.trim()) return showToast("Please write feedback content.");

        try {
          await api("/feedback", {
            method: "POST",
            body: JSON.stringify({ patientId, content, actionableSteps, category, priority })
          });
          showToast("Feedback sent successfully!", "success");
          document.getElementById("feedbackForm").reset();
          document.getElementById("stepsBuilder").innerHTML = `
            <div class="step-input-row">
              <input type="text" placeholder="e.g. Complete 3 sets of stretching daily" class="step-input" />
              <button type="button" class="step-remove-btn" onclick="removeStep(this)" title="Remove">✕</button>
            </div>
          `;
          loadFeedback();
        } catch (err) {
          showToast(err.message);
        }
      });
    }

    function renderFeedback(list) {
      const grid = document.getElementById("feedbackGrid");
      if (!list || list.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><p>No feedback yet.</p></div>';
        return;
      }

      grid.innerHTML = list.map(fb => {
        const isPatient = user.role === "patient";
        const authorName = fb.doctorId?.name || "Doctor";
        const authorSpec = fb.doctorId?.specialization || "";
        const patientName = fb.patientId?.name || "Patient";
        const initials = authorName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        const unreadClass = isPatient && !fb.read ? "unread" : "";
        const unreadDot = isPatient && !fb.read ? '<span class="unread-badge"></span>' : "";

        const stepsHtml = fb.actionableSteps && fb.actionableSteps.length > 0 ? `
          <div class="feedback-steps">
            <div class="feedback-steps-title">📋 Actionable Steps</div>
            ${fb.actionableSteps.map((step, i) => `
              <div class="step-item ${step.completed ? 'completed' : ''}" ${isPatient ? `onclick="toggleStep('${fb._id}', ${i})"` : ""}>
                <div class="step-checkbox">${step.completed ? '✓' : ''}</div>
                <span class="step-text">${step.text}</span>
              </div>
            `).join("")}
          </div>
        ` : "";

        const completedCount = fb.actionableSteps ? fb.actionableSteps.filter(s => s.completed).length : 0;
        const totalSteps = fb.actionableSteps ? fb.actionableSteps.length : 0;
        const progressBar = totalSteps > 0 ? `
          <div style="height: 4px; background: var(--surface-container-high); border-radius: 2px; margin-bottom: 14px; overflow: hidden;">
            <div style="height: 100%; width: ${(completedCount/totalSteps)*100}%; background: linear-gradient(90deg, var(--primary), var(--primary-container)); border-radius: 2px; transition: width 0.5s ease;"></div>
          </div>
          <div style="font-size: 0.7rem; color: var(--on-surface-variant); margin-bottom: 14px;">${completedCount}/${totalSteps} steps completed</div>
        ` : "";

        return `
          <div class="feedback-card ${unreadClass}">
            ${unreadDot}
            <div class="feedback-card-header">
              <div class="feedback-author">
                <div class="feedback-author-avatar">${initials}</div>
                <div>
                  <div class="feedback-author-name">${isPatient ? `Dr. ${authorName}` : `To: ${patientName}`}</div>
                  <div class="feedback-author-spec">${isPatient ? authorSpec : fb.patientId?.email || ""}</div>
                </div>
              </div>
              <div>
                <span class="feedback-badge badge-${fb.priority}">${fb.priority}</span>
                <span class="feedback-badge badge-${fb.category}" style="margin-left:4px">${fb.category}</span>
              </div>
            </div>
            <div class="feedback-date">📅 ${formatDate(fb.createdAt)}</div>
            <div class="feedback-content">${fb.content}</div>
            ${progressBar}
            ${stepsHtml}
            ${isPatient && !fb.read ? `<button class="btn btn-sm btn-ghost" onclick="markRead('${fb._id}')">✓ Mark as Read</button>` : ""}
          </div>
        `;
      }).join("");
    }

    function filterFeedback(type, el) {
      document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
      el.classList.add("active");

      if (type === "all") renderFeedback(allFeedback);
      else if (type === "unread") renderFeedback(allFeedback.filter(f => !f.read));
      else renderFeedback(allFeedback.filter(f => f.category === type));
    }

    function filterByPatient(id) {
      if (id === "all") renderFeedback(allFeedback);
      else renderFeedback(allFeedback.filter(f => (f.patientId?._id || f.patientId) === id));
    }

    async function markRead(id) {
      try {
        await api(`/feedback/${id}/read`, { method: "PUT" });
        showToast("Marked as read", "success");
        loadFeedback();
      } catch (err) {
        showToast(err.message);
      }
    }

    async function toggleStep(feedbackId, stepIndex) {
      try {
        await api(`/feedback/${feedbackId}/step/${stepIndex}`, { method: "PUT" });
        loadFeedback();
      } catch (err) {
        showToast(err.message);
      }
    }

    init();
