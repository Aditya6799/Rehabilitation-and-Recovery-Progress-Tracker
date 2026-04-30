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

    let allExercises = [];
    let currentFilter = "all";
    let editingId = null;

    // Doctor: show create button
    if (user.role === "doctor") {
      document.getElementById("doctorActions").innerHTML =
        '<button class="btn btn-primary" onclick="openModal()">＋ Create Exercise</button>';
    }

    async function loadPatientsForAssign() {
      if (user.role !== "doctor") return;
      const select = document.getElementById("exAssignedTo");
      document.getElementById("assignGroup").style.display = "block";
      try {
        const patients = await api("/patients");
        select.innerHTML = patients.map(p => `<option value="${p._id}">${p.name}</option>`).join("");
      } catch (err) {
        console.error(err);
      }
    }
    if (user.role === "doctor") loadPatientsForAssign();

    function getYouTubeEmbedURL(url) {
      if (!url) return null;
      let videoId = null;
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
      if (match && match[1]) {
        videoId = match[1];
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    async function loadExercises() {
      try {
        allExercises = await api("/exercises");
        renderExercises(allExercises);
      } catch (err) {
        document.getElementById("exercisesGrid").innerHTML =
          '<div class="empty-state"><div class="empty-state-icon">🏋️</div><p>Failed to load exercises.</p></div>';
      }
    }

    function renderExercises(exercises) {
      const docView = document.getElementById("doctorExercisesView");
      const patView = document.getElementById("patientExercisesView");
      
      if (user.role === "patient") {
        if (docView) docView.style.display = "none";
        if (patView) patView.style.display = "block";
        
        const myEx = exercises.filter(e => e.assignedTo && e.assignedTo.some(u => u._id === user.id || u === user.id));
        const globalEx = exercises.filter(e => !e.assignedTo || e.assignedTo.length === 0);
        
        const myGrid = document.getElementById("myExercisesGrid");
        const globalGrid = document.getElementById("globalExercisesGrid");
        
        if (myGrid) myGrid.innerHTML = generateExerciseHTML(myEx);
        if (globalGrid) globalGrid.innerHTML = generateExerciseHTML(globalEx);
      } else {
        if (patView) patView.style.display = "none";
        if (docView) docView.style.display = "block";
        
        const grid = document.getElementById("exercisesGrid");
        if (grid) grid.innerHTML = generateExerciseHTML(exercises);
      }
    }

    function generateExerciseHTML(exercisesList) {
      if (!exercisesList || exercisesList.length === 0) {
        return '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🏋️</div><p>No exercises found.</p></div>';
      }
      const iconMap = {
        stretching: "🧘",
        strengthening: "💪",
        balance: "⚖️",
        cardio: "🏃",
        flexibility: "🤸",
        mobility: "🦵",
        other: "🏋️",
      };
      return exercisesList
        .map(
          (ex) => {
            const iframeSrc = getYouTubeEmbedURL(ex.videoUrl);
            const videoHtml = iframeSrc ? `<div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin-bottom:12px;border-radius:var(--radius-md);"><iframe src="${iframeSrc}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>` : '';

            const isPatient = user.role === "patient";
            let assignText = "";
            let creatorName = ex.createdBy && ex.createdBy.name ? ex.createdBy.name : "Unknown Doctor";

            if (isPatient) {
              assignText = `<strong>Assigned By:</strong> Dr. ${creatorName} <br/> <strong>Assigned To:</strong> ${ex.assignedTo && ex.assignedTo.length > 0 ? '👤 You (Specifically assigned)' : '🌍 All Patients (Global)'}`;
            } else {
              let patientNames = "🌍 All Patients (Global)";
              if (ex.assignedTo && ex.assignedTo.length > 0) {
                patientNames = "👤 Specific Patients";
                if (ex.assignedTo[0].name) {
                  patientNames = "👤 " + ex.assignedTo.map(p => p.name).join(", ");
                }
              }
              assignText = `<strong>Assigned By:</strong> Dr. ${creatorName} <br/> <strong>Assigned To:</strong> ${patientNames}`;
            }

            const assignBlock = `<div class="assignment-info">${assignText}</div>`;

            return `
        <div class="exercise-card" data-category="${ex.category}">
          <div class="exercise-card-top">
            <div class="exercise-icon ${ex.category}">${iconMap[ex.category] || "🏋️"}</div>
            <span class="exercise-diff ${ex.difficulty}">${ex.difficulty}</span>
          </div>
          <h3>${ex.title}</h3>
          <div class="exercise-meta">
            <span>⏱ ${ex.duration} min</span>
            <span>📅 ${ex.daysToComplete || 7} days</span>
            <span>📂 ${ex.category}</span>
          </div>
          ${assignBlock}
          ${videoHtml}
          <div class="instruction-box">${ex.instructions}</div>
          <div class="exercise-actions">
            ${user.role === "doctor"
                ? `
              <button class="btn btn-sm btn-ghost" onclick="editExercise('${ex._id}')">✏️ Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteExercise('${ex._id}')">🗑️ Delete</button>
            `
                : `
              <button class="btn btn-sm btn-primary" onclick="showToast('Exercise noted! Log completion in Progress.','success')">✅ Mark Complete</button>
            `
              }
          </div>
        </div>
      `
          })
        .join("");
    }

    function filterExercises(category, el) {
      currentFilter = category;
      document
        .querySelectorAll(".filter-chip")
        .forEach((c) => c.classList.remove("active"));
      el.classList.add("active");
      if (category === "all") renderExercises(allExercises);
      else
        renderExercises(allExercises.filter((e) => e.category === category));
    }

    function openModal(exercise = null) {
      editingId = exercise ? exercise._id : null;
      document.getElementById("modalTitle").textContent = exercise
        ? "Edit Exercise"
        : "Create Exercise";
      document.getElementById("modalSubmitBtn").textContent = exercise
        ? "Save Changes"
        : "Create Exercise";
      document.getElementById("exTitle").value = exercise
        ? exercise.title
        : "";
      document.getElementById("exCategory").value = exercise
        ? exercise.category
        : "stretching";
      document.getElementById("exDuration").value = exercise
        ? exercise.duration
        : 15;
      document.getElementById("exDaysToComplete").value = exercise
        ? exercise.daysToComplete || 7
        : 7;
      document.getElementById("exDifficulty").value = exercise
        ? exercise.difficulty
        : "beginner";
      document.getElementById("exInstructions").value = exercise
        ? exercise.instructions
        : "";

      document.getElementById("exVideoUrl").value = exercise && exercise.videoUrl ? exercise.videoUrl : "";
      const selectBox = document.getElementById("exAssignedTo");
      if (selectBox) {
        for (let i = 0; i < selectBox.options.length; i++) {
          selectBox.options[i].selected = exercise && exercise.assignedTo ? exercise.assignedTo.some(a => (a._id || a) === selectBox.options[i].value) : false;
        }
      }

      document.getElementById("exerciseModal").classList.add("open");
    }
    function closeModal() {
      document.getElementById("exerciseModal").classList.remove("open");
      editingId = null;
    }

    document
      .getElementById("exerciseForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const assignedToOpts = document.getElementById("exAssignedTo").selectedOptions;
        const assignedToObj = Array.from(assignedToOpts).map(opt => opt.value).filter(v => v !== "");
        const body = {
          title: document.getElementById("exTitle").value,
          category: document.getElementById("exCategory").value,
          duration: parseInt(document.getElementById("exDuration").value),
          daysToComplete: parseInt(document.getElementById("exDaysToComplete").value),
          difficulty: document.getElementById("exDifficulty").value,
          instructions: document.getElementById("exInstructions").value,
          videoUrl: document.getElementById("exVideoUrl").value,
          assignedTo: assignedToObj,
        };
        try {
          if (editingId) {
            await api(`/exercises/${editingId}`, {
              method: "PUT",
              body: JSON.stringify(body),
            });
            showToast("Exercise updated!", "success");
          } else {
            await api("/exercises", {
              method: "POST",
              body: JSON.stringify(body),
            });
            showToast("Exercise created!", "success");
          }
          closeModal();
          loadExercises();
        } catch (err) {
          showToast(err.message);
        }
      });

    function editExercise(id) {
      const ex = allExercises.find((e) => e._id === id);
      if (ex) openModal(ex);
    }
    async function deleteExercise(id) {
      if (!confirm("Delete this exercise?")) return;
      try {
        await api(`/exercises/${id}`, { method: "DELETE" });
        showToast("Exercise deleted!", "success");
        loadExercises();
      } catch (err) {
        showToast(err.message);
      }
    }

    document
      .getElementById("exerciseModal")
      .addEventListener("click", (e) => {
        if (e.target === document.getElementById("exerciseModal"))
          closeModal();
      });

    loadExercises();
