const STORAGE_KEY = "dayspan-v1";

const windowDefaults = {
  mode: "compact",
  alwaysOnTop: true,
  opacity: 0.9,
  lockPosition: false,
  hoverOpaque: true
};

const initialState = {
  tasks: [],
  notes: [],
  settings: {
    layout: "vertical"
  }
};

const windowApi = window.daySpanWindow || {
  getPreferences: async () => windowDefaults,
  updatePreferences: async (patch) => ({ ...windowPrefs, ...patch }),
  setMode: async (mode) => ({ ...windowPrefs, mode }),
  setOpacity: async () => {},
  minimize: async () => {},
  close: async () => {},
  onPreferencesChanged: () => {}
};

let state = loadState();
let windowPrefs = { ...windowDefaults };
let activeTaskFormDate = null;
let activeCompactTaskForm = false;
let activeEditTaskId = null;
let activeNoteId = null;
let activeNoteDate = dateKey(new Date());
let activeEditorTab = "write";
let quickNoteId = null;
let quickNoteDate = dateKey(new Date());

const PEN_ICON_SVG = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M18.8 4.2l1 1a1.7 1.7 0 0 1 0 2.4L9.1 18.3l-4.3 1.3 1.3-4.3L16.8 4.6a1.7 1.7 0 0 1 2-.4Z" />
    <path d="M15.5 5.9l2.6 2.6" />
  </svg>
