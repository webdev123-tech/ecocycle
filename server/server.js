/* ===========================================================================
   EcoCycle — API server (Express + SQLite + JWT)
   Serves the PWA and a real REST API on one origin.
   =========================================================================== */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { db, uid, now } = require('./db');
const { signToken, hashPassword, checkPassword, publicUser, auth, requireRole } = require('./auth');
const I = require('./integrations');

const app = express();
const PORT = process.env.PORT || 4000;
const ROOT = path.join(__dirname, '..');           // the PWA folder
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => { // permissive CORS (same-origin in practice)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ---- uploads ---- */
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => cb(null, uid('img') + path.extname(file.originalname || '.jpg').slice(0, 5)),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, f, cb) => cb(null, /^image\//.test(f.mimetype)) });

/* ============================ helpers ============================ */
const LEVELS = ['Seedling','Sprout','Sapling','Eco Champion','Eco Star','Eco Legend','Planet Guardian'];
function levelFor(points) { const lvl = Math.min(LEVELS.length, Math.floor(points / 500) + 1); return { level: lvl, name: LEVELS[lvl - 1] }; }
function bumpPoints(userId, delta) {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!u) return null;
  const points = Math.max(0, (u.points || 0) + delta);
  const { level, name } = levelFor(points);
  db.prepare('UPDATE users SET points=?, level=?, level_name=? WHERE id=?').run(points, level, name, userId);
  return db.prepare('SELECT * FROM users WHERE id=?').get(userId);
}
function notify(userId, icon, title, body, kind = 'info') {
  db.prepare('INSERT INTO notifications (id,user_id,icon,title,body,kind,unread,created_at) VALUES (?,?,?,?,?,?,1,?)')
    .run(uid('n'), userId, icon, title, body, kind, now());
}
const nameOf = (id) => (db.prepare('SELECT name FROM users WHERE id=?').get(id) || {}).name || '—';

const mapReport = (r) => ({ id:r.id, type:r.type, urgency:r.urgency, status:r.status, desc:r.description,
  lat:r.lat, lng:r.lng, area:r.area, when:r.created_at, by:r.user_id, byName:nameOf(r.user_id),
  photo:r.photo_url, assignedTo:r.assigned_to });
const mapSched = (s) => ({ id:s.id, type:s.type, date:s.date, slot:s.slot, status:s.status, truck:s.truck, kg:s.kg });
const mapBin = (b) => ({ ...b, iot: !!b.iot });
const mapCenter = (c) => ({ ...c, accepts: JSON.parse(c.accepts || '[]'), buys: !!c.buys });
const mapTruck = (t) => ({ id:t.id, plate:t.plate, driver:t.driver, lat:t.lat, lng:t.lng, cap:t.cap, status:t.status, speed:t.speed });
const mapJob = (j) => ({ id:j.id, addr:j.addr, type:j.type, slot:j.slot, status:j.status, lat:j.lat, lng:j.lng, customer:j.customer, est:j.est, reportId:j.report_id, proof:j.proof_url });
const mapNote = (n) => ({ id:n.id, icon:n.icon, title:n.title, body:n.body, when:n.created_at, unread: !!n.unread, kind:n.kind });
const mapComplaint = (c) => ({ id:c.id, subject:c.subject, status:c.status, when:c.created_at, by:c.by_name });

