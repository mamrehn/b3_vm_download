// B3 VM download page: hint for devices that cannot run the VM, random download source.
// Without this script the page still works: the sources are listed under "Andere Download-Quelle wählen".
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ---- Device hints -------------------------------------------------------
  // Only clear cases; when in doubt, say nothing (the requirements are on the page anyway).
  function hinweis(titel, text) {
    document.getElementById('geraete-titel').textContent = titel;
    document.getElementById('geraete-text').textContent = text;
    document.getElementById('geraete-hinweis').hidden = false;
  }

  const ua = navigator.userAgent;
  const istIpad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/Android|iPhone|iPad|iPod/.test(ua) || istIpad) {
    hinweis('Du bist am Handy oder Tablet.', 'Die VM läuft nur auf einem PC oder Laptop. Öffne diese Seite dort: b3-f.de/vm');
  } else if (/CrOS/.test(ua)) {
    hinweis('Chromebooks können die VM nicht ausführen.', 'Nutze einen PC mit Windows oder Linux, z. B. in der Schule.');
  } else if (/Macintosh/.test(ua) && appleChip()) {
    hinweis('Dein Mac hat einen Apple-Chip.', 'Darauf läuft die VM nicht, sie braucht einen Intel- oder AMD-Prozessor. Nutze einen PC in der Schule.');
  } else if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
    navigator.userAgentData.getHighEntropyValues(['architecture']).then((v) => {
      if (v.architecture === 'arm' && navigator.userAgentData.platform === 'Windows') {
        hinweis('Dein PC hat einen ARM-Prozessor (z. B. Snapdragon).', 'Darauf läuft die VM nicht, sie braucht einen Intel- oder AMD-Prozessor. Nutze einen PC in der Schule.');
      }
    }).catch(() => {});
  }

  // Browsers on a Mac always claim "Intel"; the graphics chip tells the truth.
  function appleChip() {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      return /Apple (M\d|GPU)/.test(r) && !/Intel|AMD|Radeon/.test(r);
    } catch (e) {
      return false;
    }
  }

  // ---- Download: random source ------------------------------------------
  const quellen = [...document.querySelectorAll('.mirror-list li[data-auto]')].map((li) => ({
    name: li.dataset.mirror,
    url: li.querySelector('a').href,
    passwort: li.dataset.password || '',
    hinweis: li.dataset.hinweis || ''
  }));
  const dialog = document.getElementById('download-dialog');
  const link = document.getElementById('dl-link');

  document.getElementById('download-btn').addEventListener('click', () => {
    const q = quellen[Math.floor(Math.random() * quellen.length)];
    document.getElementById('dl-quelle').textContent = q.name;
    link.href = q.url;
    document.getElementById('dl-passwort').hidden = !q.passwort;
    document.getElementById('dl-passwort-wert').textContent = q.passwort;
    const hinweis = document.getElementById('dl-hinweis');
    hinweis.textContent = q.hinweis;
    hinweis.hidden = !q.hinweis;
    dialog.showModal();
  });
  link.addEventListener('click', () => dialog.close());
});