`;

const compactShell = document.getElementById("compactShell");
const compactDateLabel = document.getElementById("compactDateLabel");
const compactPinButton = document.getElementById("compactPinButton");
const expandButton = document.getElementById("expandButton");
const compactNoteButton = document.getElementById("compactNoteButton");
const compactMoreButton = document.getElementById("compactMoreButton");
const compactTaskInput = document.getElementById("compactTaskInput");
const compactTaskList = document.getElementById("compactTaskList");
const lockButton = document.getElementById("lockButton");
const lockStateLabel = document.getElementById("lockStateLabel");
const opacitySelect = document.getElementById("opacitySelect");
const preferencesMenu = document.getElementById("preferencesMenu");
const closePreferencesButton = document.getElementById("closePreferencesButton");
const menuSearchButton = document.getElementById("menuSearchButton");
const menuHistoryButton = document.getElementById("menuHistoryButton");
const fullShell = document.getElementById("fullShell");
const collapseButton = document.getElementById("collapseButton");
const fullPinButton = document.getElementById("fullPinButton");
const fullMoreButton = document.getElementById("fullMoreButton");
const board = document.getElementById("dayBoard");
const todayLabel = document.getElementById("todayLabel");
const quickTaskInput = document.getElementById("quickTaskInput");
const newNoteButton = document.getElementById("newNoteButton");
const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");
const historySearchInput = document.getElementById("historySearchInput");
const exportButton = document.getElementById("exportButton");
const notePanel = document.getElementById("notePanel");
const noteDateLabel = document.getElementById("noteDateLabel");
const noteTitleInput = document.getElementById("noteTitleInput");
const noteTagsInput = document.getElementById("noteTagsInput");
const noteContentInput = document.getElementById("noteContentInput");
const noteSummaryInput = document.getElementById("noteSummaryInput");
const notePreview = document.getElementById("notePreview");
const saveNoteButton = document.getElementById("saveNoteButton");
const deleteNoteButton = document.getElementById("deleteNoteButton");
const quickNotePanel = document.getElementById("quickNotePanel");
const quickNoteDateLabel = document.getElementById("quickNoteDateLabel");
const quickNoteContentInput = document.getElementById("quickNoteContentInput");
const closeQuickNoteButton = document.getElementById("closeQuickNoteButton");
const deleteQuickNoteButton = document.getElementById("deleteQuickNoteButton");
const saveQuickNoteButton = document.getElementById("saveQuickNoteButton");

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(initialState);
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(initialState),
      ...parsed,
      settings: {
        ...initialState.settings,
        ...(parsed.settings || {})
      }
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftedDate(offset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function formatCompactDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function formatFullDate(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(date);
}

function formatDateKeyCompact(dateText) {
  return formatCompactDate(new Date(`${dateText}T00:00:00`));
}

function getDays() {
  return [
    {
      key: dateKey(shiftedDate(-1)),
      date: shiftedDate(-1),
      label: "昨天",
      role: "yesterday",
      title: "完成与回看",
      taskTitle: "昨日内容",
      noteTitle: "昨日随笔",
      emptyTasks: "昨天还没有记录",
      emptyNotes: "没有昨日随笔"
    },
    {
      key: dateKey(shiftedDate(0)),
      date: shiftedDate(0),
      label: "今天",
      role: "today",
      title: "今日工作台",
      taskTitle: "今日待办",
      noteTitle: "今日随笔",
      emptyTasks: "写下今天要做的一件事",
      emptyNotes: "随手记一点想法"
    },
    {
      key: dateKey(shiftedDate(1)),
      date: shiftedDate(1),
      label: "明天",
      role: "tomorrow",
      title: "明日计划",
      taskTitle: "明日想做",
      noteTitle: "明日草稿",
      emptyTasks: "写下明天要做的一件事",
      emptyNotes: "写一个明日随笔"
    }
  ];
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseTags(value) {
  return String(value || "")
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getTodayKey() {
  return dateKey(new Date());
}

function getTodayUndoneTasks() {
  return state.tasks
    .filter((task) => task.date === getTodayKey() && !task.done)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getNotesByDate(date) {
  return state.notes
    .filter((note) => note.date === date)
    .sort((a, b) => Number(b.isSummary) - Number(a.isSummary) || b.updatedAt.localeCompare(a.updatedAt));
}

function createNoteTitle(content, date) {
  const firstLine = String(content || "")
    .split(/\r?\n/)
    .map((line) => stripMarkdown(line).trim())
    .find(Boolean);
  if (firstLine) return firstLine.slice(0, 28);
  return `${formatDateKeyCompact(date)} 随笔`;
}

function renderApp() {
  renderWindowState();
  renderCompactApp();
  renderFullApp();
}

function renderWindowState() {
  const mode = windowPrefs.mode === "full" ? "full" : "compact";
  document.body.classList.toggle("mode-compact", mode === "compact");
  document.body.classList.toggle("mode-full", mode === "full");
  document.body.classList.toggle("locked", Boolean(windowPrefs.lockPosition));
  compactShell.classList.toggle("hidden", mode !== "compact");
  fullShell.classList.toggle("hidden", mode !== "full");

  const pinText = windowPrefs.alwaysOnTop ? "置顶" : "贴桌";
  compactPinButton.textContent = pinText;
  fullPinButton.textContent = pinText;
  lockStateLabel.textContent = windowPrefs.lockPosition ? "开" : "关";
  opacitySelect.value = String(windowPrefs.opacity);
}

function renderCompactApp() {
  compactDateLabel.textContent = formatCompactDate(new Date());
  const tasks = getTodayUndoneTasks().slice(0, 2);
  const todayNotes = getNotesByDate(getTodayKey()).slice(0, 1);

  compactTaskList.innerHTML = `
    <section class="compact-section">
      <div class="compact-section-title">今日待办</div>
      ${renderCompactTaskArea(tasks)}
    </section>
    <section class="compact-section">
      <div class="compact-section-title">今日随笔</div>
      ${
        todayNotes.length
          ? todayNotes.map(renderCompactNote).join("")
          : `<div class="compact-empty compact-note-empty" data-empty-note="${getTodayKey()}" tabindex="0">随手记一点想法</div>`
      }
    </section>
  `;

  compactTaskList.querySelectorAll("[data-compact-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleTask(button.dataset.compactToggle);
      renderApp();
    });
  });
  compactTaskList.querySelectorAll("[data-compact-edit-task-title]").forEach((element) => {
    element.addEventListener("dblclick", () => {
      startTaskEdit(element.dataset.compactEditTaskTitle);
    });
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter") startTaskEdit(element.dataset.compactEditTaskTitle);
    });
  });
  compactTaskList.querySelectorAll("[data-compact-empty-task]").forEach((empty) => {
    empty.addEventListener("dblclick", openCompactTaskForm);
    empty.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openCompactTaskForm();
    });
  });
  compactTaskList.querySelectorAll("[data-compact-task-form]").forEach((form) => {
    const input = form.querySelector("input[name='title']");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      finishCompactTaskForm(input.value, true);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishCompactTaskForm(input.value, true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finishCompactTaskForm(input.value, false);
      }
    });
    input.addEventListener("blur", () => {
      if (activeCompactTaskForm) finishCompactTaskForm(input.value, true);
    });
    input.focus();
  });
  compactTaskList.querySelectorAll("[data-compact-task-edit-form]").forEach((form) => {
    const input = form.querySelector("input[name='title']");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      finishTaskEdit(form.dataset.compactTaskEditForm, input.value, true);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishTaskEdit(form.dataset.compactTaskEditForm, input.value, true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finishTaskEdit(form.dataset.compactTaskEditForm, input.value, false);
      }
    });
    input.addEventListener("blur", () => {
      if (activeEditTaskId === form.dataset.compactTaskEditForm) {
        finishTaskEdit(form.dataset.compactTaskEditForm, input.value, true);
      }
    });
  });
  compactTaskList.querySelectorAll("[data-compact-note]").forEach((card) => {
    card.addEventListener("dblclick", () => openQuickNoteEditor(card.dataset.compactNote));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openQuickNoteEditor(card.dataset.compactNote);
    });
  });
  compactTaskList.querySelectorAll("[data-empty-note]").forEach((empty) => {
    empty.addEventListener("dblclick", () => openQuickNoteEditor(null, empty.dataset.emptyNote));
    empty.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openQuickNoteEditor(null, empty.dataset.emptyNote);
    });
  });
}

function renderCompactTaskArea(tasks) {
  if (tasks.length) {
    activeCompactTaskForm = false;
    return tasks.map(renderCompactTask).join("");
  }
  if (activeCompactTaskForm) {
    return `
      <form class="compact-task-form" data-compact-task-form>
        <input name="title" type="text" placeholder="写下今天要做的一件事" autocomplete="off" />
      </form>
    `;
  }
  return `<div class="compact-empty compact-task-empty" data-compact-empty-task tabindex="0">随手写下一件事</div>`;
}

function renderCompactTask(task) {
  if (activeEditTaskId === task.id) {
    return `
      <form class="compact-task compact-task-edit" data-compact-task-edit-form="${task.id}">
        <button class="task-check" type="button" data-compact-toggle="${task.id}" title="完成待办" aria-label="完成待办"></button>
        <input class="compact-task-edit-input" name="title" type="text" value="${escapeHtml(task.title)}" autocomplete="off" />
      </form>
    `;
  }

  return `
    <article class="compact-task">
      <button class="task-check" data-compact-toggle="${task.id}" title="完成待办" aria-label="完成待办"></button>
      <span data-compact-edit-task-title="${task.id}" tabindex="0" title="双击编辑待办">${escapeHtml(task.title)}</span>
    </article>
  `;
}

function renderCompactNote(note) {
  const plain = stripMarkdown(note.content || "");
  return `
    <article class="compact-note" data-compact-note="${note.id}" tabindex="0" title="双击编辑随笔">
      <strong>${escapeHtml(note.title || "未命名随笔")}</strong>
      <span>${escapeHtml(plain || "空白随笔")}</span>
    </article>
  `;
}

function renderFullApp() {
  board.className = "day-board vertical no-drag";
  todayLabel.textContent = formatDateKeyCompact(getTodayKey());

  board.innerHTML = getDays().map(renderDayCard).join("");
  bindBoardEvents();
}

function renderDayCard(day) {
  const tasks = state.tasks
    .filter((task) => task.date === day.key)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt.localeCompare(b.createdAt));
  const notes = getNotesByDate(day.key);
  const undoneCount = tasks.filter((task) => !task.done).length;

  return `
    <section class="day-card ${day.role}" data-date="${day.key}">
      <header class="day-header">
        <div>
          <span class="day-kicker">${day.label}</span>
          <h2 class="day-title">${day.title}</h2>
          <p class="day-date">${formatDate(day.date)} · ${tasks.length} 条待办 · ${notes.length} 篇随笔</p>
        </div>
        <div class="day-actions">
          <button class="mini-button" data-add-task="${day.key}" title="新增待办" aria-label="新增待办">＋</button>
          <button class="mini-button mini-pen-button" data-add-note="${day.key}" title="新增随笔" aria-label="新增随笔">${PEN_ICON_SVG}</button>
        </div>
      </header>
      <div class="day-content">
        <section>
          <div class="section-heading">
            <span>${day.taskTitle}</span>
            <span>${undoneCount} 未完成</span>
          </div>
          <div class="task-list">
            ${renderTaskListContent(day, tasks)}
          </div>
        </section>
        ${renderCarryButton(day, tasks)}
        <section>
          <div class="section-heading">
            <span>${day.noteTitle}</span>
            <span>${notes.length}</span>
          </div>
          <div class="note-list">
            ${
              notes.length
                ? notes.map(renderNoteCard).join("")
                : `<div class="empty-state note-empty-state" data-empty-note="${day.key}" tabindex="0">${day.emptyNotes}</div>`
            }
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderTaskListContent(day, tasks) {
  if (activeTaskFormDate === day.key) {
    return `
      ${renderInlineTaskForm(day.key)}
      ${tasks.length ? tasks.map(renderTask).join("") : ""}
    `;
  }
  if (tasks.length) return tasks.map(renderTask).join("");
  return `<div class="empty-state task-empty-state" data-empty-task="${day.key}" tabindex="0">${day.emptyTasks}</div>`;
}