function badgesFor(u) {
  const reportsN = db.prepare('SELECT COUNT(*) n FROM reports WHERE user_id=?').get(u.id).n;
  const recycleN = db.prepare('SELECT COUNT(*) n FROM recycle_log WHERE user_id=?').get(u.id).n;
  const plasticN = db.prepare("SELECT COUNT(*) n FROM recycle_log WHERE user_id=? AND material LIKE '%lastic%'").get(u.id).n;
  const treeN = db.prepare("SELECT COUNT(*) n FROM redemptions WHERE user_id=? AND name LIKE '%Tree%'").get(u.id).n;
  return [
    { id:'bd1', name:'First Report', icon:'🎯', got: reportsN > 0 },
    { id:'bd2', name:'Recycler', icon:'♻️', got: recycleN > 0 },
    { id:'bd3', name:'7-Day Streak', icon:'🔥', got: (u.streak || 0) >= 7 },
    { id:'bd4', name:'Plastic Hero', icon:'🦸', got: plasticN > 0 },
    { id:'bd5', name:'Tree Planter', icon:'🌳', got: treeN > 0 },
    { id:'bd6', name:'Zero Waste', icon:'🏆', got: (u.points || 0) >= 3000 },
  ];
}
function kpis() {
  const c = (q, ...a) => db.prepare(q).get(...a).n;
  return {
    users: c('SELECT COUNT(*) n FROM users'), usersTrend: 8.4,
    trucks: c('SELECT COUNT(*) n FROM trucks'),
    activeTrucks: c("SELECT COUNT(*) n FROM trucks WHERE status IN ('En route','Collecting')"),
    collectionsToday: 412, collectionsTrend: 5.2,
    recyclingRate: 38, recyclingTrend: 6,
    revenue: 18.6, revenueTrend: 11.3,
    openComplaints: c("SELECT COUNT(*) n FROM complaints WHERE status='Open'"),
    tonnesDiverted: 1284, co2Saved: 962, treesEq: 16040,
  };
}
const SERIES = {
  weekDays:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  collected:[142,168,151,179,188,210,96], recycled:[48,61,55,70,74,92,40],
  months:['Jan','Feb','Mar','Apr','May','Jun'], diverted:[680,742,915,1040,1180,1284],
  mix:{ Organic:46, Plastic:21, Paper:14, Metal:8, Glass:6, Other:5 },
};

function bootstrap(user) {
  const all = (q, ...a) => db.prepare(q).all(...a);
  const reports = all('SELECT * FROM reports ORDER BY created_at DESC').map(mapReport);
  const schedAll = all('SELECT * FROM schedules WHERE user_id=? ORDER BY date ASC', user.id).map(mapSched);
  const jobs = user.role === 'collector'
    ? all('SELECT * FROM jobs WHERE collector_id=? ORDER BY slot', user.id).map(mapJob)
    : all('SELECT * FROM jobs ORDER BY slot').map(mapJob);
  const jobsDone = db.prepare("SELECT COUNT(*) n FROM jobs WHERE status='done'").get().n + 5;
  return {
    me: publicUser(user),
    reports,
    schedule: schedAll.filter(s => s.status !== 'completed'),
    history: schedAll.filter(s => s.status === 'completed'),
    recycleLog: all('SELECT * FROM recycle_log WHERE user_id=? ORDER BY created_at DESC', user.id)
      .map(r => ({ id:r.id, material:r.material, qty:r.qty, pts:r.pts, when:r.created_at })),
    rewards: all('SELECT * FROM rewards ORDER BY sort'),
    redemptions: all('SELECT * FROM redemptions WHERE user_id=? ORDER BY created_at DESC', user.id),
    leaderboard: all("SELECT name, points pts, avatar, id FROM users WHERE role='citizen' ORDER BY points DESC LIMIT 8")
      .map(u => ({ name:u.name, pts:u.pts, avatar:u.avatar, me: u.id === user.id })),
    badges: badgesFor(user),
    notifications: all('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC', user.id).map(mapNote),
    bins: all('SELECT * FROM bins').map(mapBin),
    centers: all('SELECT * FROM centers').map(mapCenter),
    trucks: all('SELECT * FROM trucks').map(mapTruck),
    jobs, jobsDone, jobsMissed: 1, fuelL: 18.4,
    complaints: all('SELECT * FROM complaints ORDER BY created_at DESC').map(mapComplaint),
    kpi: kpis(), series: SERIES,
  };
}

