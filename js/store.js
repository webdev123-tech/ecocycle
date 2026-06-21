/* ===========================================================================
   EcoCycle — Store: API-backed state, auth, persistence
   Reads stay synchronous against an in-memory cache hydrated from the server.
   Mutations call the real API, then refresh the cache.
   =========================================================================== */
import { api, setToken, getToken } from './api.js';

const PREFS = 'ecocycle:prefs';
const listeners = new Set();

export const CITY = { name: 'Kampala', lat: 0.3476, lng: 32.5825 };

/* demo accounts for the one-tap role switch */
const DEMO = {
  citizen:   { email: 'amina.n@gmail.com',   pw: 'ecocycle' },
  collector: { email: 'j.okello@ecocycle.ug', pw: 'ecocycle' },
  admin:     { email: 's.mbabazi@ecocycle.ug', pw: 'ecocycle' },
};

/* -------------------------------------------------------------------------
   Static reference content (UI-only, not persisted)
   ------------------------------------------------------------------------- */
export const CATEGORIES = [
  { key:'organic', name:'Organic', emoji:'🍂', color:'linear-gradient(150deg,#65a30d,#3f6212)',
    tips:'Food scraps, peelings, garden trimmings. Compost it — never mix with plastic.',
    how:['Use a separate caddy / pit', 'Add to compost or organic bin', 'Avoid meat in home compost'] },
  { key:'plastic', name:'Plastic', emoji:'🥤', color:'linear-gradient(150deg,#0284c7,#075985)',
    tips:'Bottles, containers, bags. Rinse and crush bottles to save space.',
    how:['Rinse & dry', 'Crush bottles, keep caps on', 'Drop at a recycling point — earn points'] },
  { key:'paper', name:'Paper', emoji:'📦', color:'linear-gradient(150deg,#f59e0b,#b45309)',
    tips:'Newspaper, cardboard, office paper. Keep it dry and clean.',
    how:['Flatten cardboard', 'Keep dry & grease-free', 'Bundle and recycle'] },
  { key:'glass', name:'Glass', emoji:'🍾', color:'linear-gradient(150deg,#0d9488,#115e59)',
    tips:'Bottles and jars. Handle with care; rinse before recycling.',
    how:['Rinse', 'Remove lids', 'Separate by colour if asked'] },
  { key:'metal', name:'Metal', emoji:'🥫', color:'linear-gradient(150deg,#64748b,#334155)',
    tips:'Cans, tins, foil. Highly valuable — most centres pay cash.',
    how:['Rinse cans', 'Crush to save space', 'Sell at a scrap / recycling centre'] },
  { key:'ewaste', name:'Electronics', emoji:'🔌', color:'linear-gradient(150deg,#7c3aed,#5b21b6)',
    tips:'Phones, cables, batteries. Never burn or bin — toxic.',
    how:['Back up & wipe data', 'Take to an e-waste point', 'Never burn batteries'] },
  { key:'medical', name:'Medical', emoji:'🩹', color:'linear-gradient(150deg,#e11d48,#9f1239)',
    tips:'Sharps, expired drugs, dressings. Hazardous — special handling only.',
    how:['Use sealed sharps box', 'Return drugs to a pharmacy', 'Call EcoCycle hazardous line'] },
  { key:'hazardous', name:'Hazardous', emoji:'☣️', color:'linear-gradient(150deg,#ea580c,#9a3412)',
    tips:'Chemicals, oils, paint, batteries. Keep away from drains & soil.',
    how:['Keep in original containers', 'Never pour down drains', 'Book a hazardous pickup'] },
];

export const REPORT_TYPES = [
  { k:'Illegal dumping', icon:'🗑️' }, { k:'Overflowing bin', icon:'🪣' },
  { k:'Missed collection', icon:'🚛' }, { k:'Broken bin', icon:'🧹' },
  { k:'Hazardous waste', icon:'☣️' }, { k:'Dead animal', icon:'🐾' },
  { k:'Sewage leak', icon:'💧' }, { k:'Other', icon:'❓' },
];

export const WASTE_BOOK_TYPES = ['Household waste','Garden waste','Construction waste','E-waste','Furniture','Plastic','Metal','Glass'];