function renderInlineTaskForm(date) {
  if (activeTaskFormDate !== date) return "";
  return `
    <form class="inline-task-form" data-task-form="${date}">
      <input name="title" type="text" placeholder="待办内容" autocomplete="off" />
      <input name="tags" type="text" placeholder="标签，例如 科研, 课程" autocomplete="off" />
      <footer>
        <button class="ghost-button" type="button" data-cancel-task>取消</button>
        <button class="primary-button" type="submit">保存</button>
      </footer>
    </form>
  `;
}

function renderTask(task) {
  const tags = task.tags || [];
  if (activeEditTaskId === task.id) {
    return `
      <form class="task-item task-edit-item ${task.done ? "done" : ""}" data-task-edit-form="${task.id}">
        <button class="task-check" type="button" data-toggle-task="${task.id}" title="切换完成状态" aria-label="切换完成状态">
          ${task.done ? "✓" : ""}
        </button>
        <input class="task-edit-input" name="title" type="text" value="${escapeHtml(task.title)}" autocomplete="off" />
        <div class="task-menu">
          <button type="button" data-delete-task="${task.id}" title="删除" aria-label="删除">×</button>
        </div>
      </form>
    `;
  }

  return `
    <article class="task-item ${task.done ? "done" : ""}" data-task-id="${task.id}">
      <button class="task-check" data-toggle-task="${task.id}" title="切换完成状态" aria-label="切换完成状态">
        ${task.done ? "✓" : ""}
      </button>
      <div class="task-body" data-edit-task-title="${task.id}" title="双击编辑待办">
        <p class="task-title">${escapeHtml(task.title)}</p>
        ${tags.length ? `<div class="task-meta">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="task-menu">
        <button data-delete-task="${task.id}" title="删除" aria-label="删除">×</button>
      </div>
    </article>
  `;
}

function renderNoteCard(note) {
  const plain = stripMarkdown(note.content || "");
  const tags = note.tags || [];
  return `
    <article class="note-card" data-open-note="${note.id}" tabindex="0">
      <header>
        <h4>${escapeHtml(note.title || "未命名随笔")}</h4>
        ${note.isSummary ? `<span class="summary-badge">总结</span>` : ""}
      </header>
      <p>${escapeHtml(plain || "空白随笔")}</p>
      ${tags.length ? `<div class="task-meta">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    </article>
  `;
}

function renderCarryButton(day, tasks) {
  if (day.role !== "today") return "";
  const undoneCount = tasks.filter((task) => !task.done).length;
  if (!undoneCount) return "";
  return `<button class="carry-button" data-carry-tomorrow>顺延 ${undoneCount} 条未完成到明天</button>`;
}

function bindBoardEvents() {
  board.querySelectorAll("[data-add-task]").forEach((button) => {
    button.addEventListener("click", () => {
      openInlineTaskForm(button.dataset.addTask);
    });
  });

  board.querySelectorAll("[data-task-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      addTask(form.dataset.taskForm, formData.get("title"), formData.get("tags"));
      activeTaskFormDate = null;
      renderApp();
    });
  });

  board.querySelectorAll("[data-cancel-task]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTaskFormDate = null;
      renderApp();
    });
  });

  board.querySelectorAll("[data-empty-task]").forEach((empty) => {
    empty.addEventListener("dblclick", () => openInlineTaskForm(empty.dataset.emptyTask));
    empty.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openInlineTaskForm(empty.dataset.emptyTask);
    });
  });

  board.querySelectorAll("[data-toggle-task]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleTask(button.dataset.toggleTask);
      renderApp();
    });
  });

  board.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteTask(button.dataset.deleteTask);
      renderApp();
    });
  });

  board.querySelectorAll("[data-edit-task-title]").forEach((element) => {
    element.addEventListener("dblclick", () => {
      startTaskEdit(element.dataset.editTaskTitle);
    });
  });

  board.querySelectorAll("[data-task-edit-form]").forEach((form) => {
    const input = form.querySelector("input[name='title']");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      finishTaskEdit(form.dataset.taskEditForm, input.value, true);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishTaskEdit(form.dataset.taskEditForm, input.value, true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finishTaskEdit(form.dataset.taskEditForm, input.value, false);
      }
    });
    input.addEventListener("blur", () => {
      if (activeEditTaskId === form.dataset.taskEditForm) {
        finishTaskEdit(form.dataset.taskEditForm, input.value, true);
      }
    });
  });

  board.querySelectorAll("[data-add-note]").forEach((button) => {
    button.addEventListener("click", () => openQuickNoteEditor(null, button.dataset.addNote));
  });

  board.querySelectorAll("[data-open-note]").forEach((card) => {
    card.addEventListener("click", () => openNoteEditor(card.dataset.openNote));
    card.addEventListener("dblclick", () => openNoteEditor(card.dataset.openNote));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openNoteEditor(card.dataset.openNote);
    });
  });

  board.querySelectorAll("[data-empty-note]").forEach((empty) => {
    empty.addEventListener("dblclick", () => openQuickNoteEditor(null, empty.dataset.emptyNote));
    empty.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openQuickNoteEditor(null, empty.dataset.emptyNote);
    });
  });

  const carryButton = board.querySelector("[data-carry-tomorrow]");
  if (carryButton) {
    carryButton.addEventListener("click", carryTodayToTomorrow);
  }
}

