(function () {
  'use strict';

  var DEFAULT_PRIORITY_COLORS = {
    '1': '#2e4a6e', '2': '#2e4a6e', '3': '#2e4a6e', '4': '#2e4a6e',
    '5': '#7a5c2e', '6': '#7a5c2e', '7': '#7a5c2e', '8': '#7a5c2e',
    '9': '#7a3d3d', '10': '#7a3d3d'
  };

  var DEFAULT_CATEGORIES = ['Design', 'DV', 'Support', 'Debug', 'Meeting', 'Skillup'];

  var DEFAULT_SETTINGS = {
    priorityColors: Object.assign({}, DEFAULT_PRIORITY_COLORS),
    categories: DEFAULT_CATEGORIES.slice(),
    projects: [],
    workingHoursPerDay: 8,
    dayOffs: []
  };

  var TASK_DIFFICULTY_LEVELS = ['Very Easy', 'Easy', 'Moderate', 'Hard', 'Very Hard'];
  var DEFAULT_TASK_DIFFICULTY = 'Easy';

  function normalizeTaskDifficulty(raw) {
    var v = raw != null ? String(raw).trim() : '';
    if (TASK_DIFFICULTY_LEVELS.indexOf(v) !== -1) return v;
    return DEFAULT_TASK_DIFFICULTY;
  }

  function getProjectList() {
    var list = state.data.settings && state.data.settings.projects;
    if (!Array.isArray(list)) return [];
    return list.map(function (p) { return String(p).trim(); }).filter(Boolean);
  }

  function renderProjectBarChip(project) {
    var p = project != null ? String(project).trim() : '';
    if (!p) return '';
    return '<span class="task-bar-project-pill" role="text" aria-label="Project">' + escapeHtml(p) + '</span>';
  }

  /** Optional project label for summaries / export (className e.g. 'export-project-pill' for HTML export). */
  function summaryProjectPillHtml(project, pillClass) {
    var p = project != null ? String(project).trim() : '';
    if (!p) return '';
    var cls = pillClass || 'summary-project-pill';
    return '<span class="' + cls + '">' + escapeHtml(p) + '</span>';
  }

  /** Pink pill: sub-task progress rolls into main task totals (no dedicated planned effort on sub-task). */
  function summaryIncludedPillHtml(pillClass) {
    var cls = pillClass || 'summary-included-pill';
    return '<span class="' + cls + '">Included</span>';
  }

  function renderProjectSelectInnerHtml(selectedValue) {
    var sel = selectedValue != null ? String(selectedValue).trim() : '';
    var list = getProjectList();
    var html = '<option value=""' + (!sel ? ' selected' : '') + '>None</option>';
    var seen = {};
    list.forEach(function (p) {
      if (!p || seen[p]) return;
      seen[p] = true;
      html += '<option value="' + escapeHtml(p) + '"' + (p === sel ? ' selected' : '') + '>' + escapeHtml(p) + '</option>';
    });
    if (sel && !seen[sel]) {
      html += '<option value="' + escapeHtml(sel) + '" selected>' + escapeHtml(sel) + '</option>';
    }
    return html;
  }

  function renderProjectSelectHtml(selectedValue, elementId) {
    var idAttr = elementId ? ' id="' + escapeHtml(elementId) + '"' : '';
    return '<select class="task-project-select"' + idAttr + ' aria-label="Project">' +
      renderProjectSelectInnerHtml(selectedValue) + '</select>';
  }

  function syncAddTaskProjectSelect() {
    var el = document.getElementById('task-project');
    if (!el) return;
    var prev = el.value || '';
    el.innerHTML = renderProjectSelectInnerHtml(prev);
  }

  function getCategoryList() {
    var list = state.data.settings && state.data.settings.categories;
    if (Array.isArray(list) && list.length > 0) return list;
    return DEFAULT_CATEGORIES.slice();
  }

  function renderCategoryDropdownHtml(selectedArr, idPrefix) {
    var list = getCategoryList();
    var selected = selectedArr || [];
    var label = selected.length ? selected.join(', ') : '—';
    var idAttr = idPrefix ? ' id="' + escapeHtml(idPrefix) + '"' : '';
    var html = '<div class="category-dropdown-wrap"' + idAttr + '>' +
      '<button type="button" class="category-dropdown-btn" title="Category">Category: ' + escapeHtml(label) + '</button>' +
      '<div class="category-dropdown-panel">' +
      list.map(function (cat) {
        var checked = selected.indexOf(cat) !== -1;
        return '<label class="category-checkbox-label"><input type="checkbox" class="category-checkbox" value="' + escapeHtml(cat) + '"' + (checked ? ' checked' : '') + '> ' + escapeHtml(cat) + '</label>';
      }).join('') +
      '</div></div>';
    return html;
  }

  function getSelectedCategoriesFromWrap(wrapEl) {
    if (!wrapEl) return [];
    var checked = wrapEl.querySelectorAll('.category-checkbox:checked');
    return Array.prototype.map.call(checked, function (cb) { return cb.value; });
  }

  function bindCategoryDropdownInWrap(containerOrWrapEl) {
    var wrap = (containerOrWrapEl && containerOrWrapEl.classList && containerOrWrapEl.classList.contains('category-dropdown-wrap'))
      ? containerOrWrapEl
      : (containerOrWrapEl && containerOrWrapEl.querySelector ? containerOrWrapEl.querySelector('.category-dropdown-wrap') : null);
    if (!wrap) return;
    var btn = wrap.querySelector('.category-dropdown-btn');
    var checkboxes = wrap.querySelectorAll('.category-checkbox');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        wrap.classList.toggle('open');
      });
    }
    function updateBtnLabel() {
      var sel = getSelectedCategoriesFromWrap(wrap);
      if (btn) btn.textContent = 'Category: ' + (sel.length ? sel.join(', ') : '—');
    }
    Array.prototype.forEach.call(checkboxes, function (cb) {
      cb.addEventListener('change', updateBtnLabel);
    });
  }

  function getDefaultPriorityColor(priority) {
    var p = Math.min(10, Math.max(1, parseInt(priority, 10) || 1));
    return DEFAULT_PRIORITY_COLORS[String(p)] || '#2e4a6e';
  }

  function getPriorityColor(priority, settings) {
    var colors = (settings && settings.priorityColors) || DEFAULT_PRIORITY_COLORS;
    var p = Math.min(10, Math.max(1, parseInt(priority, 10) || 1));
    if (colors[String(p)]) return colors[String(p)];
    if (p <= 4) return colors['1-4'] || colors['1'] || '#2e4a6e';
    if (p <= 8) return colors['5-8'] || colors['5'] || '#7a5c2e';
    return colors['9-10'] || colors['9'] || '#7a3d3d';
  }

  function darkenColor(hex, factor) {
    if (!hex || typeof hex !== 'string') return hex;
    hex = hex.replace(/^#/, '');
    if (hex.length !== 6) return hex;
    var r = Math.max(0, Math.floor(parseInt(hex.slice(0, 2), 16) * factor));
    var g = Math.max(0, Math.floor(parseInt(hex.slice(2, 4), 16) * factor));
    var b = Math.max(0, Math.floor(parseInt(hex.slice(4, 6), 16) * factor));
    return '#' + [r, g, b].map(function (x) {
      var s = x.toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }

  function generateId() {
    return 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function parseBugNumbers(input) {
    if (!input || typeof input !== 'string') return [];
    return input.split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(function (n) { return !isNaN(n); });
  }

  function createTask(overrides) {
    var o = overrides || {};
    var now = new Date();
    var today = now.toISOString().slice(0, 10);
    var bugNums = o.bug_numbers;
    if (bugNums == null && o.bug_number !== undefined && o.bug_number !== '' && o.bug_number !== 0) {
      bugNums = [].concat(o.bug_number);
    }
    if (!Array.isArray(bugNums)) bugNums = [];
    return {
      id: o.id || generateId(),
      title: o.title || 'Untitled',
      description: o.description ?? '',
      priority: Math.min(10, Math.max(1, (o.priority != null ? o.priority : 1))),
      tags: Array.isArray(o.tags) ? o.tags : (o.tags ? [o.tags] : ['#default']),
      assigned_date: o.assigned_date || today,
      eta: o.eta ?? '',
      effort_required_hours: o.effort_required_hours ?? 1,
      bug_numbers: bugNums,
      status: o.status || 'Open',
      difficulty: normalizeTaskDifficulty(o.difficulty),
      created_at: o.created_at || now.toISOString(),
      progress_updates: o.progress_updates || [],
      eta_updates: o.eta_updates || [],
      effort_updates: o.effort_updates || [],
      concerns: o.concerns || [],
      subtasks: o.subtasks || [],
      categories: Array.isArray(o.categories) ? o.categories.slice() : [],
      project: (o.project != null && String(o.project).trim()) ? String(o.project).trim() : '',
      done_date: o.done_date || '',
      exclude_from_summary: !!o.exclude_from_summary,
      exclude_from_export: !!o.exclude_from_export
    };
  }

  function normalizeTask(t) {
    if (!t.bug_numbers && (t.bug_number !== undefined && t.bug_number !== 0 && t.bug_number !== '')) {
      t.bug_numbers = [].concat(t.bug_number);
    }
    if (!t.bug_numbers) t.bug_numbers = [];
    if (!t.eta_updates) t.eta_updates = [];
    if (!t.effort_updates) t.effort_updates = [];
    if (!Array.isArray(t.concerns)) t.concerns = [];
    if (!t.subtasks) t.subtasks = [];
    if (!Array.isArray(t.categories)) t.categories = [];
    t.project = (t.project != null && String(t.project).trim()) ? String(t.project).trim() : '';
    t.difficulty = normalizeTaskDifficulty(t.difficulty);
    t.exclude_from_summary = !!t.exclude_from_summary;
    t.exclude_from_export = !!t.exclude_from_export;
    t.subtasks.forEach(function (s) {
      if (!s.priority && s.priority !== 0) s.priority = 1;
      if (!s.description) s.description = '';
      if (!s.progress_updates) s.progress_updates = [];
      if (!s.effort_updates) s.effort_updates = [];
      if (!Array.isArray(s.categories)) s.categories = [];
      if (!Array.isArray(s.concerns)) s.concerns = [];
      if (s.done_date == null) s.done_date = '';
      s.difficulty = normalizeTaskDifficulty(s.difficulty);
      s.project = (s.project != null && String(s.project).trim()) ? String(s.project).trim() : '';
      s.exclude_from_summary = !!s.exclude_from_summary;
      s.exclude_from_export = !!s.exclude_from_export;
    });
    return t;
  }

  function parseTags(input) {
    if (!input || typeof input !== 'string') return ['#default'];
    var raw = input.trim().split(/[\s,]+/).filter(Boolean);
    if (!raw.length) return ['#default'];
    return raw.map(function (t) { return t.startsWith('#') ? t : '#' + t; });
  }

  function hoursToDays(hours) {
    if (hours == null || isNaN(hours)) return 0;
    return Math.round((hours / 8) * 10) / 10;
  }

  function compareDateStr(a, b) {
    if (!a || !b) return 0;
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  }

  /** Progress log: oldest → newest by date_added; undated entries last; same-day ties by id. */
  function sortProgressUpdatesOldestFirst(updates) {
    if (!updates || !updates.length) return [];
    return updates.slice().sort(function (a, b) {
      var da = (a.date_added && String(a.date_added).trim()) || '';
      var db = (b.date_added && String(b.date_added).trim()) || '';
      if (da && !db) return -1;
      if (!da && db) return 1;
      if (!da && !db) return String(a.id || '').localeCompare(String(b.id || ''));
      if (da < db) return -1;
      if (da > db) return 1;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }

  function subtaskCounts(subtasks) {
    var open = 0, ongoing = 0, done = 0, dropped = 0;
    (subtasks || []).forEach(function (s) {
      if (s.status === 'Dropped' || s.status === 'Closed') dropped++;
      else if (s.status === 'Done') done++;
      else if (s.status === 'Ongoing') ongoing++;
      else open++;
    });
    return { open: open, ongoing: ongoing, done: done, dropped: dropped, total: (subtasks || []).length };
  }

  function isTruthyFlag(v) {
    return v === true || v === 1 || v === 'true';
  }

  /** Sub-task has its own planned effort (>0); otherwise its logged hours roll up to main-task summary totals. */
  function subtaskHasDedicatedEffort(s) {
    var h = s.effort_required_hours;
    if (h == null || h === '') return false;
    var n = parseFloat(h);
    return !isNaN(n) && n > 0;
  }

  function progressEffortHours(p) {
    var h = p && p.effort_consumed_hours;
    if (h == null || h === '') return 0;
    var n = typeof h === 'number' ? h : parseFloat(h);
    return isNaN(n) ? 0 : n;
  }

  function subtaskEffortSpent(s) {
    var updates = s.progress_updates || [];
    return updates.reduce(function (sum, p) {
      return sum + progressEffortHours(p);
    }, 0);
  }

  function taskEffortSpent(task) {
    return taskEffortSpentMainAttributed(task) + taskEffortSpentSubOnlyTask(task);
  }

  function taskEffortSpentMainAttributed(task) {
    var main = (task.progress_updates || []).reduce(function (sum, p) {
      return sum + progressEffortHours(p);
    }, 0);
    var sub = (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        return s2 + progressEffortHours(p);
      }, 0);
    }, 0);
    return main + sub;
  }

  function taskEffortSpentSubOnlyTask(task) {
    return (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (!subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        return s2 + progressEffortHours(p);
      }, 0);
    }, 0);
  }

  function taskEffortInRangeMainAttributed(task, from, to) {
    var main = (task.progress_updates || []).reduce(function (sum, p) {
      if (!p.date_added || p.date_added < from || p.date_added > to) return sum;
      return sum + progressEffortHours(p);
    }, 0);
    var sub = (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        if (!p.date_added || p.date_added < from || p.date_added > to) return s2;
        return s2 + progressEffortHours(p);
      }, 0);
    }, 0);
    return main + sub;
  }

  function taskEffortInRangeSubDedicated(task, from, to) {
    return (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (!subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        if (!p.date_added || p.date_added < from || p.date_added > to) return s2;
        return s2 + progressEffortHours(p);
      }, 0);
    }, 0);
  }

  /** Main + included subs: hours logged outside [from, to] (disjoint from in-range). */
  function taskEffortOutsideRangeMainAttributed(task, from, to) {
    var main = (task.progress_updates || []).reduce(function (sum, p) {
      if (!p.date_added || p.date_added < from || p.date_added > to) return sum + progressEffortHours(p);
      return sum;
    }, 0);
    var sub = (task.subtasks || []).reduce(function (sum, s) {
      if (isTruthyFlag(s.exclude_from_summary)) return sum;
      if (subtaskHasDedicatedEffort(s)) return sum;
      return sum + (s.progress_updates || []).reduce(function (s2, p) {
        if (!p.date_added || p.date_added < from || p.date_added > to) return s2 + progressEffortHours(p);
        return s2;
      }, 0);
    }, 0);
    return main + sub;
  }

  /** Dedicated sub: hours outside [from, to]. */
  function subtaskEffortOutsideRange(s, from, to) {
    return (s.progress_updates || []).reduce(function (sum, p) {
      if (!p.date_added || p.date_added < from || p.date_added > to) return sum + progressEffortHours(p);
      return sum;
    }, 0);
  }

  function isSubtaskDoneOrCompleted(s) {
    return s && (s.status === 'Done' || s.status === 'Completed');
  }

  /** YYYY-MM-DD when sub-task was finished: explicit done_date, else latest progress date_added. */
  function subtaskCompletionDateYMD(s) {
    if (!s) return '';
    var d = s.done_date;
    if (d != null && String(d).trim()) return String(d).trim().slice(0, 10);
    var updates = s.progress_updates || [];
    var maxD = '';
    for (var i = 0; i < updates.length; i++) {
      var x = updates[i].date_added || '';
      if (x > maxD) maxD = x;
    }
    return maxD || '';
  }

  /** List sub-task in summary/export tables (hide Done/Completed if finished before range start). */
  function includeSubtaskInSummaryByDate(s, rangeFrom) {
    if (!isSubtaskDoneOrCompleted(s)) return true;
    var comp = subtaskCompletionDateYMD(s);
    if (!comp) return true;
    return comp >= rangeFrom;
  }

  /** Sub-task appears in generated summary (on-screen) when parent is included. */
  function includeSubtaskInSummaryFull(s, rangeFrom) {
    if (isTruthyFlag(s.exclude_from_summary)) return false;
    return includeSubtaskInSummaryByDate(s, rangeFrom);
  }

  /** Current planned hours: last effort update's new value, else effort_required_hours (main task or sub-task). */
  function getLatestPlannedEffortHours(taskLike) {
    var updates = (taskLike.effort_updates || []).slice().sort(function (a, b) {
      return (a.date_recorded || '').localeCompare(b.date_recorded || '');
    });
    if (updates.length) {
      var lastU = updates[updates.length - 1];
      if (lastU.new_effort_hours != null && lastU.new_effort_hours !== '') {
        var ln = typeof lastU.new_effort_hours === 'number' ? lastU.new_effort_hours : parseFloat(lastU.new_effort_hours);
        if (!isNaN(ln)) return ln;
      }
    }
    var req = taskLike.effort_required_hours;
    if (req != null && req !== '') {
      var r = typeof req === 'number' ? req : parseFloat(req);
      if (!isNaN(r)) return r;
    }
    return 0;
  }

  var state = {
    data: { settings: DEFAULT_SETTINGS, tasks: [] },
    view: 'list',
    calendarFilter: 'assigned',
    calendarView: 'month',
    calendarFocusDate: new Date().toISOString().slice(0, 10),
    calendarChartStyle: 'basic',
    expandedTasks: {},
    expandedSubtasks: {},
    mainTaskSort: { by: 'date_added', dir: 'asc' },
    subtaskSortByTaskId: {},
    summaryGenerated: false,
    lastSummaryMeta: null
  };

  function parseYMD(ymd) {
    if (!ymd || typeof ymd !== 'string') return null;
    var parts = ymd.split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    var date = new Date(y, m, d);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  /** Sunday = 0, Saturday = 6 */
  function isWeekendYMD(ymd) {
    var date = parseYMD(ymd);
    if (!date) return false;
    var d = date.getDay();
    return d === 0 || d === 6;
  }

  /** Day off + weekend column tints for Gantt (full day off = green, partial = orange, weekend = red). */
  function buildGanttDayColumnOverlay(dates, usePercentWidths, colWidthPx) {
    var settings = getSettings();
    var offMap = {};
    (settings.dayOffs || []).forEach(function (o) {
      if (o && o.date) offMap[o.date] = o;
    });
    var parts = [];
    for (var i = 0; i < dates.length; i++) {
      var start;
      var end;
      if (usePercentWidths) {
        var n = dates.length || 1;
        start = (i / n * 100) + '%';
        end = ((i + 1) / n * 100) + '%';
      } else {
        var w = colWidthPx || 121;
        start = (i * w) + 'px';
        end = ((i + 1) * w) + 'px';
      }
      var ymd = dates[i];
      var off = offMap[ymd];
      var color = 'transparent';
      if (off && (off.type === 'full' || off.type === 'Full')) {
        color = 'rgba(46, 160, 67, 0.22)';
      } else if (off && (off.type === 'partial' || off.type === 'Partial')) {
        color = 'rgba(210, 153, 34, 0.24)';
      } else if (isWeekendYMD(ymd)) {
        color = 'rgba(248, 81, 73, 0.16)';
      }
      parts.push(color + ' ' + start, color + ' ' + end);
    }
    if (!parts.length) return 'linear-gradient(to right, transparent 0, transparent 100%)';
    return 'linear-gradient(to right, ' + parts.join(', ') + ')';
  }

  function getDayOffForDate(ymd) {
    var list = getSettings().dayOffs || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].date === ymd) return list[i];
    }
    return null;
  }

  function sumProgressHoursInRangeForTasks(tasks, from, to) {
    var total = 0;
    function add(updates) {
      (updates || []).forEach(function (p) {
        var d = p.date_added;
        if (d && d >= from && d <= to) total += (p.effort_consumed_hours || 0);
      });
    }
    tasks.forEach(function (t) {
      add(t.progress_updates);
      (t.subtasks || []).forEach(function (s) { add(s.progress_updates); });
    });
    return total;
  }

  function sumProgressHoursInRangeForTasksWithSummaryFilter(tasks, from, to) {
    var total = 0;
    tasks.forEach(function (t) {
      if (isTruthyFlag(t.exclude_from_summary)) return;
      (t.progress_updates || []).forEach(function (p) {
        var d = p.date_added;
        if (d && d >= from && d <= to) total += (Number(p.effort_consumed_hours) || 0);
      });
      (t.subtasks || []).forEach(function (s) {
        if (isTruthyFlag(s.exclude_from_summary)) return;
        (s.progress_updates || []).forEach(function (p) {
          var d = p.date_added;
          if (d && d >= from && d <= to) total += (Number(p.effort_consumed_hours) || 0);
        });
      });
    });
    return total;
  }

  function computeBandwidthUtilized(from, to, settings) {
    var hrsPerDay = parseFloat(settings.workingHoursPerDay);
    if (isNaN(hrsPerDay) || hrsPerDay <= 0) hrsPerDay = 8;
    var byDate = {};
    (settings.dayOffs || []).forEach(function (o) {
      if (o && o.date && o.date >= from && o.date <= to) byDate[o.date] = o;
    });
    var cap = 0;
    var pto = [];
    var sick = [];
    var other = [];
    function noteReason(reason, text) {
      if (reason === 'PTO') pto.push(text);
      else if (reason === 'Sick') sick.push(text);
      else other.push(text);
    }
    var d0 = parseYMD(from);
    var d1 = parseYMD(to);
    if (!d0 || !d1) {
      return {
        spent: 0,
        capacity: 0,
        hrsPerDay: hrsPerDay,
        ptoStr: '—',
        sickStr: '—',
        otherStr: '—'
      };
    }
    var d = new Date(d0.getTime());
    var end = new Date(d1.getTime());
    while (d <= end) {
      var ymd = toYMD(d);
      var dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        var off = byDate[ymd];
        if (off && (off.type === 'full' || off.type === 'Full')) {
          noteReason(off.reason || 'Other', ymd + ' (full day)');
        } else if (off && (off.type === 'partial' || off.type === 'Partial')) {
          var hOff = parseFloat(off.hoursOff);
          if (isNaN(hOff)) hOff = 0;
          hOff = Math.min(Math.max(0, hOff), hrsPerDay);
          cap += Math.max(0, hrsPerDay - hOff);
          noteReason(off.reason || 'Other', ymd + ' (partial, ' + hOff + 'h off)');
        } else {
          cap += hrsPerDay;
        }
      }
      d.setDate(d.getDate() + 1);
    }
    var spent = sumProgressHoursInRangeForTasksWithSummaryFilter(getTasks().map(normalizeTask), from, to);
    function joinList(arr) {
      return arr.length ? arr.join(', ') : '—';
    }
    return {
      spent: spent,
      capacity: cap,
      hrsPerDay: hrsPerDay,
      ptoStr: joinList(pto),
      sickStr: joinList(sick),
      otherStr: joinList(other)
    };
  }

  function formatCalendarDate(ymd) {
    var date = parseYMD(ymd);
    if (!date) return { dayName: '', dateMonthYear: ymd };
    var dayName = date.toLocaleDateString('en', { weekday: 'long' });
    var dateMonthYear = date.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });
    return { dayName: dayName, dateMonthYear: dateMonthYear };
  }

  function toYMD(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function getMonday(ymd) {
    var date = parseYMD(ymd);
    if (!date) return ymd;
    var day = date.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return toYMD(date);
  }

  function addDays(ymd, n) {
    var date = parseYMD(ymd);
    if (!date) return ymd;
    date.setDate(date.getDate() + n);
    return toYMD(date);
  }

  function getWeekDates(ymd) {
    var monday = getMonday(ymd);
    var out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(monday, i));
    return out;
  }

  function getMonthDates(ymd) {
    var date = parseYMD(ymd);
    if (!date) return [];
    var y = date.getFullYear();
    var m = date.getMonth();
    var first = new Date(y, m, 1);
    var last = new Date(y, m + 1, 0);
    var out = [];
    for (var d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      out.push(toYMD(new Date(d)));
    }
    return out;
  }

  function getMonthLabel(ymd) {
    var date = parseYMD(ymd);
    if (!date) return ymd;
    return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  }

  function getWeekLabel(ymd) {
    var dates = getWeekDates(ymd);
    if (dates.length < 2) return ymd;
    var a = formatCalendarDate(dates[0]);
    var b = formatCalendarDate(dates[6]);
    return a.dateMonthYear + ' – ' + b.dateMonthYear;
  }

  function compareDateStrOrEmpty(a, b) {
    var sa = a || '';
    var sb = b || '';
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    if (sa > sb) return 1;
    if (sa < sb) return -1;
    return 0;
  }

  function sortMainTasks(tasks) {
    var opt = state.mainTaskSort;
    var by = opt.by;
    var dir = opt.dir === 'desc' ? -1 : 1;
    return tasks.slice().sort(function (a, b) {
      var cmp = 0;
      if (by === 'date_added') {
        var da = (a.created_at && a.created_at.slice(0, 10)) || a.assigned_date || '';
        var db = (b.created_at && b.created_at.slice(0, 10)) || b.assigned_date || '';
        cmp = compareDateStrOrEmpty(da, db);
      } else if (by === 'priority') {
        var pa = a.priority != null ? a.priority : 0;
        var pb = b.priority != null ? b.priority : 0;
        cmp = pa - pb;
      } else if (by === 'eta') {
        cmp = compareDateStrOrEmpty(a.eta, b.eta);
      } else {
        return 0;
      }
      return cmp * dir;
    });
  }

  function sortSubtasksForTask(taskId, subtasks) {
    var opt = state.subtaskSortByTaskId[taskId] || { by: 'date_added', dir: 'asc' };
    var by = opt.by;
    var dir = opt.dir === 'desc' ? -1 : 1;
    return (subtasks || []).slice().sort(function (a, b) {
      var cmp = 0;
      if (by === 'date_added' || by === 'assigned_date') {
        cmp = compareDateStrOrEmpty(a.assigned_date, b.assigned_date);
      } else if (by === 'priority') {
        var pa = a.priority != null ? a.priority : 0;
        var pb = b.priority != null ? b.priority : 0;
        cmp = pa - pb;
      } else {
        return 0;
      }
      return cmp * dir;
    });
  }

  function getTasks() {
    var tasks = state.data.tasks || [];
    tasks.forEach(normalizeTask);
    return tasks;
  }

  function getSettings() {
    return state.data.settings || DEFAULT_SETTINGS;
  }

  function setData(data) {
    state.data = data || {};
    if (!state.data.tasks) state.data.tasks = [];
    var merged = Object.assign({}, DEFAULT_PRIORITY_COLORS, (state.data.settings && state.data.settings.priorityColors));
    if (!state.data.settings) state.data.settings = {};
    state.data.settings.priorityColors = merged;
    if (!Array.isArray(state.data.settings.categories) || state.data.settings.categories.length === 0) {
      state.data.settings.categories = DEFAULT_CATEGORIES.slice();
    }
    var wh = parseFloat(state.data.settings.workingHoursPerDay);
    if (isNaN(wh) || wh <= 0) state.data.settings.workingHoursPerDay = 8;
    if (!Array.isArray(state.data.settings.dayOffs)) state.data.settings.dayOffs = [];
    if (!Array.isArray(state.data.settings.projects)) state.data.settings.projects = [];
    else {
      state.data.settings.projects = state.data.settings.projects.map(function (p) {
        return String(p).trim();
      }).filter(Boolean);
    }
  }

  function updateDocumentTitleFromPath(fullPath) {
    if (!fullPath) {
      document.title = 'FlowAssist';
      return;
    }
    var base = String(fullPath).replace(/^.*[/\\]/, '');
    document.title = 'FlowAssist — ' + base;
  }

  function showProfileError(title, message, detail) {
    if (window.taskAPI.showErrorDialog) {
      return window.taskAPI.showErrorDialog({
        title: title || 'FlowAssist',
        message: message || 'An error occurred.',
        detail: detail || ''
      });
    }
    window.alert(message + (detail ? '\n\n' + detail : ''));
    return Promise.resolve();
  }

  function save() {
    return window.taskAPI.saveTasks(state.data).then(function (result) {
      if (result && !result.success) console.error('Save failed:', result.error);
      return result;
    });
  }

  function load() {
    return window.taskAPI.loadTasks().then(function (res) {
      if (res && res.success === false) {
        var msg = res.message || 'Could not load the profile.';
        var detail = res.path ? String(res.path) : '';
        var title = res.code === 'FILE_NOT_FOUND' ? 'Profile file missing' : 'Could not read profile';
        return showProfileError(title, msg, detail).then(function () {
          setData({ tasks: [], settings: {} });
          updateDocumentTitleFromPath(null);
          render();
        });
      }
      setData(res.data);
      updateDocumentTitleFromPath(res.path);
      render();
      return res.data;
    });
  }

  function addTask(task) {
    var t = createTask(task);
    state.data.tasks.push(t);
    return save().then(function () { render(); return t; });
  }

  function updateTask(id, updates) {
    var task = state.data.tasks.find(function (t) { return t.id === id; });
    if (!task) return Promise.resolve();
    if (updates.status === 'Done' && task.status !== 'Done' && task.status !== 'Completed') {
      if (!task.done_date) task.done_date = new Date().toISOString().slice(0, 10);
    }
    Object.keys(updates).forEach(function (k) {
      if (k === 'categories') task.categories = Array.isArray(updates.categories) ? updates.categories.slice() : [];
      else if (k === 'difficulty') task.difficulty = normalizeTaskDifficulty(updates.difficulty);
      else task[k] = updates[k];
    });
    return save().then(function () { render(); });
  }

  function recordEtaUpdate(taskId, newEta) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    var oldEta = task.eta || '';
    if (!task.eta_updates) task.eta_updates = [];
    task.eta_updates.push({
      id: generateId(),
      date_recorded: new Date().toISOString().slice(0, 10),
      old_eta: oldEta,
      new_eta: newEta
    });
    task.eta = newEta;
    return save().then(function () { render(); });
  }

  function recordEffortUpdate(taskId, newEffortHours) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    var oldH = task.effort_required_hours ?? 0;
    var newH = parseFloat(newEffortHours);
    if (isNaN(newH)) newH = 0;
    if (!task.effort_updates) task.effort_updates = [];
    task.effort_updates.push({
      id: generateId(),
      date_recorded: new Date().toISOString().slice(0, 10),
      old_effort_hours: oldH,
      new_effort_hours: newH
    });
    task.effort_required_hours = newH;
    return save().then(function () { render(); });
  }

  function updateDoneDate(taskId, newDate) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    task.done_date = newDate || '';
    return save().then(function () { render(); });
  }

  function addProgressUpdate(taskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    if (!task.progress_updates) task.progress_updates = [];
    task.progress_updates.push({
      id: generateId(),
      text: payload.text || '',
      date_added: payload.date_added || new Date().toISOString().slice(0, 10),
      effort_consumed_hours: payload.effort_consumed_hours ?? 0
    });
    task.progress_updates = sortProgressUpdatesOldestFirst(task.progress_updates);
    return save().then(function () { render(); });
  }

  function updateProgressUpdate(taskId, updateId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.progress_updates) return Promise.resolve();
    var u = task.progress_updates.find(function (p) { return p.id === updateId; });
    if (!u) return Promise.resolve();
    if (payload.text !== undefined) u.text = payload.text;
    if (payload.date_added !== undefined) u.date_added = payload.date_added;
    if (payload.effort_consumed_hours !== undefined) u.effort_consumed_hours = payload.effort_consumed_hours;
    task.progress_updates = sortProgressUpdatesOldestFirst(task.progress_updates);
    return save().then(function () { render(); });
  }

  function addSubtask(taskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    if (!task.subtasks) task.subtasks = [];
    var today = new Date().toISOString().slice(0, 10);
    task.subtasks.push({
      id: generateId(),
      title: payload.title || 'Untitled',
      description: payload.description || '',
      priority: Math.min(10, Math.max(1, (payload.priority != null ? payload.priority : 1))),
      assigned_date: payload.assigned_date != null ? payload.assigned_date : today,
      effort_required_hours: payload.effort_required_hours != null ? payload.effort_required_hours : 0,
      status: payload.status || 'Open',
      done_date: '',
      difficulty: normalizeTaskDifficulty(payload.difficulty),
      progress_updates: payload.progress_updates || [],
      categories: Array.isArray(payload.categories) ? payload.categories.slice() : [],
      project: (payload.project != null && String(payload.project).trim()) ? String(payload.project).trim() : '',
      exclude_from_summary: !!payload.exclude_from_summary,
      exclude_from_export: !!payload.exclude_from_export
    });
    return save().then(function () { render(); });
  }

  function updateSubtask(taskId, subtaskId, updates) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s) return Promise.resolve();
    if (updates.title !== undefined) s.title = updates.title;
    if (updates.status !== undefined) {
      var prevSt = s.status;
      s.status = updates.status;
      if ((updates.status === 'Done' || updates.status === 'Completed') &&
          prevSt !== 'Done' && prevSt !== 'Completed') {
        if (!s.done_date) s.done_date = new Date().toISOString().slice(0, 10);
      }
    }
    if (updates.description !== undefined) s.description = updates.description;
    if (updates.priority !== undefined) s.priority = Math.min(10, Math.max(1, updates.priority));
    if (updates.assigned_date !== undefined) s.assigned_date = updates.assigned_date;
    if (updates.effort_required_hours !== undefined) s.effort_required_hours = updates.effort_required_hours;
    if (updates.categories !== undefined) s.categories = Array.isArray(updates.categories) ? updates.categories.slice() : [];
    if (updates.project !== undefined) s.project = (updates.project != null && String(updates.project).trim()) ? String(updates.project).trim() : '';
    if (updates.difficulty !== undefined) s.difficulty = normalizeTaskDifficulty(updates.difficulty);
    if (updates.exclude_from_summary !== undefined) s.exclude_from_summary = !!updates.exclude_from_summary;
    if (updates.exclude_from_export !== undefined) s.exclude_from_export = !!updates.exclude_from_export;
    return save().then(function () { render(); });
  }

  function addSubtaskProgressUpdate(taskId, subtaskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s) return Promise.resolve();
    if (!s.progress_updates) s.progress_updates = [];
    s.progress_updates.push({
      id: generateId(),
      text: payload.text || '',
      date_added: payload.date_added || new Date().toISOString().slice(0, 10),
      effort_consumed_hours: payload.effort_consumed_hours ?? 0
    });
    s.progress_updates = sortProgressUpdatesOldestFirst(s.progress_updates);
    return save().then(function () { render(); });
  }

  function updateSubtaskProgressUpdate(taskId, subtaskId, updateId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !s.progress_updates) return Promise.resolve();
    var u = s.progress_updates.find(function (p) { return p.id === updateId; });
    if (!u) return Promise.resolve();
    if (payload.text !== undefined) u.text = payload.text;
    if (payload.date_added !== undefined) u.date_added = payload.date_added;
    if (payload.effort_consumed_hours !== undefined) u.effort_consumed_hours = payload.effort_consumed_hours;
    s.progress_updates = sortProgressUpdatesOldestFirst(s.progress_updates);
    return save().then(function () { render(); });
  }

  function deleteSubtask(taskId, subtaskId) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    task.subtasks = task.subtasks.filter(function (s) { return s.id !== subtaskId; });
    return save().then(function () { render(); });
  }

  function addConcern(taskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return Promise.resolve();
    if (!Array.isArray(task.concerns)) task.concerns = [];
    task.concerns.push({
      id: generateId(),
      description: payload.description || '',
      logged_date: payload.logged_date || new Date().toISOString().slice(0, 10),
      status: 'Open',
      addressed_date: '',
      addressed_comment: ''
    });
    return save().then(function () { render(); });
  }

  function addressConcern(taskId, concernId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !Array.isArray(task.concerns)) return Promise.resolve();
    var c = task.concerns.find(function (x) { return x.id === concernId; });
    if (!c) return Promise.resolve();
    c.addressed_date = payload.addressed_date || new Date().toISOString().slice(0, 10);
    c.addressed_comment = payload.addressed_comment || '';
    c.status = 'Addressed';
    return save().then(function () { render(); });
  }

  function addSubtaskConcern(taskId, subtaskId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s) return Promise.resolve();
    if (!Array.isArray(s.concerns)) s.concerns = [];
    s.concerns.push({
      id: generateId(),
      description: payload.description || '',
      logged_date: payload.logged_date || new Date().toISOString().slice(0, 10),
      status: 'Open',
      addressed_date: '',
      addressed_comment: ''
    });
    return save().then(function () { render(); });
  }

  function addressSubtaskConcern(taskId, subtaskId, concernId, payload) {
    var task = state.data.tasks.find(function (t) { return t.id === taskId; });
    if (!task || !task.subtasks) return Promise.resolve();
    var s = task.subtasks.find(function (x) { return x.id === subtaskId; });
    if (!s || !Array.isArray(s.concerns)) return Promise.resolve();
    var c = s.concerns.find(function (x) { return x.id === concernId; });
    if (!c) return Promise.resolve();
    c.addressed_date = payload.addressed_date || new Date().toISOString().slice(0, 10);
    c.addressed_comment = payload.addressed_comment || '';
    c.status = 'Addressed';
    return save().then(function () { render(); });
  }

  function deleteTask(id) {
    state.data.tasks = state.data.tasks.filter(function (t) { return t.id !== id; });
    return save().then(function () { render(); });
  }

  function saveSettings(newSettings) {
    state.data.settings = newSettings || getSettings();
    return save().then(function () { render(); });
  }

  var $ = function (id) { return document.getElementById(id); };
  var taskTitle = $('task-title');
  var taskDescription = $('task-description');
  var taskPriority = $('task-priority');
  var taskTags = $('task-tags');
  var taskAssigned = $('task-assigned');
  var taskEta = $('task-eta');
  var taskEffort = $('task-effort');
  var taskDifficulty = $('task-difficulty');
  var taskBug = $('task-bug');
  var addTaskBtn = $('add-task-btn');
  var taskListEl = $('task-list');
  var completedTaskListEl = $('completed-task-list');
  var calendarFilter = $('calendar-filter');
  var calendarContainer = $('calendar-container');
  var summaryFrom = $('summary-from');
  var summaryTo = $('summary-to');
  var generateSummaryBtn = $('generate-summary-btn');
  var summaryExportFormat = $('summary-export-format');
  var exportSummaryBtn = $('export-summary-btn');
  var summaryOutput = $('summary-output');

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderDifficultySelectHtml(selectedValue, extraClass) {
    var sel = normalizeTaskDifficulty(selectedValue);
    var cls = extraClass ? (' ' + extraClass) : '';
    var parts = ['<select class="task-difficulty-select' + cls + '" aria-label="Difficulty">'];
    TASK_DIFFICULTY_LEVELS.forEach(function (level) {
      parts.push('<option value="' + escapeHtml(level) + '"' + (level === sel ? ' selected' : '') + '>' + escapeHtml(level) + '</option>');
    });
    parts.push('</select>');
    return parts.join('');
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '&#10;')
      .replace(/\r/g, '&#13;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  var URL_IN_TEXT_RE = /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

  function splitUrlTrailingPunct(raw) {
    var u = raw;
    var tail = '';
    while (u.length > 0) {
      var c = u.charAt(u.length - 1);
      if ('.,;:!?)]}'.indexOf(c) >= 0) {
        tail = c + tail;
        u = u.slice(0, -1);
      } else {
        break;
      }
    }
    return { core: u, tail: tail };
  }

  /** Escape plain text and wrap http(s):// and www. URLs in safe external links. */
  function linkifyPlainText(plain) {
    if (plain == null || plain === '') return '';
    var s = String(plain);
    var parts = [];
    var last = 0;
    var m;
    URL_IN_TEXT_RE.lastIndex = 0;
    while ((m = URL_IN_TEXT_RE.exec(s)) !== null) {
      parts.push(escapeHtml(s.slice(last, m.index)));
      var raw = m[0];
      var sp = splitUrlTrailingPunct(raw);
      var core = sp.core;
      var tail = sp.tail;
      if (!core) {
        parts.push(escapeHtml(raw));
        last = m.index + raw.length;
        continue;
      }
      var href = /^https?:\/\//i.test(core) ? core : 'https://' + core;
      parts.push('<a href="' + escapeAttr(href) + '" target="_blank" rel="noopener noreferrer" class="auto-link">' + escapeHtml(core) + '</a>');
      parts.push(escapeHtml(tail));
      last = m.index + raw.length;
    }
    parts.push(escapeHtml(s.slice(last)));
    return parts.join('');
  }

  function formatMultilineWithLinks(plain) {
    return linkifyPlainText(plain || '').replace(/\r\n|\n|\r/g, '<br>');
  }

  function decodeAttr(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&#10;/g, '\n')
      .replace(/&#13;/g, '\r')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function autoResizeTextarea(ta) {
    if (!ta || ta.tagName !== 'TEXTAREA') return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 400) + 'px';
  }

  function renderConcernCountPill(concerns) {
    var n = (concerns || []).length;
    if (!n) return '';
    return '<span class="bar-concerns-pill" role="text" aria-label="' + n + ' concern(s)">' + n + '</span>';
  }

  function renderConcernsBlock(concerns) {
    var today = new Date().toISOString().slice(0, 10);
    var openCount = concerns ? concerns.filter(function (c) { return c.status !== 'Addressed'; }).length : 0;
    var list = (concerns && concerns.length) ? concerns.map(function (c) {
      var isAddressed = c.status === 'Addressed';
      var statusBadge = '<span class="concern-status-badge ' + (isAddressed ? 'concern-addressed' : 'concern-open') + '">' + (isAddressed ? 'Addressed' : 'Open') + '</span>';
      var addressedInfo = isAddressed
        ? '<div class="concern-addressed-info">' +
            '<span class="concern-addressed-label">Addressed: ' + escapeHtml(c.addressed_date || '') + '</span>' +
            (c.addressed_comment ? '<div class="concern-addressed-comment">' + formatMultilineWithLinks(c.addressed_comment) + '</div>' : '') +
          '</div>'
        : '';
      return '<li class="concern-item' + (isAddressed ? ' concern-item-addressed' : '') + '" data-concern-id="' + escapeHtml(c.id) + '">' +
        '<div class="concern-item-view">' +
          '<div class="concern-item-header">' +
            statusBadge +
            '<span class="concern-logged-date">' + escapeHtml(c.logged_date || '') + '</span>' +
            (!isAddressed ? '<button type="button" class="btn-edit-cyan btn-concern-update-toggle" title="Update concern">✎</button>' : '') +
          '</div>' +
          '<div class="concern-description">' + formatMultilineWithLinks(c.description || '') + '</div>' +
          addressedInfo +
        '</div>' +
        (!isAddressed
          ? '<div class="concern-update-form hidden">' +
              '<textarea class="concern-update-comment auto-resize" rows="2" placeholder="Comment on how the concern was addressed…"></textarea>' +
              '<input type="date" class="concern-addressed-date-in" value="' + today + '">' +
              '<button type="button" class="btn-small concern-submit-update-btn">Mark as Addressed</button>' +
            '</div>'
          : '') +
      '</li>';
    }).join('') : '';

    var countLabel = concerns && concerns.length
      ? ' <span class="concerns-count">(' + concerns.length + (openCount ? ', ' + openCount + ' open' : '') + ')</span>'
      : '';

    return '<div class="task-concerns-block task-toggleable-block task-block-collapsed">' +
      '<h4 class="task-update-title">Concerns' + countLabel + '</h4>' +
      (list ? '<ul class="concern-list">' + list + '</ul>' : '') +
      '<div class="concern-add-form">' +
        '<textarea class="concern-desc-in auto-resize" rows="2" placeholder="Describe the concern…"></textarea>' +
        '<input type="date" class="concern-date-in" value="' + today + '">' +
        '<button type="button" class="btn-small log-concern-btn">Log Concern</button>' +
      '</div>' +
    '</div>';
  }

  function renderSubtaskCard(taskId, s, settings) {
    var today = new Date().toISOString().slice(0, 10);
    var subKey = taskId + '_' + s.id;
    var isSubExpanded = state.expandedSubtasks[subKey];
    var baseColor = getPriorityColor(s.priority, settings);
    var subPriorityColor = darkenColor(baseColor, 0.72);
    var subAssignedStr = s.assigned_date || null;
    var subEffortReq = s.effort_required_hours != null && s.effort_required_hours !== '' ? (s.effort_required_hours + ' hrs') : '0 hrs';
    var subCats = (s.categories || []).length ? (s.categories || []).map(function (c) {
      return '<span class="meta-chip meta-chip-category">' + escapeHtml(c) + '</span>';
    }).join('') : '';
    var subMetaChips = [
      '<span class="meta-chip"><span class="meta-label">Priority</span><span class="meta-value">' + (s.priority != null ? 'P' + s.priority : 'P1') + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Difficulty</span><span class="meta-value">' + escapeHtml(normalizeTaskDifficulty(s.difficulty)) + '</span></span>',
      (subCats ? '<span class="meta-chip meta-chip-categories"><span class="meta-label">Category</span>' + subCats + '</span>' : '<span class="meta-chip"><span class="meta-label">Category</span><span class="meta-value default-value">—</span></span>'),
      '<span class="meta-chip"><span class="meta-label">Assigned</span><span class="meta-value' + (!subAssignedStr ? ' default-value' : '') + '">' + escapeHtml(subAssignedStr || '—') + '</span></span>',
      '<span class="meta-chip meta-chip-effort"><span class="meta-label">Effort</span><span class="meta-value">' + escapeHtml(subEffortReq) + '</span></span>'
    ].join('');

    var subBar = '<div class="subtask-bar" style="background-color:' + escapeHtml(subPriorityColor) + ';color:#fff" data-task-id="' + escapeHtml(taskId) + '" data-subtask-id="' + escapeHtml(s.id) + '">' +
      '<div class="subtask-bar-left">' +
        '<div class="subtask-bar-title-row">' +
          renderProjectBarChip(s.project) +
          '<span class="subtask-bar-title">' + escapeHtml(s.title || '') + '</span>' +
          renderConcernCountPill(s.concerns) +
        '</div>' +
        '<div class="subtask-bar-meta">' + subMetaChips + '</div>' +
      '</div>' +
      '<div class="subtask-bar-right">' +
        '<div class="status-buttons status-buttons-sub" data-status-target="subtask">' +
          '<button type="button" class="status-btn' + (s.status === 'Open' ? ' active' : '') + '" data-status="Open">Open</button>' +
          '<button type="button" class="status-btn' + (s.status === 'Ongoing' ? ' active' : '') + '" data-status="Ongoing">Ongoing</button>' +
          '<button type="button" class="status-btn' + (s.status === 'Done' ? ' active' : '') + '" data-status="Done">Done</button>' +
          '<button type="button" class="status-btn' + ((s.status === 'Dropped' || s.status === 'Closed') ? ' active' : '') + '" data-status="Dropped">Dropped</button>' +
        '</div>' +
        '<button type="button" class="btn-icon subtask-delete" title="Delete">×</button>' +
      '</div>' +
      '</div>';

    var subBody = '';
    if (isSubExpanded) {
      var subDesc = formatMultilineWithLinks(s.description || '');
      subBody = '<div class="subtask-body">' +
        '<div class="subtask-summary-export-flags">' +
          '<label class="flag-check"><input type="checkbox" class="subtask-exclude-summary"' + (isTruthyFlag(s.exclude_from_summary) ? ' checked' : '') + '> Exclude from summary</label>' +
          '<label class="flag-check"><input type="checkbox" class="subtask-exclude-export"' + (isTruthyFlag(s.exclude_from_export) ? ' checked' : '') + '> Exclude from export</label>' +
        '</div>' +
        '<div class="subtask-update-toggles">' +
          '<button type="button" class="btn-update-toggle btn-subtask-update-details">Update Details</button>' +
          '<button type="button" class="btn-update-toggle btn-update-toggle-concern btn-add-concern-toggle">Concerns</button>' +
        '</div>' +
        renderConcernsBlock(s.concerns || []) +
        '<div class="subtask-details-block task-toggleable-block task-block-collapsed">' +
          '<h4 class="task-details-title">Sub-task details</h4>' +
          '<div class="task-details-grid">' +
            '<label>Priority <input type="number" class="subtask-detail-priority" min="1" max="10" value="' + (s.priority != null ? s.priority : 1) + '" placeholder="1–10"></label>' +
            '<label>Difficulty ' + renderDifficultySelectHtml(s.difficulty, 'subtask-detail-difficulty') + '</label>' +
            '<label>Assigned <input type="date" class="subtask-detail-assigned" value="' + escapeHtml(s.assigned_date || '') + '" placeholder="YYYY-MM-DD"></label>' +
            '<label>Effort (hrs) <input type="number" class="subtask-detail-effort" min="0" step="0.5" value="' + (s.effort_required_hours != null && s.effort_required_hours !== '' ? s.effort_required_hours : 0) + '" placeholder="hrs"></label>' +
          '</div>' +
          '<div class="task-detail-category-wrap">' +
            '<span class="task-detail-label">Category</span>' +
            renderCategoryDropdownHtml(s.categories || [], 'subtask-detail-category-' + taskId + '-' + s.id) +
          '</div>' +
          '<div class="task-detail-project-wrap">' +
            '<span class="task-detail-label">Project</span>' +
            renderProjectSelectHtml(s.project || '', 'subtask-detail-project-' + taskId + '-' + s.id) +
          '</div>' +
          '<button type="button" class="btn-small save-subtask-details-btn">Save details</button>' +
        '</div>' +
        '<div class="subtask-description-block">' +
          '<span class="block-subtitle">Description</span>' +
          '<div class="task-description-wrap">' +
            '<div class="task-description-view">' + (subDesc || '<em class="no-desc">No description</em>') + '</div>' +
            '<textarea class="task-description-edit hidden subtask-desc-edit auto-resize" rows="2" placeholder="Description…">' + escapeHtml(s.description || '') + '</textarea>' +
            '<button type="button" class="btn-edit-cyan toggle-subtask-desc-edit" title="Edit description">✎</button>' +
          '</div>' +
        '</div>' +
        '<div class="task-progress-block">' +
          '<div class="progress-list-wrap">' +
            (s.progress_updates && s.progress_updates.length ? '<ul class="progress-list subtask-progress-list">' + sortProgressUpdatesOldestFirst(s.progress_updates).map(function (p) {
              var d = p.date_added || '';
              var h = p.effort_consumed_hours != null ? p.effort_consumed_hours + ' hrs' : '';
              var effortVal = p.effort_consumed_hours != null ? p.effort_consumed_hours : '';
              return '<li class="progress-item" data-update-id="' + escapeHtml(p.id) + '" data-date-added="' + escapeHtml(d) + '" data-effort="' + escapeHtml(String(effortVal)) + '" data-progress-text="' + escapeAttr(p.text || '') + '">' +
                '<div class="progress-item-view">' +
                  '<div class="progress-item-head">' +
                    '<span class="progress-meta">' + escapeHtml(d) + (h ? ' · ' + h : '') + '</span>' +
                    '<button type="button" class="btn-edit-cyan btn-edit-subtask-progress" title="Edit">✎</button>' +
                  '</div>' +
                  '<div class="progress-text">' + (formatMultilineWithLinks(p.text || '') || '') + '</div>' +
                '</div>' +
                '<div class="progress-item-edit hidden">' +
                  '<textarea class="progress-edit-text auto-resize" rows="2" placeholder="Note"></textarea>' +
                  '<input type="date" class="progress-edit-date">' +
                  '<input type="number" class="progress-edit-effort" placeholder="Hrs" min="0" step="0.5">' +
                  '<button type="button" class="btn-small progress-save-btn subtask-progress-save">Save</button>' +
                '</div>' +
              '</li>';
            }).join('') + '</ul>' : '') +
          '</div>' +
          '<div class="progress-add">' +
            '<textarea class="progress-text-in subtask-progress-text auto-resize" rows="2" placeholder="Progress note…"></textarea>' +
            '<input type="date" class="progress-date-in subtask-progress-date" value="' + today + '">' +
            '<input type="number" class="progress-effort-in subtask-progress-effort" placeholder="Hrs" min="0" step="0.5">' +
            '<button type="button" class="btn-small add-subtask-progress-btn">Add progress</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    return '<li class="subtask-card' + (isSubExpanded ? ' expanded' : '') + '" data-task-id="' + escapeHtml(taskId) + '" data-subtask-id="' + escapeHtml(s.id) + '">' + subBar + subBody + '</li>';
  }

  function renderTaskCard(task) {
    var today = new Date().toISOString().slice(0, 10);
    var settings = getSettings();
    var priorityColor = getPriorityColor(task.priority, settings);
    var isExpanded = state.expandedTasks[task.id];
    var effortDays = hoursToDays(task.effort_required_hours);
    var effortStr = task.effort_required_hours != null && task.effort_required_hours !== '' ? (task.effort_required_hours + ' hrs' + (effortDays ? ' (' + effortDays + ' d)' : '')) : null;
    var tagsStr = (task.tags && task.tags.length) ? task.tags.join(' ') : null;
    var bugNums = task.bug_numbers || (task.bug_number != null && task.bug_number !== 0 && task.bug_number !== '' ? [].concat(task.bug_number) : []);
    var bugStr = bugNums.length ? bugNums.join(', ') : null;
    var etaStr = task.eta || null;
    var counts = subtaskCounts(task.subtasks);

    var effortSpentHrs = taskEffortSpent(task);
    var effortSpentStr = effortSpentHrs ? (effortSpentHrs + ' hrs') : '0 hrs';
    var statusStr = (task.status === 'Closed' ? 'Dropped' : (task.status === 'Completed' ? 'Done' : task.status)) || 'Open';
    var statusClass = 'meta-status-' + (statusStr || 'open').toLowerCase().replace(/\s/g, '-');

    var taskCats = (task.categories || []).length ? (task.categories || []).map(function (c) {
      return '<span class="meta-chip meta-chip-category">' + escapeHtml(c) + '</span>';
    }).join('') : '';
    var metaChips = [
      '<span class="meta-chip meta-chip-status ' + statusClass + '"><span class="meta-label">Status</span><span class="meta-value">' + escapeHtml(statusStr) + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Priority</span><span class="meta-value' + (task.priority == null ? ' default-value' : '') + '">' + (task.priority != null ? 'P' + task.priority : '—') + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Difficulty</span><span class="meta-value">' + escapeHtml(normalizeTaskDifficulty(task.difficulty)) + '</span></span>',
      (taskCats ? '<span class="meta-chip meta-chip-categories"><span class="meta-label">Category</span>' + taskCats + '</span>' : '<span class="meta-chip"><span class="meta-label">Category</span><span class="meta-value default-value">—</span></span>'),
      '<span class="meta-chip"><span class="meta-label">Tags</span><span class="meta-value' + (!tagsStr ? ' default-value' : '') + '">' + escapeHtml(tagsStr || '—') + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Assigned</span><span class="meta-value' + (!task.assigned_date ? ' default-value' : '') + '">' + escapeHtml(task.assigned_date || '—') + '</span></span>',
      '<span class="meta-chip meta-chip-eta"><span class="meta-label">ETA</span><span class="meta-value' + (!etaStr ? ' default-value' : '') + '">' + escapeHtml(etaStr || '—') + '</span></span>',
      '<span class="meta-chip meta-chip-effort"><span class="meta-label">Effort</span><span class="meta-value' + (effortStr == null ? ' default-value' : '') + '">' + (effortStr != null ? escapeHtml(effortStr) : '—') + '</span></span>',
      '<span class="meta-chip meta-chip-spent"><span class="meta-label">Effort spent</span><span class="meta-value' + (!effortSpentHrs ? ' default-value' : '') + '">' + effortSpentStr + '</span></span>',
      '<span class="meta-chip"><span class="meta-label">Bugs</span><span class="meta-value' + (!bugStr ? ' default-value' : '') + '">' + escapeHtml(bugStr || '—') + '</span></span>'
    ].join('');

    var subtaskBlock = '';
    if (counts.total > 0) {
      subtaskBlock = '<div class="task-bar-subtasks">' +
        '<span class="subtask-count-wrap"><span class="subtask-count-label">Subtasks : </span><span class="subtask-count-value">' + counts.total + '</span></span>' +
        '<span class="subtask-pipe">|</span>' +
        '<span class="subtask-summary">' +
          '<span class="badge badge-open">' + counts.open + ' Open</span>' +
          '<span class="badge badge-ongoing">' + counts.ongoing + ' Ongoing</span>' +
          '<span class="badge badge-done">' + counts.done + ' Done</span>' +
          '<span class="badge badge-dropped">' + counts.dropped + ' Dropped</span>' +
        '</span></div>';
    }

    var barContent = '<div class="task-bar" style="background-color:' + escapeHtml(priorityColor) + ';color:#fff" data-task-id="' + escapeHtml(task.id) + '">' +
      '<div class="task-bar-left">' +
        '<div class="task-bar-title-row">' +
          renderProjectBarChip(task.project) +
          '<span class="task-bar-title">' + escapeHtml(task.title || '') + '</span>' +
          renderConcernCountPill(task.concerns) +
        '</div>' +
        '<div class="task-bar-meta">' + metaChips + '</div>' +
        subtaskBlock +
      '</div>' +
      '</div>';

    var bodyHtml = '';
    if (isExpanded) {
      var desc = formatMultilineWithLinks(task.description || '');
      bodyHtml = '<div class="task-body">' +
        '<div class="task-body-actions">' +
          '<div class="status-buttons" data-status-target="task">' +
            '<button type="button" class="status-btn' + (task.status === 'Open' ? ' active' : '') + '" data-status="Open">Open</button>' +
            '<button type="button" class="status-btn' + (task.status === 'Ongoing' ? ' active' : '') + '" data-status="Ongoing">Ongoing</button>' +
            '<button type="button" class="status-btn' + ((task.status === 'Done' || task.status === 'Completed') ? ' active' : '') + '" data-status="Done">Done</button>' +
            '<button type="button" class="status-btn' + ((task.status === 'Dropped' || task.status === 'Closed') ? ' active' : '') + '" data-status="Dropped">Dropped</button>' +
          '</div>' +
          '<button type="button" class="btn-icon task-delete" title="Delete task">×</button>' +
        '</div>' +
        '<div class="task-summary-export-flags">' +
          '<label class="flag-check"><input type="checkbox" class="task-exclude-summary"' + (isTruthyFlag(task.exclude_from_summary) ? ' checked' : '') + '> Exclude from summary</label>' +
          '<label class="flag-check"><input type="checkbox" class="task-exclude-export"' + (isTruthyFlag(task.exclude_from_export) ? ' checked' : '') + '> Exclude from export</label>' +
        '</div>' +
        '<div class="task-update-toggles">' +
          '<button type="button" class="btn-update-toggle btn-update-details">Update Task Details</button>' +
          '<button type="button" class="btn-update-toggle btn-update-eta">Update ETA</button>' +
          '<button type="button" class="btn-update-toggle btn-update-effort">Update Effort</button>' +
          '<button type="button" class="btn-update-toggle btn-update-done-date">Update Done Date</button>' +
          '<button type="button" class="btn-update-toggle btn-update-toggle-concern btn-add-concern-toggle">Concerns</button>' +
        '</div>' +
        '<div class="task-details-block task-toggleable-block task-block-collapsed">' +
          '<h4 class="task-details-title">Task details</h4>' +
          '<div class="task-details-grid">' +
            '<label>Priority <input type="number" class="task-detail-priority" min="1" max="10" value="' + (task.priority != null ? task.priority : '') + '" placeholder="1–10"></label>' +
            '<label>Difficulty ' + renderDifficultySelectHtml(task.difficulty, 'task-detail-difficulty') + '</label>' +
            '<label>Tags <input type="text" class="task-detail-tags" value="' + escapeHtml((task.tags || []).map(function (t) { return (t || '').replace(/^#/, ''); }).join(', ')) + '" placeholder="e.g. tag1, tag2"></label>' +
            '<label>Assigned <input type="date" class="task-detail-assigned" value="' + escapeHtml(task.assigned_date || '') + '" placeholder="YYYY-MM-DD"></label>' +
            '<label>ETA <input type="date" class="task-detail-eta" value="' + escapeHtml(task.eta || '') + '" placeholder="YYYY-MM-DD"></label>' +
            '<label>Effort (hrs) <input type="number" class="task-detail-effort" min="0" step="0.5" value="' + (task.effort_required_hours != null && task.effort_required_hours !== '' ? task.effort_required_hours : '') + '" placeholder="hrs"></label>' +
            '<label>Bugs <input type="text" class="task-detail-bugs" value="' + escapeHtml((task.bug_numbers || []).join(', ')) + '" placeholder="—"></label>' +
          '</div>' +
          '<div class="task-detail-category-wrap">' +
            '<span class="task-detail-label">Category</span>' +
            renderCategoryDropdownHtml(task.categories || [], 'task-detail-category-' + task.id) +
          '</div>' +
          '<div class="task-detail-project-wrap">' +
            '<span class="task-detail-label">Project</span>' +
            renderProjectSelectHtml(task.project || '', 'task-detail-project-' + task.id) +
          '</div>' +
          '<button type="button" class="btn-small save-task-details-btn">Save details</button>' +
        '</div>' +
        '<div class="task-update-eta-block task-toggleable-block task-block-collapsed">' +
          '<h4 class="task-update-title">Update ETA</h4>' +
          '<p class="task-update-current">Current ETA: <strong' + (!task.eta ? ' class="default-value"' : '') + '>' + escapeHtml(task.eta || '—') + '</strong></p>' +
          '<div class="task-update-row">' +
            '<input type="date" class="task-update-eta-in" value="' + today + '">' +
            '<button type="button" class="btn-small update-eta-btn">Update ETA</button>' +
          '</div>' +
          (task.eta_updates && task.eta_updates.length ? (function () {
            var updates = task.eta_updates;
            var prev = updates[0].old_eta || '—';
            var parts = [escapeHtml(prev)];
            for (var i = 0; i < updates.length; i++) {
              var newE = updates[i].new_eta || '—';
              var cmp = compareDateStr(i === 0 ? updates[0].old_eta : updates[i - 1].new_eta, updates[i].new_eta);
              var slipClass = cmp < 0 ? ' eta-slip' : (cmp > 0 ? ' eta-pullin' : '');
              parts.push(' → <span class="eta-change-new' + slipClass + '">' + escapeHtml(newE) + '</span>');
            }
            var dates = updates.map(function (u) { return u.date_recorded || ''; }).filter(Boolean).join(', ');
            return '<p class="task-update-count">ETA changed ' + updates.length + ' time(s)</p><p class="task-update-chain task-update-history-eta">' + parts.join('') + (dates ? ' <span class="task-update-date">(' + escapeHtml(dates) + ')</span>' : '') + '</p>';
          })() : '') +
        '</div>' +
        '<div class="task-update-effort-block task-toggleable-block task-block-collapsed">' +
          '<h4 class="task-update-title">Update Effort</h4>' +
          '<p class="task-update-current">Current effort: <strong' + (task.effort_required_hours == null || task.effort_required_hours === '' ? ' class="default-value"' : '') + '>' + (task.effort_required_hours != null && task.effort_required_hours !== '' ? task.effort_required_hours + ' hrs' : '—') + '</strong></p>' +
          '<div class="task-update-row">' +
            '<input type="number" class="task-update-effort-in" min="0" step="0.5" placeholder="New effort (hrs)">' +
            '<button type="button" class="btn-small update-effort-btn">Update Effort</button>' +
          '</div>' +
          (task.effort_updates && task.effort_updates.length ? (function () {
            var updates = task.effort_updates;
            var prevNum = updates[0].old_effort_hours != null ? updates[0].old_effort_hours : '—';
            var prevVal = prevNum === '—' ? '—' : prevNum + ' hrs';
            var parts = [escapeHtml(String(prevVal))];
            for (var i = 0; i < updates.length; i++) {
              var n = updates[i].new_effort_hours != null ? updates[i].new_effort_hours : '—';
              var prevForCmp = i === 0 ? (typeof updates[0].old_effort_hours === 'number' ? updates[0].old_effort_hours : parseFloat(updates[0].old_effort_hours)) : (typeof updates[i - 1].new_effort_hours === 'number' ? updates[i - 1].new_effort_hours : parseFloat(updates[i - 1].new_effort_hours));
              var nNum = typeof n === 'number' ? n : parseFloat(n);
              var cmp = (!isNaN(prevForCmp) && !isNaN(nNum)) ? (nNum > prevForCmp ? 1 : (nNum < prevForCmp ? -1 : 0)) : 0;
              var slipClass = cmp > 0 ? ' effort-increase' : (cmp < 0 ? ' effort-decrease' : '');
              var newVal = n === '—' ? '— hrs' : n + ' hrs';
              parts.push(' → <span class="effort-change-new' + slipClass + '">' + escapeHtml(String(newVal)) + '</span>');
            }
            var dates = updates.map(function (u) { return u.date_recorded || ''; }).filter(Boolean).join(', ');
            return '<p class="task-update-count">Effort changed ' + updates.length + ' time(s)</p><p class="task-update-chain task-update-history-effort">' + parts.join('') + (dates ? ' <span class="task-update-date">(' + escapeHtml(dates) + ')</span>' : '') + '</p>';
          })() : '') +
        '</div>' +
        '<div class="task-update-done-date-block task-toggleable-block task-block-collapsed">' +
          '<h4 class="task-update-title">Date Of Completion</h4>' +
          '<p class="task-update-current">Date Of Completion: <strong' + (!task.done_date ? ' class="default-value"' : '') + '>' + escapeHtml(task.done_date || '—') + '</strong></p>' +
          '<div class="task-update-row">' +
            '<input type="date" class="task-update-done-date-in" value="' + today + '">' +
            '<button type="button" class="btn-small update-done-date-btn">Update Done Date</button>' +
          '</div>' +
        '</div>' +
        renderConcernsBlock(task.concerns || []) +
        '<div class="task-description-block">' +
          '<span class="block-subtitle">Description</span>' +
          '<div class="task-description-wrap">' +
            '<div class="task-description-view">' + (desc || '<em class="no-desc">No description</em>') + '</div>' +
            '<textarea class="task-description-edit hidden auto-resize" rows="3" placeholder="Description…">' + escapeHtml(task.description || '') + '</textarea>' +
            '<button type="button" class="btn-edit-cyan toggle-desc-edit" title="Edit description">✎</button>' +
          '</div>' +
        '</div>' +
        '<div class="task-progress-block">' +
          '<div class="progress-list-wrap">' +
            (task.progress_updates && task.progress_updates.length ? '<ul class="progress-list">' + sortProgressUpdatesOldestFirst(task.progress_updates).map(function (p) {
              var d = p.date_added || '';
              var h = p.effort_consumed_hours != null ? p.effort_consumed_hours + ' hrs' : '';
              var effortVal = p.effort_consumed_hours != null ? p.effort_consumed_hours : '';
              return '<li class="progress-item" data-update-id="' + escapeHtml(p.id) + '" data-date-added="' + escapeHtml(d) + '" data-effort="' + escapeHtml(String(effortVal)) + '" data-progress-text="' + escapeAttr(p.text || '') + '">' +
                '<div class="progress-item-view">' +
                  '<div class="progress-item-head">' +
                    '<span class="progress-meta">' + escapeHtml(d) + (h ? ' · ' + h : '') + '</span>' +
                    '<button type="button" class="btn-edit-cyan btn-edit-progress" title="Edit">✎</button>' +
                  '</div>' +
                  '<div class="progress-text">' + (formatMultilineWithLinks(p.text || '') || '') + '</div>' +
                '</div>' +
                '<div class="progress-item-edit hidden">' +
                  '<textarea class="progress-edit-text auto-resize" rows="2" placeholder="Note"></textarea>' +
                  '<input type="date" class="progress-edit-date">' +
                  '<input type="number" class="progress-edit-effort" placeholder="Hrs" min="0" step="0.5">' +
                  '<button type="button" class="btn-small progress-save-btn">Save</button>' +
                '</div>' +
              '</li>';
            }).join('') + '</ul>' : '') +
          '</div>' +
          '<div class="progress-add">' +
            '<textarea class="progress-text-in auto-resize" rows="2" placeholder="Progress note…"></textarea>' +
            '<input type="date" class="progress-date-in" value="' + today + '">' +
            '<input type="number" class="progress-effort-in" placeholder="Hrs" min="0" step="0.5">' +
            '<button type="button" class="btn-small add-progress-btn">Add progress</button>' +
          '</div>' +
        '</div>' +
        '<div class="task-subtasks-block">' +
          '<div class="subtasks-heading-row">' +
            '<h4 class="subtasks-title">Sub-tasks</h4>' +
            '<div class="filter-dropdown-wrap subtask-filter-wrap" data-task-id="' + escapeHtml(task.id) + '">' +
              '<button type="button" class="filter-dropdown-btn" title="Sort sub-tasks">&#9662; Sort</button>' +
              '<div class="filter-dropdown-menu">' +
                '<button type="button" class="filter-option" data-sort-by="date_added" data-sort-dir="asc">Date added (oldest first)</button>' +
                '<button type="button" class="filter-option" data-sort-by="date_added" data-sort-dir="desc">Date added (newest first)</button>' +
                '<button type="button" class="filter-option" data-sort-by="priority" data-sort-dir="asc">Priority (low to high)</button>' +
                '<button type="button" class="filter-option" data-sort-by="priority" data-sort-dir="desc">Priority (high to low)</button>' +
                '<button type="button" class="filter-option" data-sort-by="assigned_date" data-sort-dir="asc">Assigned date (oldest first)</button>' +
                '<button type="button" class="filter-option" data-sort-by="assigned_date" data-sort-dir="desc">Assigned date (newest first)</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          (task.subtasks && task.subtasks.length ? (function () {
            var sorted = sortSubtasksForTask(task.id, task.subtasks);
            return '<ul class="subtask-list">' + sorted.map(function (s) {
              return renderSubtaskCard(task.id, s, settings);
            }).join('') + '</ul>';
          })() : '') +
          '<div class="new-subtask-toggles">' +
            '<button type="button" class="btn-update-toggle btn-new-subtask">New Sub-Task</button>' +
          '</div>' +
          '<div class="new-subtask-block task-toggleable-block task-block-collapsed">' +
            '<h4 class="task-details-title">New sub-task</h4>' +
            '<div class="new-subtask-form">' +
              '<label>Title <input type="text" class="new-subtask-title-in" placeholder="Sub-task title"></label>' +
              '<label>Description <textarea class="new-subtask-desc-in auto-resize" rows="3" placeholder="Description…"></textarea></label>' +
              '<div class="task-details-grid">' +
                '<label>Priority <input type="number" class="new-subtask-priority-in" min="1" max="10" value="1" placeholder="1–10"></label>' +
                '<label>Difficulty ' + renderDifficultySelectHtml(DEFAULT_TASK_DIFFICULTY, 'new-subtask-difficulty') + '</label>' +
                '<label>Assigned <input type="date" class="new-subtask-assigned-in" value="' + today + '"></label>' +
                '<label>Effort (hrs) <input type="number" class="new-subtask-effort-in" min="0" step="0.5" value="0" placeholder="hrs"></label>' +
              '</div>' +
              '<div class="task-detail-category-wrap">' +
                '<span class="task-detail-label">Category</span>' +
                renderCategoryDropdownHtml([], 'new-subtask-category-' + task.id) +
              '</div>' +
              '<div class="task-detail-project-wrap">' +
                '<span class="task-detail-label">Project</span>' +
                renderProjectSelectHtml('', 'new-subtask-project-' + task.id) +
              '</div>' +
              '<button type="button" class="btn-cyan add-subtask-submit-btn">Add Sub-Task</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="task-card' + (isExpanded ? ' expanded' : '') + '" data-id="' + escapeHtml(task.id) + '">' + barContent + bodyHtml + '</div>';
  }

  function bindTaskCardEvents(card) {
    var taskId = card.dataset.id;
    var taskBar = card.querySelector('.task-bar');
    if (taskBar) {
      taskBar.addEventListener('click', function (e) {
        if (e.target.closest('.task-body')) return;
        state.expandedTasks[taskId] = !state.expandedTasks[taskId];
        renderList();
      });
    }

    card.querySelectorAll('.task-body-actions .status-buttons[data-status-target="task"] .status-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        updateTask(taskId, { status: btn.dataset.status });
      });
    });

    card.querySelectorAll('.task-exclude-summary').forEach(function (inp) {
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
      inp.addEventListener('change', function (e) {
        e.stopPropagation();
        updateTask(taskId, { exclude_from_summary: inp.checked });
      });
    });
    card.querySelectorAll('.task-exclude-export').forEach(function (inp) {
      inp.addEventListener('click', function (e) { e.stopPropagation(); });
      inp.addEventListener('change', function (e) {
        e.stopPropagation();
        updateTask(taskId, { exclude_from_export: inp.checked });
      });
    });

    card.querySelectorAll('.task-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('Delete this task?')) deleteTask(taskId);
      });
    });

    function closeOtherTaskUpdateBlocks(exceptBlock) {
      var detailsBlock = card.querySelector('.task-details-block');
      var etaBlock = card.querySelector('.task-update-eta-block');
      var effortBlock = card.querySelector('.task-update-effort-block');
      var doneDateBlock = card.querySelector('.task-update-done-date-block');
      var concernsBlock = card.querySelector(':scope > .task-body > .task-concerns-block');
      [detailsBlock, etaBlock, effortBlock, doneDateBlock, concernsBlock].forEach(function (b) {
        if (b && b !== exceptBlock) {
          b.classList.add('task-block-collapsed');
          if (b === detailsBlock) { var btn = card.querySelector('.btn-update-details'); if (btn) btn.classList.remove('active'); }
          if (b === etaBlock) { var btn = card.querySelector('.btn-update-eta'); if (btn) btn.classList.remove('active'); }
          if (b === effortBlock) { var btn = card.querySelector('.btn-update-effort'); if (btn) btn.classList.remove('active'); }
          if (b === doneDateBlock) { var btn = card.querySelector('.btn-update-done-date'); if (btn) btn.classList.remove('active'); }
          if (b === concernsBlock) { var btn = card.querySelector('.btn-add-concern-toggle'); if (btn) btn.classList.remove('active'); }
        }
      });
    }
    card.querySelectorAll('.btn-update-details').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.task-details-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
      });
    });
    card.querySelectorAll('.btn-update-eta').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.task-update-eta-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
      });
    });
    card.querySelectorAll('.btn-update-effort').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.task-update-effort-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
      });
    });
    card.querySelectorAll('.btn-update-done-date').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.task-update-done-date-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
      });
    });

    card.querySelectorAll(':scope > .task-body .task-update-toggles .btn-add-concern-toggle').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector(':scope > .task-body > .task-concerns-block');
        if (block) {
          var opening = block.classList.contains('task-block-collapsed');
          if (opening) closeOtherTaskUpdateBlocks(block);
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
        }
      });
    });

    var descView = card.querySelector('.task-description-view');
    var descEdit = card.querySelector('.task-description-edit');
    var toggleDesc = card.querySelector('.toggle-desc-edit');
    if (toggleDesc && descView && descEdit) {
      toggleDesc.addEventListener('click', function (e) {
        e.stopPropagation();
        if (descEdit.classList.contains('hidden')) {
          descEdit.classList.remove('hidden');
          descView.classList.add('hidden');
          toggleDesc.textContent = '✓';
          autoResizeTextarea(descEdit);
        } else {
          updateTask(taskId, { description: descEdit.value });
          descEdit.classList.add('hidden');
          descView.classList.remove('hidden');
          descView.innerHTML = descEdit.value ? formatMultilineWithLinks(descEdit.value) : '<em class="no-desc">No description</em>';
          toggleDesc.textContent = '✎';
        }
      });
    }

    card.querySelectorAll('.save-task-details-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var priorityEl = card.querySelector('.task-detail-priority');
        var tagsEl = card.querySelector('.task-detail-tags');
        var assignedEl = card.querySelector('.task-detail-assigned');
        var etaEl = card.querySelector('.task-detail-eta');
        var effortEl = card.querySelector('.task-detail-effort');
        var bugsEl = card.querySelector('.task-detail-bugs');
        var catWrap = card.querySelector('.task-details-block .category-dropdown-wrap');
        var priority = priorityEl ? Math.min(10, Math.max(1, parseInt(priorityEl.value, 10) || 1)) : undefined;
        var tags = tagsEl ? parseTags(tagsEl.value) : undefined;
        var assigned_date = assignedEl ? (assignedEl.value || undefined) : undefined;
        var eta = etaEl ? (etaEl.value || '') : undefined;
        var effort_required_hours = effortEl ? (parseFloat(effortEl.value) || 0) : undefined;
        var bug_numbers = bugsEl ? parseBugNumbers(bugsEl.value) : undefined;
        var categories = catWrap ? getSelectedCategoriesFromWrap(catWrap) : undefined;
        var projEl = card.querySelector('.task-details-block .task-project-select');
        var project = projEl ? projEl.value.trim() : '';
        var diffEl = card.querySelector('.task-details-block .task-difficulty-select');
        var updates = {};
        if (priority != null) updates.priority = priority;
        if (diffEl) updates.difficulty = diffEl.value;
        if (tags != null) updates.tags = tags;
        if (assigned_date != null) updates.assigned_date = assigned_date;
        if (eta !== undefined) updates.eta = eta;
        if (effort_required_hours != null) updates.effort_required_hours = effort_required_hours;
        if (bug_numbers != null) updates.bug_numbers = bug_numbers;
        if (categories != null) updates.categories = categories;
        updates.project = project;
        updateTask(taskId, updates);
      });
    });

    card.querySelectorAll('.update-eta-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var inEl = card.querySelector('.task-update-eta-in');
        var newEta = inEl ? inEl.value : '';
        recordEtaUpdate(taskId, newEta);
        if (inEl) inEl.value = '';
      });
    });

    card.querySelectorAll('.update-done-date-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var inEl = card.querySelector('.task-update-done-date-in');
        var val = inEl ? inEl.value.trim() : '';
        updateDoneDate(taskId, val);
        if (inEl) inEl.value = '';
      });
    });

    card.querySelectorAll('.update-effort-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var inEl = card.querySelector('.task-update-effort-in');
        var val = inEl ? inEl.value : '';
        if (val === '' || isNaN(parseFloat(val))) return;
        recordEffortUpdate(taskId, val);
        if (inEl) inEl.value = '';
      });
    });

    card.querySelectorAll('.add-progress-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var textIn = card.querySelector('.progress-text-in');
        var dateIn = card.querySelector('.progress-date-in');
        var effortIn = card.querySelector('.progress-effort-in');
        addProgressUpdate(taskId, {
          text: textIn && textIn.value,
          date_added: dateIn && dateIn.value || new Date().toISOString().slice(0, 10),
          effort_consumed_hours: effortIn ? parseFloat(effortIn.value) || 0 : 0
        });
        if (textIn) textIn.value = '';
        if (dateIn) dateIn.value = '';
        if (effortIn) effortIn.value = '';
      });
    });

    card.querySelectorAll('.btn-edit-progress').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.progress-item');
        var view = li.querySelector('.progress-item-view');
        var edit = li.querySelector('.progress-item-edit');
        if (edit.classList.contains('hidden')) {
          var textEl = li.querySelector('.progress-text');
          var editText = li.querySelector('.progress-edit-text');
            var rawText = li.getAttribute('data-progress-text');
            editText.value = rawText !== null ? decodeAttr(rawText) : (textEl ? textEl.textContent : '');
            li.querySelector('.progress-edit-date').value = li.dataset.dateAdded || '';
            li.querySelector('.progress-edit-effort').value = li.dataset.effort || '';
            view.classList.add('hidden');
            edit.classList.remove('hidden');
            autoResizeTextarea(editText);
        }
      });
    });

    card.querySelectorAll('.progress-save-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.progress-item');
        var edit = li.querySelector('.progress-item-edit');
        var view = li.querySelector('.progress-item-view');
        var updateId = li.dataset.updateId;
        updateProgressUpdate(taskId, updateId, {
          text: li.querySelector('.progress-edit-text').value,
          date_added: li.querySelector('.progress-edit-date').value || new Date().toISOString().slice(0, 10),
          effort_consumed_hours: parseFloat(li.querySelector('.progress-edit-effort').value) || 0
        });
        edit.classList.add('hidden');
        view.classList.remove('hidden');
      });
    });

    card.querySelectorAll('.subtask-card').forEach(function (subCard) {
      var subTaskId = subCard.dataset.taskId;
      var subId = subCard.dataset.subtaskId;
      var subKey = subTaskId + '_' + subId;

      var subBar = subCard.querySelector('.subtask-bar');
      if (subBar) {
        subBar.addEventListener('click', function (e) {
          if (e.target.closest('.status-buttons-sub') || e.target.closest('.subtask-delete')) return;
          state.expandedSubtasks[subKey] = !state.expandedSubtasks[subKey];
          renderList();
        });
      }

      subCard.querySelectorAll('.status-buttons-sub .status-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          updateSubtask(subTaskId, subId, { status: btn.dataset.status });
        });
      });

      subCard.querySelectorAll('.subtask-exclude-summary').forEach(function (inp) {
        inp.addEventListener('click', function (e) { e.stopPropagation(); });
        inp.addEventListener('change', function (e) {
          e.stopPropagation();
          updateSubtask(subTaskId, subId, { exclude_from_summary: inp.checked });
        });
      });
      subCard.querySelectorAll('.subtask-exclude-export').forEach(function (inp) {
        inp.addEventListener('click', function (e) { e.stopPropagation(); });
        inp.addEventListener('change', function (e) {
          e.stopPropagation();
          updateSubtask(subTaskId, subId, { exclude_from_export: inp.checked });
        });
      });

      subCard.querySelectorAll('.subtask-delete').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          if (confirm('Delete this sub-task?')) deleteSubtask(subTaskId, subId);
        });
      });

      var toggleSubDesc = subCard.querySelector('.toggle-subtask-desc-edit');
      var subDescView = subCard.querySelector('.subtask-description-block .task-description-view');
      var subDescEdit = subCard.querySelector('.subtask-desc-edit');
      if (toggleSubDesc && subDescView && subDescEdit) {
        toggleSubDesc.addEventListener('click', function (e) {
          e.stopPropagation();
        if (subDescEdit.classList.contains('hidden')) {
          subDescEdit.classList.remove('hidden');
          subDescView.classList.add('hidden');
          toggleSubDesc.textContent = '✓';
          autoResizeTextarea(subDescEdit);
        } else {
            updateSubtask(subTaskId, subId, { description: subDescEdit.value });
            subDescEdit.classList.add('hidden');
            subDescView.classList.remove('hidden');
            subDescView.innerHTML = subDescEdit.value ? formatMultilineWithLinks(subDescEdit.value) : '<em class="no-desc">No description</em>';
            toggleSubDesc.textContent = '✎';
          }
        });
      }

      subCard.querySelectorAll('.btn-subtask-update-details').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var block = subCard.querySelector('.subtask-details-block');
          if (block) {
            block.classList.toggle('task-block-collapsed');
            btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
          }
        });
      });
      subCard.querySelectorAll('.save-subtask-details-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var priorityEl = subCard.querySelector('.subtask-detail-priority');
          var assignedEl = subCard.querySelector('.subtask-detail-assigned');
          var effortEl = subCard.querySelector('.subtask-detail-effort');
          var catWrap = subCard.querySelector('.subtask-details-block .category-dropdown-wrap');
          var priority = priorityEl ? Math.min(10, Math.max(1, parseInt(priorityEl.value, 10) || 1)) : undefined;
          var assigned_date = assignedEl ? (assignedEl.value || undefined) : undefined;
          var effort_required_hours = effortEl != null ? (parseFloat(effortEl.value) || 0) : undefined;
          var categories = catWrap ? getSelectedCategoriesFromWrap(catWrap) : undefined;
          var projEl = subCard.querySelector('.subtask-details-block .task-project-select');
          var project = projEl ? projEl.value.trim() : '';
          var diffEl = subCard.querySelector('.subtask-details-block .task-difficulty-select');
          var updates = {};
          if (priority != null) updates.priority = priority;
          if (diffEl) updates.difficulty = diffEl.value;
          if (assigned_date != null) updates.assigned_date = assigned_date;
          if (effort_required_hours != null) updates.effort_required_hours = effort_required_hours;
          if (categories != null) updates.categories = categories;
          updates.project = project;
          updateSubtask(subTaskId, subId, updates);
        });
      });

      subCard.querySelectorAll('.add-subtask-progress-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var textIn = subCard.querySelector('.subtask-progress-text');
          var dateIn = subCard.querySelector('.subtask-progress-date');
          var effortIn = subCard.querySelector('.subtask-progress-effort');
          addSubtaskProgressUpdate(subTaskId, subId, {
            text: textIn && textIn.value,
            date_added: dateIn && dateIn.value || new Date().toISOString().slice(0, 10),
            effort_consumed_hours: effortIn ? parseFloat(effortIn.value) || 0 : 0
          });
          if (textIn) textIn.value = '';
          if (dateIn) dateIn.value = '';
          if (effortIn) effortIn.value = '';
        });
      });

      subCard.querySelectorAll('.btn-edit-subtask-progress').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.progress-item');
          var view = li.querySelector('.progress-item-view');
          var edit = li.querySelector('.progress-item-edit');
          if (edit.classList.contains('hidden')) {
            var textEl = li.querySelector('.progress-text');
            var editTextEl = li.querySelector('.progress-edit-text');
            var rawText = li.getAttribute('data-progress-text');
            editTextEl.value = rawText !== null ? decodeAttr(rawText) : (textEl ? textEl.textContent : '');
            li.querySelector('.progress-edit-date').value = li.dataset.dateAdded || '';
            li.querySelector('.progress-edit-effort').value = li.dataset.effort || '';
            view.classList.add('hidden');
            edit.classList.remove('hidden');
            autoResizeTextarea(editTextEl);
          }
        });
      });

      subCard.querySelectorAll('.subtask-progress-save').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.progress-item');
          var edit = li.querySelector('.progress-item-edit');
          var view = li.querySelector('.progress-item-view');
          var updateId = li.dataset.updateId;
          updateSubtaskProgressUpdate(subTaskId, subId, updateId, {
            text: li.querySelector('.progress-edit-text').value,
            date_added: li.querySelector('.progress-edit-date').value || new Date().toISOString().slice(0, 10),
            effort_consumed_hours: parseFloat(li.querySelector('.progress-edit-effort').value) || 0
          });
          edit.classList.add('hidden');
          view.classList.remove('hidden');
        });
      });

      subCard.querySelectorAll('.subtask-update-toggles .btn-add-concern-toggle').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var block = subCard.querySelector('.task-concerns-block');
          if (block) {
            block.classList.toggle('task-block-collapsed');
            btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
          }
        });
      });

      subCard.querySelectorAll('.task-concerns-block .log-concern-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var block = btn.closest('.task-concerns-block');
          var descIn = block && block.querySelector('.concern-desc-in');
          var dateIn = block && block.querySelector('.concern-date-in');
          var desc = descIn ? descIn.value.trim() : '';
          if (!desc) return;
          addSubtaskConcern(subTaskId, subId, {
            description: desc,
            logged_date: dateIn ? (dateIn.value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10)
          });
        });
      });

      subCard.querySelectorAll('.task-concerns-block .btn-concern-update-toggle').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.concern-item');
          var form = li && li.querySelector('.concern-update-form');
          if (form) {
            form.classList.toggle('hidden');
            btn.classList.toggle('active', !form.classList.contains('hidden'));
          }
        });
      });

      subCard.querySelectorAll('.task-concerns-block .concern-submit-update-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var li = btn.closest('.concern-item');
          var concernId = li && li.dataset.concernId;
          if (!concernId) return;
          var dateIn = li.querySelector('.concern-addressed-date-in');
          var commentIn = li.querySelector('.concern-update-comment');
          var comment = commentIn ? commentIn.value.trim() : '';
          if (!comment) return;
          addressSubtaskConcern(subTaskId, subId, concernId, {
            addressed_date: dateIn ? (dateIn.value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
            addressed_comment: comment
          });
        });
      });
    });

    card.querySelectorAll(':scope > .task-body > .task-concerns-block .log-concern-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = btn.closest('.task-concerns-block');
        var descIn = block && block.querySelector('.concern-desc-in');
        var dateIn = block && block.querySelector('.concern-date-in');
        var desc = descIn ? descIn.value.trim() : '';
        if (!desc) return;
        addConcern(taskId, {
          description: desc,
          logged_date: dateIn ? (dateIn.value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10)
        });
      });
    });

    card.querySelectorAll(':scope > .task-body > .task-concerns-block .btn-concern-update-toggle').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.concern-item');
        var form = li && li.querySelector('.concern-update-form');
        if (form) {
          form.classList.toggle('hidden');
          btn.classList.toggle('active', !form.classList.contains('hidden'));
        }
      });
    });

    card.querySelectorAll(':scope > .task-body > .task-concerns-block .concern-submit-update-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var li = btn.closest('.concern-item');
        var concernId = li && li.dataset.concernId;
        if (!concernId) return;
        var dateIn = li.querySelector('.concern-addressed-date-in');
        var commentIn = li.querySelector('.concern-update-comment');
        var comment = commentIn ? commentIn.value.trim() : '';
        if (!comment) return;
        addressConcern(taskId, concernId, {
          addressed_date: dateIn ? (dateIn.value || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
          addressed_comment: comment
        });
      });
    });

    card.querySelectorAll('.btn-new-subtask').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var block = card.querySelector('.new-subtask-block');
        if (block) {
          block.classList.toggle('task-block-collapsed');
          btn.classList.toggle('active', !block.classList.contains('task-block-collapsed'));
          if (!block.classList.contains('task-block-collapsed')) {
            var assignedIn = card.querySelector('.new-subtask-assigned-in');
            if (assignedIn && !assignedIn.value) assignedIn.value = new Date().toISOString().slice(0, 10);
          }
        }
      });
    });
    card.querySelectorAll('.add-subtask-submit-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cardEl = btn.closest('.task-card');
        var taskIdEl = cardEl && cardEl.dataset.id;
        var titleIn = cardEl && cardEl.querySelector('.new-subtask-title-in');
        var descIn = cardEl && cardEl.querySelector('.new-subtask-desc-in');
        var priorityIn = cardEl && cardEl.querySelector('.new-subtask-priority-in');
        var assignedIn = cardEl && cardEl.querySelector('.new-subtask-assigned-in');
        var effortIn = cardEl && cardEl.querySelector('.new-subtask-effort-in');
        var title = (titleIn && titleIn.value || '').trim();
        if (!title) return;
        var today = new Date().toISOString().slice(0, 10);
        var priority = priorityIn ? (Math.min(10, Math.max(1, parseInt(priorityIn.value, 10) || 1))) : 1;
        var assigned_date = (assignedIn && assignedIn.value) ? assignedIn.value : today;
        var effort_required_hours = effortIn != null ? (parseFloat(effortIn.value) || 0) : 0;
        var subCatWrap = cardEl.querySelector('.new-subtask-block .category-dropdown-wrap');
        var subCategories = subCatWrap ? getSelectedCategoriesFromWrap(subCatWrap) : [];
        var subProjEl = cardEl.querySelector('.new-subtask-block .task-project-select');
        var subProject = subProjEl && subProjEl.value ? subProjEl.value.trim() : '';
        var subDiffEl = cardEl.querySelector('.new-subtask-block .task-difficulty-select');
        addSubtask(taskIdEl, {
          title: title,
          description: (descIn && descIn.value) ? descIn.value : '',
          priority: priority,
          difficulty: subDiffEl ? subDiffEl.value : DEFAULT_TASK_DIFFICULTY,
          assigned_date: assigned_date,
          effort_required_hours: effort_required_hours,
          categories: subCategories,
          project: subProject
        });
        if (titleIn) titleIn.value = '';
        if (descIn) descIn.value = '';
        if (priorityIn) priorityIn.value = '1';
        if (assignedIn) assignedIn.value = today;
        if (effortIn) effortIn.value = '0';
        if (subDiffEl) subDiffEl.value = DEFAULT_TASK_DIFFICULTY;
      });
    });

    card.querySelectorAll('.subtask-filter-wrap').forEach(function (wrap) {
      var taskId = wrap.dataset.taskId;
      var btn = wrap.querySelector('.filter-dropdown-btn');
      var opts = wrap.querySelectorAll('.filter-option');
      if (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          wrap.classList.toggle('open');
        });
      }
      opts.forEach(function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          state.subtaskSortByTaskId[taskId] = { by: opt.dataset.sortBy, dir: opt.dataset.sortDir };
          renderList();
          wrap.classList.remove('open');
        });
      });
    });

    card.querySelectorAll('.category-dropdown-wrap').forEach(function (w) {
      bindCategoryDropdownInWrap(w);
    });
  }

  function isTaskCompleted(task) {
    var s = task.status || 'Open';
    return s === 'Done' || s === 'Completed' || s === 'Dropped' || s === 'Closed';
  }

  function renderList() {
    var tasks = getTasks();
    var active = tasks.filter(function (t) { return !isTaskCompleted(t); });
    var completed = tasks.filter(function (t) { return isTaskCompleted(t); });
    var sortedActive = sortMainTasks(active);
    var sortedCompleted = sortMainTasks(completed);

    taskListEl.innerHTML = sortedActive.length
      ? sortedActive.map(renderTaskCard).join('')
      : '<p class="empty-state">No tasks yet. Add one above.</p>';
    taskListEl.querySelectorAll('.task-card').forEach(bindTaskCardEvents);

    if (completedTaskListEl) {
      completedTaskListEl.innerHTML = sortedCompleted.length
        ? sortedCompleted.map(renderTaskCard).join('')
        : '<p class="empty-state">No done tasks.</p>';
      completedTaskListEl.querySelectorAll('.task-card').forEach(bindTaskCardEvents);
    }
  }

  function refreshCalendarDayOffList() {
    var ul = $('calendar-dayoff-list');
    if (!ul) return;
    var offs = getSettings().dayOffs || [];
    if (!offs.length) {
      ul.innerHTML = '<li class="muted">No day offs logged.</li>';
      return;
    }
    ul.innerHTML = offs.map(function (o) {
      var typ = (o.type === 'full' || o.type === 'Full') ? 'Full day' : ('Partial · ' + (o.hoursOff != null ? o.hoursOff + 'h off' : ''));
      return '<li class="calendar-dayoff-item"><span class="calendar-dayoff-item-text">' +
        escapeHtml(o.date) + ' · ' + escapeHtml(o.reason || 'Other') + ' · ' + escapeHtml(typ) +
        '</span> <button type="button" class="btn-small calendar-dayoff-remove" data-dayoff-id="' + escapeHtml(o.id) + '">Remove</button></li>';
    }).join('');
  }

  function renderCalendar() {
    refreshCalendarDayOffList();
    var view = state.calendarView || 'month';
    var chartStyle = state.calendarChartStyle || 'basic';
    document.querySelectorAll('.calendar-view-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.calendarView === view);
    });
    document.querySelectorAll('.calendar-chart-style-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.chartStyle === chartStyle);
    });
    var filterRow = document.getElementById('calendar-filter-row');
    if (filterRow) filterRow.style.display = chartStyle === 'gantt' ? 'none' : '';

    var tasks = getTasks();
    var focus = state.calendarFocusDate || new Date().toISOString().slice(0, 10);
    var periodLabelEl = document.getElementById('calendar-period-label');
    var gotoInput = document.getElementById('calendar-goto-date');
    if (gotoInput) gotoInput.value = focus;

    if (chartStyle === 'gantt' && (view === 'week' || view === 'month')) {
      var dates = view === 'week' ? getWeekDates(focus) : getMonthDates(focus);
      var firstDate = dates[0];
      var lastDate = dates[dates.length - 1];
      var tasksWithRange = tasks.filter(function (t) {
        var start = t.assigned_date || (t.created_at && t.created_at.slice(0, 10));
        if (!start) return false;
        var end = t.eta || start;
        if (end < start) end = start;
        return end >= firstDate && start <= lastDate;
      });
      var title = view === 'week' ? getWeekLabel(focus) : getMonthLabel(focus);
      if (periodLabelEl) periodLabelEl.textContent = title;
      var todayYMD = new Date().toISOString().slice(0, 10);
      var headerHtml = dates.map(function (ymd, i) {
        var fmt = formatCalendarDate(ymd);
        var todayClass = ymd === todayYMD ? ' gantt-date-cell-today' : '';
        var weekendClass = isWeekendYMD(ymd) ? ' gantt-date-cell-weekend' : '';
        var off = getDayOffForDate(ymd);
        var offClass = '';
        if (off && (off.type === 'full' || off.type === 'Full')) offClass = ' gantt-date-cell-off-full';
        else if (off && (off.type === 'partial' || off.type === 'Partial')) offClass = ' gantt-date-cell-off-partial';
        var offLine = off
          ? '<span class="gantt-date-off">' + escapeHtml(off.reason || 'Off') + ' · ' + ((off.type === 'full' || off.type === 'Full') ? 'Full' : 'Partial') + '</span>'
          : '';
        return '<div class="gantt-date-cell' + todayClass + weekendClass + offClass + '" style="grid-column: ' + (i + 1) + '; grid-row: 1;" data-date="' + escapeHtml(ymd) + '">' +
          '<span class="gantt-date-name">' + escapeHtml(fmt.dayName) + '</span>' +
          '<span class="gantt-date-full">' + escapeHtml(fmt.dateMonthYear) + '</span>' + offLine + '</div>';
      }).join('');
      var rowHtml = '';
      tasksWithRange.forEach(function (t, idx) {
        var startYMD = t.assigned_date || (t.created_at && t.created_at.slice(0, 10)) || firstDate;
        var endYMD = t.eta || startYMD;
        if (endYMD < startYMD) endYMD = startYMD;
        var startIdx = dates.indexOf(startYMD);
        var endIdx = dates.indexOf(endYMD);
        if (startIdx === -1 && startYMD < firstDate) startIdx = 0;
        if (startIdx === -1) startIdx = 0;
        if (endIdx === -1 && endYMD > lastDate) endIdx = dates.length - 1;
        if (endIdx === -1) endIdx = dates.length - 1;
        if (startIdx > dates.length - 1) startIdx = dates.length - 1;
        if (endIdx < 0) endIdx = 0;
        if (startIdx > endIdx) { var tmp = startIdx; startIdx = endIdx; endIdx = tmp; }
        var colStart = startIdx + 1;
        var colEnd = endIdx + 2;
        var statusClass = (t.status || '').toLowerCase().replace(/\s/g, '-');
        var barRow = idx * 2 + 2;
        var dropRow = idx * 2 + 3;
        var effortReq = t.effort_required_hours != null && t.effort_required_hours !== '' ? t.effort_required_hours : 0;
        var effortSpent = taskEffortSpent(t);
        var subtasks = t.subtasks || [];
        var subtaskListHtml = subtasks.length
          ? '<ul class="gantt-dropdown-subtask-list">' + subtasks.map(function (s) {
              var sStatus = (s.status || 'Open').toLowerCase().replace(/\s/g, '-');
              return '<li class="gantt-dropdown-subtask-item"><span class="task-status-pill ' + sStatus + '">' + escapeHtml(s.status || 'Open') + '</span> ' + escapeHtml(s.title || '') + '</li>';
            }).join('') + '</ul>'
          : '<p class="gantt-dropdown-no-subtasks">No subtasks</p>';
        var dropContent = '<div class="gantt-task-dropdown-inner">' +
          '<div class="gantt-dropdown-summary">' +
          '<span class="gantt-dropdown-label">Status</span><span class="task-status-pill ' + statusClass + '">' + escapeHtml((t.status === 'Completed' ? 'Done' : t.status) || 'Open') + '</span>' +
          '<span class="gantt-dropdown-label">Difficulty</span><span class="gantt-dropdown-value">' + escapeHtml(normalizeTaskDifficulty(t.difficulty)) + '</span>' +
          '<span class="gantt-dropdown-label">Effort</span><span class="gantt-dropdown-value">' + effortReq + ' hrs</span>' +
          '<span class="gantt-dropdown-label">Spent</span><span class="gantt-dropdown-value">' + effortSpent + ' hrs</span>' +
          '</div>' +
          '<div class="gantt-dropdown-subtasks"><span class="gantt-dropdown-subtitle">Subtasks</span>' + subtaskListHtml + '</div>' +
          '</div>';
        rowHtml += '<div class="gantt-task-bar ' + statusClass + ' gantt-task-bar-toggle" style="grid-column: ' + colStart + ' / ' + colEnd + '; grid-row: ' + barRow + ';" title="' + escapeAttr(t.title || '') + '" data-task-id="' + escapeAttr(t.id) + '">' +
          '<span class="gantt-task-bar-chevron" aria-hidden="true"></span><span class="gantt-task-bar-title">' + escapeHtml(t.title || '') + '</span></div>';
        rowHtml += '<div class="gantt-task-dropdown" style="grid-column: 1 / -1; grid-row: ' + dropRow + ';" data-task-id="' + escapeAttr(t.id) + '">' + dropContent + '</div>';
      });
      var n = dates.length;
      var taskRowCount = tasksWithRange.length;
      var isWeekGantt = view === 'week';
      // Use auto-sized rows so the Gantt grid height grows with content
      // and lets the calendar container provide vertical scrolling.
      var rowDef = taskRowCount > 0
        ? 'auto repeat(' + taskRowCount + ', 2.5em minmax(0, auto)) auto'
        : 'auto auto';
      var colWidthPx = 121;
      var weekendOverlay = buildGanttDayColumnOverlay(dates, isWeekGantt, colWidthPx);
      var stripeGrad = 'repeating-linear-gradient(to right, transparent 0, transparent calc(var(--gantt-col-width) - 2px), rgba(255, 255, 255, 0.06) calc(var(--gantt-col-width) - 1px), transparent var(--gantt-col-width))';
      var gridStyle = isWeekGantt
        ? 'grid-template-columns: repeat(' + n + ', 1fr); grid-template-rows: ' + rowDef + '; --gantt-col-width: calc(100% / ' + n + '); background-image: ' + weekendOverlay + ', ' + stripeGrad + ';'
        : 'grid-template-columns: repeat(' + n + ', ' + colWidthPx + 'px); grid-template-rows: ' + rowDef + '; --gantt-col-width: ' + colWidthPx + 'px; min-width: ' + (n * colWidthPx) + 'px; background-image: ' + weekendOverlay + ', ' + stripeGrad + ';';
      var ganttGridClass = isWeekGantt ? 'gantt-grid gantt-grid-week' : 'gantt-grid gantt-grid-month';
      var fillerRow = taskRowCount * 2 + 2;
      var fillerHtml = '<div class="gantt-grid-filler" style="grid-column: 1 / -1; grid-row: ' + fillerRow + ';"></div>';
      var html = '<h3 class="calendar-title">' + escapeHtml(title) + '</h3>' +
        '<div class="' + ganttGridClass + '" style="' + gridStyle + '">' +
        headerHtml +
        rowHtml +
        fillerHtml +
        '</div>';
      if (tasksWithRange.length === 0) {
        html += '<p class="empty-state">No tasks in this period.</p>';
      }
      calendarContainer.innerHTML = html;
      return;
    }

    var key = state.calendarFilter === 'eta' ? 'eta' : 'assigned_date';
    var byDate = {};
    tasks.forEach(function (t) {
      var d = key === 'eta' ? (t.eta || t.assigned_date) : t.assigned_date;
      if (!d) return;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(t);
    });

    var todayYMD = new Date().toISOString().slice(0, 10);
    function renderDayCard(ymd) {
      var fmt = formatCalendarDate(ymd);
      var tasksOnDay = byDate[ymd] || [];
      var listHtml = tasksOnDay.length
        ? '<ul class="calendar-day-tasks">' + tasksOnDay.map(function (t) {
          return '<li><span class="task-status-pill ' + (t.status || '').toLowerCase() + '">' + escapeHtml(t.status) + '</span> ' + escapeHtml(t.title || '') + '</li>';
        }).join('') + '</ul>'
        : '<p class="calendar-day-empty">No tasks</p>';
      var todayClass = ymd === todayYMD ? ' calendar-day-today' : '';
      var weekendClass = isWeekendYMD(ymd) ? ' calendar-day-weekend' : '';
      var off = getDayOffForDate(ymd);
      var offClass = '';
      var offBadge = '';
      if (off) {
        if (off.type === 'full' || off.type === 'Full') offClass = ' calendar-day-off-full';
        else offClass = ' calendar-day-off-partial';
        offBadge = '<div class="calendar-day-off-badge">' + escapeHtml(off.reason || 'Off') + ' · ' +
          ((off.type === 'full' || off.type === 'Full') ? 'Full day' : ('Partial' + (off.hoursOff != null ? ' (' + off.hoursOff + 'h off)' : ''))) +
          '</div>';
      }
      return '<div class="calendar-day' + todayClass + weekendClass + offClass + '" data-date="' + escapeHtml(ymd) + '">' +
        '<div class="calendar-day-name">' + escapeHtml(fmt.dayName) + '</div>' +
        '<div class="calendar-day-date">' + escapeHtml(fmt.dateMonthYear) + '</div>' +
        offBadge +
        listHtml +
        '</div>';
    }

    var html = '';
    if (view === 'day') {
      if (periodLabelEl) periodLabelEl.textContent = formatCalendarDate(focus).dateMonthYear + ' (' + formatCalendarDate(focus).dayName + ')';
      html = '<div class="calendar-days calendar-view-day">' + renderDayCard(focus) + '</div>';
    } else if (view === 'week') {
      var weekDates = getWeekDates(focus);
      if (periodLabelEl) periodLabelEl.textContent = getWeekLabel(focus);
      html = '<h3 class="calendar-title">' + escapeHtml(getWeekLabel(focus)) + '</h3>' +
        '<div class="calendar-days calendar-view-week">';
      weekDates.forEach(function (ymd) {
        html += renderDayCard(ymd);
      });
      html += '</div>';
    } else {
      var monthDates = getMonthDates(focus);
      var firstDay = parseYMD(monthDates[0]);
      var startPad = firstDay ? (firstDay.getDay() + 6) % 7 : 0;
      if (periodLabelEl) periodLabelEl.textContent = getMonthLabel(focus);
      html = '<h3 class="calendar-title">' + escapeHtml(getMonthLabel(focus)) + '</h3>' +
        '<div class="calendar-days calendar-view-month">';
      for (var p = 0; p < startPad; p++) {
        html += '<div class="calendar-day calendar-day-empty-slot"></div>';
      }
      monthDates.forEach(function (ymd) {
        html += renderDayCard(ymd);
      });
      html += '</div>';
    }
    calendarContainer.innerHTML = html;
  }

  function renderSummary() {
    summaryOutput.innerHTML = '<p class="muted">Pick a date range and click "Generate Summary".</p>';
    if (exportSummaryBtn) exportSummaryBtn.disabled = !state.summaryGenerated;
  }

  /** Tasks / sub-tasks omitted from summary export (HTML file); excludes export flags and summary-only exclusions. */
  function tasksForExportWorkTable(taskList, from) {
    return (taskList || []).map(function (t) {
      if (isTruthyFlag(t.exclude_from_export)) return null;
      var subs = (t.subtasks || []).filter(function (s) {
        if (isTruthyFlag(s.exclude_from_summary) || isTruthyFlag(s.exclude_from_export)) return false;
        return includeSubtaskInSummaryByDate(s, from);
      });
      return Object.assign({}, t, { subtasks: subs });
    }).filter(Boolean);
  }

  function buildSummaryExportHtml(meta) {
    var from = meta.from;
    var to = meta.to;
    var activeTasks = meta.activeTasks || [];
    var idleTasks = meta.idleTasks || [];
    var exportActiveTasks = tasksForExportWorkTable(activeTasks, from);
    var exportIdleTasks = tasksForExportWorkTable(idleTasks, from);
    var exportSettings = getSettings();
    var exportHpd = parseFloat(exportSettings.workingHoursPerDay);
    if (isNaN(exportHpd) || exportHpd <= 0) exportHpd = 8;

    function inRange(dateStr) {
      return dateStr && dateStr >= from && dateStr <= to;
    }
    function statusClass(s) {
      var v = (s || 'Open').toLowerCase();
      if (v === 'done' || v === 'completed') return 'done';
      if (v === 'ongoing') return 'ongoing';
      if (v === 'open') return 'open';
      return 'other';
    }
    function statusBadge(s) {
      var label = s || 'Open';
      return '<span class="status-btn ' + statusClass(label) + '">' + escapeHtml(label) + '</span>';
    }
    function formatDateDMY(ymd) {
      if (!ymd || typeof ymd !== 'string') return '—';
      var m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return escapeHtml(ymd);
      return escapeHtml(m[3] + '-' + m[2] + '-' + m[1]);
    }
    function buildEtaCurrentHtml(taskLike) {
      var segs = [];
      function pushY(y) {
        if (!y || typeof y !== 'string') return;
        if (segs.indexOf(y) === -1) segs.push(y);
      }
      var planned = (taskLike.eta_updates && taskLike.eta_updates.length && taskLike.eta_updates[0].old_eta) || taskLike.assigned_date || taskLike.eta || '';
      if (planned) pushY(planned);
      (taskLike.eta_updates || []).slice().sort(function (a, b) {
        return (a.date_recorded || '').localeCompare(b.date_recorded || '');
      }).forEach(function (u) {
        if (u.old_eta) pushY(u.old_eta);
        if (u.new_eta) pushY(u.new_eta);
      });
      if (taskLike.eta) pushY(taskLike.eta);
      if (!segs.length) return '—';
      var out = '<span class="export-eta-stack-line">' + formatDateDMY(segs[0]) + '</span>';
      for (var ei = 1; ei < segs.length; ei++) {
        var cmp = compareDateStr(segs[ei - 1], segs[ei]);
        var ecls = cmp < 0 ? 'export-eta-slip' : (cmp > 0 ? 'export-eta-pullin' : 'export-eta-neutral');
        out += '<br><span class="export-eta-stack-line ' + ecls + '">-&gt; ' + formatDateDMY(segs[ei]) + '</span>';
      }
      return '<span class="export-eta-stack">' + out + '</span>';
    }
    function formatEffortExportNum(n) {
      var x = Number(n);
      if (isNaN(x)) return '0';
      if (Math.abs(x - Math.round(x)) < 0.001) return String(Math.round(x));
      var t = Math.round(x * 10) / 10;
      return String(t).replace(/\.0$/, '');
    }
    function buildPlannedEffortHtml(taskLike) {
      var updates = (taskLike.effort_updates || []).slice().sort(function (a, b) {
        return (a.date_recorded || '').localeCompare(b.date_recorded || '');
      });
      var segs = [];
      function pushN(n) {
        if (n == null || n === '') return;
        var num = typeof n === 'number' ? n : parseFloat(n);
        if (isNaN(num)) return;
        if (segs.length && Math.abs(segs[segs.length - 1] - num) < 0.0001) return;
        segs.push(num);
      }
      if (updates.length) {
        pushN(updates[0].old_effort_hours);
        updates.forEach(function (u) {
          pushN(u.new_effort_hours);
        });
      } else {
        var req = taskLike.effort_required_hours;
        if (req != null && req !== '') pushN(req);
      }
      if (!segs.length) return '—';
      var html = '<span class="export-effort-stack-line">' + escapeHtml(formatEffortExportNum(segs[0])) + '</span>';
      for (var hi = 1; hi < segs.length; hi++) {
        var prevH = segs[hi - 1];
        var curH = segs[hi];
        var hcmp = curH > prevH ? 1 : (curH < prevH ? -1 : 0);
        var hcls = hcmp > 0 ? 'export-effort-increase' : (hcmp < 0 ? 'export-effort-decrease' : 'export-effort-same');
        html += '<br><span class="export-effort-stack-line ' + hcls + '">-&gt; ' + escapeHtml(formatEffortExportNum(segs[hi])) + '</span>';
      }
      return '<span class="export-effort-stack">' + html + '</span>';
    }
    function progressSummaryHtml(updates) {
      if (!updates || !updates.length) return '<span class="muted">No progress made.</span>';
      var ordered = sortProgressUpdatesOldestFirst(updates);
      var lines = ordered.map(function (p, i) {
        var text = (p.text || '').replace(/\s+/g, ' ').trim();
        return escapeHtml(String(i + 1) + '. ') + linkifyPlainText(text);
      });
      return lines.join('<br>');
    }
    function taskDetailsHtml(desc) {
      if (!desc || !String(desc).trim()) return '—';
      return linkifyPlainText(String(desc).trim()).replace(/\r\n|\n|\r/g, '<br>');
    }
    function exportProgressConcernsHtml(concerns) {
      var out = [];
      (concerns || []).forEach(function (c) {
        var st = c.status || 'Open';
        var cls = st === 'Addressed' ? 'concern-addressed' : 'concern-open';
        out.push('<div class="' + cls + '">' + linkifyPlainText(c.description || '') + (c.addressed_comment ? ' (' + linkifyPlainText(c.addressed_comment) + ')' : '') + '</div>');
      });
      return out.length ? out.join('') : '<span class="muted">None</span>';
    }
    function progressCellHtml(updates, concerns) {
      return '<div class="export-progress-wrap">' +
        '<div class="export-p-label">Progress:</div><div class="export-p-body">' + progressSummaryHtml(updates) + '</div>' +
        '<div class="export-p-label export-p-label-gap">Concerns:</div><div class="export-c-body">' + exportProgressConcernsHtml(concerns) + '</div></div>';
    }
    function formatExportDays(d) {
      if (d == null || isNaN(d) || d < 0.001) return '0';
      var rounded = Math.round(d);
      if (Math.abs(d - rounded) < 0.08) {
        return rounded === 1 ? '1 Days' : (rounded + ' Days');
      }
      return '~' + d.toFixed(1).replace(/\.0$/, '') + ' Days';
    }
    var projectHours = {};
    function addProjHours(proj, hrs) {
      var h = Number(hrs) || 0;
      if (h < 0.001) return;
      var k = (proj != null && String(proj).trim()) ? String(proj).trim() : 'Miscellaneous';
      projectHours[k] = (projectHours[k] || 0) + h;
    }
    exportActiveTasks.forEach(function (t) {
      addProjHours(t.project, taskEffortInRangeMainAttributed(t, from, to));
      (t.subtasks || []).forEach(function (s) {
        if (!subtaskHasDedicatedEffort(s)) return;
        var su = (s.progress_updates || []).filter(function (p) { return inRange(p.date_added); });
        var sh = su.reduce(function (sum, p) { return sum + (Number(p.effort_consumed_hours) || 0); }, 0);
        addProjHours(s.project, sh);
      });
    });

    function oooEntryDayEquivalent(off) {
      if (!off) return 0;
      var typ = (off.type || '').toLowerCase();
      if (typ === 'full') return 1;
      var hOff = parseFloat(off.hoursOff);
      if (isNaN(hOff)) hOff = 0;
      hOff = Math.min(Math.max(0, hOff), exportHpd);
      return hOff / exportHpd;
    }

    var ptoAgg = 0;
    var sickAgg = 0;
    var otherAgg = 0;
    (exportSettings.dayOffs || []).forEach(function (off) {
      if (!off || !off.date || off.date < from || off.date > to) return;
      var eq = oooEntryDayEquivalent(off);
      var reason = off.reason || 'Other';
      if (reason === 'PTO') ptoAgg += eq;
      else if (reason === 'Sick') sickAgg += eq;
      else otherAgg += eq;
    });
    var oooDaysTotal = ptoAgg + sickAgg + otherAgg;

    var miscHours = projectHours.Miscellaneous || 0;
    var projKeys = Object.keys(projectHours).filter(function (k) { return k !== 'Miscellaneous'; }).sort(function (a, b) { return a.localeCompare(b); });
    var bwRowsHtml = projKeys.map(function (k) {
      var d = projectHours[k] / exportHpd;
      return '<tr><td>' + escapeHtml(k) + '</td><td class="export-td-num">' + formatExportDays(d) + '</td></tr>';
    }).join('');
    bwRowsHtml += '<tr><td>Miscellaneous</td><td class="export-td-num">' + formatExportDays(miscHours / exportHpd) + '</td></tr>';
    bwRowsHtml += '<tr><td>OOO</td><td class="export-td-num">' + formatExportDays(oooDaysTotal) + '</td></tr>';

    var bandwidthBlock =
      '<table class="export-bw-table">' +
      '<thead><tr><th colspan="2" class="export-bw-head">Bandwidth</th></tr></thead><tbody>' +
      bwRowsHtml +
      '</tbody></table>';

    function subNewEffortInRange(s) {
      return (s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }).reduce(function (sum, p) {
        return sum + progressEffortHours(p);
      }, 0);
    }

    function appendWorkSummaryExportRows(rows, tasks, omitNewEffort) {
      tasks.forEach(function (t) {
        var subsAll = t.subtasks || [];
        var subs = subsAll.filter(function (s) { return includeSubtaskInSummaryByDate(s, from); });
        var includedSubs = subs.filter(function (s) { return !subtaskHasDedicatedEffort(s); });
        var dedicatedSubs = subs.filter(function (s) { return subtaskHasDedicatedEffort(s); });

        var mainProgress = sortProgressUpdatesOldestFirst((t.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
        var mainRangeEffort = taskEffortInRangeMainAttributed(t, from, to);
        var cumulativeOutsideRange = taskEffortOutsideRangeMainAttributed(t, from, to);
        var spentMainAttrTotal = taskEffortSpentMainAttributed(t);
        var latestPlannedMain = getLatestPlannedEffortHours(t);
        var remainingMainOnly = latestPlannedMain - spentMainAttrTotal;
        var plannedEtaRaw = (t.eta_updates && t.eta_updates.length && t.eta_updates[0].old_eta) || t.assigned_date || t.eta || '';
        var plannedEtaCell = plannedEtaRaw ? formatDateDMY(plannedEtaRaw) : '—';

        var anySubNew = subsAll.some(function (s) { return subNewEffortInRange(s) > 0.001; });
        var highlightMain = !omitNewEffort && (mainRangeEffort > 0.001 || anySubNew);
        var mainRowClass = 'export-row-main' + (highlightMain ? ' export-row-highlight' : '');
        var numRows = subs.length ? subs.length + 1 : 1;
        var projectLabel = escapeHtml(t.project || 'Miscellaneous');

        var mergeBlockRows = includedSubs.length > 0 ? 1 + includedSubs.length : 1;
        var mergeAttr = mergeBlockRows > 1 ? ' rowspan="' + mergeBlockRows + '"' : '';
        var mergeNum = 'export-td-num export-td-merge';

        var plannedTd = '<td' + mergeAttr + ' class="' + mergeNum + ' export-td-eff-planned">' + buildPlannedEffortHtml(t) + '</td>';
        var cumTd = '<td' + mergeAttr + ' class="' + mergeNum + ' export-td-eff-cumulative">' + cumulativeOutsideRange + '</td>';
        var newMainTd = '<td class="export-td-num export-td-eff-new">' + mainRangeEffort + '</td>';
        var remTd = '<td' + mergeAttr + ' class="' + mergeNum + ' export-td-eff-remaining' + (remainingMainOnly < 0 ? ' negative' : '') + '">' + remainingMainOnly + '</td>';
        var mainEffortCells = plannedTd + cumTd + (omitNewEffort ? '' : newMainTd) + remTd;

        rows.push(
          '<tr class="' + mainRowClass + '">' +
            '<td rowspan="' + numRows + '" class="export-td-project">' + projectLabel + '</td>' +
            '<td class="export-td-task"><div class="export-task-main">' + escapeHtml(t.title || '(no title)') + '</div></td>' +
            mainEffortCells +
            '<td class="export-td-eta export-td-eta-planned">' + plannedEtaCell + '</td>' +
            '<td class="export-td-eta export-td-eta-current">' + buildEtaCurrentHtml(t) + '</td>' +
            '<td class="export-td-status">' + statusBadge(t.status || 'Open') + '</td>' +
            '<td class="export-td-progress">' + progressCellHtml(mainProgress, t.concerns || []) + '</td>' +
            '<td class="export-td-details">' + taskDetailsHtml(t.description) + '</td>' +
          '</tr>'
        );

        includedSubs.forEach(function (s) {
          var subUpdates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
          var subEffort = subUpdates.reduce(function (sum, p) { return sum + progressEffortHours(p); }, 0);
          var plannedRawS = s.assigned_date || s.eta || '';
          var plannedCellS = plannedRawS ? formatDateDMY(plannedRawS) : '—';
          var highlightSub = !omitNewEffort && subEffort > 0.001;
          var subRowClass = 'export-row-sub export-row-included' + (highlightSub ? ' export-row-highlight' : '');
          var newSubTd = omitNewEffort ? '' : ('<td class="export-td-num export-td-eff-new">' + subEffort + '</td>');
          rows.push(
            '<tr class="' + subRowClass + '">' +
              '<td class="export-td-task"><div class="export-sub-task-row">' +
              escapeHtml(s.title || '(no title)') +
              summaryIncludedPillHtml('export-included-pill') +
              '</div></td>' +
              newSubTd +
              '<td class="export-td-eta export-td-eta-planned">' + plannedCellS + '</td>' +
              '<td class="export-td-eta export-td-eta-current">' + buildEtaCurrentHtml(s) + '</td>' +
              '<td class="export-td-status">' + statusBadge(s.status || 'Open') + '</td>' +
              '<td class="export-td-progress">' + progressCellHtml(subUpdates, s.concerns || []) + '</td>' +
              '<td class="export-td-details">' + taskDetailsHtml(s.description) + '</td>' +
            '</tr>'
          );
        });

        dedicatedSubs.forEach(function (s) {
          var subUpdates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
          var subEffort = subUpdates.reduce(function (sum, p) { return sum + progressEffortHours(p); }, 0);
          var reqS = getLatestPlannedEffortHours(s);
          var spentS = subtaskEffortSpent(s);
          var cumulativeOutsideSub = subtaskEffortOutsideRange(s, from, to);
          var remS = reqS - spentS;
          var plannedRawS = s.assigned_date || s.eta || '';
          var plannedCellS = plannedRawS ? formatDateDMY(plannedRawS) : '—';
          var highlightSub = !omitNewEffort && subEffort > 0.001;
          var subRowClass = 'export-row-sub' + (highlightSub ? ' export-row-highlight' : '');
          var dedicatedNewTd = omitNewEffort ? '' : ('<td class="export-td-num export-td-eff-new">' + subEffort + '</td>');
          rows.push(
            '<tr class="' + subRowClass + '">' +
              '<td class="export-td-task"><div class="export-sub-task-row">' +
              escapeHtml(s.title || '(no title)') +
              '</div></td>' +
              '<td class="export-td-num export-td-eff-planned">' + buildPlannedEffortHtml(s) + '</td>' +
              '<td class="export-td-num export-td-eff-cumulative">' + cumulativeOutsideSub + '</td>' +
              dedicatedNewTd +
              '<td class="export-td-num export-td-eff-remaining' + (remS < 0 ? ' negative' : '') + '">' + remS + '</td>' +
              '<td class="export-td-eta export-td-eta-planned">' + plannedCellS + '</td>' +
              '<td class="export-td-eta export-td-eta-current">' + buildEtaCurrentHtml(s) + '</td>' +
              '<td class="export-td-status">' + statusBadge(s.status || 'Open') + '</td>' +
              '<td class="export-td-progress">' + progressCellHtml(subUpdates, s.concerns || []) + '</td>' +
              '<td class="export-td-details">' + taskDetailsHtml(s.description) + '</td>' +
            '</tr>'
          );
        });
      });
    }

    var gridRows = [];
    appendWorkSummaryExportRows(gridRows, exportActiveTasks, false);
    var idleGridRows = [];
    appendWorkSummaryExportRows(idleGridRows, exportIdleTasks, true);

    var exportCss =
      'body{font-family:Calibri,Arial,sans-serif;color:#111827;background:#fff;padding:20px;line-height:1.4;font-size:13px}' +
      '.export-ws-title{font-size:18px;font-weight:700;margin:0 0 16px;color:#111827}' +
      '.export-ws-subtitle{font-size:15px;font-weight:700;margin:28px 0 10px;color:#111827}' +
      '.export-bw-table{border-collapse:collapse;margin:0 0 22px;width:auto;min-width:320px}' +
      '.export-bw-table th.export-bw-head,.export-bw-table td{border:1px solid #6b7280;padding:8px 14px;text-align:left}' +
      '.export-bw-table th.export-bw-head{background:#bfbfbf;font-weight:700;text-align:center}' +
      '.export-bw-table tbody td:first-child{font-weight:600}' +
      'body{overflow-x:visible}' +
      '.export-work-table{table-layout:auto;width:auto;min-width:1680px;border-collapse:collapse;margin:8px 0 20px;font-size:12px}' +
      '.export-work-table col.export-col-task{min-width:16em;max-width:26em;width:26em}' +
      '.export-work-table col.export-col-progress{width:580px;min-width:540px}' +
      '.export-work-table col.export-col-details{width:520px;min-width:500px}' +
      '.export-work-table col.export-col-effort{min-width:7.75em;width:7.75em;max-width:7.75em}' +
      '.export-work-table thead th{background:#bfbfbf;border:1px solid #6b7280;padding:8px 6px;font-weight:700;text-align:center;vertical-align:middle}' +
      '.export-work-table thead th.export-th-shrink{white-space:nowrap;width:1%}' +
      '.export-work-table thead th.export-th-effort{white-space:normal;text-align:center;line-height:1.25;font-size:11px;vertical-align:middle;min-width:7.75em;max-width:7.75em;width:7.75em;word-wrap:break-word;overflow-wrap:break-word}' +
      '.export-work-table thead th.export-th-eta-planned,.export-work-table thead th.export-th-eta-current{white-space:normal;width:1%;max-width:12em;line-height:1.3}' +
      '.export-work-table tbody td{border:1px solid #6b7280;padding:8px 6px;vertical-align:top}' +
      '.export-td-project{font-weight:600;text-align:center;vertical-align:middle;background:#f9fafb;white-space:nowrap;width:1%}' +
      '.export-td-task{text-align:left;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word}' +
      '.export-td-num{text-align:center;white-space:nowrap}' +
      '.export-work-table td.export-td-eff-planned,.export-work-table td.export-td-eff-cumulative,.export-work-table td.export-td-eff-new,.export-work-table td.export-td-eff-remaining{min-width:7.75em;max-width:7.75em;width:7.75em}' +
      '.export-work-table td.export-td-eff-planned{white-space:normal;vertical-align:top}' +
      '.export-work-table tbody td.export-td-merge{vertical-align:middle;text-align:center}' +
      '.export-work-table td.export-td-merge.export-td-eff-planned{vertical-align:top}' +
      '.export-td-status{text-align:center;white-space:nowrap;width:1%}' +
      '.export-work-table col.export-col-eta-planned,.export-work-table col.export-col-eta-current{width:10.5em;max-width:12em;min-width:9em}' +
      '.export-td-eta-planned{text-align:center;font-size:11px;white-space:normal;vertical-align:top;line-height:1.45}' +
      '.export-td-eta-current{text-align:center;font-size:11px;white-space:normal;vertical-align:top;line-height:1.45}' +
      '.export-eta-stack{display:block;text-align:center}' +
      '.export-eta-stack-line{display:block;line-height:1.45}' +
      '.export-effort-stack{display:block;text-align:center}' +
      '.export-effort-stack-line{display:block;line-height:1.45}' +
      '.export-td-details,.export-td-progress{font-size:11px;line-height:1.45;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;white-space:normal}' +
      '.export-work-table thead th.export-th-progress{text-align:left}' +
      '.export-td-progress{text-align:left;min-width:540px}' +
      '.export-td-progress .export-progress-wrap,.export-td-progress .export-p-label,.export-td-progress .export-p-body,.export-td-progress .export-c-body{text-align:left}' +
      '.export-td-progress .concern-open,.export-td-progress .concern-addressed{text-align:left}' +
      '.export-work-table.export-work-table-idle{min-width:1600px}' +
      '.export-work-table.export-work-table-idle col.export-col-progress{width:290px;min-width:270px}' +
      '.export-work-table.export-work-table-idle .export-td-progress{min-width:270px}' +
      '.export-td-details{min-width:500px}' +
      '.export-task-main{font-weight:700}.export-sub-task-row{display:block;font-weight:600;color:#374151;padding:2px 0 2px 14px;margin-left:10px;border-left:3px solid #cbd5e1}' +
      'tr.export-row-sub .export-td-task{padding-left:18px}' +
      'tr.export-row-sub .export-td-details{padding-left:18px}' +
      '.export-progress-wrap{}.export-p-label{font-weight:700;margin-top:2px}.export-p-label-gap{margin-top:10px}' +
      '.export-p-body,.export-c-body{margin:4px 0 0}' +
      'tr.export-row-highlight{background:#d4edda}tr.export-row-highlight td{background:transparent}' +
      'tr.export-row-main td{background:#fafafa}tr.export-row-sub td{background:#fff}' +
      'tr.export-row-highlight.export-row-main td,tr.export-row-highlight.export-row-sub td{background:transparent}' +
      '.export-project-pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;margin-left:6px;vertical-align:middle}' +
      '.export-included-pill{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:700;border:1px solid #f9a8d4;background:#fce7f3;color:#be185d;margin-left:6px;vertical-align:middle}' +
      '.status-btn{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid}' +
      '.status-btn.done{background:#eaf7ee;border-color:#a7d7b4;color:#1f6f3a}.status-btn.ongoing{background:#fff7e6;border-color:#f3d48a;color:#8a6000}' +
      '.status-btn.open{background:#eaf2ff;border-color:#a9c4ff;color:#1f4ea8}.status-btn.other{background:#f3f4f6;border-color:#d1d5db;color:#4b5563}' +
      '.negative{color:#b91c1c;font-weight:700}.muted{color:#6b7280}' +
      '.concern-open{background:#fff1f2;border-left:3px solid #ef4444;padding:3px 6px;margin:3px 0}' +
      '.concern-addressed{background:#ecfdf5;border-left:3px solid #10b981;padding:3px 6px;margin:3px 0}' +
      'a.auto-link{color:#2563eb;text-decoration:underline;word-break:break-all}' +
      '.export-eta-slip{color:#b91c1c;font-weight:700}' +
      '.export-eta-pullin{color:#15803d;font-weight:700}' +
      '.export-eta-neutral{color:#4b5563}' +
      '.export-effort-increase{color:#b91c1c;font-weight:700}' +
      '.export-effort-decrease{color:#15803d;font-weight:700}' +
      '.export-effort-same{color:#4b5563}';

    var titleRange = formatDateDMY(from) + ' to ' + formatDateDMY(to);

    var idleTableBlock = '';
    if (exportIdleTasks.length) {
      idleTableBlock =
        '<p class="export-ws-subtitle">Tasks with No Progress</p>' +
        '<table class="export-work-table export-work-table-idle">' +
        '<colgroup>' +
        '<col>' +
        '<col class="export-col-task">' +
        '<col class="export-col-effort"><col class="export-col-effort"><col class="export-col-effort">' +
        '<col class="export-col-eta-planned"><col class="export-col-eta-current">' +
        '<col>' +
        '<col class="export-col-progress"><col class="export-col-details">' +
        '</colgroup>' +
        '<thead>' +
        '<tr>' +
        '<th rowspan="2" class="export-th-shrink">Project</th>' +
        '<th rowspan="2">Task</th>' +
        '<th colspan="3">Effort</th>' +
        '<th colspan="2">ETA</th>' +
        '<th rowspan="2" class="export-th-shrink">Status</th>' +
        '<th rowspan="2" class="export-th-progress">Progress</th>' +
        '<th rowspan="2">Task Details</th>' +
        '</tr>' +
        '<tr>' +
        '<th class="export-th-effort">Planned</th>' +
        '<th class="export-th-effort" title="Effort spent so far excluding new effort: hours logged outside the selected From–To range (before From or after To).">Cumulative Effort</th>' +
        '<th class="export-th-effort">Remaining Effort</th>' +
        '<th class="export-th-eta-planned">Planned</th>' +
        '<th class="export-th-eta-current">Current</th>' +
        '</tr>' +
        '</thead><tbody>' +
        idleGridRows.join('') +
        '</tbody></table>';
    }

    return '<!doctype html><html><head><meta charset="UTF-8"><title>Work Summary Export</title><style>' + exportCss + '</style></head><body>' +
      '<p class="export-ws-title">Work Summary : ' + titleRange + '</p>' +
      bandwidthBlock +
      '<table class="export-work-table">' +
      '<colgroup>' +
        '<col>' +
        '<col class="export-col-task">' +
        '<col class="export-col-effort"><col class="export-col-effort"><col class="export-col-effort"><col class="export-col-effort">' +
        '<col class="export-col-eta-planned"><col class="export-col-eta-current">' +
        '<col>' +
        '<col class="export-col-progress"><col class="export-col-details">' +
      '</colgroup>' +
      '<thead>' +
      '<tr>' +
        '<th rowspan="2" class="export-th-shrink">Project</th>' +
        '<th rowspan="2">Task</th>' +
        '<th colspan="4">Effort</th>' +
        '<th colspan="2">ETA</th>' +
        '<th rowspan="2" class="export-th-shrink">Status</th>' +
        '<th rowspan="2" class="export-th-progress">Progress</th>' +
        '<th rowspan="2">Task Details</th>' +
      '</tr>' +
      '<tr>' +
        '<th class="export-th-effort">Planned</th><th class="export-th-effort" title="Effort spent so far excluding new effort: hours logged outside the selected From–To range (before From or after To).">Cumulative Effort</th><th class="export-th-effort" title="Effort logged on dates from From through To (inclusive)">New Effort</th><th class="export-th-effort">Remaining Effort</th>' +
        '<th class="export-th-eta-planned">Planned</th><th class="export-th-eta-current">Current</th>' +
      '</tr>' +
      '</thead><tbody>' +
      (gridRows.length ? gridRows.join('') : '<tr><td colspan="11">No tasks with progress in this range.</td></tr>') +
      '</tbody></table>' +
      idleTableBlock +
      '</body></html>';
  }

  function exportSummary() {
    if (!state.summaryGenerated || !state.lastSummaryMeta) return;
    var format = summaryExportFormat ? summaryExportFormat.value : 'htmlcss';
    if (format === 'markdown') {
      summaryOutput.innerHTML = '<p class="muted">Markdown export will be added next. Please use HTML/CSS for now.</p>';
      return;
    }
    var doc = buildSummaryExportHtml(state.lastSummaryMeta);
    summaryOutput.innerHTML = '<textarea class="summary-export-text" spellcheck="false">' + escapeHtml(doc) + '</textarea>';
  }

  function generateSummary() {
    var from = summaryFrom.value;
    var to = summaryTo.value;
    if (!from || !to) {
      summaryOutput.innerHTML = '<p class="muted">Please set both From and To dates.</p>';
      return;
    }
    var tasks = getTasks().map(normalizeTask).filter(function (t) { return !isTruthyFlag(t.exclude_from_summary); });

    function inRange(dateStr) {
      return dateStr && dateStr >= from && dateStr <= to;
    }
    function statusRank(s) {
      if (s === 'Done' || s === 'Completed') return 0;
      if (s === 'Ongoing') return 1;
      if (s === 'Open') return 2;
      return 3;
    }
    function statusClass(s) {
      return (s || 'open').toLowerCase().replace(/\s/g, '-');
    }
    var hpdSetting = parseFloat(getSettings().workingHoursPerDay);
    if (isNaN(hpdSetting) || hpdSetting <= 0) hpdSetting = 8;
    function formatHoursAndDays(hours) {
      var h = hours || 0;
      var days = h / hpdSetting;
      return h.toFixed(1).replace(/\.0$/, '') + ' hrs (~' + days.toFixed(1).replace(/\.0$/, '') + ' days)';
    }

    function hasProgressInRange(t) {
      if ((t.progress_updates || []).some(function (p) { return inRange(p.date_added); })) return true;
      var subs = t.subtasks || [];
      for (var i = 0; i < subs.length; i++) {
        if (isTruthyFlag(subs[i].exclude_from_summary)) continue;
        if ((subs[i].progress_updates || []).some(function (p) { return inRange(p.date_added); })) return true;
      }
      return false;
    }

    var sortedTasks = tasks.slice().sort(function (a, b) {
      var ra = statusRank(a.status);
      var rb = statusRank(b.status);
      if (ra !== rb) return ra - rb;
      return (a.title || '').localeCompare(b.title || '');
    });

    var activeTasks = sortedTasks.filter(hasProgressInRange);
    var idleTasks = sortedTasks.filter(function (t) {
      if (hasProgressInRange(t)) return false;
      if (t.status === 'Done' || t.status === 'Completed') {
        return t.done_date && inRange(t.done_date);
      }
      return true;
    });

    var openOngoingMain = activeTasks.filter(function (t) {
      return t.status === 'Open' || t.status === 'Ongoing';
    });
    var completedInRange = activeTasks.filter(function (t) {
      return (t.status === 'Done' || t.status === 'Completed') && inRange(t.done_date);
    });

    var rangeLabel = escapeHtml(from) + ' to ' + escapeHtml(to);

    var bw = computeBandwidthUtilized(from, to, getSettings());
    var utilPct = bw.capacity > 0 ? ((bw.spent / bw.capacity) * 100).toFixed(1) : '—';
    var bandwidthHtml =
      '<section class="summary-section summary-bandwidth">' +
        '<h4 class="summary-section-title">Bandwidth Utilized</h4>' +
        '<p class="summary-range">' + rangeLabel + '</p>' +
        '<div class="summary-table-wrap">' +
          '<table class="summary-table summary-bandwidth-table">' +
            '<tbody>' +
              '<tr><th>Total hours spent (in range)</th><td><strong>' + bw.spent.toFixed(1) + ' hrs</strong></td></tr>' +
              '<tr><th>Total working hours available (in range)</th><td><strong>' + bw.capacity.toFixed(1) + ' hrs</strong></td></tr>' +
              '<tr><th>Utilization</th><td>' + utilPct + (utilPct === '—' ? '' : '%') + '</td></tr>' +
              '<tr><th>Ideal hours / working day</th><td>' + bw.hrsPerDay + ' hrs</td></tr>' +
              '<tr><th>PTO (dates)</th><td>' + escapeHtml(bw.ptoStr) + '</td></tr>' +
              '<tr><th>Sick (dates)</th><td>' + escapeHtml(bw.sickStr) + '</td></tr>' +
              '<tr><th>Other time off (dates)</th><td>' + escapeHtml(bw.otherStr) + '</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>';

    // ---- Cumulative Summary (styled, only tasks with progress in range)
    var cumulativeTableRows = activeTasks.map(function (t) {
      var subs = (t.subtasks || []).filter(function (s) { return includeSubtaskInSummaryFull(s, from); });
      var subDone = subs.filter(function (s) { return s.status === 'Done' || s.status === 'Completed'; }).length;
      var subOngoing = subs.filter(function (s) { return s.status === 'Ongoing'; }).length;
      var subOpen = subs.filter(function (s) { return s.status === 'Open'; }).length;
      var mainSpent = taskEffortSpentMainAttributed(t);
      var subSpent = taskEffortSpentSubOnlyTask(t);
      var effortCell =
        '<div class="summary-effort-split"><span class="summary-effort-split-label">Main</span> ' + escapeHtml(formatHoursAndDays(mainSpent)) + '</div>' +
        '<div class="summary-effort-split"><span class="summary-effort-split-label">Sub</span> ' + escapeHtml(formatHoursAndDays(subSpent)) + '</div>';
      var statusLabel = t.status || 'Open';
      var pillClass = statusClass(statusLabel);
      var newEffortInRange = taskEffortInRangeMainAttributed(t, from, to) + taskEffortInRangeSubDedicated(t, from, to);
      var rowClass = newEffortInRange > 0 ? ' class="summary-has-new-effort"' : '';
      return '<tr' + rowClass + '><td><span class="task-status-pill ' + pillClass + '">' + escapeHtml(statusLabel) + '</span></td>' +
        '<td class="summary-cumulative-task-cell"><div class="summary-cell-flex">' + summaryProjectPillHtml(t.project) + escapeHtml(t.title || '(no title)') + '</div></td>' +
        '<td>' + subDone + ' / ' + subOngoing + ' / ' + subOpen + '</td>' +
        '<td>' + effortCell + '</td></tr>';
    }).join('');

    var cumulativeHtml =
      '<section class="summary-section summary-cumulative">' +
        '<h4 class="summary-section-title">Cumulative Summary</h4>' +
        '<p class="summary-range">' + rangeLabel + '</p>' +
        '<div class="summary-stats">' +
          '<span class="summary-stat"><strong>' + openOngoingMain.length + '</strong> main tasks Open/Ongoing</span>' +
          '<span class="summary-stat"><strong>' + completedInRange.length + '</strong> main tasks completed</span>' +
        '</div>' +
        '<div class="summary-table-wrap">' +
          '<table class="summary-table">' +
            '<thead><tr><th>Status</th><th>Main Task</th><th>Subtasks (Done / Ongoing / Open)</th><th>Effort spent (main / sub-tasks)</th></tr></thead>' +
            '<tbody>' + cumulativeTableRows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>';

    // ---- Detailed Summary (cards only for tasks with progress in range)
    var detailedCards = [];
    activeTasks.forEach(function (t, idx) {
      var subs = (t.subtasks || []).filter(function (s) { return includeSubtaskInSummaryFull(s, from); });
      var mainProgressInRange = sortProgressUpdatesOldestFirst((t.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
      var subProgressBySub = subs.map(function (s) {
        var updates = sortProgressUpdatesOldestFirst((s.progress_updates || []).filter(function (p) { return inRange(p.date_added); }));
        return { subtask: s, updates: updates };
      });
      var hasSubProgress = subProgressBySub.some(function (x) { return x.updates.length; });
      var etaUpdatesInRange = (t.eta_updates || []).filter(function (u) { return inRange(u.date_recorded); });
      var effortUpdatesInRange = (t.effort_updates || []).filter(function (u) { return inRange(u.date_recorded); });
      var activeConcernsMain = (t.concerns || []).filter(function (c) { return c.status !== 'Addressed'; });
      var addressedConcernsMainInRange = (t.concerns || []).filter(function (c) {
        return c.status === 'Addressed' && inRange(c.addressed_date);
      });
      var activeConcernsSubs = [];
      var addressedConcernsSubsInRange = [];
      subs.forEach(function (s) {
        (s.concerns || []).forEach(function (c) {
          if (c.status !== 'Addressed') {
            activeConcernsSubs.push({ subtask: s, concern: c });
          } else if (inRange(c.addressed_date)) {
            addressedConcernsSubsInRange.push({ subtask: s, concern: c });
          }
        });
      });

      var etaLabel = t.eta || '—';
      var latestPlannedMain = getLatestPlannedEffortHours(t);
      var effortReq = latestPlannedMain;
      var mainAttrInRange = taskEffortInRangeMainAttributed(t, from, to);
      var subOnlyInRange = taskEffortInRangeSubDedicated(t, from, to);
      var cumulativeOutsideMain = taskEffortOutsideRangeMainAttributed(t, from, to);
      var spentMainAttrTotal = taskEffortSpentMainAttributed(t);
      var remainingMainOnly = latestPlannedMain - spentMainAttrTotal;
      var remainingMainClass = remainingMainOnly < 0 ? 'summary-remaining-negative' : '';
      var subsNoProgress = subs.filter(function (s, i) { return !subProgressBySub[i].updates.length; });

      var pillClass = statusClass(t.status || 'Open');
      /* Full-card tint only when main-track work in range (main + included subs); not sub-tasks with own planned effort only. */
      var cardHighlightClass = mainAttrInRange > 0 ? ' summary-has-new-effort' : '';
      var card = '<div class="summary-task-card' + cardHighlightClass + '">' +
        '<h5 class="summary-task-title">' + summaryProjectPillHtml(t.project) + '<span class="summary-task-title-main">' + escapeHtml(t.title || '(no title)') + '</span> <span class="task-status-pill ' + pillClass + '">' + escapeHtml(t.status || 'Open') + '</span></h5>' +
        '<div class="summary-meta-grid">' +
          '<span class="summary-meta"><span class="summary-meta-label">Project</span><span class="summary-meta-value">' +
          ((t.project != null && String(t.project).trim()) ? escapeHtml(String(t.project).trim()) : '—') +
          '</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">ETA</span><span class="summary-meta-value">' + escapeHtml(etaLabel) + '</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">Total Planned Effort</span><span class="summary-meta-value">' + effortReq + ' hrs</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">Cumulative Effort</span><span class="summary-meta-value">' + cumulativeOutsideMain + ' hrs</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">New Effort Spent</span><span class="summary-meta-value">' + mainAttrInRange + ' hrs</span></span>' +
          '<span class="summary-meta"><span class="summary-meta-label">Total Remaining Effort</span><span class="summary-meta-value ' + remainingMainClass + '">' + remainingMainOnly + ' hrs</span></span>' +
        '</div>';

      var mainProgressNewEffortHrs = mainProgressInRange.reduce(function (sum, p) {
        return sum + (Number(p.effort_consumed_hours) || 0);
      }, 0);
      var mainProgBlockClass = 'summary-main-progress-block' + (mainProgressNewEffortHrs > 0 ? ' summary-has-new-effort' : '');

      card += '<div class="summary-block-head">Progress on main task</div>';
      card += '<div class="' + mainProgBlockClass + '">';
      if (mainProgressInRange.length) {
        card += '<ol class="summary-list summary-progress-list">';
        mainProgressInRange.forEach(function (p, i) {
          var text = (p.text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
          card += '<li><span class="summary-progress-meta">' + (p.effort_consumed_hours != null ? p.effort_consumed_hours + ' hrs' : '') + '</span>' + (text ? (p.effort_consumed_hours != null ? ' ' : '') + linkifyPlainText(text) : '') + '</li>';
        });
        card += '</ol>';
      } else {
        card += '<p class="summary-no-progress">No progress made.</p>';
      }
      card += '</div>';
      card += '<p class="summary-total-effort">Total main task effort (in range): <strong>' + mainAttrInRange + ' hrs</strong></p>';

      if (hasSubProgress) {
        card += '<div class="summary-block-head">Sub-task progress</div>';
        subProgressBySub.forEach(function (entry) {
          if (!entry.updates.length) return;
          var s = entry.subtask;
          var subNewEffortHrs = entry.updates.reduce(function (sum, p) {
            return sum + (Number(p.effort_consumed_hours) || 0);
          }, 0);
          var subBlockClass = 'summary-subtask-progress-block' + (subNewEffortHrs > 0 ? ' summary-has-new-effort' : '');
          card += '<div class="' + subBlockClass + '"><div class="summary-subtask-name">' + summaryProjectPillHtml(s.project) + '<span>' + escapeHtml(s.title || '(no title)') + '</span>' + (!subtaskHasDedicatedEffort(s) ? summaryIncludedPillHtml() : '') + '</div><ol class="summary-list summary-sublist">';
          entry.updates.forEach(function (p, i) {
            var text = (p.text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
            card += '<li><span class="summary-progress-meta">' + (p.effort_consumed_hours != null ? p.effort_consumed_hours + ' hrs' : '') + '</span>' + (text ? (p.effort_consumed_hours != null ? ' ' : '') + linkifyPlainText(text) : '') + '</li>';
          });
          card += '</ol></div>';
        });
        card += '<p class="summary-total-effort">Total sub-task effort (in range): <strong>' + subOnlyInRange + ' hrs</strong></p>';
      }

      if (subsNoProgress.length) {
        card += '<div class="summary-block-head">Sub-tasks with no progress</div><ul class="summary-list summary-plain-list">';
        subsNoProgress.forEach(function (s) {
          card += '<li class="summary-list-task-line">' + summaryProjectPillHtml(s.project) + escapeHtml(s.title || '(no title)') + (!subtaskHasDedicatedEffort(s) ? summaryIncludedPillHtml() : '') + '</li>';
        });
        card += '</ul>';
      }

      if (subs.length) {
        card += '<div class="summary-block-head">Sub-task ETA / Effort</div><div class="summary-table-wrap summary-subtable-effort-wrap"><table class="summary-table summary-subtable summary-subtable-effort"><thead><tr>' +
          '<th>Sub-task</th><th>Status</th><th>ETA</th>' +
          '<th>Total Planned Effort</th><th>Cumulative Effort</th><th>New Effort Spent</th><th>Total Remaining Effort</th>' +
          '</tr></thead><tbody>';
        subs.forEach(function (s) {
          var etaS = s.eta || '—';
          var reqS = getLatestPlannedEffortHours(s);
          var spentS = subtaskEffortSpent(s);
          var subUpdatesInRange = (s.progress_updates || []).filter(function (p) { return inRange(p.date_added); });
          var newSubInRange = subUpdatesInRange.reduce(function (sum, p) {
            return sum + progressEffortHours(p);
          }, 0);
          var cumulativeOutsideSub = subtaskEffortOutsideRange(s, from, to);
          var remS = reqS - spentS;
          var remSClass = remS < 0 ? 'summary-remaining-negative' : '';
          var spClass = statusClass(s.status || 'Open');
          var subRowTint = subUpdatesInRange.length > 0 && newSubInRange > 0;
          var subRowClass = subRowTint ? ' class="summary-has-new-effort"' : '';
          card += '<tr' + subRowClass + '><td class="summary-cumulative-task-cell"><div class="summary-cell-flex">' + summaryProjectPillHtml(s.project) + '<span>' + escapeHtml(s.title || '(no title)') + '</span>' + (!subtaskHasDedicatedEffort(s) ? summaryIncludedPillHtml() : '') + '</div></td><td><span class="task-status-pill ' + spClass + '">' + escapeHtml(s.status || 'Open') + '</span></td><td>' + escapeHtml(etaS) + '</td>' +
            '<td>' + reqS + ' hrs</td><td>' + cumulativeOutsideSub + ' hrs</td><td>' + newSubInRange + ' hrs</td><td><span class="' + remSClass + '">' + remS + ' hrs</span></td></tr>';
        });
        card += '</tbody></table></div>';
      }

      if (activeConcernsMain.length || activeConcernsSubs.length || addressedConcernsMainInRange.length || addressedConcernsSubsInRange.length) {
        card += '<div class="summary-block-head">Concerns</div><div class="summary-concerns">';
        if (activeConcernsMain.length) {
          card += '<div class="summary-concern-group"><span class="summary-concern-group-label">Active (main task)</span><ul class="summary-list">';
          activeConcernsMain.forEach(function (c) {
            card += '<li class="summary-concern-open">' + escapeHtml(c.logged_date || '') + ' — ' + linkifyPlainText(c.description || '') + '</li>';
          });
          card += '</ul></div>';
        }
        if (activeConcernsSubs.length) {
          card += '<div class="summary-concern-group"><span class="summary-concern-group-label">Active (sub-tasks)</span><ul class="summary-list">';
          activeConcernsSubs.forEach(function (e) {
            card += '<li class="summary-concern-open summary-list-task-line">' + summaryProjectPillHtml(e.subtask.project) + escapeHtml(e.subtask.title || '') + (!subtaskHasDedicatedEffort(e.subtask) ? summaryIncludedPillHtml() : '') + ' — ' + escapeHtml(e.concern.logged_date || '') + ': ' + linkifyPlainText(e.concern.description || '') + '</li>';
          });
          card += '</ul></div>';
        }
        if (addressedConcernsMainInRange.length) {
          card += '<div class="summary-concern-group"><span class="summary-concern-addressed-label">Addressed (main; not a blocker)</span><ul class="summary-list">';
          addressedConcernsMainInRange.forEach(function (c) {
            card += '<li class="summary-concern-addressed">' + escapeHtml(c.addressed_date || '') + ' — ' + linkifyPlainText(c.description || '') + (c.addressed_comment ? ' <em>' + linkifyPlainText(c.addressed_comment) + '</em>' : '') + '</li>';
          });
          card += '</ul></div>';
        }
        if (addressedConcernsSubsInRange.length) {
          card += '<div class="summary-concern-group"><span class="summary-concern-addressed-label">Addressed (sub-tasks; not blockers)</span><ul class="summary-list">';
          addressedConcernsSubsInRange.forEach(function (e) {
            card += '<li class="summary-concern-addressed summary-list-task-line">' + summaryProjectPillHtml(e.subtask.project) + escapeHtml(e.subtask.title || '') + (!subtaskHasDedicatedEffort(e.subtask) ? summaryIncludedPillHtml() : '') + ' — ' + escapeHtml(e.concern.addressed_date || '') + ': ' + linkifyPlainText(e.concern.description || '') + (e.concern.addressed_comment ? ' <em>' + linkifyPlainText(e.concern.addressed_comment) + '</em>' : '') + '</li>';
          });
          card += '</ul></div>';
        }
        card += '</div>';
      }

      if (etaUpdatesInRange.length || effortUpdatesInRange.length) {
        card += '<div class="summary-block-head">ETA / Effort slips</div><ul class="summary-list summary-slips">';
        etaUpdatesInRange.forEach(function (u) {
          card += '<li class="summary-slip summary-slip-eta">ETA: ' + escapeHtml(u.date_recorded || '') + ' — ' + escapeHtml(u.old_eta || '—') + ' → ' + escapeHtml(u.new_eta || '—') + '</li>';
        });
        effortUpdatesInRange.forEach(function (u) {
          var oldH = u.old_effort_hours != null ? u.old_effort_hours + ' hrs' : '—';
          var newH = u.new_effort_hours != null ? u.new_effort_hours + ' hrs' : '—';
          card += '<li class="summary-slip summary-slip-effort">Effort: ' + escapeHtml(u.date_recorded || '') + ' — ' + escapeHtml(oldH) + ' → ' + escapeHtml(newH) + '</li>';
        });
        card += '</ul>';
      }

      card += '</div>';
      detailedCards.push(card);
    });

    var detailedHtml =
      '<section class="summary-section summary-detailed">' +
        '<h4 class="summary-section-title">Detailed Summary</h4>' +
        '<p class="summary-range">' + rangeLabel + '</p>' +
        '<div class="summary-cards">' + detailedCards.join('') + '</div>' +
      '</section>';

    // ---- Tasks with No Progress (excludes Done/Completed unless completed in range)
    var idleHtml = '';
    if (idleTasks.length) {
      var idleRows = idleTasks.map(function (t) {
        var subs = t.subtasks || [];
        var statusLabel = t.status || 'Open';
        var pillClass = statusClass(statusLabel);
        return '<tr><td><span class="task-status-pill ' + pillClass + '">' + escapeHtml(statusLabel) + '</span></td>' +
          '<td class="summary-cumulative-task-cell"><div class="summary-cell-flex">' + summaryProjectPillHtml(t.project) + escapeHtml(t.title || '(no title)') + '</div></td>' +
          '<td>' + subs.length + '</td></tr>';
      }).join('');
      idleHtml =
        '<section class="summary-section summary-idle">' +
          '<h4 class="summary-section-title">Tasks with No Progress</h4>' +
          '<p class="summary-range">' + rangeLabel + '</p>' +
          '<div class="summary-table-wrap">' +
            '<table class="summary-table">' +
              '<thead><tr><th>Status</th><th>Main Task</th><th>Sub-task count</th></tr></thead>' +
              '<tbody>' + idleRows + '</tbody>' +
            '</table>' +
          '</div>' +
        '</section>';
    }

    var html = '<div class="summary-report">' +
      '<h3 class="summary-report-title">Summary</h3>' +
      '<p class="summary-report-range">' + rangeLabel + '</p>' +
      bandwidthHtml +
      cumulativeHtml +
      detailedHtml +
      idleHtml +
      '</div>';
    summaryOutput.innerHTML = html;
    state.summaryGenerated = true;
    state.lastSummaryMeta = {
      from: from,
      to: to,
      activeTasks: activeTasks,
      idleTasks: idleTasks
    };
    if (exportSummaryBtn) exportSummaryBtn.disabled = false;
  }

  function render() {
    if (state.view === 'list') renderList();
    else if (state.view === 'calendar') renderCalendar();
    else if (state.view === 'summary') renderSummary();
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll('.view-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'view-' + view);
    });
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === view);
    });
    render();
  }

  function setFormDefaults() {
    var today = new Date().toISOString().slice(0, 10);
    taskAssigned.value = today;
    taskEta.value = today;
    taskEffort.value = '1';
    taskPriority.value = '1';
    if (taskDifficulty) taskDifficulty.value = DEFAULT_TASK_DIFFICULTY;
    taskTags.value = 'default';
    if (taskBug) taskBug.value = '';
    var taskProjEl = $('task-project');
    if (taskProjEl) taskProjEl.innerHTML = renderProjectSelectInnerHtml('');
  }

  function prefillDebugForm() {
    taskTitle.value = 'Debug: Sample task';
    taskDescription.value = 'Edit or add and click Add Task.';
    setFormDefaults();
  }

  function openSettingsModal() {
    var s = getSettings().priorityColors || DEFAULT_PRIORITY_COLORS;
    for (var i = 1; i <= 10; i++) {
      var el = $('setting-priority-' + i);
      if (el) el.value = s[String(i)] || getDefaultPriorityColor(i);
    }
    var categoriesEl = $('setting-categories');
    if (categoriesEl) categoriesEl.value = getCategoryList().join(', ');
    var projectsEl = $('setting-projects');
    if (projectsEl) projectsEl.value = getProjectList().join(', ');
    var whEl = $('setting-working-hours');
    if (whEl) {
      var w = parseFloat(getSettings().workingHoursPerDay);
      whEl.value = !isNaN(w) && w > 0 ? String(w) : '8';
    }
    var modal = $('settings-modal');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeSettingsModal() {
    var modal = $('settings-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function setSummaryDefaultDates() {
    if (!summaryFrom || !summaryTo) return;
    var today = new Date().toISOString().slice(0, 10);
    var thisWeekMonday = getMonday(today);
    var prevWeekMonday = addDays(thisWeekMonday, -7);
    var prevWeekSunday = addDays(prevWeekMonday, 6);
    summaryFrom.value = prevWeekMonday;
    summaryTo.value = prevWeekSunday;
  }

  function init() {
    setFormDefaults();
    setSummaryDefaultDates();

    var addNewTaskBtn = $('add-new-task-btn');
    var addNewTaskBlock = $('add-new-task-block');
    if (addNewTaskBtn && addNewTaskBlock) {
      addNewTaskBtn.addEventListener('click', function () {
        addNewTaskBlock.classList.toggle('task-block-collapsed');
        addNewTaskBtn.classList.toggle('active', !addNewTaskBlock.classList.contains('task-block-collapsed'));
      });
    }
    var addTaskCatContainer = $('add-task-category-dropdown');
    if (addTaskCatContainer) {
      addTaskCatContainer.innerHTML = renderCategoryDropdownHtml([], 'add-task-category');
      bindCategoryDropdownInWrap(addTaskCatContainer);
    }
    syncAddTaskProjectSelect();

    var mainFilterWrap = document.querySelector('.main-task-filter-wrap');
    var mainFilterBtn = $('main-task-filter-btn');
    var mainFilterMenu = $('main-task-filter-menu');
    if (mainFilterBtn && mainFilterWrap && mainFilterMenu) {
      mainFilterBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        mainFilterWrap.classList.toggle('open');
      });
      mainFilterMenu.querySelectorAll('.filter-option').forEach(function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          state.mainTaskSort = { by: opt.dataset.sortBy, dir: opt.dataset.sortDir };
          renderList();
          mainFilterWrap.classList.remove('open');
        });
      });
    }
    document.addEventListener('click', function () {
      document.querySelectorAll('.filter-dropdown-wrap.open').forEach(function (w) {
        w.classList.remove('open');
      });
      document.querySelectorAll('.category-dropdown-wrap.open').forEach(function (w) {
        w.classList.remove('open');
      });
    });

    addTaskBtn.addEventListener('click', function () {
      var title = (taskTitle.value || '').trim();
      if (!title) return;
      var today = new Date().toISOString().slice(0, 10);
      var tags = parseTags(taskTags.value);
      var bugNums = taskBug ? parseBugNumbers(taskBug.value) : [];
      var addTaskCatWrap = $('add-task-category-dropdown') && $('add-task-category-dropdown').querySelector('.category-dropdown-wrap');
      var taskCategories = addTaskCatWrap ? getSelectedCategoriesFromWrap(addTaskCatWrap) : [];
      var taskProjEl = $('task-project');
      var taskProject = taskProjEl && taskProjEl.value ? taskProjEl.value.trim() : '';
      addTask({
        title: title,
        description: (taskDescription.value || '').trim(),
        priority: parseInt(taskPriority.value, 10) || 1,
        difficulty: taskDifficulty && taskDifficulty.value ? taskDifficulty.value : DEFAULT_TASK_DIFFICULTY,
        tags: tags,
        assigned_date: taskAssigned.value || today,
        eta: taskEta.value || today,
        effort_required_hours: parseFloat(taskEffort.value) || 1,
        bug_numbers: bugNums,
        status: 'Open',
        categories: taskCategories,
        project: taskProject
      }).then(function () {
        taskTitle.value = '';
        taskDescription.value = '';
        var addCatWrap = $('add-task-category-dropdown') && $('add-task-category-dropdown').querySelector('.category-dropdown-wrap');
        if (addCatWrap) {
          addCatWrap.querySelectorAll('.category-checkbox').forEach(function (cb) { cb.checked = false; });
          var btn = addCatWrap.querySelector('.category-dropdown-btn');
          if (btn) btn.textContent = 'Category: —';
        }
        if (window.__FLOWASSIST_DEBUG__) prefillDebugForm();
        else setFormDefaults();
      });
    });

    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(btn.dataset.view); });
    });
    if (calendarFilter) {
      calendarFilter.addEventListener('change', function () {
        state.calendarFilter = calendarFilter.value;
        renderCalendar();
      });
    }
    var calendarViewBtns = document.querySelectorAll('.calendar-view-btn');
    calendarViewBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.dataset.calendarView;
        if (!v) return;
        state.calendarView = v;
        calendarViewBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.calendarView === v); });
        renderCalendar();
      });
    });
    var chartStyleBtns = document.querySelectorAll('.calendar-chart-style-btn');
    chartStyleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = btn.dataset.chartStyle;
        if (!s) return;
        state.calendarChartStyle = s;
        chartStyleBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.chartStyle === s); });
        renderCalendar();
      });
    });
    var calendarPrevBtn = document.getElementById('calendar-prev-btn');
    var calendarNextBtn = document.getElementById('calendar-next-btn');
    if (calendarPrevBtn) {
      calendarPrevBtn.addEventListener('click', function () {
        var focus = state.calendarFocusDate || new Date().toISOString().slice(0, 10);
        if (state.calendarView === 'day') state.calendarFocusDate = addDays(focus, -1);
        else if (state.calendarView === 'week') state.calendarFocusDate = addDays(focus, -7);
        else if (state.calendarView === 'month') {
          var d = parseYMD(focus);
          if (d) { d.setMonth(d.getMonth() - 1); state.calendarFocusDate = toYMD(d); }
        }
        renderCalendar();
      });
    }
    if (calendarNextBtn) {
      calendarNextBtn.addEventListener('click', function () {
        var focus = state.calendarFocusDate || new Date().toISOString().slice(0, 10);
        if (state.calendarView === 'day') state.calendarFocusDate = addDays(focus, 1);
        else if (state.calendarView === 'week') state.calendarFocusDate = addDays(focus, 7);
        else if (state.calendarView === 'month') {
          var d = parseYMD(focus);
          if (d) { d.setMonth(d.getMonth() + 1); state.calendarFocusDate = toYMD(d); }
        }
        renderCalendar();
      });
    }
    var calendarGoto = document.getElementById('calendar-goto-date');
    if (calendarGoto) {
      calendarGoto.addEventListener('change', function () {
        if (calendarGoto.value) {
          state.calendarFocusDate = calendarGoto.value;
          renderCalendar();
        }
      });
    }
    var calendarContainerEl = document.getElementById('calendar-container');
    if (calendarContainerEl) {
      calendarContainerEl.addEventListener('click', function (e) {
        var bar = e.target && e.target.closest && e.target.closest('.gantt-task-bar-toggle');
        if (!bar) return;
        e.preventDefault();
        var drop = bar.nextElementSibling;
        if (drop && drop.classList && drop.classList.contains('gantt-task-dropdown')) {
          drop.classList.toggle('gantt-task-dropdown-open');
          bar.classList.toggle('gantt-task-bar-expanded');
        }
      });
    }
    var dayoffToggle = $('calendar-dayoff-toggle');
    var dayoffPanel = $('calendar-dayoff-panel');
    if (dayoffToggle && dayoffPanel) {
      dayoffToggle.addEventListener('click', function () {
        dayoffPanel.classList.toggle('task-block-collapsed');
        dayoffToggle.classList.toggle('active', !dayoffPanel.classList.contains('task-block-collapsed'));
      });
    }
    var dayoffType = $('dayoff-type');
    var dayoffHoursRow = $('dayoff-hours-row');
    function syncDayoffHoursRow() {
      if (!dayoffHoursRow || !dayoffType) return;
      dayoffHoursRow.style.display = dayoffType.value === 'partial' ? '' : 'none';
    }
    if (dayoffType) dayoffType.addEventListener('change', syncDayoffHoursRow);
    syncDayoffHoursRow();

    var addDayoffBtn = $('calendar-dayoff-add-btn');
    if (addDayoffBtn) {
      addDayoffBtn.addEventListener('click', function () {
        var dateEl = $('dayoff-date');
        var date = dateEl && dateEl.value;
        if (!date) return;
        var type = dayoffType && dayoffType.value === 'partial' ? 'partial' : 'full';
        var reasonEl = $('dayoff-reason');
        var reason = reasonEl && reasonEl.value ? reasonEl.value : 'Other';
        var hoursOff = 0;
        if (type === 'partial') {
          var hEl = $('dayoff-hours');
          hoursOff = hEl ? parseFloat(hEl.value) : NaN;
          if (isNaN(hoursOff) || hoursOff <= 0) return;
          var maxH = parseFloat(getSettings().workingHoursPerDay) || 8;
          if (hoursOff > maxH) hoursOff = maxH;
        }
        var base = getSettings();
        var list = (base.dayOffs || []).filter(function (o) { return o.date !== date; });
        list.push({ id: generateId(), date: date, type: type, reason: reason, hoursOff: hoursOff });
        saveSettings(Object.assign({}, base, { dayOffs: list }));
      });
    }
    var viewCal = document.getElementById('view-calendar');
    if (viewCal) {
      viewCal.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest && e.target.closest('.calendar-dayoff-remove');
        if (!btn) return;
        var id = btn.getAttribute('data-dayoff-id');
        if (!id) return;
        var base = getSettings();
        var list = (base.dayOffs || []).filter(function (o) { return o.id !== id; });
        saveSettings(Object.assign({}, base, { dayOffs: list }));
      });
    }

    if (generateSummaryBtn) generateSummaryBtn.addEventListener('click', generateSummary);
    if (exportSummaryBtn) {
      exportSummaryBtn.disabled = !state.summaryGenerated;
      exportSummaryBtn.addEventListener('click', exportSummary);
    }

    var settingsBtn = $('settings-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
    var settingsSave = $('settings-save-btn');
    if (settingsSave) {
      settingsSave.addEventListener('click', function () {
        var colors = {};
        for (var i = 1; i <= 10; i++) {
          var el = $('setting-priority-' + i);
          if (el) colors[String(i)] = el.value;
        }
        var categoriesInput = $('setting-categories');
        var categoriesStr = categoriesInput ? categoriesInput.value.trim() : '';
        var categories = categoriesStr ? categoriesStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : getCategoryList();
        var projectsInput = $('setting-projects');
        var projectsStr = projectsInput ? projectsInput.value.trim() : '';
        var projects = projectsStr ? projectsStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
        var whIn = $('setting-working-hours');
        var wh = whIn ? parseFloat(whIn.value) : 8;
        if (isNaN(wh) || wh <= 0) wh = 8;
        var base = getSettings();
        saveSettings(Object.assign({}, base, {
          priorityColors: colors,
          categories: categories.length ? categories : getCategoryList(),
          projects: projects,
          workingHoursPerDay: wh,
          dayOffs: Array.isArray(base.dayOffs) ? base.dayOffs : []
        }));
        closeSettingsModal();
        var addCatWrap = $('add-task-category-dropdown');
        if (addCatWrap && addCatWrap.parentNode) {
          addCatWrap.innerHTML = renderCategoryDropdownHtml([], 'add-task-category');
          bindCategoryDropdownInWrap(addCatWrap);
        }
        syncAddTaskProjectSelect();
      });
    }
    var settingsCancel = $('settings-cancel-btn');
    if (settingsCancel) settingsCancel.addEventListener('click', closeSettingsModal);
    var modal = $('settings-modal');
    if (modal) {
      modal.querySelector('.modal-backdrop').addEventListener('click', closeSettingsModal);
    }

    document.body.addEventListener('input', function (e) {
      if (e.target.tagName === 'TEXTAREA' && e.target.classList.contains('auto-resize')) {
        autoResizeTextarea(e.target);
      }
    });

    if (window.taskAPI.onFileMenu) {
      window.taskAPI.onFileMenu(function (action) {
        if (action === 'load-profile') {
          window.taskAPI.dialogOpenProfile().then(function (r) {
            if (!r || r.canceled || !r.filePath) return;
            window.taskAPI.profileActivateFromPath(r.filePath).then(function (act) {
              if (!act.success) {
                showProfileError('Load profile', act.message || 'Could not open this file.', act.path ? String(act.path) : '');
                return;
              }
              setData(act.data);
              updateDocumentTitleFromPath(act.path);
              render();
              syncAddTaskProjectSelect();
            });
          });
        } else if (action === 'new-profile') {
          window.taskAPI.dialogNewProfile().then(function (r) {
            if (!r || r.canceled || !r.filePath) return;
            window.taskAPI.profileCreateNew(r.filePath).then(function (cr) {
              if (!cr.success) {
                showProfileError('New profile', cr.message || 'Could not create the profile file.', '');
                return;
              }
              setData(cr.data);
              updateDocumentTitleFromPath(cr.path);
              render();
              syncAddTaskProjectSelect();
            });
          });
        } else if (action === 'save-as') {
          window.taskAPI.profileSaveAs(state.data).then(function (r) {
            if (!r || r.canceled) return;
            if (!r.success) {
              showProfileError('Save As', r.message || 'Could not save the profile.', '');
              return;
            }
            updateDocumentTitleFromPath(r.path);
          });
        }
      });
    }

    load().then(function () {
      syncAddTaskProjectSelect();
      if (window.__FLOWASSIST_DEBUG__) prefillDebugForm();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
