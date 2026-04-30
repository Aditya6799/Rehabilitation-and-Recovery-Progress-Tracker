(function () {
        const theme = localStorage.getItem("theme");
        if (theme === "dark") document.body.classList.add("dark");
      })();

      document.getElementById("themeToggle").addEventListener("click", () => {
        document.body.classList.toggle("dark");
        const isDark = document.body.classList.contains("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        document.getElementById("themeToggle").textContent = isDark
          ? "☀️"
          : "🌙";
      });

      if (localStorage.getItem("theme") === "dark") {
        document.getElementById("themeToggle").textContent = "☀️";
      }
      window.addEventListener("scroll", () => {
        document
          .getElementById("mainNav")
          .classList.toggle("scrolled", window.scrollY > 20);
      });
      document.getElementById("navToggle").addEventListener("click", () => {
        document.getElementById("navLinks").classList.toggle("open");
      });
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
            }
          });
        },
        { threshold: 0.1 },
      );

      document
        .querySelectorAll(".fade-up")
        .forEach((el) => observer.observe(el));

      /* ── If user is already logged in, show dashboard link */
      const token = localStorage.getItem("token");
      if (token) {
        const navActions = document.querySelector(".nav-actions");
        const loginBtn = navActions.querySelector(".btn-ghost");
        const startBtn = navActions.querySelector(".btn-primary");
        if (loginBtn) loginBtn.textContent = "Dashboard";
        if (loginBtn) loginBtn.href = "dashboard.html";
        if (startBtn) startBtn.textContent = "Go to Dashboard";
        if (startBtn) startBtn.href = "dashboard.html";
      }