function openInlineTaskForm(date) {
  activeTaskFormDate = date;
  renderApp();
  const input = board.querySelector(`[data-task-form="${activeTaskFormDate}"] input[name="title"]`);
  input?.focus();
}

function addTask(date, title, tagValue = "") {
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return;

  const now = new Date().toISOString();
  state.tasks.push({
    id: createId("task"),
    title: cleanTitle,
    date,
    tags: parseTags(tagValue),
    done: false,
    createdAt: now,
    completedAt: null,
    carryCount: 0
  });
  saveState();
}

function addTodayTaskFrom(input) {
  addTask(getTodayKey(), input.value);
  input.value = "";
  renderApp();
}

function openCompactTaskForm() {
  activeCompactTaskForm = true;
  renderApp();
}

function finishCompactTaskForm(title, shouldSave) {
  if (!activeCompactTaskForm) return;
  if (shouldSave) addTask(getTodayKey(), title);
  activeCompactTaskForm = false;
  renderApp();
}

function toggleTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.done = !task.done;
  task.completedAt = task.done ? new Date().toISOString() : null;
  saveState();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((item) => item.id !== taskId);
  if (activeEditTaskId === taskId) activeEditTaskId = null;
  saveState();
}

function startTaskEdit(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  activeEditTaskId = taskId;
  renderApp();
  const compactInput = compactTaskList.querySelector(`[data-compact-task-edit-form="${taskId}"] input[name="title"]`);
  const boardInput = board.querySelector(`[data-task-edit-form="${taskId}"] input[name="title"]`);
  const input = windowPrefs.mode === "compact" ? compactInput || boardInput : boardInput || compactInput;
  input?.focus();
  input?.select();
}

