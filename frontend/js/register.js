const API_BASE = window.location.origin + "/api";
      let selectedRole = "patient";
      (function () {
        if (localStorage.getItem("theme") === "dark") {
          document.body.classList.add("dark");
          document.getElementById("themeToggle").textContent = "☀️";
        }
      })();

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

      document.getElementById("themeToggle").addEventListener("click", () => {
        document.body.classList.toggle("dark");
        const isDark = document.body.classList.contains("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        document.getElementById("themeToggle").textContent = isDark
          ? "☀️"
          : "🌙";
      });

      if (localStorage.getItem("token"))
        window.location.href = "dashboard.html";
      function selectRole(role) {
        selectedRole = role;
        document
          .querySelectorAll(".role-option")
          .forEach((el) => el.classList.remove("active"));
        if (role === "patient")
          document.getElementById("rolePatient").classList.add("active");
        else document.getElementById("roleDoctor").classList.add("active");
      }
      document.getElementById("password").addEventListener("input", (e) => {
        const val = e.target.value;
        const fill = document.getElementById("strengthFill");
        let strength = 0;
        if (val.length >= 6) strength++;
        if (val.length >= 8) strength++;
        if (/[A-Z]/.test(val)) strength++;
        if (/[0-9]/.test(val)) strength++;
        if (/[^A-Za-z0-9]/.test(val)) strength++;

        const percent = (strength / 5) * 100;
        fill.style.width = percent + "%";
        if (strength <= 1) fill.style.background = "#e53935";
        else if (strength <= 2) fill.style.background = "#fb8c00";
        else if (strength <= 3) fill.style.background = "#fdd835";
        else fill.style.background = "#43a047";
      });
      function showToast(message, type = "error") {
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = `${type === "success" ? "✓" : "⚠"} ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => toast.remove(), 300);
        }, 4000);
      }
      document
        .getElementById("registerForm")
        .addEventListener("submit", async (e) => {
          e.preventDefault();
          const name = document.getElementById("name");
          const email = document.getElementById("email");
          const password = document.getElementById("password");
          const confirmPassword = document.getElementById("confirmPassword");
          const submitBtn = document.getElementById("submitBtn");

          [name, email, password, confirmPassword].forEach((i) =>
            i.classList.remove("error"),
          );
          let hasError = false;

          if (!name.value || name.value.trim().length < 2) {
            name.classList.add("error");
            hasError = true;
          }
          if (!email.value || !/^\S+@\S+\.\S+$/.test(email.value)) {
            email.classList.add("error");
            hasError = true;
          }
          if (!password.value || password.value.length < 6) {
            password.classList.add("error");
            hasError = true;
          }
          if (password.value !== confirmPassword.value) {
            confirmPassword.classList.add("error");
            hasError = true;
          }
          if (hasError) return;

          submitBtn.classList.add("loading");
          submitBtn.disabled = true;

          try {
            const res = await fetch(`${API_BASE}/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: name.value.trim(),
                email: email.value.trim(),
                password: password.value,
                role: selectedRole,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed.");

            showToast("Account created! Redirecting to login...", "success");
            setTimeout(() => {
              window.location.href = "login.html";
            }, 1500);
          } catch (error) {
            showToast(error.message || "Registration failed.");
          } finally {
            submitBtn.classList.remove("loading");
            submitBtn.disabled = false;
          }
        });

      document.querySelectorAll(".form-input").forEach((input) => {
        input.addEventListener("input", () => input.classList.remove("error"));
      });
