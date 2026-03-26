# FlowAssist

> A **desktop task tracker** for people who want their work plan, progress history, and reports in one place—**stored in files you control**, not in someone else’s cloud.

FlowAssist is **free software** released under the [**GNU General Public License v3.0** (GPLv3)](LICENSE). You may run, study, redistribute, and modify it under that license; the full legal text is in the [`LICENSE`](LICENSE) file in this repository.

FlowAssist is built for **individual contributors and small teams** who track real work: priorities, ETAs, time logged, sub-tasks, and “what changed over time.” Use it for **weekly planning**, **sprint-style visibility**, **status reviews**, and **lightweight reporting** without leaving a local JSON profile behind.

---

## Core features & use cases

| You want to… | FlowAssist helps by… |
|----------------|----------------------|
| **Own your data** | Everything lives in a **JSON profile** (`.fa.json`). No account, no server. |
| **Separate work streams** | **Load / create profiles** for different roles, clients, or quarters. |
| **See work at a glance** | **List**, **calendar**, and **summary** views over the same task model. |
| **Track effort honestly** | **Progress updates** with hours, **planned vs. actual** effort history, **day-offs** in the calendar math. |
| **Break work down** | **Sub-tasks** with their own status, progress, and optional roll-up into parent totals. |
| **Surface risk** | **Concerns** on tasks and sub-tasks, with an “addressed” trail. |
| **Share or archive** | **Export summaries** as **HTML/CSS** or **Confluence Markdown** for email, wikis, or tickets. |

---

## Feature reference

### Profiles & storage

- **Default data file** (dev): `tasks.json` next to the project, or (installed app) under your OS **user data** folder.
- **Named profiles**: **File → Load Profile…** (`Ctrl+O`), **New Profile…**, **Save As…** (`Ctrl+Shift+S`). New files are normalized to a **`.fa.json`** name when you save.
- **Preferences** (e.g. which profile is active) are stored separately as `flowassist-profile.json` in app user data—your task JSON stays portable.

### Main list — tasks

- **Add tasks** with title, description, **project** (from settings), **multi-select categories**, **priority (1–10)**, **difficulty**, **tags**, **assigned date**, **ETA**, **effort (hours)**, and **bug IDs** (including comma-separated lists).
- **Sort** main tasks by date added, priority, or ETA (ascending/descending).
- **Status workflow**: Open, Ongoing, Completed/Done, **Dropped**, and related UI for moving work through its lifecycle.
- **Visual priority**: Task bars use **per-priority colors** from **Settings**; sub-tasks use a darker tint.
- **Progress updates**: Log dated notes with **hours consumed**; totals feed **summary bandwidth** and calendar logic.
- **History**: **ETA updates** and **effort (plan) updates** keep a dated trail when plans change.
- **Concerns**: Flag issues on a task; **address** them with a date and comment; open vs. addressed state is visible in the UI.
- **Exclude from summary/export**: Optional flags on tasks (and sub-tasks) when something should not appear in generated reports.
- **Done section**: Completed work is listed separately for a cleaner active list.

### Sub-tasks

- Nested under a main task with their own fields (title, description, status, priority, dates, categories, project, difficulty, progress updates, concerns).
- **Effort roll-up**: If a sub-task has **no dedicated planned effort**, its logged hours can **roll up** into the parent for summary math; dedicated effort is tracked separately when set.

### Calendar

- **Views**: Day, week, and month navigation with **go-to-date**.
- **Chart styles**: **Basic** and **Gantt-style** layouts.
- **Filter**: Show tasks by **assigned (date added)** vs. **ETA (due date)**.
- **Day offs**: Log **full or partial** PTO/sick/other; hours respect **ideal working hours per day** from Settings for utilization-style views.

### Summary & export

- Pick a **date range**, then **Generate Summary** for planned vs. actual effort, bandwidth utilization (using working hours and day-offs), and task/sub-task tables with sensible date filtering (e.g. hiding items finished before the range when appropriate).
- **Export** the generated summary as **HTML/CSS** or **Confluence Markdown** (vertical layout with an **Effort/ETA** block: two markdown tables stacked under one heading; Confluence Cloud markdown has no text color — **bold** marks changed steps and over-plan remaining; use the editor’s **Text color** after paste if you want color). Tasks with no progress in range omit the **Progress** section; export respects exclude flags where implemented.

