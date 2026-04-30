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
      nav.innerHTML = links
        .map(
          (l) =>
            `<a class="sidebar-link ${cur === l.href ? "active" : ""}" href="${l.href}"><span class="sidebar-link-icon">${l.icon}</span>${l.label}</a>`,
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
      document.getElementById("sidebarName").textContent = user.name;
      document.getElementById("sidebarRole").textContent = user.role;
    }
    renderSidebar();
    document
      .getElementById("mobileToggle")
      .addEventListener("click", () =>
        document.getElementById("sidebar").classList.toggle("open"),
      );
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });

    // Load page
    async function loadPage() {
      const content = document.getElementById("pageContent");
      if (user.role === "patient") renderPatientProgress(content);
      else renderDoctorProgress(content);
    }
    async function renderPatientProgress(container) {
      container.innerHTML = `
        <div class="page-actions">
          <div></div>
          <button class="btn btn-primary" id="addLogBtn">＋ Log Today's Session</button>
        </div>
        <div class="progress-grid">
          <div class="card card-full">
            <div class="card-header"><div class="card-title">Recovery Trend</div></div>
            <div class="chart-container"><canvas id="progressChart"></canvas></div>
          </div>
          <div class="card card-full cal-card">
            <div class="cal-header">
              <div class="card-title">📅 Exercise Activity Calendar</div>
              <div class="cal-nav">
                <button class="cal-nav-btn" id="calPrev" title="Previous month">◀</button>
                <span class="cal-month-label" id="calMonthLabel"></span>
                <button class="cal-nav-btn" id="calNext" title="Next month">▶</button>
              </div>
            </div>
            <div class="cal-grid" id="calGrid"></div>
            <div class="cal-legend">
              <div class="cal-legend-item"><div class="cal-legend-dot done"></div> Done (≥75%)</div>
              <div class="cal-legend-item"><div class="cal-legend-dot partial"></div> Partial (1-74%)</div>
              <div class="cal-legend-item"><div class="cal-legend-dot missed"></div> Missed (0%)</div>
              <div class="cal-legend-item"><div class="cal-legend-dot none"></div> No log</div>
            </div>
            <div class="streak-panel" id="streakPanel"></div>
          </div>
          <div class="card card-full" id="logFormCard" style="display:none;">
            <div class="card-header"><div class="card-title">Log Daily Session</div></div>
            <form id="progressForm" class="form-grid">
              <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" class="form-input" id="logDate" value="${new Date().toISOString().split("T")[0]}">
              </div>
              <div class="form-group">
                <label class="form-label">Pain Level</label>
                <div class="range-group">
                  <input type="range" min="0" max="10" value="3" id="painLevel" oninput="document.getElementById('painVal').textContent=this.value">
                  <div class="range-value" id="painVal">3</div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Exercise Completion %</label>
                <div class="range-group">
                  <input type="range" min="0" max="100" value="75" id="completion" oninput="document.getElementById('compVal').textContent=this.value+'%'">
                  <div class="range-value" id="compVal">75%</div>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Mood</label>
                <div class="mood-selector" id="moodSelector">
                  <div class="mood-option" onclick="selectMood('great',this)">😄<span>Great</span><input type="radio" name="mood" value="great"></div>
                  <div class="mood-option" onclick="selectMood('good',this)">🙂<span>Good</span><input type="radio" name="mood" value="good"></div>
                  <div class="mood-option active" onclick="selectMood('okay',this)">😐<span>Okay</span><input type="radio" name="mood" value="okay" checked></div>
                  <div class="mood-option" onclick="selectMood('bad',this)">😟<span>Bad</span><input type="radio" name="mood" value="bad"></div>
                  <div class="mood-option" onclick="selectMood('terrible',this)">😢<span>Terrible</span><input type="radio" name="mood" value="terrible"></div>
                </div>
              </div>
              <div class="form-group full">
                <label class="form-label">Notes (Optional)</label>
                <textarea class="form-textarea" id="logNotes" placeholder="How did today's session go?"></textarea>
              </div>
              <div class="form-group full" style="text-align:right;">
                <button type="button" class="btn" style="background:var(--surface-container);color:var(--on-surface-variant);margin-right:8px;" onclick="document.getElementById('logFormCard').style.display='none'">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Progress</button>
              </div>
            </form>
          </div>
          <div class="card card-full">
            <div class="card-header"><div class="card-title">Progress History</div></div>
            <div class="table-wrap" id="progressTable"><div class="empty-state"><div class="empty-state-icon">📊</div><p>Loading progress data...</p></div></div>
          </div>
        </div>
      `;

      document.getElementById("addLogBtn").addEventListener("click", () => {
        document.getElementById("logFormCard").style.display = "block";
        document
          .getElementById("logFormCard")
          .scrollIntoView({ behavior: "smooth" });
      });

      document
        .getElementById("progressForm")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          try {
            await api("/progress", {
              method: "POST",
              body: JSON.stringify({
                date: document.getElementById("logDate").value,
                painLevel: parseInt(
                  document.getElementById("painLevel").value,
                ),
                exerciseCompletion: parseInt(
                  document.getElementById("completion").value,
                ),
                mood: document.querySelector('input[name="mood"]:checked')
                  .value,
                notes: document.getElementById("logNotes").value,
              }),
            });
            showToast("Progress logged!", "success");
            document.getElementById("logFormCard").style.display = "none";
            loadProgressData();
          } catch (err) {
            showToast(err.message);
          }
        });

      loadProgressData();
    }

    let selectedMood = "okay";
    function selectMood(mood, el) {
      selectedMood = mood;
      document
        .querySelectorAll(".mood-option")
        .forEach((o) => o.classList.remove("active"));
      el.classList.add("active");
      el.querySelector("input").checked = true;
    }

    let allProgressData = [];
    let calYear, calMonth;
    (function initCalDate() {
      const now = new Date();
      calYear = now.getFullYear();
      calMonth = now.getMonth();
    })();

    async function loadProgressData() {
      try {
        const data = await api(`/progress/${user.id}`);
        allProgressData = data;
        renderProgressTable(data);
        drawProgressChart(data.slice().reverse());
        renderCalendar();
        setupCalendarNav();
        renderStreakStats();
      } catch (err) {
        document.getElementById("progressTable").innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No progress data yet. Log your first session!</p></div>';
      }
    }

    function setupCalendarNav() {
      const prevBtn = document.getElementById('calPrev');
      const nextBtn = document.getElementById('calNext');
      if (!prevBtn || prevBtn._bound) return;
      prevBtn._bound = true;
      prevBtn.addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
      });
      nextBtn.addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
      });
    }

    function renderCalendar() {
      const grid = document.getElementById('calGrid');
      const label = document.getElementById('calMonthLabel');
      if (!grid || !label) return;

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      label.textContent = `${monthNames[calMonth]} ${calYear}`;

      // Build a map of date -> completion
      const dateMap = {};
      allProgressData.forEach(p => {
        const d = new Date(p.date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        dateMap[key] = p.exerciseCompletion;
      });

      const today = new Date();
      const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

      const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let html = dayHeaders.map(d => `<div class="cal-day-header">${d}</div>`).join('');

      // Empty cells before first day
      for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day empty"></div>';
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const key = `${calYear}-${calMonth}-${day}`;
        const comp = dateMap[key];
        const dateObj = new Date(calYear, calMonth, day);
        const isToday = dateObj.toDateString() === today.toDateString();
        const isFuture = dateObj > today;

        let cls = '';
        let tooltip = '';
        if (isFuture) {
          cls = 'future';
        } else if (comp !== undefined) {
          if (comp >= 75) {
            cls = 'done';
            tooltip = `✅ ${comp}% completed`;
          } else if (comp > 0) {
            cls = 'partial';
            tooltip = `⚠️ ${comp}% completed`;
          } else {
            cls = 'missed';
            tooltip = '❌ 0% — No exercise';
          }
        }
        if (isToday) cls += ' today';

        const tooltipHtml = tooltip ? `<span class="cal-tooltip">${tooltip}</span>` : '';
        html += `<div class="cal-day ${cls}">${day}${tooltipHtml}</div>`;
      }

      grid.innerHTML = html;
    }

    function renderStreakStats() {
      const panel = document.getElementById('streakPanel');
      if (!panel) return;

      if (!allProgressData || allProgressData.length === 0) {
        panel.innerHTML = `
          <div class="streak-card">
            <div class="streak-icon">🔥</div>
            <div class="streak-value fire">0</div>
            <div class="streak-label">Current Streak</div>
            <div class="streak-sub">days</div>
          </div>
          <div class="streak-card">
            <div class="streak-icon">🏆</div>
            <div class="streak-value trophy">0</div>
            <div class="streak-label">Best Streak</div>
            <div class="streak-sub">days</div>
          </div>
          <div class="streak-card">
            <div class="streak-icon">✅</div>
            <div class="streak-value check">0</div>
            <div class="streak-label">Total Logged</div>
            <div class="streak-sub">days</div>
          </div>
          <div class="streak-card">
            <div class="streak-icon">📊</div>
            <div class="streak-value rate">0%</div>
            <div class="streak-label">This Month</div>
            <div class="streak-sub">completion avg</div>
          </div>
        `;
        return;
      }

      // Sort dates ascending
      const sorted = allProgressData
        .filter(p => p.exerciseCompletion > 0)
        .map(p => {
          const d = new Date(p.date);
          d.setHours(0, 0, 0, 0);
          return d;
        })
        .sort((a, b) => a - b);

      // Calculate current streak (consecutive days ending today or yesterday)
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;

      if (sorted.length > 0) {
        // Deduplicate dates
        const uniqueDays = [];
        sorted.forEach(d => {
          const ts = d.getTime();
          if (!uniqueDays.length || uniqueDays[uniqueDays.length - 1].getTime() !== ts) {
            uniqueDays.push(d);
          }
        });

        // Calculate all streaks
        tempStreak = 1;
        bestStreak = 1;
        for (let i = 1; i < uniqueDays.length; i++) {
          const diff = (uniqueDays[i] - uniqueDays[i - 1]) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
          bestStreak = Math.max(bestStreak, tempStreak);
        }

        // Current streak: check if last logged date is today or yesterday
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastDate = uniqueDays[uniqueDays.length - 1];
        const daysSinceLast = (today - lastDate) / (1000 * 60 * 60 * 24);

        if (daysSinceLast <= 1) {
          currentStreak = tempStreak;
        } else {
          currentStreak = 0;
        }
      }

      // Total logged days
      const totalLogged = allProgressData.length;

      // This month avg completion
      const now = new Date();
      const thisMonthLogs = allProgressData.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const monthAvg = thisMonthLogs.length > 0
        ? Math.round(thisMonthLogs.reduce((s, p) => s + p.exerciseCompletion, 0) / thisMonthLogs.length)
        : 0;

      panel.innerHTML = `
        <div class="streak-card">
          <div class="streak-icon">🔥</div>
          <div class="streak-value fire">${currentStreak}</div>
          <div class="streak-label">Current Streak</div>
          <div class="streak-sub">${currentStreak === 1 ? 'day' : 'days'}</div>
        </div>
        <div class="streak-card">
          <div class="streak-icon">🏆</div>
          <div class="streak-value trophy">${bestStreak}</div>
          <div class="streak-label">Best Streak</div>
          <div class="streak-sub">${bestStreak === 1 ? 'day' : 'days'}</div>
        </div>
        <div class="streak-card">
          <div class="streak-icon">✅</div>
          <div class="streak-value check">${totalLogged}</div>
          <div class="streak-label">Total Logged</div>
          <div class="streak-sub">${totalLogged === 1 ? 'day' : 'days'}</div>
        </div>
        <div class="streak-card">
          <div class="streak-icon">📊</div>
          <div class="streak-value rate">${monthAvg}%</div>
          <div class="streak-label">This Month</div>
          <div class="streak-sub">completion avg</div>
        </div>
      `;
    }

    function renderProgressTable(data) {
      if (!data || data.length === 0) {
        document.getElementById("progressTable").innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No progress entries yet.</p></div>';
        return;
      }
      const moodEmoji = {
        great: "😄",
        good: "🙂",
        okay: "😐",
        bad: "😟",
        terrible: "😢",
      };
      document.getElementById("progressTable").innerHTML =
        `<table><thead><tr><th>Date</th><th>Pain</th><th>Completion</th><th>Mood</th><th>Notes</th></tr></thead><tbody>${data.map((p) => `<tr><td>${formatDate(p.date)}</td><td><span class="pain-dot ${p.painLevel <= 3 ? "pain-low" : p.painLevel <= 6 ? "pain-mid" : "pain-high"}"></span>${p.painLevel}/10</td><td>${p.exerciseCompletion}%</td><td>${moodEmoji[p.mood] || "😐"} ${p.mood}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.notes || "—"}</td></tr>`).join("")}</tbody></table>`;
    }

    function drawProgressChart(data) {
      const canvas = document.getElementById("progressChart");
      if (!canvas || data.length < 2) return;
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const W = rect.width,
        H = rect.height,
        pad = { top: 20, right: 20, bottom: 30, left: 40 };
      const cW = W - pad.left - pad.right,
        cH = H - pad.top - pad.bottom;
      const vals = data.map((p) => p.exerciseCompletion);
      const painVals = data.map((p) => p.painLevel * 10);
      ctx.strokeStyle = getComputedStyle(document.body)
        .getPropertyValue("--outline-variant")
        .trim();
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (cH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(W - pad.right, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const primary = getComputedStyle(document.body)
        .getPropertyValue("--primary")
        .trim();
      // Completion line
      ctx.beginPath();
      vals.forEach((v, i) => {
        const x = pad.left + (cW / (vals.length - 1)) * i;
        const y = pad.top + cH - (v / 100) * cH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = primary;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();
      // Pain line
      ctx.beginPath();
      painVals.forEach((v, i) => {
        const x = pad.left + (cW / (painVals.length - 1)) * i;
        const y = pad.top + cH - (v / 100) * cH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = getComputedStyle(document.body)
        .getPropertyValue("--tertiary")
        .trim();
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Labels
      ctx.font = `11px Inter,sans-serif`;
      ctx.fillStyle = getComputedStyle(document.body)
        .getPropertyValue("--on-surface-variant")
        .trim();
      ctx.textAlign = "center";
      const step = Math.max(1, Math.floor(data.length / 6));
      data.forEach((p, i) => {
        if (i % step === 0 || i === data.length - 1) {
          const x = pad.left + (cW / (data.length - 1)) * i;
          ctx.fillText(
            new Date(p.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            x,
            H - 8,
          );
        }
      });
      // Legend
      ctx.font = "bold 11px Inter,sans-serif";
      ctx.fillStyle = primary;
      ctx.textAlign = "left";
      ctx.fillText("— Completion %", pad.left, pad.top - 4);
      ctx.fillStyle = getComputedStyle(document.body)
        .getPropertyValue("--tertiary")
        .trim();
      ctx.fillText("- - Pain Level (×10)", pad.left + 120, pad.top - 4);
    }
    async function renderDoctorProgress(container) {
      document.getElementById("pageSubtitle").textContent =
        "View patient progress data";
      container.innerHTML = `
        <div class="patient-selector">
          <label class="form-label">Select Patient</label>
          <div class="search-select" id="patientSearchSelect">
            <input type="text" class="search-select-input" id="patientSearchInput" placeholder="🔍 Search patients..." autocomplete="off" />
            <span class="search-select-arrow">▼</span>
            <div class="search-select-dropdown" id="patientDropdown"></div>
          </div>
          <input type="hidden" id="patientSelect" value="" />
        </div>
        <div class="progress-grid">
          <div class="card card-full"><div class="card-header"><div class="card-title">Patient Progress Trend</div></div><div class="chart-container"><canvas id="progressChart"></canvas></div></div>
          <div class="card card-full cal-card">
            <div class="cal-header">
              <div class="card-title">📅 Exercise Activity Calendar</div>
              <div class="cal-nav">
                <button class="cal-nav-btn" id="calPrev" title="Previous month">◀</button>
                <span class="cal-month-label" id="calMonthLabel"></span>
                <button class="cal-nav-btn" id="calNext" title="Next month">▶</button>
              </div>
            </div>
            <div class="cal-grid" id="calGrid"></div>
            <div class="cal-legend">
              <div class="cal-legend-item"><div class="cal-legend-dot done"></div> Done (≥75%)</div>
              <div class="cal-legend-item"><div class="cal-legend-dot partial"></div> Partial (1-74%)</div>
              <div class="cal-legend-item"><div class="cal-legend-dot missed"></div> Missed (0%)</div>
              <div class="cal-legend-item"><div class="cal-legend-dot none"></div> No log</div>
            </div>
            <div class="streak-panel" id="streakPanel"></div>
          </div>
          <div class="card card-full"><div class="card-header"><div class="card-title">Progress History</div></div><div class="table-wrap" id="progressTable"><div class="empty-state"><div class="empty-state-icon">👥</div><p>Select a patient to view their progress.</p></div></div></div>
        </div>
      `;
      // Init calendar for doctor view
      renderCalendar();
      setupCalendarNav();
      try {
        const patients = await api("/patients");
        const wrapper = document.getElementById("patientSearchSelect");
        const input = document.getElementById("patientSearchInput");
        const dropdown = document.getElementById("patientDropdown");
        const hiddenInput = document.getElementById("patientSelect");
        let highlightedIdx = -1;

        function getInitials(name) {
          return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
        }

        function renderOptions(filter = "") {
          const q = filter.toLowerCase();
          const filtered = patients.filter(p =>
            p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
          );
          highlightedIdx = -1;
          if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="search-select-empty">No patients found</div>';
            return;
          }
          dropdown.innerHTML = filtered.map((p, i) => `
              <div class="search-select-option ${hiddenInput.value === p._id ? 'selected' : ''}" data-id="${p._id}" data-name="${p.name}" data-email="${p.email}" data-index="${i}">
                <div class="opt-avatar">${getInitials(p.name)}</div>
                <div class="opt-info">
                  <span class="opt-name">${p.name}</span>
                  <span class="opt-email">${p.email}</span>
                </div>
              </div>
            `).join("");
        }

        function openDropdown() {
          wrapper.classList.add("open");
          renderOptions(input.value);
        }
        function closeDropdown() {
          wrapper.classList.remove("open");
          highlightedIdx = -1;
        }

        async function selectPatient(id, name) {
          hiddenInput.value = id;
          input.value = name;
          closeDropdown();
          try {
            const data = await api(`/progress/${id}`);
            allProgressData = data;
            renderProgressTable(data);
            drawProgressChart(data.slice().reverse());
            renderCalendar();
            renderStreakStats();
          } catch (err) {
            showToast(err.message);
          }
        }

        input.addEventListener("focus", () => {
          input.select();
          openDropdown();
        });
        input.addEventListener("input", () => {
          openDropdown();
        });

        dropdown.addEventListener("click", (e) => {
          const opt = e.target.closest(".search-select-option");
          if (opt) selectPatient(opt.dataset.id, opt.dataset.name);
        });

        input.addEventListener("keydown", (e) => {
          const opts = dropdown.querySelectorAll(".search-select-option");
          if (!opts.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            highlightedIdx = Math.min(highlightedIdx + 1, opts.length - 1);
            opts.forEach((o, i) => o.classList.toggle("highlighted", i === highlightedIdx));
            opts[highlightedIdx]?.scrollIntoView({ block: "nearest" });
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            highlightedIdx = Math.max(highlightedIdx - 1, 0);
            opts.forEach((o, i) => o.classList.toggle("highlighted", i === highlightedIdx));
            opts[highlightedIdx]?.scrollIntoView({ block: "nearest" });
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIdx >= 0 && opts[highlightedIdx]) {
              const opt = opts[highlightedIdx];
              selectPatient(opt.dataset.id, opt.dataset.name);
            }
          } else if (e.key === "Escape") {
            closeDropdown();
            input.blur();
          }
        });

        document.addEventListener("click", (e) => {
          if (!wrapper.contains(e.target)) closeDropdown();
        });

        renderOptions();
      } catch (err) {
        showToast("Failed to load patients");
      }
    }

    loadPage();