function finishTaskEdit(taskId, title, shouldSave) {
  if (activeEditTaskId !== taskId) return;
  if (shouldSave) {
    const task = state.tasks.find((item) => item.id === taskId);
    const cleanTitle = String(title || "").trim();
    if (task && cleanTitle) {
      task.title = cleanTitle;
      task.updatedAt = new Date().toISOString();
      saveState();
    }
  }
  activeEditTaskId = null;
  renderApp();
}

function addNote(date, content, options = {}) {
  const cleanContent = String(content || "").trim();
  if (!cleanContent) return null;
  const now = new Date().toISOString();
  const note = {
    id: createId("note"),
    date,
    title: options.title || createNoteTitle(cleanContent, date),
    tags: options.tags || [],
    content: cleanContent,
    isSummary: Boolean(options.isSummary),
    createdAt: now,
    updatedAt: now
  };
  state.notes.push(note);
  saveState();
  return note;
}

function carryTodayToTomorrow() {
  const today = getTodayKey();
  const tomorrow = dateKey(shiftedDate(1));
  const now = new Date().toISOString();
  let moved = 0;

  state.tasks.forEach((task) => {
    if (task.date === today && !task.done) {
      task.date = tomorrow;
      task.carryCount = (task.carryCount || 0) + 1;
      task.updatedAt = now;
      moved += 1;
    }
  });

  if (moved) {
    saveState();
    renderApp();
  }
}

