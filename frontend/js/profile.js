const API_BASE = window.location.origin + "/api";

      document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const input = btn.previousElementSibling;
          if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
          } else {
            input.type = 'password';
            btn.textContent = '👁️';
          }
        });
      });

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

      // Load profile
      async function loadProfile() {
        try {
          const profile = await api("/profile");
          const initials = profile.name
            ? profile.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : "--";

          document.getElementById("profileAvatar").textContent = initials;
          document.getElementById("profileName").textContent = profile.name;
          document.getElementById("profileEmail").textContent = profile.email;

          const badge = document.getElementById("profileBadge");
          badge.className = `profile-role-badge ${profile.role}`;
          badge.textContent =
            profile.role === "patient" ? "👤 Patient" : "🩺 Doctor";

          document.getElementById("profileMeta").innerHTML = `
          <div class="profile-meta-item"><span>Member Since</span><span>${new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span></div>
          <div class="profile-meta-item"><span>Phone</span><span>${profile.phone || "Not set"}</span></div>
          ${profile.role === "doctor" ? `<div class="profile-meta-item"><span>Specialization</span><span>${profile.specialization || "Not set"}</span></div>
          <div class="profile-meta-item"><span>License</span><span>${profile.licenseNumber || "Not set"}</span></div>` : ""}
        `;

          // Fill form
          document.getElementById("profName").value = profile.name || "";
          document.getElementById("profPhone").value = profile.phone || "";
          document.getElementById("profBio").value = profile.bio || "";

          // Role-specific fields
          const roleFields = document.getElementById("roleSpecificFields");
          if (profile.role === "doctor") {
            roleFields.innerHTML = `
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Specialization</label>
                <input type="text" class="form-input" id="profSpecialization" value="${profile.specialization || ""}" placeholder="e.g., Orthopedic Rehabilitation">
              </div>
              <div class="form-group">
                <label class="form-label">License Number</label>
                <input type="text" class="form-input" id="profLicense" value="${profile.licenseNumber || ""}" placeholder="MED-XXXXX">
              </div>
            </div>
          `;
          } else {
            roleFields.innerHTML = `
            <div class="form-group">
              <label class="form-label">Medical History</label>
              <textarea class="form-textarea" id="profMedHistory" placeholder="Any relevant medical history...">${profile.medicalHistory || ""}</textarea>
            </div>
          `;
          }
        } catch (err) {
          showToast("Failed to load profile: " + err.message);
        }
      }

      // Save profile
      document
        .getElementById("profileForm")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          const body = {
            name: document.getElementById("profName").value,
            phone: document.getElementById("profPhone").value,
            bio: document.getElementById("profBio").value,
          };
          if (user.role === "doctor") {
            const spec = document.getElementById("profSpecialization");
            const lic = document.getElementById("profLicense");
            if (spec) body.specialization = spec.value;
            if (lic) body.licenseNumber = lic.value;
          } else {
            const med = document.getElementById("profMedHistory");
            if (med) body.medicalHistory = med.value;
          }
          try {
            const updated = await api("/profile", {
              method: "PUT",
              body: JSON.stringify(body),
            });
            // Update localStorage
            const u = getUser();
            u.name = body.name;
            localStorage.setItem("user", JSON.stringify(u));
            showToast("Profile updated!", "success");
            renderSidebar();
            loadProfile();
          } catch (err) {
            showToast(err.message);
          }
        });

      // Change password
      document
        .getElementById("passwordForm")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          const current = document.getElementById("currentPassword").value;
          const newPw = document.getElementById("newPassword").value;
          if (newPw.length < 6) {
            showToast("New password must be at least 6 characters");
            return;
          }
          try {
            await api("/profile", {
              method: "PUT",
              body: JSON.stringify({
                currentPassword: current,
                newPassword: newPw,
              }),
            });
            showToast("Password updated!", "success");
            document.getElementById("currentPassword").value = "";
            document.getElementById("newPassword").value = "";
          } catch (err) {
            showToast(err.message);
          }
        });

      loadProfile();