/* ============================ AUTH ROUTES ============================ */
app.get('/api/status', (req, res) => res.json({ ok: true, integrations: I.status, googleClientId: process.env.GOOGLE_CLIENT_ID || null }));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (db.prepare('SELECT id FROM users WHERE email=?').get(String(email).toLowerCase()))
    return res.status(409).json({ error: 'An account with this email already exists' });
  const id = uid('u');
  const avatar = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const r = ['citizen','collector','admin'].includes(role) ? role : 'citizen';
  db.prepare(`INSERT INTO users (id,name,email,phone,password_hash,role,avatar,points,level,level_name,streak,provider,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, name, String(email).toLowerCase(), phone || null, hashPassword(password), r, avatar, 50, 1, 'Seedling', 1, 'local', now());
  notify(id, '🌱', 'Welcome to EcoCycle!', 'You earned +50 Green Points for joining. Start by reporting or recycling!', 'reward');
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(email || '').toLowerCase());
  if (!user || !checkPassword(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    const g = await I.verifyGoogle(idToken);
    if (g.sandbox) return res.status(400).json({ error: 'Google login is in sandbox — add GOOGLE_CLIENT_ID to .env to enable it.' });
    let user = db.prepare('SELECT * FROM users WHERE email=?').get(g.email.toLowerCase());
    if (!user) {
      const id = uid('u');
      const avatar = (g.name || 'EC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      db.prepare(`INSERT INTO users (id,name,email,role,avatar,points,level,level_name,streak,email_verified,provider,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, g.name, g.email.toLowerCase(), 'citizen', avatar, 50, 1, 'Seedling', 1, 1, 'google', now());
      user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) { res.status(401).json({ error: 'Google verification failed' }); }
});

app.post('/api/auth/otp/request', auth(false), async (req, res) => {
  const { channel = 'sms', identifier } = req.body || {};
  const target = req.user ? (channel === 'email' ? req.user.email : req.user.phone) : identifier;
  if (!target) return res.status(400).json({ error: 'No phone/email on file' });
  const code = ('' + crypto.randomInt(100000, 999999));
  db.prepare('INSERT INTO otps (id,identifier,code_hash,purpose,expires_at,created_at) VALUES (?,?,?,?,?,?)')
    .run(uid('otp'), target, bcrypt.hashSync(code, 8), channel, now() + 10 * 60000, now());
  const msg = `Your EcoCycle verification code is ${code}. It expires in 10 minutes.`;
  const out = channel === 'email'
    ? await I.sendEmail(target, 'Your EcoCycle code', msg)
    : await I.sendSMS(target, msg);
  res.json({ sent: true, channel, target, sandbox: !!out.sandbox, preview: out.sandbox ? code : undefined });
});

app.post('/api/auth/otp/verify', auth(false), (req, res) => {
  const { code, identifier } = req.body || {};
  const target = req.user ? (req.user.phone || req.user.email) : identifier;
  const row = db.prepare('SELECT * FROM otps WHERE identifier=? AND consumed=0 ORDER BY created_at DESC LIMIT 1').get(target);
  if (!row) return res.status(400).json({ error: 'No pending code — request a new one' });
  if (row.expires_at < now()) return res.status(400).json({ error: 'Code expired — request a new one' });
  if (!bcrypt.compareSync(String(code || ''), row.code_hash)) return res.status(400).json({ error: 'Incorrect code' });
  db.prepare('UPDATE otps SET consumed=1 WHERE id=?').run(row.id);
  if (req.user) db.prepare('UPDATE users SET phone_verified=1, email_verified=1 WHERE id=?').run(req.user.id);
  res.json({ verified: true });
});