function openNoteEditor(noteId, date = getTodayKey()) {
  const note = noteId ? state.notes.find((item) => item.id === noteId) : null;
  activeNoteId = note?.id || null;
  activeNoteDate = note?.date || date;
  activeEditorTab = "write";

  noteDateLabel.textContent = formatFullDate(activeNoteDate);
  noteTitleInput.value = note?.title || "";
  noteTagsInput.value = (note?.tags || []).join(", ");
  noteContentInput.value = note?.content || "";
  noteSummaryInput.checked = Boolean(note?.isSummary);
  deleteNoteButton.style.display = note ? "" : "none";
  renderMarkdownPreview();
  setEditorTab("write");
  notePanel.classList.add("open");
  notePanel.setAttribute("aria-hidden", "false");
  noteTitleInput.focus();
}

function closeNoteEditor() {
  notePanel.classList.remove("open");
  notePanel.setAttribute("aria-hidden", "true");
}

function openQuickNoteEditor(noteId = null, date = getTodayKey()) {
  closePreferencesMenu();
  const note = noteId ? state.notes.find((item) => item.id === noteId) : null;
  quickNoteId = note?.id || null;
  quickNoteDate = note?.date || date;
  quickNoteDateLabel.textContent = formatDateKeyCompact(quickNoteDate);
  quickNoteContentInput.value = note?.content || "";
  deleteQuickNoteButton.style.display = note ? "" : "none";
  quickNotePanel.classList.add("open");
  quickNotePanel.setAttribute("aria-hidden", "false");
  quickNoteContentInput.focus();
}

function closeQuickNoteEditor() {
  quickNotePanel.classList.remove("open");
  quickNotePanel.setAttribute("aria-hidden", "true");
  quickNoteId = null;
  deleteQuickNoteButton.style.display = "none";
}

function saveQuickNote() {
  const cleanContent = quickNoteContentInput.value.trim();
  if (!cleanContent) {
    closeQuickNoteEditor();
    return;
  }

  if (quickNoteId) {
    const note = state.notes.find((item) => item.id === quickNoteId);
    if (note) {
      note.content = cleanContent;
      if (!note.title || note.title === "未命名随笔") {
        note.title = createNoteTitle(cleanContent, note.date);
      }
      note.updatedAt = new Date().toISOString();
      saveState();
    }
  } else {
    addNote(quickNoteDate, cleanContent);
  }

  closeQuickNoteEditor();
  renderApp();
}

function deleteQuickNote() {
  if (!quickNoteId) return;
  state.notes = state.notes.filter((item) => item.id !== quickNoteId);
  saveState();
  closeQuickNoteEditor();
  renderApp();
}

