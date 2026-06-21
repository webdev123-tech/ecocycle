/* ===========================================================================
   EcoCycle — UI helpers: icons, toast, sheets, formatting, DOM
   =========================================================================== */

/* ---- Inline SVG icons (Feather-style, 24x24, currentColor) ---- */
const P = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  home:P('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'),
  map:P('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>'),
  recycle:P('<path d="M7 19h10l-2.5-4"/><path d="m4.5 13 2.5 6"/><path d="M7.5 8 5 12.3"/><path d="m9.5 4.5 2.5 4 4-2.3"/><path d="M14 4h3.5L20 8"/><path d="m20 14-1.5 5"/>'),
  impact:P('<path d="M3 3v18h18"/><path d="m7 14 3-4 3 3 5-6"/>'),
  user:P('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
  bell:P('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  plus:P('<path d="M12 5v14M5 12h14"/>'),
  camera:P('<path d="M5 8h3l1.5-2h5L16 8h3v11H5Z"/><circle cx="12" cy="13" r="3.2"/>'),
  scan:P('<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>'),
  truck:P('<path d="M2 6h11v9H2Z"/><path d="M13 9h4l3 3v3h-7Z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>'),
  calendar:P('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>'),
  leaf:P('<path d="M4 20c12 2 16-6 16-16C8 4 2 8 4 20Z"/><path d="M4 20C8 14 12 12 18 10"/>'),
  award:P('<circle cx="12" cy="9" r="6"/><path d="m9 14-2 7 5-3 5 3-2-7"/>'),
  settings:P('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L4.1 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z"/>'),
  chev:P('<path d="m9 6 6 6-6 6"/>'),
  back:P('<path d="m15 18-6-6 6-6"/>'),
  search:P('<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>'),
  send:P('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>'),
  check:P('<path d="m5 13 4 4L19 7"/>'),
  checkcircle:P('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  x:P('<path d="M6 6 18 18M18 6 6 18"/>'),
  alert:P('<path d="M12 3 2 20h20Z"/><path d="M12 9v5M12 17h.01"/>'),
  trash:P('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  pin:P('<path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>'),
  phone:P('<path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>'),
  mail:P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  lock:P('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  eye:P('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  sun:P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>'),
  moon:P('<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>'),
  globe:P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/>'),
  gift:P('<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13"/><path d="M12 8S10 3 7.5 4.5 9 8 12 8Zm0 0s2-5 4.5-3.5S15 8 12 8Z"/>'),
  chat:P('<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z"/>'),
  list:P('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  layers:P('<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>'),
  fuel:P('<path d="M3 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M3 11h10"/><path d="M16 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 1-3 0v-3h-2"/>'),
  nav:P('<path d="M3 11 22 2l-9 19-2-8Z"/>'),
  edit:P('<path d="M12 20h8"/><path d="M16 4 20 8 8 20H4v-4Z"/>'),
  star:P('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>'),
  shield:P('<path d="M12 3 5 6v6c0 5 3.5 7.5 7 9 3.5-1.5 7-4 7-9V6Z"/><path d="m9 12 2 2 4-4"/>'),
  logout:P('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
  filter:P('<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>'),
  image:P('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 16-5-5L5 20"/>'),
  sparkle:P('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/><circle cx="12" cy="12" r="2.5"/>'),
  droplet:P('<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z"/>'),
  flame:P('<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 11 8 9 12 3Z"/>'),
  clock:P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  weight:P('<circle cx="12" cy="6" r="2.5"/><path d="M9 8h6l3 11H6Z"/>'),
  users:P('<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M17 5a3.2 3.2 0 0 1 0 6.2M22 20c0-3-1.6-4.6-4-5.2"/>'),
  cash:P('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v6M18 9v6"/>'),
  mic:P('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  refresh:P('<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4"/>'),
  google:'<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.6 0-1.2-.2-1.8H12v3.5h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2Z"/><path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.7 9.4 6.1 12 6.1Z"/></svg>',
  facebook:'<svg viewBox="0 0 24 24"><path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/></svg>',
};
export function icon(name) { return ICONS[name] || ICONS.x; }

/* ---- DOM ---- */
export const $ = (s, root=document) => root.querySelector(s);
export const $$ = (s, root=document) => [...root.querySelectorAll(s)];
export function setHTML(el, html) { el.innerHTML = html; return el; }

/* ---- formatting ---- */
export function rel(ts) {
  const now = Date.now();
  const d = Math.round((ts - now) / 1000);
  const abs = Math.abs(d);
  const fut = d > 0;
  const fmt = (n,u) => fut ? `in ${n}${u}` : `${n}${u} ago`;
  if (abs < 60) return fut ? 'soon' : 'just now';
  if (abs < 3600) return fmt(Math.round(abs/60),'m');
  if (abs < 86400) return fmt(Math.round(abs/3600),'h');
  if (abs < 7*86400) return fmt(Math.round(abs/86400),'d');
  return new Date(ts).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}
export function dateShort(ts) { return new Date(ts).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); }
export function ugx(n) { return new Intl.NumberFormat('en-UG').format(Math.round(n)); }
export function esc(s='') { return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---- Toast ---- */
let toastTimer;
export function toast(msg, kind='') {
  const host = document.getElementById('toast');
  const ic = kind==='ok'?'check':kind==='err'?'alert':kind==='info'?'sparkle':'check';
  const el = document.createElement('div');
  el.className = 'toast' + (kind?` toast--${kind}`:'');
  el.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
  host.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .3s, transform .3s'; el.style.opacity='0'; el.style.transform='translateY(-12px)'; setTimeout(()=>el.remove(),300); }, 2600);
}

/* ---- Bottom sheet / dialog ---- */
let sheetCloser = null;
export function openSheet(html, { center=false } = {}) {
  const host = document.getElementById('sheet-host');
  host.hidden = false;
  host.className = 'sheet-host' + (center ? ' sheet--center' : '');
  host.innerHTML = `<div class="sheet-back"></div>${center
    ? `<div class="dialog">${html}</div>`
    : `<div class="sheet"><div class="sheet__grip"></div>${html}</div>`}`;
  const close = () => { host.hidden = true; host.innerHTML=''; sheetCloser=null; };
  sheetCloser = close;
  host.querySelector('.sheet-back').addEventListener('click', close);
  host.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click', close));
  return { close, el: host };
}
export function closeSheet() { if (sheetCloser) sheetCloser(); }

/* ---- confirm dialog ---- */
export function confirmDialog({ title, body, ok='Confirm', danger=false, onOk }) {
  const { close } = openSheet(`
    <div class="center">
      <div class="h2 mb-8">${esc(title)}</div>
      <p class="lead mb-16">${esc(body)}</p>
      <div class="btn-row">
        <button class="btn btn--ghost" data-close>Cancel</button>
        <button class="btn ${danger?'btn--danger':'btn--brand'}" id="cfm-ok">${esc(ok)}</button>
      </div>
    </div>`, { center:true });
  document.getElementById('cfm-ok').addEventListener('click', ()=>{ close(); onOk && onOk(); });
}

/* ---- tiny helpers ---- */
export function statusBadge(status) {
  const m = {
    'Pending':'amber','Assigned':'blue','In Progress':'violet','Completed':'green',
    'confirmed':'green','done':'green','Open':'amber','In Review':'blue','Resolved':'green',
    'OK':'green','Near full':'amber','Critical':'red',
  };
  return `<span class="badge badge--${m[status]||'slate'}">${esc(status)}</span>`;
}
export function urgencyBadge(u){ const m={High:'red',Medium:'amber',Low:'slate'}; return `<span class="badge badge--${m[u]||'slate'}">${esc(u)}</span>`; }

/* progress meter html */
export function meter(pct) {
  const cls = pct>=85?'red':pct>=60?'amber':'';
  return `<div class="bar ${cls}"><i style="width:${Math.min(100,pct)}%"></i></div>`;
}

/* delegate one-tap haptic-ish feedback already handled via CSS :active */
