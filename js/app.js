/* ===========================================================================
   EcoCycle — App shell + hash router + boot
   =========================================================================== */
import { Store, subscribe, applyTheme, unread } from './store.js';
import { icon } from './ui.js';
import { clearMaps } from './maps.js';
import { clearCharts } from './charts.js';
import { routes as coreRoutes } from './views-core.js';
import { routes as moreRoutes } from './views-more.js';

const ROUTES = { ...coreRoutes, ...moreRoutes };

/* ---- bottom nav per role ---- */
const NAV = {
  citizen:[
    {ic:'home',l:'Home',h:'#/home'}, {ic:'map',l:'Map',h:'#/map'},
    {fab:'camera',h:'#/report'},
    {ic:'gift',l:'Rewards',h:'#/rewards'}, {ic:'user',l:'Profile',h:'#/profile'},
  ],
  collector:[
    {ic:'home',l:'Jobs',h:'#/home'}, {ic:'map',l:'Route',h:'#/route'},
    {fab:'scan',h:'#/scan'},
    {ic:'list',l:'History',h:'#/chistory'}, {ic:'user',l:'Profile',h:'#/profile'},
  ],
  admin:[
    {ic:'home',l:'Dash',h:'#/home'}, {ic:'impact',l:'Stats',h:'#/analytics'},
    {fab:'alert',h:'#/emergency'},
    {ic:'layers',l:'Manage',h:'#/manage'}, {ic:'user',l:'Profile',h:'#/profile'},
  ],
};

/* ---- route matching (supports :params) ---- */
function match(path) {
  const segs = path.split('/').filter(Boolean);
  for (const key of Object.keys(ROUTES)) {
    const ks = key.split('/');
    if (ks.length !== segs.length) continue;
    const params = {}; let ok = true;
    for (let i=0;i<ks.length;i++){
      if (ks[i].startsWith(':')) params[ks[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (ks[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return { fn: ROUTES[key], params };
  }
  return null;
}

function currentPath() {
  let h = location.hash.replace(/^#\/?/, '');
  if (!h) h = Store.authed ? 'home' : 'auth';
  return h;
}
const baseOf = (h) => h.replace(/^#\/?/, '').split('/')[0];

/* ---- render ---- */
let rendering = false;
function render() {
  if (rendering) return; rendering = true;
  clearMaps(); clearCharts();

  const app = document.getElementById('app');
  const path = currentPath();
  // gate: must be authenticated except for auth screen
  if (path !== 'auth' && !Store.authed) { location.hash = '#/auth'; rendering=false; return; }
  if (path === 'auth' && Store.authed) { location.hash = '#/home'; rendering=false; return; }

  const m = match(path) || match('home');
  let view;
  try { view = m.fn(m.params || {}); }
  catch (e) { console.error(e); view = { title:'Error', html:`<div class="empty"><div class="e">⚠️</div><div>Something went wrong.</div><pre class="tiny" style="white-space:pre-wrap;text-align:left">${(e&&e.message)||e}</pre></div>` }; }

  const role = Store.role;
  const showBar = view.bar !== false;
  const showNav = view.nav !== false && path !== 'auth';
  const flush = view.flush || view.full;

  let html = '';
  if (showBar) {
    const actions = (view.actions||[]).map(a=>{
      const noteDot = a.icon==='bell' && unread()>0;
      return `<button class="iconbtn" ${a.id?`id="${a.id}"`:''} ${a.go?`data-go="${a.go}"`:''}>${icon(a.icon)}${(a.dot||noteDot)?'<span class="dot"></span>':''}</button>`;
    }).join('');
    html += `<div class="appbar">
      ${view.back?`<button class="iconbtn back" id="navback">${icon('back')}</button>`:''}
      <div class="flex1"><div class="appbar__title">${view.title||'EcoCycle'}</div>${view.sub?`<div class="appbar__sub">${view.sub}</div>`:''}</div>
      ${actions}
    </div>`;
  }
  html += view.full ? view.html : `<div class="screen ${flush?'screen--flush':''} view-anim" id="screen">${view.html}</div>`;
  if (view.footer) html += view.footer;
  if (showNav) html += navHTML(role, path);

  app.innerHTML = html;

  // wire shell
  const back = document.getElementById('navback');
  if (back) back.addEventListener('click', ()=> history.length>1 ? history.back() : (location.hash='#/home'));
  wireGoGlobal(app);
  wireNav(app);

  // mount
  const screen = document.getElementById('screen') || app;
  try { view.onMount && view.onMount(screen); } catch(e){ console.error(e); }

  rendering = false;
}

function navHTML(role, path) {
  const items = NAV[role] || NAV.citizen;
  const active = baseOf(path);
  return `<nav class="nav">
    ${items.map(it=> it.fab
      ? `<button class="nav__fab" data-nav="${it.h}">${icon(it.fab)}</button>`
      : `<button class="nav__item ${baseOf(it.h)===active?'is-active':''}" data-nav="${it.h}">${icon(it.ic)}<span>${it.l}</span>${it.ic==='user'&&false?'':''}</button>`
    ).join('')}
  </nav>`;
}

function wireNav(root){ root.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=> location.hash = b.dataset.nav)); }
function wireGoGlobal(root){
  root.querySelectorAll('[data-go]').forEach(el=>{ if(el.__g) return; el.__g=true;
    el.addEventListener('click',(e)=>{ e.stopPropagation(); location.hash = el.dataset.go; }); });
}

/* ---- render coalescing (collapse rapid triggers into one frame) ---- */
let pending = false;
function scheduleRender() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; render(); }); }

/* ---- boot ---- */
async function boot() {
  // hydrate session/data from the real backend (splash shows until ready)
  await Store.init();
  if (!location.hash) location.hash = Store.authed ? '#/home' : '#/auth';

  window.addEventListener('hashchange', scheduleRender);
  subscribe(scheduleRender);   // re-render on any store change (points, theme, reports…)
  scheduleRender();            // single initial render (coalesced with the hash-set event)

  // service worker (offline)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js').catch(()=>{}));
  }
}
boot();
