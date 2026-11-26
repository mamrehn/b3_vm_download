/* ================================================================
   B3 Schulportal Styleguide — b3.js
   Version 6.5 · optional, dependency-free behaviors for style.css

   <script src="b3.js" defer></script>

   Everything is wired automatically from markup (ARIA roles, classes,
   data attributes) — no per-app copy-paste of event handlers. Content
   added later: call B3.init(container).

   Public API (window.B3):
     B3.toast(type, message, { duration })   'success'|'error'|'warning'|'info'
     B3.confirm({ title, message, confirmLabel, cancelLabel, danger }) → Promise<boolean>
     B3.setTheme('system'|'light'|'dark')     persisted in localStorage 'b3-theme'
     B3.getTheme() → 'system'|'light'|'dark'  the stored preference (default 'system')
     B3.validate(form) → boolean              German messages, focus on the first problem
     B3.setFieldError(field, message)         your own checks; '' clears the error
     B3.fmt.date / time / dateTime / number / percent / bytes / duration
     B3.parseNumber('1,5') → 1.5              German or English decimal input
     B3.init(root)

   Theme preference: 'system' (default, follows prefers-color-scheme
   live), 'light' or 'dark'. <html data-theme> always holds the resolved
   'light'|'dark', so style.css needs no media query. The header button
   [data-b3-theme-toggle] cycles automatisch → hell → dunkel and shows
   the current preference as icon and title. To avoid a flash of the
   wrong theme, put this in <head> before the stylesheet:
     <script>try{var t=localStorage.getItem('b3-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){}</script>
   ================================================================ */