export const QUIZ = [
  { q:'Which bin do banana peels and food scraps belong in?', a:['Organic','Plastic','General'], c:0 },
  { q:'Before recycling a plastic bottle, you should…', a:['Burn it','Rinse and crush it','Bury it'], c:1 },
  { q:'Used batteries and old phones are…', a:['General waste','E-waste / hazardous','Organic'], c:1 },
  { q:'What is the most eco-friendly first step?', a:['Recycle everything','Reduce & reuse first','Burn waste'], c:1 },
  { q:'Sewage and chemical waste should…', a:['Go down the drain','Be reported & specially handled','Be buried'], c:1 },
];

export const EDU = [
  { id:'ed1', kind:'Video', mins:4, title:'Why separating waste matters', emoji:'🎬',
    body:'Separating waste at the source means more can be recycled and less ends up in landfills or drainage channels. In Kampala, blocked drains from mixed waste are a leading cause of flooding. Sorting into organic, plastic, paper and hazardous turns a problem into a resource.' },
  { id:'ed2', kind:'Guide', mins:3, title:'The 5 Rs: Refuse, Reduce, Reuse, Recycle, Rot', emoji:'♻️',
    body:'Recycling is powerful but it is not first. Refuse what you do not need, Reduce what you use, Reuse what you can, Recycle what is left, and Rot (compost) the organics. Following this order shrinks your waste before it is even created.' },
  { id:'ed3', kind:'Article', mins:5, title:'Composting at home in a small space', emoji:'🌱',
    body:'You do not need a garden to compost. A small bucket with a lid, a handful of soil, and dry leaves can turn kitchen scraps into rich fertiliser in weeks. Layer wet (food) and dry (paper, leaves) materials, keep it covered, and stir weekly.' },
  { id:'ed4', kind:'Infographic', mins:2, title:'What your Green Points really save', emoji:'📊',
    body:'Every kilogram you recycle keeps roughly 0.75 kg of CO₂ out of the air and saves landfill space. Recycling 40 aluminium cans saves enough energy to power a home for a full day. Your points are a real footprint of impact.' },
];

export const FAQ = [
  { q:'How do I schedule a waste collection?', a:'Open Schedule from the home screen or the + button, choose your waste type, date and time, and confirm. You will get a notification when the truck is on the way.' },
  { q:'How do Green Points work?', a:'You earn points by recycling, reporting issues, and keeping a streak. Redeem them for airtime, cash, coupons or to plant a tree in the Rewards tab.' },
  { q:'What do I do with hazardous waste?', a:'Never bin or burn it. Use the Report tool and select Hazardous waste, or book an on-call hazardous pickup. Our team handles it safely.' },
  { q:'Is my report anonymous?', a:'Your report is linked to your account so we can update you on progress, but your identity is never shown publicly on the map.' },
];

/* -------------------------------------------------------------------------
   State (in-memory cache)
   ------------------------------------------------------------------------- */
const EMPTY_DATA = {
  reports:[], schedule:[], history:[], recycleLog:[], rewards:[], redemptions:[],
  leaderboard:[], badges:[], notifications:[], bins:[], centers:[], trucks:[],
  jobs:[], jobsDone:0, jobsMissed:0, fuelL:0, complaints:[], kpi:{}, series:{},
};

let prefs = loadPrefs();
let state = {
  meta: { theme: prefs.theme || 'light', lang: prefs.lang || 'English', onboarded: false },
  session: { authed: false, user: null, role: 'citizen' },
  integrations: { sms:'sandbox', email:'sandbox', payments:'sandbox', google:'sandbox' },
  eduDone: prefs.eduDone || [], quizBest: prefs.quizBest || 0,
  ...structuredCloneSafe(EMPTY_DATA),
};

function structuredCloneSafe(o){ return JSON.parse(JSON.stringify(o)); }
function loadPrefs(){ try { return JSON.parse(localStorage.getItem(PREFS)) || {}; } catch(e){ return {}; } }
function savePrefs(){ try { localStorage.setItem(PREFS, JSON.stringify({
  theme: state.meta.theme, lang: state.meta.lang, eduDone: state.eduDone, quizBest: state.quizBest })); } catch(e){} }

function hydrate(boot) {
  Object.assign(state, EMPTY_DATA, boot);
  state.session.authed = true;
  state.session.user = boot.me;
  state.session.role = boot.me.role;
  state.meta.onboarded = true;
}

/* -------------------------------------------------------------------------
   Public Store
   ------------------------------------------------------------------------- */