app.get('/api/me', auth(), (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/api/bootstrap', auth(), (req, res) => res.json(bootstrap(req.user)));

/* ============================ DATA ROUTES ============================ */
app.post('/api/reports', auth(), upload.single('photo'), (req, res) => {
  const { type, urgency, desc, area, lat, lng } = req.body || {};
  if (!type) return res.status(400).json({ error: 'Report type required' });
  const id = uid('r');
  const photo = req.file ? '/uploads/' + req.file.filename : null;
  db.prepare(`INSERT INTO reports (id,user_id,type,urgency,status,description,area,lat,lng,photo_url,assigned_to,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, type, urgency || 'Medium', 'Pending', desc || '', area || 'Kampala',
      lat ? +lat : null, lng ? +lng : null, photo, null, now());
  const me = bumpPoints(req.user.id, 40);
  notify(req.user.id, '📨', 'Report received', `Your "${type}" report is now Pending. +40 Green Points!`, 'report');
  res.json({ report: mapReport(db.prepare('SELECT * FROM reports WHERE id=?').get(id)), me: publicUser(me) });
});

app.patch('/api/reports/:id', auth(), requireRole('collector', 'admin'), (req, res) => {
  const r = db.prepare('SELECT * FROM reports WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Report not found' });
  const status = req.body.status || r.status;
  const assigned = req.body.assignedTo ?? r.assigned_to;
  db.prepare('UPDATE reports SET status=?, assigned_to=? WHERE id=?').run(status, assigned, r.id);
  notify(r.user_id, '🔔', 'Report update', `Your "${r.type}" report is now: ${status}.`, 'report');
  res.json({ report: mapReport(db.prepare('SELECT * FROM reports WHERE id=?').get(r.id)) });
});

app.post('/api/schedules', auth(), (req, res) => {
  const { type, date, slot } = req.body || {};
  if (!type || !date) return res.status(400).json({ error: 'Type and date required' });
  const id = uid('s');
  db.prepare('INSERT INTO schedules (id,user_id,type,date,slot,status,truck,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.user.id, type, +date, slot || '08:00 – 10:00', 'confirmed', 'UAX 442K', now());
  notify(req.user.id, '📅', 'Pickup booked', `${type} scheduled. We'll remind you before the truck arrives.`, 'schedule');
  res.json({ schedule: mapSched(db.prepare('SELECT * FROM schedules WHERE id=?').get(id)) });
});

app.post('/api/recycle', auth(), (req, res) => {
  let { material, qty, pts } = req.body || {};
  pts = Math.max(0, Math.min(2000, parseInt(pts, 10) || 0));
  if (!material) return res.status(400).json({ error: 'Material required' });
  const id = uid('rl');
  db.prepare('INSERT INTO recycle_log (id,user_id,material,qty,pts,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, req.user.id, material, qty || '', pts, now());
  const me = bumpPoints(req.user.id, pts);
  notify(req.user.id, '♻️', `+${pts} Green Points`, `You recycled ${qty} ${material}. Keep it up!`, 'reward');
  res.json({ recycle: { id, material, qty, pts, when: now() }, me: publicUser(me) });
});

app.post('/api/rewards/redeem', auth(), (req, res) => {
  const rw = db.prepare('SELECT * FROM rewards WHERE id=?').get(req.body.rewardId);
  if (!rw) return res.status(404).json({ error: 'Reward not found' });
  if ((req.user.points || 0) < rw.cost) return res.status(400).json({ error: 'Not enough points' });
  const me = bumpPoints(req.user.id, -rw.cost);
  db.prepare('INSERT INTO redemptions (id,user_id,reward_id,name,cost,created_at) VALUES (?,?,?,?,?,?)')
    .run(uid('rd'), req.user.id, rw.id, rw.name, rw.cost, now());
  notify(req.user.id, '🎁', 'Reward redeemed', `${rw.name} — ${rw.cost} pts. Check your SMS/email for details.`, 'reward');
  res.json({ me: publicUser(me), reward: rw });
});

app.post('/api/me/points', auth(), (req, res) => {
  const amount = Math.max(0, Math.min(100, parseInt(req.body.amount, 10) || 0));
  const me = bumpPoints(req.user.id, amount);
  if (amount) notify(req.user.id, '⭐', `+${amount} Green Points`, req.body.reason || 'Nice work!', 'reward');
  res.json({ me: publicUser(me) });
});

app.post('/api/complaints', auth(), (req, res) => {
  const { subject } = req.body || {};
  if (!subject) return res.status(400).json({ error: 'Subject required' });
  const id = uid('cp');
  db.prepare('INSERT INTO complaints (id,user_id,by_name,subject,status,created_at) VALUES (?,?,?,?,?,?)')
    .run(id, req.user.id, req.user.name, subject, 'Open', now());
  res.json({ complaint: mapComplaint(db.prepare('SELECT * FROM complaints WHERE id=?').get(id)) });
});

app.get('/api/trucks', auth(false), (req, res) => res.json({ trucks: db.prepare('SELECT * FROM trucks').all().map(mapTruck) }));
app.post('/api/trucks/:id/location', auth(), requireRole('collector', 'admin'), (req, res) => {
  const { lat, lng, speed, status } = req.body || {};
  const t = db.prepare('SELECT * FROM trucks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Truck not found' });
  db.prepare('UPDATE trucks SET lat=?, lng=?, speed=?, status=?, updated_at=? WHERE id=?')
    .run(lat ?? t.lat, lng ?? t.lng, speed ?? t.speed, status ?? t.status, now(), t.id);
  res.json({ truck: mapTruck(db.prepare('SELECT * FROM trucks WHERE id=?').get(t.id)) });
});

app.get('/api/reports', auth(), (req, res) => res.json({ reports: db.prepare('SELECT * FROM reports ORDER BY created_at DESC').all().map(mapReport) }));

app.post('/api/jobs/:id/complete', auth(), requireRole('collector', 'admin'), upload.single('proof'), (req, res) => {
  const j = db.prepare('SELECT * FROM jobs WHERE id=?').get(req.params.id);
  if (!j) return res.status(404).json({ error: 'Job not found' });
  const proof = req.file ? '/uploads/' + req.file.filename : j.proof_url;
  db.prepare('UPDATE jobs SET status=?, proof_url=? WHERE id=?').run('done', proof, j.id);
  if (j.report_id) db.prepare('UPDATE reports SET status=? WHERE id=?').run('Completed', j.report_id);
  res.json({ job: mapJob(db.prepare('SELECT * FROM jobs WHERE id=?').get(j.id)) });
});

app.post('/api/notifications/read-all', auth(), (req, res) => {
  db.prepare('UPDATE notifications SET unread=0 WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
});

/* ---- payments ---- */
app.post('/api/payments/init', auth(), async (req, res) => {
  const amount = Math.max(500, parseInt(req.body.amount, 10) || 25000);
  const method = req.body.method === 'card' ? 'card' : 'momo';
  const reference = 'ECO-' + uid('tx').toUpperCase();
  const out = await I.initPayment({ amount, method, name: req.user.name, email: req.user.email,
    phone: req.user.phone, reference, redirectUrl: `${PUBLIC_URL}/index.html#/payments` });
  db.prepare('INSERT INTO payments (id,user_id,amount,method,status,reference,link,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(uid('pay'), req.user.id, amount, method, out.sandbox ? 'sandbox' : (out.status || 'pending'), reference, out.link || null, now());
  res.json(out);
});
app.get('/api/payments', auth(), (req, res) =>
  res.json({ payments: db.prepare('SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC').all(req.user.id) }));

/* ============================ STATIC PWA ============================ */
// Android TWA verification (express.static ignores dotfiles, so serve it explicitly)
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.type('application/json');
  res.sendFile(path.join(ROOT, '.well-known', 'assetlinks.json'));
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(ROOT, { extensions: ['html'] }));
app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message || 'Server error' }); });

app.listen(PORT, () => {
  console.log(`\n♻️  EcoCycle server running → ${PUBLIC_URL}`);
  console.log(`   Integrations: SMS=${I.status.sms} · Email=${I.status.email} · Payments=${I.status.payments} · Google=${I.status.google}\n`);
});
