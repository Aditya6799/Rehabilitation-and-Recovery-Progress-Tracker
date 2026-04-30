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

    // Patient: show book button & load doctors
    if (user.role === "patient") {
      document.getElementById("patientActions").innerHTML =
        '<button class="btn btn-primary" onclick="openBookModal()">＋ Book Appointment</button>';
      loadDoctors();
    }

    async function loadDoctors() {
      try {
        const docs = await api("/doctors");
        const sel = document.getElementById("doctorSelect");
        sel.innerHTML =
          '<option value="">— Select a doctor —</option>' +
          docs
            .map(
              (d) =>
                `<option value="${d._id}">${d.name}${d.specialization ? " — " + d.specialization : ""}</option>`,
            )
            .join("");
      } catch (err) {
        showToast("Failed to load doctors list");
      }
    }

    async function loadAppointments() {
      try {
        const appts = await api("/appointments");
        renderAppointments(appts);
      } catch (err) {
        document.getElementById("appointmentsGrid").innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">📅</div><p>Failed to load appointments.</p></div>';
      }
    }

    function renderAppointments(appts) {
      const grid = document.getElementById("appointmentsGrid");
      if (!appts || appts.length === 0) {
        grid.innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">📅</div><p>No appointments yet. ' +
          (user.role === "patient"
            ? "Book your first consultation!"
            : "Patients will appear here when they book.") +
          "</p></div>";
        return;
      }
      grid.innerHTML = appts
        .map((a) => {
          const d = new Date(a.date);
          const phone = user.role === "patient" ? a.doctorId?.phone : a.patientId?.phone;
          const personName = user.role === "patient" ? a.doctorId?.name || "Doctor" : a.patientId?.name || "Patient";
          const personLabel = user.role === "patient" ? "Doctor" : "Patient";
          
          const whatsappBtn = phone && phone.trim()
            ? `<a href="https://wa.me/${phone.replace(/\D/g, '')}" target="_blank" class="btn btn-sm btn-ghost" style="color: #25D366; border-color: #25D366; display: inline-flex; align-items: center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg> WhatsApp
              </a>`
            : `<span class="btn btn-sm btn-ghost" style="color: #999; border-color: #ddd; display: inline-flex; align-items: center; gap: 4px; cursor: default;" title="No phone number in profile">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg> No Phone
              </span>`;

          return `
        <div class="appt-card">
          <div class="appt-card-top">
            <div class="appt-date-badge">
              <div class="appt-date-icon">
                <span class="day">${d.getDate()}</span>
                <span class="month">${d.toLocaleDateString("en-US", { month: "short" })}</span>
              </div>
              <div class="appt-info">
                <h3>${personName}</h3>
                <p>${personLabel}${a.doctorId?.specialization ? " · " + a.doctorId.specialization : ""}</p>
              </div>
            </div>
            <span class="appt-status ${a.status}">${a.status}</span>
          </div>
          <div class="appt-details">
            <div class="appt-detail">📅 ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            <div class="appt-detail">🕐 ${a.time}</div>
            <div class="appt-detail">📋 ${a.reason}</div>
          </div>
          <div class="appt-actions">
            ${whatsappBtn}
            ${user.role === "doctor" && a.status === "pending"
              ? `
              <button class="btn btn-sm btn-success" onclick="updateStatus('${a._id}','confirmed')">✓ Confirm</button>
              <button class="btn btn-sm btn-primary" onclick="updateStatus('${a._id}','completed')">✔ Complete</button>
              <button class="btn btn-sm btn-danger" onclick="updateStatus('${a._id}','cancelled')">✕ Cancel</button>
            `
              : ""
            }
            ${user.role === "doctor" && a.status === "confirmed"
              ? `
              <button class="btn btn-sm btn-primary" onclick="updateStatus('${a._id}','completed')">✔ Mark Completed</button>
              <button class="btn btn-sm btn-danger" onclick="updateStatus('${a._id}','cancelled')">✕ Cancel</button>
            `
              : ""
            }
          </div>
        </div>`;
        })
        .join("");
    }

    async function updateStatus(id, status) {
      try {
        await api(`/appointments/${id}`, {
          method: "PUT",
          body: JSON.stringify({ status }),
        });
        showToast(`Appointment ${status}!`, "success");
        loadAppointments();
      } catch (err) {
        showToast(err.message);
      }
    }

    function openBookModal() {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      document.getElementById("apptDate").value = tomorrow
        .toISOString()
        .split("T")[0];
      document.getElementById("apptDate").min = tomorrow
        .toISOString()
        .split("T")[0];
      document.getElementById("bookModal").classList.add("open");
    }
    function closeBookModal() {
      document.getElementById("bookModal").classList.remove("open");
    }

    document
      .getElementById("bookForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const doctorId = document.getElementById("doctorSelect").value;
        const date = document.getElementById("apptDate").value;
        const time = document.getElementById("apptTime").value;
        const reason = document.getElementById("apptReason").value;
        if (!doctorId) {
          showToast("Please select a doctor");
          return;
        }
        try {
          await api("/appointments", {
            method: "POST",
            body: JSON.stringify({ doctorId, date, time, reason }),
          });
          showToast("Appointment booked!", "success");
          closeBookModal();
          loadAppointments();
        } catch (err) {
          showToast(err.message);
        }
      });

    document.getElementById("bookModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("bookModal")) closeBookModal();
    });

    loadAppointments();
