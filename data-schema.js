/**
 * FlowAssist – Task (AI) data schema and helpers.
 * Single source of truth for task shape; JSON on disk matches this.
 */

function generateId() {
  return 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * @typedef {Object} ProgressUpdate
 * @property {string} id
 * @property {string} text
 * @property {string} date_added - YYYY-MM-DD
 * @property {number} effort_consumed_hours
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {number} priority - 1-10
 * @property {string[]} tags - e.g. ["#default"]
 * @property {string} assigned_date - YYYY-MM-DD (date added / AI assigned)
 * @property {string} [eta] - YYYY-MM-DD
 * @property {number} [effort_required_hours]
 * @property {number|string} [bug_number]
 * @property {'Open'|'Ongoing'|'Completed'} status
 * @property {string} created_at - ISO string for ordering
 * @property {ProgressUpdate[]} progress_updates
 */

/**
 * Create a new task with defaults.
 * @param {Partial<Task>} overrides
 * @returns {Task}
 */
function createTask(overrides = {}) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  return {
    id: overrides.id || generateId(),
    title: overrides.title || 'Untitled',
    description: overrides.description ?? '',
    priority: Math.min(10, Math.max(1, overrides.priority ?? 5)),
    tags: Array.isArray(overrides.tags) ? overrides.tags : (overrides.tags ? [overrides.tags] : ['#default']),
    assigned_date: overrides.assigned_date || today,
    eta: overrides.eta ?? '',
    effort_required_hours: overrides.effort_required_hours ?? 0,
    bug_number: overrides.bug_number ?? '',
    status: overrides.status || 'Open',
    created_at: overrides.created_at || now.toISOString(),
    progress_updates: overrides.progress_updates || []
  };
}

/**
 * Parse tags from input string (e.g. "#urgent #work" -> ["#urgent","#work"]).
 * @param {string} input
 * @returns {string[]}
 */
function parseTags(input) {
  if (!input || typeof input !== 'string') return ['#default'];
  const tags = input.trim().split(/\s+/).filter(Boolean);
  return tags.length ? tags.map(t => t.startsWith('#') ? t : '#' + t) : ['#default'];
}

/**
 * Effort hours to days (e.g. 8 -> 1).
 * @param {number} hours
 * @returns {number}
 */
function hoursToDays(hours) {
  if (hours == null || isNaN(hours)) return 0;
  return Math.round((hours / 8) * 10) / 10;
}

// Export for use in renderer (copy into renderer if not using a bundler; Electron renderer can't require Node modules by default)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createTask, parseTags, hoursToDays, generateId };
}
