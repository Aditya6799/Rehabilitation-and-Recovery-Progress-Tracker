const API_BASE = window.location.origin + "/api";
      let selectedRole = "patient";

      (function () {
        if (localStorage.getItem("theme") === "dark") {
          document.body.classList.add("dark");
          document.getElementById("themeToggle").textContent = "☀️";
        }
      })();

      // Role selector logic
      document.querySelectorAll('.role-option').forEach(option => {
        option.addEventListener('click', () => {
          document.querySelectorAll('.role-option').forEach(o => o.classList.remove('active'));
          option.classList.add('active');
          option.querySelector('input').checked = true;
          selectedRole = option.dataset.role;
        });
      });

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
      if (localStorage.getItem("token")) {
        window.location.href = "dashboard.html";
      }
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
        .getElementById("loginForm")
        .addEventListener("submit", async (e) => {
          e.preventDefault();

          const email = document.getElementById("email");
          const password = document.getElementById("password");
          const submitBtn = document.getElementById("submitBtn");

          // Reset errors
          [email, password].forEach((input) => input.classList.remove("error"));

          // Validate
          let hasError = false;
          if (!email.value || !/^\S+@\S+\.\S+$/.test(email.value)) {
            email.classList.add("error");
            hasError = true;
          }
          if (!password.value) {
            password.classList.add("error");
            hasError = true;
          }
          if (hasError) return;

          // Submit
          submitBtn.classList.add("loading");
          submitBtn.disabled = true;

          try {
            const res = await fetch(`${API_BASE}/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: email.value,
                password: password.value,
              }),
            });

            const data = await res.json();

            if (!res.ok) {
              throw new Error(data.error || "Login failed.");
            }

            // Check if selected role matches the account's role
            if (data.user.role !== selectedRole) {
              showToast(`This account is registered as a ${data.user.role}, not a ${selectedRole}. Logging you in as ${data.user.role}.`);
            }

            // Store token and user data
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            showToast("Login successful! Redirecting...", "success");

            setTimeout(() => {
              window.location.href = "dashboard.html";
            }, 1000);
          } catch (error) {
            showToast(error.message || "Login failed. Please try again.");
          } finally {
            submitBtn.classList.remove("loading");
            submitBtn.disabled = false;
          }
        });
      document.querySelectorAll(".form-input").forEach((input) => {
        input.addEventListener("input", () => input.classList.remove("error"));
      });
