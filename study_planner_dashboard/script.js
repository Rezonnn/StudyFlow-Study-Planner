// StudyFlow – simple in-browser task tracker using localStorage

const taskListEl = document.getElementById("taskList");
const emptyStateEl = document.getElementById("emptyState");
const filterCourseEl = document.getElementById("filterCourse");
const filterStatusEl = document.getElementById("filterStatus");
const filterPriorityEl = document.getElementById("filterPriority");

const statTotalEl = document.getElementById("statTotal");
const statDoneEl = document.getElementById("statDone");
const statHighEl = document.getElementById("statHigh");
const statWeekEl = document.getElementById("statWeek");

const todayListEl = document.getElementById("todayList");
const todayEmptyEl = document.getElementById("todayEmpty");
const todayCourseEl = document.getElementById("todayCourse");
const yearEl = document.getElementById("year");

// Form
const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("titleInput");
const courseInput = document.getElementById("courseInput");
const dueInput = document.getElementById("dueInput");
const priorityInput = document.getElementById("priorityInput");
const notesInput = document.getElementById("notesInput");
const clearAllBtn = document.getElementById("clearAllBtn");

yearEl.textContent = new Date().getFullYear();

// --- Data layer ----

let tasks = loadTasks();

function loadTasks() {
  try {
    const raw = localStorage.getItem("studyflow_tasks");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem("studyflow_tasks", JSON.stringify(tasks));
}

// --- Rendering ---

function renderFilters() {
  const courses = [...new Set(tasks.map((t) => t.course))].filter(Boolean);
  const currentValue = filterCourseEl.value;
  filterCourseEl.innerHTML = '<option value="all">All courses</option>';
  courses.forEach((course) => {
    const opt = document.createElement("option");
    opt.value = course;
    opt.textContent = course;
    filterCourseEl.appendChild(opt);
  });
  if ("all" === currentValue || courses.includes(currentValue)) {
    filterCourseEl.value = currentValue;
  }
}

function passesFilters(task) {
  const statusFilter = filterStatusEl.value;
  const priorityFilter = filterPriorityEl.value;
  const courseFilter = filterCourseEl.value;

  if (statusFilter === "pending" && task.done) return false;
  if (statusFilter === "done" && !task.done) return false;

  if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;

  if (courseFilter !== "all" && task.course !== courseFilter) return false;

  return true;
}

function renderTasks() {
  taskListEl.innerHTML = "";
  const visibleTasks = tasks.filter(passesFilters);

  if (visibleTasks.length === 0) {
    emptyStateEl.style.display = "block";
  } else {
    emptyStateEl.style.display = "none";
  }

  visibleTasks
    .slice()
    .sort((a, b) => {
      // Sort by done, then due date, then priority
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.due && b.due && a.due !== b.due) {
        return a.due.localeCompare(b.due);
      }
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .forEach((task) => {
      const card = document.createElement("article");
      card.className = "task-card";

      const left = document.createElement("div");
      left.className = "task-left";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-checkbox";
      checkbox.checked = task.done;
      checkbox.addEventListener("change", () => toggleDone(task.id));
      left.appendChild(checkbox);

      const main = document.createElement("div");
      main.className = "task-main";

      const titleEl = document.createElement("div");
      titleEl.className = "task-title";
      titleEl.textContent = task.title;
      if (task.done) {
        titleEl.style.textDecoration = "line-through";
        titleEl.style.color = "#6b7280";
      }

      const courseEl = document.createElement("div");
      courseEl.className = "task-course";
      courseEl.textContent = task.course;

      const meta = document.createElement("div");
      meta.className = "task-meta";

      const priorityChip = document.createElement("span");
      priorityChip.className = "chip " + task.priority;
      priorityChip.textContent =
        task.priority.charAt(0).toUpperCase() + task.priority.slice(1) + " priority";

      const statusChip = document.createElement("span");
      statusChip.className = "chip";
      statusChip.textContent = task.done ? "Done" : "Pending";

      meta.appendChild(priorityChip);
      meta.appendChild(statusChip);

      main.appendChild(titleEl);
      main.appendChild(courseEl);
      main.appendChild(meta);

      const right = document.createElement("div");
      right.className = "task-right";
      const dateEl = document.createElement("div");
      dateEl.className = "task-date";
      dateEl.textContent = formatDueDate(task.due);
      const delBtn = document.createElement("button");
      delBtn.className = "task-delete";
      delBtn.textContent = "Remove";
      delBtn.addEventListener("click", () => deleteTask(task.id));
      right.appendChild(dateEl);
      right.appendChild(delBtn);

      card.appendChild(left);
      card.appendChild(main);
      card.appendChild(right);

      if (task.notes && task.notes.trim()) {
        const notesEl = document.createElement("div");
        notesEl.className = "task-notes";
        notesEl.textContent = task.notes;
        card.appendChild(notesEl);
      }

      taskListEl.appendChild(card);
    });

  updateStats();
  renderTodayPanel();
  renderFilters();
}

function formatDueDate(dateStr) {
  if (!dateStr) return "No due date";
  const date = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateStr;
  const today = new Date();
  const diffDays = Math.floor(
    (date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  let label = date.toLocaleDateString();
  if (diffDays === 0) label += " (Today)";
  else if (diffDays === 1) label += " (Tomorrow)";
  else if (diffDays === -1) label += " (Yesterday)";
  return label;
}

function updateStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const high = tasks.filter((t) => t.priority === "high").length;

  const now = new Date();
  const endOfWeek = new Date();
  endOfWeek.setDate(now.getDate() + 7);
  endOfWeek.setHours(0, 0, 0, 0);

  const dueThisWeek = tasks.filter((t) => {
    if (!t.due) return false;
    const d = new Date(t.due + "T00:00:00");
    if (Number.isNaN(d.getTime())) return false;
    return d >= now && d <= endOfWeek;
  }).length;

  statTotalEl.textContent = total;
  statDoneEl.textContent = done;
  statHighEl.textContent = high;
  statWeekEl.textContent = dueThisWeek;

  const pending = total - done;
  document.getElementById("pendingCount").textContent = pending;
}

function renderTodayPanel() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => t.due === todayStr && !t.done);

  todayListEl.innerHTML = "";
  if (todayTasks.length === 0) {
    todayEmptyEl.style.display = "block";
  } else {
    todayEmptyEl.style.display = "none";
  }

  todayTasks.forEach((t) => {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = t.title;
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = t.course;
    li.appendChild(left);
    li.appendChild(label);
    todayListEl.appendChild(li);
  });

  if (todayTasks.length > 0) {
    const courseCounts = {};
    todayTasks.forEach((t) => {
      courseCounts[t.course] = (courseCounts[t.course] || 0) + 1;
    });
    const topCourse = Object.entries(courseCounts).sort(
      (a, b) => b[1] - a[1]
    )[0][0];
    todayCourseEl.textContent = topCourse;
  } else {
    todayCourseEl.textContent = "—";
  }
}

// --- Actions ---

function addTask(task) {
  tasks.push(task);
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

function toggleDone(id) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  saveTasks();
  renderTasks();
}

function clearAll() {
  if (!confirm("Clear all tasks? This cannot be undone.")) return;
  tasks = [];
  saveTasks();
  renderTasks();
}

// --- Event listeners ---

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const course = courseInput.value.trim();
  const due = dueInput.value;
  const priority = priorityInput.value;
  const notes = notesInput.value.trim();

  if (!title || !course || !due) {
    alert("Please fill in title, course, and due date.");
    return;
  }

  const newTask = {
    id: Date.now(),
    title,
    course,
    due,
    priority,
    notes,
    done: false
  };

  addTask(newTask);
  taskForm.reset();
  priorityInput.value = "medium";
});

clearAllBtn.addEventListener("click", clearAll);

[filterCourseEl, filterStatusEl, filterPriorityEl].forEach((el) =>
  el.addEventListener("change", renderTasks)
);

// Initial render
renderTasks();