function saveActiveNote() {
  const now = new Date().toISOString();
  const title = noteTitleInput.value.trim() || "未命名随笔";
  const tags = parseTags(noteTagsInput.value);
  const content = noteContentInput.value;
  const isSummary = noteSummaryInput.checked;

  if (activeNoteId) {
    const note = state.notes.find((item) => item.id === activeNoteId);
    if (!note) return;
    Object.assign(note, {
      title,
      tags,
      content,
      isSummary,
      updatedAt: now
    });
  } else {
    state.notes.push({
      id: createId("note"),
      date: activeNoteDate,
      title,
      tags,
      content,
      isSummary,
      createdAt: now,
      updatedAt: now
    });
  }

  saveState();
  closeNoteEditor();
  renderApp();
}

function deleteActiveNote() {
  if (!activeNoteId) return;
  state.notes = state.notes.filter((item) => item.id !== activeNoteId);
  saveState();
  closeNoteEditor();
  renderApp();
}

function setEditorTab(tab) {
  activeEditorTab = tab;
  document.querySelectorAll("[data-editor-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.editorTab === tab);
  });
  noteContentInput.classList.toggle("hidden", tab !== "write");
  notePreview.classList.toggle("hidden", tab !== "preview");
  if (tab === "preview") renderMarkdownPreview();
}

function renderMarkdownPreview() {
  notePreview.innerHTML = markdownToHtml(noteContentInput.value);
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inCode = false;
  let listType = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push("</code></pre>");
        inCode = false;
      } else {
        closeList();
        html.push("<pre><code>");
        inCode = true;
      }
      return;
    }

    if (inCode) {
      html.push(`${escapeHtml(line)}\n`);
      return;
    }

    if (!line.trim()) {
      closeList();
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      return;
    }

    const unordered = line.match(/^[-*]\s+(.*)$/);
    if (unordered) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
      return;
    }

    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      return;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  });

  closeList();
  if (inCode) html.push("</code></pre>");
  return html.join("");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function stripMarkdown(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()]/g, "")
    .replace(/[-+]\s/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function openHistoryPanel(focusSearch = false) {
  renderHistory();
  historyPanel.classList.add("open");
  historyPanel.setAttribute("aria-hidden", "false");
  if (focusSearch) historySearchInput.focus();
}

function closeHistoryPanel() {
  historyPanel.classList.remove("open");
  historyPanel.setAttribute("aria-hidden", "true");
}

function renderHistory() {
  const query = historySearchInput.value.trim().toLowerCase();
  const entries = [];

  state.tasks.forEach((task) => {
    entries.push({
      type: "待办",
      date: task.date,
      title: task.title,
      content: task.done ? "已完成" : "未完成",
      tags: task.tags || []
    });
  });

  state.notes.forEach((note) => {
    entries.push({
      type: note.isSummary ? "总结" : "随笔",
      date: note.date,
      title: note.title || "未命名随笔",
      content: stripMarkdown(note.content || ""),
      tags: note.tags || []
    });
  });

  const filtered = entries
    .filter((entry) => {
      const haystack = [entry.type, entry.date, entry.title, entry.content, ...(entry.tags || [])]
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type));

  if (!filtered.length) {
    historyList.innerHTML = `<div class="empty-state">没有找到记录</div>`;
    return;
  }

  let currentDate = "";
  historyList.innerHTML = filtered
    .map((entry) => {
      const dateHeader =
        entry.date !== currentDate
          ? ((currentDate = entry.date), `<div class="history-date">${formatFullDate(entry.date)}</div>`)
          : "";
      return `
        ${dateHeader}
        <article class="history-item">
          <header>
            <h4>${escapeHtml(entry.title)}</h4>
            <span class="summary-badge">${entry.type}</span>
          </header>
          <p>${escapeHtml(entry.content || "无正文")}</p>
          ${
            entry.tags.length
              ? `<div class="task-meta">${entry.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "DaySpan",
    tasks: state.tasks,
    notes: state.notes,
    settings: state.settings
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dayspan-${dateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function togglePreferencesMenu() {
  preferencesMenu.classList.toggle("hidden");
}

function closePreferencesMenu() {
  preferencesMenu.classList.add("hidden");
}

async function setWindowMode(mode) {
  windowPrefs = { ...windowPrefs, mode };
  renderApp();
  const updated = await windowApi.setMode(mode);
  windowPrefs = { ...windowPrefs, ...(updated || {}) };
  renderApp();
}

async function updateWindowPreferences(patch) {
  windowPrefs = { ...windowPrefs, ...patch };
  renderApp();
  const updated = await windowApi.updatePreferences(patch);
  windowPrefs = { ...windowPrefs, ...(updated || {}) };
  renderApp();
}

async function openHistoryFromMenu(focusSearch = false) {
  closePreferencesMenu();
  await setWindowMode("full");
  openHistoryPanel(focusSearch);
}

compactTaskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addTodayTaskFrom(compactTaskInput);
  }
});

quickTaskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addTodayTaskFrom(quickTaskInput);
  }
});