### Settings

- **Working hours per day** (drives bandwidth, summary, and partial day-off behavior).
- **Category types** and **project names** (comma-separated lists used across the UI).
- **Priority bar colors** for priorities 1–10.

### Application shell

- **Menu**: File (profiles, save as), View (reload), Help (Documentation opens `README.md` / `DOCUMENTATION.md` / `docs/index.html` if present, **About**).
- **Sidebar**: List / Calendar / Summary; **Settings** button; **version and author** line under Settings (from `package.json`).
- **Security model**: **Context isolation** and **preload bridge** (`taskAPI`) for IPC—renderer does not get raw Node APIs.

### Developer / debug

- `npm run start:debug` launches with **`--flowassist-debug`** (DevTools + debug flag for the renderer).

---

## Stack

- **Electron** (desktop shell)
- **HTML / CSS / vanilla JavaScript** (no React/Vue in the renderer)
- **JSON** on disk for all task data

---

## Development (Windows)

### Prerequisites

- **[Node.js](https://nodejs.org/)** LTS or Current (includes `npm`)
- **Git** (optional, if you clone from a repository)

### Clone and install

```powershell
git clone https://github.com/PXVI/flow-assist.git
cd flow-assist
npm install
```

If `npm install` fails with **EBUSY** / file-lock errors on `electron` under **OneDrive**, try pausing sync for the folder, closing other apps using the project, or cloning to a path outside OneDrive (e.g. `%TEMP%` or `C:\dev\flow-assist`) and working there.

### Run the app

```powershell
npm start
```

Optional debug run (DevTools + `window.__FLOWASSIST_DEBUG__`):

```powershell
npm run start:debug
```

---

## Building Windows executables

From the project root, after `npm install`:

```powershell
npm run dist
```

This uses **electron-builder** and writes output under **`dist\`**.

Typical artifacts:

| Artifact | Role |
|----------|------|
| **`FlowAssist-Portable.exe`** | Self-contained portable build—run without running an installer. |
| **`FlowAssist-Setup-<version>.exe`** | NSIS installer (choose install directory, not one-click). |

The **`dist\`** folder is **gitignored**; ship binaries via **GitHub Releases** (or similar), not by committing them to the repo.

### If the build fails on Windows

- **`CSC_IDENTITY_AUTO_DISCOVERY=false`** before `npm run dist` can help when tooling tries to use signing-related caches that need symlink privileges. The project is configured with **`signAndEditExecutable: false`** for simpler unsigned builds.
- Installers are **not code-signed** by default; Windows SmartScreen may warn until you sign with your own certificate.

### Unpacked folder (optional)

To inspect the app folder without making installers:

```powershell
npm run pack
```

---

## Data & schema

Task shape and helpers are described in **`data-schema.js`** (JSDoc and exports). The live app stores a top-level object with **`tasks`** and **`settings`** (and nested fields as created by the UI). Treat profiles as **your documents**: back them up, diff them, and version them in Git if you want.

---

## License

**GNU General Public License v3.0** — see [`LICENSE`](LICENSE).

In short (this is not a substitute for the license text): GPLv3 is a **copyleft** license. If you **distribute** this program or a modified version, you must generally **license the distributed work under GPLv3** and **provide corresponding source** (or a written offer, as the license specifies). Using the app privately or modifying it for your own use without distributing it does not trigger those distribution obligations.

- **Your task data** (JSON profiles you create) is **yours**; the license governs the FlowAssist **program**, not the content of your files.
- **Copyright**: see `author` in [`package.json`](package.json); you may add a copyright notice in source files as you prefer.

For the authoritative terms, always read **`LICENSE`**.

**SPDX identifier:** `GPL-3.0` (listed in `package.json` as `"license": "GPL-3.0"`).