(function () {
  'use strict';

  const ICONS = {
    success: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    error:   'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    info:    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
  };

  const svg = (path) =>
    '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor"><path d="' + path + '"/></svg>';

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode */ } }
  };

  /* --- German formats (§ Language): 15.07.2026 · 14:30 Uhr · 1,5 · 87 %.
     Number and unit are joined by a no-break space, so "10 MB" and
     "14:30 Uhr" never break across two lines. */
  const NBSP = '\u00a0';
  const fmt = {
    date: (d) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: (d) => new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr',
    dateTime: (d) => fmt.date(d) + ', ' + fmt.time(d),
    number: (n, digits) => Number(n).toLocaleString('de-DE', digits === undefined ? {} : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    /* percent(0.87) → "87 %" (pass a fraction, like Intl does) */
    percent: (fraction, digits = 0) => Number(fraction).toLocaleString('de-DE', { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }),
    bytes: (n) => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let i = 0;
      while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
      return fmt.number(n, i === 0 ? 0 : 1) + ' ' + units[i];
    },
    /* duration(5400) → "90:00" — total minutes:seconds, as exam timers count */
    duration: (seconds) => {
      const s = Math.max(0, Math.round(seconds));
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
  };

  /* What learners type: "1,5", "1.5", "1.234,5", "−3" → number (NaN if none) */
  function parseNumber(text) {
    let t = String(text).trim().replace(/[\s\u00a0\u202f]/g, '').replace(/[−–]/g, '-');
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    return t === '' ? NaN : Number(t);
  }

  /* --- Theme ------------------------------------------------------ */
  // Preference 'system' | 'light' | 'dark'; data-theme gets the resolved value.
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const THEMES = ['system', 'light', 'dark'];   // cycle order of the toggle button
  const THEME_LABELS = { system: 'automatisch', light: 'hell', dark: 'dunkel' };
  // Line icons (stroke, not fill): half-filled circle, sun, moon
  const THEME_ICONS = {
    system: 'M12 3a9 9 0 1 0 0 18zm0 0a9 9 0 0 1 0 18',
    light: 'M12 5.5v-3m0 19v-3m6.5-6.5h3m-19 0h3m11.1-4.6 2.1-2.1M5.3 18.7l2.1-2.1m0-9.2L5.3 5.3m13.4 13.4-2.1-2.1M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8',
    dark: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5'
  };
  const themeIcon = (preference) =>
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="' + THEME_ICONS[preference] +
    '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function getTheme() {
    const stored = store.get('b3-theme');
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  }

  function resolveTheme(preference) {
    if (preference === 'light' || preference === 'dark') return preference;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function applyTheme(preference) {
    const theme = resolveTheme(preference);
    document.documentElement.setAttribute('data-theme', theme);
    // Not a two-state toggle: no aria-pressed; the title names the current mode
    document.querySelectorAll('[data-b3-theme-toggle]').forEach((btn) => {
      btn.innerHTML = themeIcon(preference);
      btn.title = 'Farbschema: ' + THEME_LABELS[preference];
      btn.setAttribute('aria-label', 'Farbschema wechseln');
      btn.removeAttribute('aria-pressed');
    });
  }

  function setTheme(preference) {
    if (!THEMES.includes(preference)) preference = 'system';
    store.set('b3-theme', preference);
    applyTheme(preference);
  }

  // Follow the operating system live while the preference is 'system'
  darkQuery?.addEventListener?.('change', () => { if (getTheme() === 'system') applyTheme('system'); });

  /* --- Toasts ----------------------------------------------------- */
  function toastRegion() {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    return region;
  }

  function toast(type, message, options = {}) {
    const kind = ICONS[type] ? type : 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    if (kind === 'error') el.setAttribute('role', 'alert');
    el.innerHTML = svg(ICONS[kind]) + '<span></span>' +
      '<button type="button" class="toast-close" aria-label="Meldung schließen">×</button>';
    el.querySelector('span').textContent = message;
    el.querySelector('.toast-close').addEventListener('click', () => el.remove());
    toastRegion().appendChild(el);
    // Errors stay until dismissed; everything else leaves after 5 s —
    // but not while someone is reading it (pointer over it, focus in it).
    const duration = options.duration ?? (kind === 'error' ? 0 : 5000);
    if (duration > 0) {
      let timer = setTimeout(() => el.remove(), duration);
      const hold = () => clearTimeout(timer);
      const release = () => { clearTimeout(timer); timer = setTimeout(() => el.remove(), 2000); };
      el.addEventListener('mouseenter', hold);
      el.addEventListener('focusin', hold);
      el.addEventListener('mouseleave', release);
      el.addEventListener('focusout', release);
    }
    return el;
  }

  /* --- Confirm dialog -------------------------------------------- */
  let uid = 0;
  function confirmDialog({ title, message, confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen', danger = false }) {
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'modal';
      const id = 'b3-confirm-' + (++uid);
      dialog.setAttribute('aria-labelledby', id);
      dialog.innerHTML =
        '<div class="modal-header"><h2 class="modal-title" id="' + id + '"></h2></div>' +
        '<p></p>' +
        '<form method="dialog" class="modal-footer">' +
        '<button class="btn secondary" value="cancel"></button>' +
        '<button class="btn ' + (danger ? 'danger' : 'primary') + '" value="ok"></button>' +
        '</form>';
      dialog.querySelector('.modal-title').textContent = title;
      dialog.querySelector('p').textContent = message;
      dialog.querySelector('[value="cancel"]').textContent = cancelLabel;
      dialog.querySelector('[value="ok"]').textContent = confirmLabel;
      dialog.addEventListener('close', () => {
        resolve(dialog.returnValue === 'ok');
        dialog.remove();
      });
      document.body.appendChild(dialog);
      dialog.showModal();
      dialog.querySelector('[value="cancel"]').focus(); // safe default for binding actions
    });
  }

  /* --- Wiring ----------------------------------------------------- */
  const wired = new WeakSet();
  const once = (el) => (wired.has(el) ? false : (wired.add(el), true));

  function initTabs(root) {
    root.querySelectorAll('[role="tablist"]').forEach((tablist) => {
      if (!once(tablist)) return;
      const tabs = [...tablist.querySelectorAll('[role="tab"]')];
      const select = (tab, focus) => {
        tabs.forEach((t) => {
          const selected = t === tab;
          t.setAttribute('aria-selected', String(selected));
          t.tabIndex = selected ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !selected;
        });
        if (focus) tab.focus();
        tablist.dispatchEvent(new CustomEvent('b3:change', { detail: { tab }, bubbles: true }));
      };
      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(tab, false));
        tab.addEventListener('keydown', (e) => {
          const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
          if (!(e.key in keys)) return;
          e.preventDefault();
          select(tabs[(keys[e.key] + tabs.length) % tabs.length], true);
        });
      });
    });
  }

  function initToggles(root) {
    // Segmented control: exactly one pressed
    root.querySelectorAll('.segmented').forEach((group) => {
      if (!once(group)) return;
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !group.contains(btn)) return;
        group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        group.dispatchEvent(new CustomEvent('b3:change', { detail: { value: btn.value || btn.textContent.trim() }, bubbles: true }));
      });
    });
    // Filter pills: independent toggles (single choice inside [data-single])
    root.querySelectorAll('button.pill[aria-pressed]').forEach((pill) => {
      if (!once(pill)) return;
      pill.addEventListener('click', () => {
        const group = pill.closest('[data-single]');
        if (group) group.querySelectorAll('button.pill[aria-pressed]').forEach((p) => p.setAttribute('aria-pressed', String(p === pill)));
        else pill.setAttribute('aria-pressed', String(pill.getAttribute('aria-pressed') !== 'true'));
        pill.dispatchEvent(new CustomEvent('b3:change', { bubbles: true }));
      });
    });
    // Removable tags
    root.querySelectorAll('.pill .remove-btn').forEach((btn) => {
      if (!once(btn)) return;
      btn.addEventListener('click', () => btn.closest('.pill').remove());
    });
    // Theme button: cycles automatisch → hell → dunkel (v6.2 markup with the moon icon works too)
    root.querySelectorAll('[data-b3-theme-toggle]').forEach((btn) => {
      if (!once(btn)) return;
      btn.addEventListener('click', () => setTheme(THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length]));
    });
    applyTheme(getTheme());
    // Dialog openers: <button data-open-dialog="id">
    root.querySelectorAll('[data-open-dialog]').forEach((btn) => {
      if (!once(btn)) return;
      btn.addEventListener('click', () => document.getElementById(btn.dataset.openDialog)?.showModal());
    });
  }

  /* Dropdown menus: native popover; we position and add arrow keys. */
  function initMenus(root) {
    root.querySelectorAll('.menu[popover]').forEach((menu) => {
      if (!once(menu)) return;
      const items = () => [...menu.querySelectorAll('.menu-item:not([disabled])')];
      menu.addEventListener('toggle', (e) => {
        const invoker = document.querySelector('[popovertarget="' + menu.id + '"]');
        invoker?.setAttribute('aria-expanded', String(e.newState === 'open'));
        if (e.newState !== 'open' || !invoker) return;
        const r = invoker.getBoundingClientRect();
        const m = menu.getBoundingClientRect();
        const gap = 4;
        let top = r.bottom + gap;
        if (top + m.height > innerHeight - 8 && r.top - gap - m.height > 8) top = r.top - gap - m.height;
        let left = r.left;
        if (left + m.width > innerWidth - 8) left = Math.max(8, r.right - m.width);
        menu.style.top = top + 'px';
        menu.style.left = left + 'px';
        items()[0]?.focus();
      });
      menu.addEventListener('keydown', (e) => {
        const list = items();
        const i = list.indexOf(document.activeElement);
        if (e.key === 'Tab') { menu.hidePopover(); return; }   // focus returns to the button, Tab moves on
        const keys = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        list[(keys[e.key] + list.length) % list.length]?.focus();
      });
      menu.addEventListener('click', (e) => {
        if (e.target.closest('.menu-item')) menu.hidePopover();
      });
    });
    // Close open menus on scroll (positions are fixed to the viewport)
    if (!wired.has(document)) {
      wired.add(document);
      addEventListener('scroll', () => document.querySelectorAll('.menu:popover-open').forEach((m) => m.hidePopover()), { passive: true });
    }
  }

  function copyText(text, feedbackEl, button) {
    const done = () => {
      if (feedbackEl) {
        feedbackEl.textContent = 'Kopiert';
        setTimeout(() => { feedbackEl.textContent = ''; }, 2000);
      } else if (button) {
        const label = button.textContent;
        button.textContent = 'Kopiert';
        setTimeout(() => { button.textContent = label; }, 2000);
      }
    };
    navigator.clipboard?.writeText(text).then(done, () => toast('error', 'Kopieren nicht möglich. Bitte markiere den Text und drücke Strg + C.'));
  }

  function initCopy(root) {
    // <button data-copy="#selector"> or data-copy="literal text"
    root.querySelectorAll('[data-copy]').forEach((btn) => {
      if (!once(btn)) return;
      btn.addEventListener('click', () => {
        const ref = btn.dataset.copy;
        let target = null;
        try { target = ref.startsWith('#') ? document.querySelector(ref) : null; } catch (e) { /* not a selector */ }
        const text = target ? (target.value ?? target.textContent) : ref;
        copyText(text.trim(), btn.closest('.copy-field')?.querySelector('.copy-feedback'), btn);
      });
    });
    root.querySelectorAll('.code-figure .code-copy').forEach((btn) => {
      if (!once(btn)) return;
      btn.addEventListener('click', () => copyText(btn.closest('.code-figure').querySelector('pre').textContent, null, btn));
    });
  }

  function initForms(root) {
    // Range slider → <output for="id">, optional data-unit=" %"
    root.querySelectorAll('input.range-slider').forEach((input) => {
      if (!once(input)) return;
      const out = root.querySelector('output[for~="' + input.id + '"]') || document.querySelector('output[for~="' + input.id + '"]');
      if (!out) return;
      const unit = input.dataset.unit ?? '';
      const render = () => { out.textContent = fmt.number(input.value) + unit; };
      input.addEventListener('input', render);
      render();
    });
    // Upload zone: drag highlight + hand dropped files to the input
    root.querySelectorAll('.upload-zone').forEach((zone) => {
      if (!once(zone)) return;
      const input = zone.querySelector('input[type="file"]');
      ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('dragover'); }));
      ['dragleave', 'dragend', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('dragover'); }));
      zone.addEventListener('drop', (e) => {
        if (!input || !e.dataTransfer?.files.length) return;
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  /* Quiz: <div class="quiz-options" data-quiz> with <button class="quiz-option" data-correct="true">,
     a sibling <div data-correct-text="…" data-incorrect-text="…"> for the feedback and an
     optional sibling <button data-quiz-reset> ("Nochmal versuchen"), shown once answered. */
  function initQuiz(root) {
    root.querySelectorAll('.quiz-options[data-quiz]').forEach((group) => {
      if (!once(group)) return;
      const slot = group.parentElement.querySelector('[data-correct-text]');
      const retry = group.parentElement.querySelector('[data-quiz-reset]');
      if (retry) {
        retry.hidden = true;
        retry.addEventListener('click', () => {
          group.querySelectorAll('.quiz-option').forEach((o) => { o.disabled = false; o.classList.remove('correct', 'incorrect'); });
          if (slot) slot.innerHTML = '';
          retry.hidden = true;
          group.querySelector('.quiz-option')?.focus();
        });
      }
      group.addEventListener('click', (e) => {
        const chosen = e.target.closest('.quiz-option');
        if (!chosen || chosen.disabled) return;
        const right = chosen.dataset.correct === 'true';
        group.querySelectorAll('.quiz-option').forEach((o) => {
          o.disabled = true;
          if (o.dataset.correct === 'true') o.classList.add('correct');
        });
        if (!right) chosen.classList.add('incorrect');
        if (slot) {
          slot.innerHTML = '';
          const fb = document.createElement('div');
          fb.className = 'quiz-feedback ' + (right ? 'correct' : 'incorrect');
          fb.setAttribute('role', 'status');
          fb.innerHTML = '<span aria-hidden="true">' + (right ? '✓' : '✗') + '</span><div><strong></strong> <span></span></div>';
          fb.querySelector('strong').textContent = right ? 'Richtig.' : 'Noch nicht.';
          fb.querySelector('div span').textContent = right ? slot.dataset.correctText : slot.dataset.incorrectText;
          slot.appendChild(fb);
        }
        if (retry) retry.hidden = false;
        group.dispatchEvent(new CustomEvent('b3:answer', { detail: { correct: right, option: chosen }, bubbles: true }));
      });
    });
  }

  /* Checked exercise: <form data-exercise> with fields carrying data-answer
     (several accepted answers: "GPIO 17|17"; numbers may add data-tolerance).
     Marks .input-unit / .match-row as .correct / .incorrect and writes the
     result into [data-exercise-result]. Empty fields stay open, unmarked. */
  function initExercises(root) {
    root.querySelectorAll('form[data-exercise]').forEach((form) => {
      if (!once(form)) return;
      const result = form.querySelector('[data-exercise-result]');
      const fields = () => [...form.querySelectorAll('[data-answer]')];
      const box = (field) => field.closest('.input-unit, .match-row') || field;
      const unmark = (field) => { box(field).classList.remove('correct', 'incorrect'); field.removeAttribute('aria-invalid'); };
      const isRight = (field) => {
        const given = field.value.trim();
        return field.dataset.answer.split('|').some((answer) => {
          const want = parseNumber(answer);
          if (!Number.isNaN(want) && field.tagName !== 'SELECT') {
            const tolerance = parseNumber(field.dataset.tolerance ?? '0') || 0;
            return Math.abs(parseNumber(given) - want) <= tolerance + 1e-9;
          }
          return given.toLowerCase() === answer.trim().toLowerCase();
        });
      };
      form.noValidate = true;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let correct = 0, open = 0;
        const all = fields();
        all.forEach((field) => {
          unmark(field);
          if (!field.value.trim()) { open++; return; }   // selects start with <option value="">Bitte wählen</option>
          const right = isRight(field);
          if (right) correct++;
          else field.setAttribute('aria-invalid', 'true');
          box(field).classList.add(right ? 'correct' : 'incorrect');
        });
        if (result) {
          const done = correct === all.length;
          let text = correct + ' von ' + all.length + ' richtig';
          text += open ? ', ' + open + ' noch offen.' : '.';
          const why = done ? result.dataset.correctText : result.dataset.incorrectText;
          result.textContent = text + (why ? ' ' + why : '');
        }
        form.dispatchEvent(new CustomEvent('b3:check', { detail: { correct, open, total: all.length }, bubbles: true }));
      });
      // A changed answer is no longer the checked one
      const edited = (e) => { if (e.target.matches?.('[data-answer]')) unmark(e.target); };
      form.addEventListener('input', edited);
      form.addEventListener('change', edited);
      form.addEventListener('reset', () => { fields().forEach(unmark); if (result) result.textContent = ''; });
    });
  }

  /* Sortable tables: <table data-sortable>, sortable columns carry
     <th aria-sort="none"><button class="sort-btn">…</button></th>.
     Understands German numbers ("1,5", "46 / 50", "87 %") and dates
     ("15.07.2026"); a cell may give its own key with data-sort="…".
     Empty cells and "–" always go last. */
  function sortKey(cell) {
    const text = (cell?.dataset.sort ?? cell?.textContent ?? '').trim();
    if (!text || /^[–—-]$/.test(text)) return { empty: true, text };
    const d = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/.exec(text);
    if (d) return { num: new Date(+d[3], d[2] - 1, +d[1], +(d[4] || 0), +(d[5] || 0)).getTime(), text };
    const n = /^[+\-−–]?\s*\d[\d.]*(?:,\d+)?/.exec(text);
    return n ? { num: parseNumber(n[0]), text } : { text };
  }

  const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });

  function initSort(root) {
    root.querySelectorAll('table[data-sortable]').forEach((table) => {
      if (!once(table)) return;
      const headers = [...table.querySelectorAll('thead th')].filter((th) => th.querySelector('.sort-btn'));
      headers.forEach((th) => {
        if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');
        th.querySelector('.sort-btn').addEventListener('click', () => {
          const direction = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
          const sign = direction === 'ascending' ? 1 : -1;
          headers.forEach((h) => h.setAttribute('aria-sort', h === th ? direction : 'none'));
          [...table.tBodies].forEach((tbody) => {
            const rows = [...tbody.rows].map((row) => ({ row, key: sortKey(row.cells[th.cellIndex]) }));
            rows.sort((a, b) => {
              if (a.key.empty || b.key.empty) return (a.key.empty ? 1 : 0) - (b.key.empty ? 1 : 0);
              const an = a.key.num !== undefined, bn = b.key.num !== undefined;
              if (an && bn && a.key.num !== b.key.num) return sign * (a.key.num - b.key.num);
              if (an !== bn) return an ? -1 : 1;
              return sign * collator.compare(a.key.text, b.key.text);
            });
            rows.forEach(({ row }) => tbody.appendChild(row));
          });
          table.dispatchEvent(new CustomEvent('b3:sort', { detail: { column: th.cellIndex, direction }, bubbles: true }));
        });
      });
    });
  }

  /* Wide tables and code scroll sideways. Without a focus stop they cannot
     be scrolled by keyboard (WCAG 2.1.1), so an overflowing box gets one. */
  const scrollWatch = window.ResizeObserver ? new ResizeObserver((entries) => entries.forEach((e) => syncScrollBox(e.target))) : null;

  function syncScrollBox(box) {
    const overflows = box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1;
    if (overflows && !box.hasAttribute('tabindex')) {
      box.tabIndex = 0;
      box.dataset.b3Scroll = '';
      const caption = box.matches('.table-scroll') && box.querySelector('caption');
      if (caption && !box.hasAttribute('role') && !box.hasAttribute('aria-label')) {
        box.setAttribute('role', 'region');
        box.setAttribute('aria-label', caption.textContent.trim());
      }
    } else if (!overflows && 'b3Scroll' in box.dataset) {
      box.removeAttribute('tabindex');
      delete box.dataset.b3Scroll;
    }
  }

  function initScroll(root) {
    root.querySelectorAll('.table-scroll, pre.code-block').forEach((box) => {
      if (!once(box)) return;
      syncScrollBox(box);
      scrollWatch?.observe(box);
    });
  }

  /* --- Form validation --------------------------------------------
     <form data-validate> — native constraints (required, type, min, max,
     minlength, pattern), German messages that say what to do, shown in a
     .form-error below the field (created if missing), aria-invalid +
     aria-describedby, focus on the first problem. data-error="…" on a
     field replaces the built-in message. Your submit handler only runs
     when the form is valid. An optional .form-summary lists all problems. */
  const ERROR_ICON = svg(ICONS.error);

  function fieldMessage(field) {
    const v = field.validity;
    if (v.valid) return '';
    if (field.dataset.error) return field.dataset.error;
    if (v.valueMissing) {
      if (field.type === 'checkbox') return 'Setze den Haken, um fortzufahren.';
      if (field.type === 'radio' || field.tagName === 'SELECT') return 'Wähle eine Option aus.';
      if (field.type === 'file') return 'Wähle eine Datei aus.';
      return 'Fülle dieses Feld aus.';
    }
    if (v.typeMismatch && field.type === 'email') return 'Gib eine E-Mail-Adresse mit @ ein, z.' + NBSP + 'B. name@b3-fuerth.de.';
    if (v.typeMismatch && field.type === 'url') return 'Gib eine vollständige Adresse ein, z.' + NBSP + 'B. https://www.b3-fuerth.de.';
    if (v.tooShort) return 'Gib mindestens ' + field.minLength + ' Zeichen ein.';
    if (v.tooLong) return 'Kürze die Eingabe auf höchstens ' + field.maxLength + ' Zeichen.';
    if (v.rangeUnderflow) return 'Gib einen Wert ab ' + rangeLimit(field, field.min) + ' ein.';
    if (v.rangeOverflow) return 'Gib einen Wert bis ' + rangeLimit(field, field.max) + ' ein.';
    if (v.badInput || v.stepMismatch) return field.type === 'number' ? 'Gib eine Zahl ein.' : 'Prüfe die Eingabe.';
    if (v.patternMismatch) return field.title || 'Halte das vorgegebene Format ein.';
    return 'Prüfe die Eingabe.';
  }

  const rangeLimit = (field, value) =>
    field.type === 'date' ? fmt.date(value) : field.type === 'number' || field.type === 'range' ? fmt.number(value) : value;

  function setFieldError(field, message) {
    const id = (field.id || (field.id = 'b3-field-' + (++uid))) + '-error';
    let error = document.getElementById(id);
    if (!error && !message) { field.removeAttribute('aria-invalid'); return; }
    if (!error) {
      error = document.createElement('span');
      error.className = 'form-error';
      error.id = id;
      (field.closest('.input-unit, .search-container, .check, .switch, .radio-group, .checkbox-group, .upload-zone') || field).after(error);
    }
    const described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!described.includes(id)) field.setAttribute('aria-describedby', [...described, id].join(' '));
    if (message) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    error.hidden = !message;
    error.innerHTML = message ? ERROR_ICON : '';
    if (message) error.append(message);
  }

  // One entry per field; a radio group counts once (its first button)
  function validatable(form) {
    const seen = new Set();
    return [...form.elements].filter((el) => {
      if (!el.willValidate) return false;
      if (el.type !== 'radio') return true;
      if (seen.has(el.name)) return false;
      seen.add(el.name);
      return true;
    });
  }

  function validate(form) {
    const invalid = [];
    validatable(form).forEach((field) => {
      const message = fieldMessage(field);
      setFieldError(field, message);
      if (message) invalid.push({ field, message });
    });
    const summary = form.querySelector('.form-summary');
    if (summary) {
      summary.hidden = invalid.length === 0;
      summary.innerHTML = '';
      if (invalid.length) {
        summary.innerHTML = ERROR_ICON + '<div><span class="alert-title"></span><ul></ul></div>';
        summary.querySelector('.alert-title').textContent =
          invalid.length === 1 ? 'Ein Feld braucht noch deine Eingabe.' : invalid.length + ' Felder brauchen noch deine Eingabe.';
        invalid.forEach(({ field, message }) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = '#' + field.id;
          // A checkbox label is a whole sentence: there the message stands alone
          const label = field.type === 'checkbox' || field.type === 'radio' ? '' : field.labels?.[0]?.textContent.trim();
          a.textContent = (label ? label + ': ' : '') + message;
          a.addEventListener('click', (e) => { e.preventDefault(); field.focus(); });
          li.appendChild(a);
          summary.querySelector('ul').appendChild(li);
        });
      }
    }
    if (invalid.length) {
      invalid[0].field.focus();
      form.dispatchEvent(new CustomEvent('b3:invalid', { detail: { fields: invalid.map((i) => i.field) }, bubbles: true }));
    }
    return invalid.length === 0;
  }

  function initValidation(root) {
    root.querySelectorAll('form[data-validate]').forEach((form) => {
      if (!once(form)) return;
      form.noValidate = true;   // our messages instead of the browser's bubbles
      form.addEventListener('submit', (e) => {
        if (validate(form)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      });
      // Once a field is marked, it clears as soon as it is fixed
      const recheck = (e) => {
        const field = e.target;
        if (!field.willValidate) return;
        const marked = field.type === 'radio' ? form.querySelector('input[type="radio"][name="' + field.name + '"][aria-invalid="true"]') : field.getAttribute('aria-invalid') === 'true' && field;
        if (marked && field.validity.valid) setFieldError(marked, '');
      };
      form.addEventListener('input', recheck);
      form.addEventListener('change', recheck);
      form.addEventListener('reset', () => {
        validatable(form).forEach((field) => setFieldError(field, ''));
        const summary = form.querySelector('.form-summary');
        if (summary) summary.hidden = true;
      });
    });
  }

  function init(root = document) {
    initTabs(root);
    initToggles(root);
    initMenus(root);
    initCopy(root);
    initValidation(root);   // before other submit handlers: they only see valid forms
    initForms(root);
    initExercises(root);
    initSort(root);
    initScroll(root);
    initQuiz(root);
  }

  // Apply the theme before first paint where possible (the <head> snippet does it earlier)
  if (!document.documentElement.hasAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', resolveTheme(getTheme()));
  }

  window.B3 = { init, toast, confirm: confirmDialog, setTheme, getTheme, validate, setFieldError, parseNumber, fmt };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