export const Store = {
  get() { return state; },
  get me() { return state.session.user || {}; },
  get role() { return state.session.role; },
  get authed() { return state.session.authed; },

  async init() {
    applyTheme();
    try { const s = await api.get('/status'); state.integrations = s.integrations; state.googleClientId = s.googleClientId || null; } catch(e){}
    if (getToken()) {
      try { hydrate(await api.get('/bootstrap')); }
      catch (e) { setToken(null); state.session.authed = false; }
    }
    emit();
  },

  async refresh() { if (!getToken()) return; try { hydrate(await api.get('/bootstrap')); emit(); } catch(e){} },

  /* ---- auth ---- */
  async login(email, password) {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.token); hydrate(await api.get('/bootstrap')); emit(); return r.user;
  },
  async register(payload) {
    const r = await api.post('/auth/register', payload);
    setToken(r.token); hydrate(await api.get('/bootstrap')); emit(); return r.user;
  },
  async googleLogin(idToken) {
    const r = await api.post('/auth/google', { idToken });
    setToken(r.token); hydrate(await api.get('/bootstrap')); emit(); return r.user;
  },
  async setRole(role) { const d = DEMO[role]; if (!d) return; return this.login(d.email, d.pw); },
  logout() { setToken(null); Object.assign(state, EMPTY_DATA); state.session = { authed:false, user:null, role:'citizen' }; emit(); },

  requestOtp(channel, identifier) { return api.post('/auth/otp/request', { channel, identifier }); },
  verifyOtp(code, identifier) { return api.post('/auth/otp/verify', { code, identifier }); },

  /* ---- mutations (call API, then refresh cache) ---- */
  async addReport({ type, urgency, desc, area, lat, lng, photoFile }) {
    const fd = new FormData();
    fd.append('type', type); fd.append('urgency', urgency || 'Medium');
    fd.append('desc', desc || ''); fd.append('area', area || 'Kampala');
    if (lat != null) fd.append('lat', lat); if (lng != null) fd.append('lng', lng);
    if (photoFile) fd.append('photo', photoFile);
    const r = await api.postForm('/reports', fd);
    await this.refresh(); return r.report.id;
  },
  async addSchedule(obj) { const r = await api.post('/schedules', obj); await this.refresh(); return r.schedule; },
  async addRecycle(material, qty, pts) { const r = await api.post('/recycle', { material, qty, pts }); await this.refresh(); return r; },
  async redeem(rw) { try { await api.post('/rewards/redeem', { rewardId: rw.id }); await this.refresh(); return true; } catch(e){ return false; } },
  async completeJob(id, proofFile) { const fd = new FormData(); if (proofFile) fd.append('proof', proofFile); await api.postForm(`/jobs/${id}/complete`, fd); await this.refresh(); },
  async setReportStatus(id, status) { await api.patch('/reports/' + id, { status }); await this.refresh(); },
  async addComplaint(subject) { await api.post('/complaints', { subject }); await this.refresh(); },
  async markAllRead() { await api.post('/notifications/read-all', {}); await this.refresh(); },
  async earnPoints(amount, reason) { await api.post('/me/points', { amount, reason }); await this.refresh(); },
  async updateTruck(id, body) { await api.post(`/trucks/${id}/location`, body); },
  initPayment(amount, method) { return api.post('/payments/init', { amount, method }); },

  /* ---- local prefs ---- */
  setTheme(t) { state.meta.theme = t; savePrefs(); applyTheme(); emit(); },
  toggleTheme() { this.setTheme(state.meta.theme === 'dark' ? 'light' : 'dark'); },
  setLang(l) { state.meta.lang = l; savePrefs(); emit(); },
  finishEdu(id) { if (!state.eduDone.includes(id)) { state.eduDone.push(id); savePrefs(); emit(); } },
  async setQuiz(score) { if (score > state.quizBest) { state.quizBest = score; savePrefs(); if (score >= 4) await this.earnPoints(50, 'Aced the Waste IQ quiz!'); } emit(); },
  reset() { this.logout(); },
};

/* ---- pub/sub ---- */
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => { try { fn(state); } catch(e){ console.error(e); } }); }

/* ---- theme ---- */
export function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.meta.theme || 'light');
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', state.meta.theme === 'dark' ? '#0c110e' : '#15803d');
}

export const unread = () => state.notifications.filter(n => n.unread).length;