expandButton.addEventListener("click", () => setWindowMode("full"));
collapseButton.addEventListener("click", () => setWindowMode("compact"));
compactNoteButton.addEventListener("click", () => openQuickNoteEditor(null, getTodayKey()));
newNoteButton.addEventListener("click", () => openQuickNoteEditor(null, getTodayKey()));
compactMoreButton.addEventListener("click", togglePreferencesMenu);
fullMoreButton.addEventListener("click", togglePreferencesMenu);
closePreferencesButton.addEventListener("click", closePreferencesMenu);
menuSearchButton.addEventListener("click", () => openHistoryFromMenu(true));
menuHistoryButton.addEventListener("click", () => openHistoryFromMenu(false));
historySearchInput.addEventListener("input", renderHistory);
exportButton.addEventListener("click", exportData);
closeQuickNoteButton.addEventListener("click", closeQuickNoteEditor);
deleteQuickNoteButton.addEventListener("click", deleteQuickNote);
saveQuickNoteButton.addEventListener("click", saveQuickNote);

document.querySelectorAll("[data-window-minimize]").forEach((button) => {
  button.addEventListener("click", () => windowApi.minimize());
});

document.querySelectorAll("[data-window-close]").forEach((button) => {
  button.addEventListener("click", () => windowApi.close());
});

compactPinButton.addEventListener("click", () => {
  updateWindowPreferences({ alwaysOnTop: !windowPrefs.alwaysOnTop });
});

fullPinButton.addEventListener("click", () => {
  updateWindowPreferences({ alwaysOnTop: !windowPrefs.alwaysOnTop });
});

lockButton.addEventListener("click", () => {
  updateWindowPreferences({ lockPosition: !windowPrefs.lockPosition });
});

opacitySelect.addEventListener("change", () => {
  updateWindowPreferences({ opacity: Number(opacitySelect.value) });
});

compactShell.addEventListener("mouseenter", () => {
  if (windowPrefs.hoverOpaque) windowApi.setOpacity(1);
});

compactShell.addEventListener("mouseleave", () => {
  if (windowPrefs.hoverOpaque) windowApi.setOpacity(windowPrefs.opacity);
});

document.querySelectorAll("[data-close-panel]").forEach((element) => {
  element.addEventListener("click", closeNoteEditor);
});

document.querySelectorAll("[data-close-history]").forEach((element) => {
  element.addEventListener("click", closeHistoryPanel);
});

document.querySelectorAll("[data-editor-tab]").forEach((button) => {
  button.addEventListener("click", () => setEditorTab(button.dataset.editorTab));
});

noteContentInput.addEventListener("input", () => {
  if (activeEditorTab === "preview") renderMarkdownPreview();
});

saveNoteButton.addEventListener("click", saveActiveNote);
deleteNoteButton.addEventListener("click", deleteActiveNote);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeNoteEditor();
    closeQuickNoteEditor();
    closeHistoryPanel();
    closePreferencesMenu();
  }
});

document.addEventListener("click", (event) => {
  if (
    !preferencesMenu.classList.contains("hidden") &&
    !preferencesMenu.contains(event.target) &&
    !event.target.closest("#compactMoreButton, #fullMoreButton")
  ) {
    closePreferencesMenu();
  }
});

windowApi.onPreferencesChanged((preferences) => {
  windowPrefs = { ...windowPrefs, ...(preferences || {}) };
  renderApp();
});

async function init() {
  const preferences = await windowApi.getPreferences();
  windowPrefs = { ...windowDefaults, ...(preferences || {}) };
  renderApp();
}

init();
