// CORE UTILITIES
    const API_BASE = window.location.origin + "/api";

    function getToken() {
      return localStorage.getItem("token");
    }
    function getUser() {
      try {
        return JSON.parse(localStorage.getItem("user"));
      } catch {
        return null;
      }
    }

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
      setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => t.remove(), 300);
      }, 4000);
    }

    function formatDate(d) {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    // AUTH CHECK
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      window.location.href = "login.html";
    }
    // THEME
    (function () {
      if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        document.getElementById("themeToggle").textContent = "☀️";
      }
    })();
    document.getElementById("themeToggle").addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      document.getElementById("themeToggle").textContent = isDark
        ? "☀️"
        : "🌙";
    });
    // SIDEBAR
    function renderSidebar() {
      const nav = document.getElementById("sidebarNav");
      const patientLinks = [
        { icon: "📊", label: "Dashboard", href: "dashboard.html" },
        { icon: "📈", label: "Progress", href: "progress.html" },
        { icon: "🏋️", label: "Exercises", href: "exercises.html" },
        { icon: "📅", label: "Appointments", href: "appointments.html" },
        { icon: "📝", label: "Feedback", href: "feedback.html" },
        { icon: "👤", label: "Profile", href: "profile.html" },
      ];
      const doctorLinks = [
        { icon: "📊", label: "Dashboard", href: "dashboard.html" },
        { icon: "👥", label: "Patients", href: "progress.html" },
        { icon: "🏋️", label: "Exercises", href: "exercises.html" },
        { icon: "📅", label: "Appointments", href: "appointments.html" },
        { icon: "📝", label: "Feedback", href: "feedback.html" },
        { icon: "👤", label: "Profile", href: "profile.html" },
      ];
      const links = user.role === "doctor" ? doctorLinks : patientLinks;
      const currentPage =
        window.location.pathname.split("/").pop() || "dashboard.html";

      nav.innerHTML = links
        .map(
          (l) => `
        <a class="sidebar-link ${currentPage === l.href ? "active" : ""}" href="${l.href}">
          <span class="sidebar-link-icon">${l.icon}</span>${l.label}
        </a>
      `,
        )
        .join("");

      document.getElementById("sidebarAvatar").textContent = user.name
        ? user.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
        : "--";
      document.getElementById("sidebarName").textContent =
        user.name || "User";
      document.getElementById("sidebarRole").textContent = user.role || "—";
    }
    renderSidebar();
    document.getElementById("mobileToggle").addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("open");
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
    // DASHBOARD DATA
    async function loadDashboard() {
      try {
        const data = await api("/dashboard");
        document.getElementById("pageSubtitle").textContent =
          `Welcome back, ${user.name}`;

        if (data.role === "patient") renderPatientDashboard(data);
        else renderDoctorDashboard(data);
      } catch (err) {
        showToast("Failed to load dashboard: " + err.message);
        renderFallbackDashboard();
      }
    }
    function renderPatientDashboard(data) {
      const s = data.stats;

      document.getElementById("statsGrid").innerHTML = `
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon blue">📊</div>
            <span class="stat-badge up">↑ Active</span>
          </div>
          <div class="stat-value">${s.totalSessions}</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon ${s.averagePainLevel <= 4 ? "green" : "orange"}">💪</div>
            <span class="stat-badge ${s.averagePainLevel <= 4 ? "up" : "down"}">${s.averagePainLevel <= 4 ? "↓ Good" : "↑ Monitor"}</span>
          </div>
          <div class="stat-value">${s.averagePainLevel}/10</div>
          <div class="stat-label">Avg Pain Level</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon green">✅</div>
            <span class="stat-badge up">${s.averageCompletion >= 80 ? "★ Great" : "Keep going"}</span>
          </div>
          <div class="stat-value">${s.averageCompletion}%</div>
          <div class="stat-label">Avg Completion</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon purple">🏋️</div>
          </div>
          <div class="stat-value">${s.assignedExercises}</div>
          <div class="stat-label">Assigned Exercises</div>
        </div>
      `;

      // Cards
      let exerciseHtml = "";
      if (data.exercises.length === 0) {
        exerciseHtml =
          '<div class="empty-state"><div class="empty-state-icon">🏋️</div><p>No exercises assigned yet.</p></div>';
      } else {
        exerciseHtml = data.exercises
          .map(
            (ex) => `
          <div class="list-item">
            <div class="list-avatar blue">🏋️</div>
            <div class="list-info">
              <h4>${ex.title}</h4>
              <p>${ex.category} · ${ex.duration} min · ${ex.difficulty}</p>
            </div>
            <span class="list-badge confirmed">${ex.difficulty}</span>
          </div>
        `,
          )
          .join("");
      }

      let appointmentHtml = "";
      if (data.appointments.length === 0) {
        appointmentHtml =
          '<div class="empty-state"><div class="empty-state-icon">📅</div><p>No appointments scheduled.</p></div>';
      } else {
        appointmentHtml = data.appointments
          .slice(0, 5)
          .map(
            (apt) => {
              const waLink = apt.doctorId?.phone ? `https://wa.me/${apt.doctorId.phone.replace(/\D/g, '')}` : null;
              return `
              <div class="list-item">
                <div class="list-avatar orange">📅</div>
                <div class="list-info">
                  <h4>${apt.doctorId?.name || "Doctor"}</h4>
                  <p>${formatDate(apt.date)} · ${apt.time}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${waLink ? `<a href="${waLink}" target="_blank" title="WhatsApp Doctor" style="color: #25D366;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>` : ""}
                  <span class="list-badge ${apt.status}">${apt.status}</span>
                </div>
              </div>
            `;
            },
          )
          .join("");
      }

      document.getElementById("cardsGrid").innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">Assigned Exercises</div>
            <a class="card-action" href="exercises.html">View All →</a>
          </div>
          ${exerciseHtml}
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">Upcoming Appointments</div>
            <a class="card-action" href="appointments.html">View All →</a>
          </div>
          ${appointmentHtml}
        </div>
      `;

      // Progress chart
      if (data.recentProgress.length > 0) {
        const chartCard = document.createElement("div");
        chartCard.className = "card";
        chartCard.style.gridColumn = "1 / -1";
        chartCard.innerHTML = `
          <div class="card-header">
            <div class="card-title">Recovery Trend (Last 30 Days)</div>
            <a class="card-action" href="progress.html">Details →</a>
          </div>
          <div class="chart-container"><canvas id="progressChart"></canvas></div>
        `;
        document.getElementById("cardsGrid").appendChild(chartCard);
        drawChart(data.recentProgress.reverse());
      }
    }
    function renderDoctorDashboard(data) {
      const s = data.stats;

      document.getElementById("statsGrid").innerHTML = `
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon blue">👥</div></div>
          <div class="stat-value">${s.totalPatients}</div>
          <div class="stat-label">Total Patients</div>
        </div>
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon green">🔗</div><span class="stat-badge up">${s.assignedPatients} of ${s.totalPatients}</span></div>
          <div class="stat-value">${s.assignedPatients}</div>
          <div class="stat-label">Assigned Patients</div>
        </div>
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon orange">🏋️</div></div>
          <div class="stat-value">${s.totalExercises}</div>
          <div class="stat-label">Exercise Protocols</div>
        </div>
        <div class="stat-card">
          <div class="stat-header"><div class="stat-icon purple">⏳</div><span class="stat-badge ${s.pendingAppointments > 0 ? "down" : "up"}">${s.pendingAppointments > 0 ? "Action needed" : "All clear"}</span></div>
          <div class="stat-value">${s.pendingAppointments}</div>
          <div class="stat-label">Pending Appointments</div>
        </div>
      `;

      // Assigned patients block
      const assignedIds = new Set((data.assignedPatientsList || []).map(p => p._id));
      let assignedHtml = "";
      if (!data.assignedPatientsList || data.assignedPatientsList.length === 0) {
        assignedHtml = '<div class="empty-state"><div class="empty-state-icon">🔗</div><p>No patients assigned yet. Patients get assigned when they book an appointment with you.</p></div>';
      } else {
        assignedHtml = data.assignedPatientsList
          .slice(0, 6)
          .map(
            (p) => `
          <div class="list-item">
            <div class="list-avatar blue">${p.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}</div>
            <div class="list-info">
              <h4>${p.name}</h4>
              <p>${p.email}</p>
            </div>
            <span class="list-badge confirmed">Assigned</span>
          </div>
        `,
          )
          .join("");
      }

      // All patients block
      let allPatientsHtml = "";
      if (data.patients.length === 0) {
        allPatientsHtml = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>No patients registered yet.</p></div>';
      } else {
        allPatientsHtml = data.patients
          .slice(0, 6)
          .map(
            (p) => `
          <div class="list-item">
            <div class="list-avatar ${assignedIds.has(p._id) ? 'green' : 'blue'}">${p.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}</div>
            <div class="list-info">
              <h4>${p.name}</h4>
              <p>${p.email}</p>
            </div>
            <span class="list-badge ${assignedIds.has(p._id) ? 'confirmed' : 'pending'}">${assignedIds.has(p._id) ? 'Assigned' : 'Unassigned'}</span>
          </div>
        `,
          )
          .join("");
      }

      let apptHtml = "";
      if (data.recentAppointments.length === 0) {
        apptHtml =
          '<div class="empty-state"><div class="empty-state-icon">📅</div><p>No appointments yet.</p></div>';
      } else {
        apptHtml = data.recentAppointments
          .slice(0, 6)
          .map(
            (a) => {
              const waLink = a.patientId?.phone ? `https://wa.me/${a.patientId.phone.replace(/\D/g, '')}` : null;
              return `
              <div class="list-item">
                <div class="list-avatar orange">📅</div>
                <div class="list-info">
                  <h4>${a.patientId?.name || "Patient"}</h4>
                  <p>${formatDate(a.date)} · ${a.time}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${waLink ? `<a href="${waLink}" target="_blank" title="WhatsApp Patient" style="color: #25D366;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>` : ""}
                  <span class="list-badge ${a.status}">${a.status}</span>
                </div>
              </div>
            `;
            },
          )
          .join("");
      }

      document.getElementById("cardsGrid").innerHTML = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">🔗 Assigned Patients</div>
            <a class="card-action" href="progress.html">Manage →</a>
          </div>
          ${assignedHtml}
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">👥 All Patients</div>
            <a class="card-action" href="progress.html">View All →</a>
          </div>
          ${allPatientsHtml}
        </div>
        <div class="card" style="grid-column: 1 / -1;">
          <div class="card-header">
            <div class="card-title">📅 Recent Appointments</div>
            <a class="card-action" href="appointments.html">View All →</a>
          </div>
          ${apptHtml}
        </div>
      `;
    }

    function renderFallbackDashboard() {
      document.getElementById("statsGrid").innerHTML = `
        <div class="stat-card"><div class="stat-header"><div class="stat-icon blue">📊</div></div><div class="stat-value">0</div><div class="stat-label">Sessions</div></div>
        <div class="stat-card"><div class="stat-header"><div class="stat-icon green">💪</div></div><div class="stat-value">0</div><div class="stat-label">Pain Level</div></div>
        <div class="stat-card"><div class="stat-header"><div class="stat-icon orange">✅</div></div><div class="stat-value">0%</div><div class="stat-label">Completion</div></div>
        <div class="stat-card"><div class="stat-header"><div class="stat-icon purple">🏋️</div></div><div class="stat-value">0</div><div class="stat-label">Exercises</div></div>
      `;
      document.getElementById("cardsGrid").innerHTML = `
        <div class="card"><div class="empty-state"><div class="empty-state-icon">🚀</div><p>Connect your backend to see live data!</p></div></div>
      `;
    }
    function drawChart(progressData) {
      const canvas = document.getElementById("progressChart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const W = rect.width,
        H = rect.height;
      const padding = { top: 20, right: 20, bottom: 30, left: 40 };
      const chartW = W - padding.left - padding.right;
      const chartH = H - padding.top - padding.bottom;

      const values = progressData.map((p) => p.exerciseCompletion);
      const max = Math.max(...values, 100);
      const min = 0;

      // Grid lines
      ctx.strokeStyle = getComputedStyle(document.body)
        .getPropertyValue("--outline-variant")
        .trim();
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (values.length < 2) return;

      // Line
      const gradient = ctx.createLinearGradient(
        0,
        padding.top,
        0,
        H - padding.bottom,
      );
      const primary = getComputedStyle(document.body)
        .getPropertyValue("--primary")
        .trim();
      gradient.addColorStop(0, primary);
      gradient.addColorStop(1, primary + "20");

      ctx.beginPath();
      values.forEach((v, i) => {
        const x = padding.left + (chartW / (values.length - 1)) * i;
        const y = padding.top + chartH - (v / max) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = primary;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();

      // Fill area
      const lastX = padding.left + chartW;
      const firstX = padding.left;
      ctx.lineTo(lastX, H - padding.bottom);
      ctx.lineTo(firstX, H - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.1;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Dots
      values.forEach((v, i) => {
        const x = padding.left + (chartW / (values.length - 1)) * i;
        const y = padding.top + chartH - (v / max) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = primary;
        ctx.fill();
        ctx.strokeStyle = getComputedStyle(document.body)
          .getPropertyValue("--surface-container-lowest")
          .trim();
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Labels
      ctx.font = `11px ${getComputedStyle(document.body).getPropertyValue("--font-body").trim()}`;
      ctx.fillStyle = getComputedStyle(document.body)
        .getPropertyValue("--on-surface-variant")
        .trim();
      ctx.textAlign = "center";
      const step = Math.max(1, Math.floor(values.length / 6));
      progressData.forEach((p, i) => {
        if (i % step === 0 || i === values.length - 1) {
          const x = padding.left + (chartW / (values.length - 1)) * i;
          const label = new Date(p.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          ctx.fillText(label, x, H - 8);
        }
      });
    }

    loadDashboard();
    // CHATBOT
    const chatFab = document.getElementById("chatbotFab");
    const chatWindow = document.getElementById("chatbotWindow");
    const chatClose = document.getElementById("chatbotClose");
    const chatInput = document.getElementById("chatInput");
    const chatSend = document.getElementById("chatSend");
    const chatMessages = document.getElementById("chatMessages");

    chatFab.addEventListener("click", () => {
      chatWindow.classList.toggle("open");
      if (chatWindow.classList.contains("open")) chatInput.focus();
    });
    chatClose.addEventListener("click", () =>
      chatWindow.classList.remove("open"),
    );

    async function sendChat() {
      const msg = chatInput.value.trim();
      if (!msg) return;

      // Add user bubble
      chatMessages.innerHTML += `<div class="chat-bubble user">${msg}</div>`;
      chatInput.value = "";
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Typing indicator
      const typing = document.createElement("div");
      typing.className = "typing-indicator";
      typing.innerHTML = "<span></span><span></span><span></span>";
      chatMessages.appendChild(typing);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      try {
        const data = await api("/chat", {
          method: "POST",
          body: JSON.stringify({ message: msg }),
        });
        typing.remove();
        chatMessages.innerHTML += `<div class="chat-bubble assistant">${marked.parse(data.message)}</div>`;
      } catch (err) {
        typing.remove();
        chatMessages.innerHTML += `<div class="chat-bubble assistant">Sorry, I couldn't process that. Please try again.</div>`;
      }
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatSend.addEventListener("click", sendChat);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendChat();
    });

    // Load chat history
    (async () => {
      try {
        const messages = await api("/chat");
        if (messages && messages.length > 0) {
          const recent = messages.slice(-20);
          recent.forEach((m) => {
            const content = m.role === 'assistant' ? marked.parse(m.content) : m.content;
            chatMessages.innerHTML += `<div class="chat-bubble ${m.role}">${content}</div>`;
          });
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      } catch (e) {
        /* Ignore - first time user */
      }
    })();
