/** Schedule: accessible day tabs (arrow keys), opens on today's tab during the fest, and marks live slots. */
export function mountSchedule() {
  const tabs = [...document.querySelectorAll('[data-day-tab]')];
  const panels = [...document.querySelectorAll('[data-day-panel]')];
  if (!tabs.length) return () => {};
  function select(i, focus) {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== i; });
    if (focus) tabs[i].focus();
  }
  const onClick = (e) => { const i = tabs.indexOf(e.currentTarget); if (i >= 0) select(i, false); };
  const onKey = (e) => {
    const i = tabs.indexOf(e.currentTarget);
    if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % tabs.length, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
    if (e.key === 'Home') { e.preventDefault(); select(0, true); }
    if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
  };
  tabs.forEach((t) => { t.addEventListener('click', onClick); t.addEventListener('keydown', onKey); });

  function markLive() {
    const now = Date.now();
    let today = -1;
    panels.forEach((p, k) => {
      p.querySelectorAll('.slot').forEach((s) => {
        const a = Date.parse(s.dataset.start), b = s.dataset.end ? Date.parse(s.dataset.end) : a + 2 * 3600e3;
        s.classList.toggle('is-now', now >= a && now <= b);
        if (new Date(a).toDateString() === new Date(now).toDateString()) today = k;
      });
    });
    return today;
  }
  const today = markLive();
  if (today >= 0) select(today, false);
  const id = setInterval(markLive, 60000);
  return () => { clearInterval(id); tabs.forEach((t) => { t.removeEventListener('click', onClick); t.removeEventListener('keydown', onKey); }); };
}
