/* ===========================================================================
   EcoCycle — Database (SQLite via better-sqlite3)
   Real relational schema + idempotent seed.
   =========================================================================== */
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'ecocycle.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT,
  password_hash TEXT, role TEXT DEFAULT 'citizen', address TEXT,
  lat REAL, lng REAL, avatar TEXT, points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1, level_name TEXT DEFAULT 'Seedling', streak INTEGER DEFAULT 0,
  truck TEXT, rating REAL, email_verified INTEGER DEFAULT 0, phone_verified INTEGER DEFAULT 0,
  provider TEXT DEFAULT 'local', created_at INTEGER
);
CREATE TABLE IF NOT EXISTS otps (
  id TEXT PRIMARY KEY, identifier TEXT, code_hash TEXT, purpose TEXT,
  expires_at INTEGER, consumed INTEGER DEFAULT 0, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY, user_id TEXT, type TEXT, urgency TEXT, status TEXT DEFAULT 'Pending',
  description TEXT, area TEXT, lat REAL, lng REAL, photo_url TEXT,
  assigned_to TEXT, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY, user_id TEXT, type TEXT, date INTEGER, slot TEXT,
  status TEXT DEFAULT 'confirmed', truck TEXT, kg REAL, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS recycle_log (
  id TEXT PRIMARY KEY, user_id TEXT, material TEXT, qty TEXT, pts INTEGER, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY, name TEXT, cost INTEGER, kind TEXT, icon TEXT, sort INTEGER
);
CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY, user_id TEXT, reward_id TEXT, name TEXT, cost INTEGER, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS bins (
  id TEXT PRIMARY KEY, code TEXT, area TEXT, type TEXT, lat REAL, lng REAL,
  fill INTEGER, cap INTEGER, owner TEXT, freq TEXT, iot INTEGER, temp REAL, status TEXT
);
CREATE TABLE IF NOT EXISTS centers (
  id TEXT PRIMARY KEY, name TEXT, area TEXT, lat REAL, lng REAL, accepts TEXT, hours TEXT, buys INTEGER
);
CREATE TABLE IF NOT EXISTS trucks (
  id TEXT PRIMARY KEY, plate TEXT, driver_id TEXT, driver TEXT, lat REAL, lng REAL,
  cap INTEGER, status TEXT, speed REAL, updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, collector_id TEXT, addr TEXT, type TEXT, slot TEXT, status TEXT DEFAULT 'pending',
  lat REAL, lng REAL, customer TEXT, est TEXT, report_id TEXT, proof_url TEXT, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, user_id TEXT, icon TEXT, title TEXT, body TEXT, kind TEXT,
  unread INTEGER DEFAULT 1, created_at INTEGER
);
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY, user_id TEXT, by_name TEXT, subject TEXT, status TEXT DEFAULT 'Open', created_at INTEGER
);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, user_id TEXT, amount INTEGER, method TEXT, status TEXT,
  reference TEXT, link TEXT, created_at INTEGER
);
`);

const now = () => Date.now();
const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,10) + now().toString(36).slice(-4);

function seed() {
  const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (count > 0) return;
  const t = now(), day = 86400000;
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const insUser = db.prepare(`INSERT INTO users (id,name,email,phone,password_hash,role,address,lat,lng,avatar,points,level,level_name,streak,truck,rating,email_verified,phone_verified,provider,created_at)
    VALUES (@id,@name,@email,@phone,@password_hash,@role,@address,@lat,@lng,@avatar,@points,@level,@level_name,@streak,@truck,@rating,@email_verified,@phone_verified,@provider,@created_at)`);
  const users = [
    { id:'u_amina', name:'Amina Nakato', email:'amina.n@gmail.com', phone:'+256772113044', role:'citizen', address:'Plot 14, Bukoto Street, Kampala', lat:0.3392, lng:32.5980, avatar:'AN', points:1840, level:4, level_name:'Eco Champion', streak:12, truck:null, rating:null },
    { id:'u_collector', name:'Joseph Okello', email:'j.okello@ecocycle.ug', phone:'+256701998220', role:'collector', address:'KCCA Depot, Lugogo', lat:0.3340, lng:32.6010, avatar:'JO', points:0, level:1, level_name:'Collector', streak:0, truck:'UAX 442K', rating:4.8 },
    { id:'u_admin', name:'Sarah Mbabazi', email:'s.mbabazi@ecocycle.ug', phone:'+256712445901', role:'admin', address:'EcoCycle HQ, Nakawa', lat:0.3290, lng:32.6160, avatar:'SM', points:0, level:1, level_name:'Admin', streak:0, truck:null, rating:null },
    { id:'u_david', name:'David Ssali', email:'david.s@gmail.com', phone:'+256772300111', role:'citizen', address:'Kololo', lat:0.3352, lng:32.5905, avatar:'DS', points:2980, level:6, level_name:'Eco Legend', streak:21, truck:null, rating:null },
    { id:'u_grace', name:'Grace Atim', email:'grace.a@gmail.com', phone:'+256772300222', role:'citizen', address:'Ntinda', lat:0.3512, lng:32.6101, avatar:'GA', points:2410, level:5, level_name:'Eco Star', streak:15, truck:null, rating:null },
    { id:'u_brian', name:'Brian Mukasa', email:'brian.m@gmail.com', phone:'+256772300333', role:'citizen', address:'Kawempe', lat:0.3680, lng:32.5640, avatar:'BM', points:1620, level:4, level_name:'Eco Champion', streak:7, truck:null, rating:null },
  ];
  users.forEach(u => insUser.run({ password_hash:hash('ecocycle'), email_verified:1, phone_verified:1, provider:'local', created_at:t, ...u, truck:u.truck??null, rating:u.rating??null }));

  const insReport = db.prepare(`INSERT INTO reports (id,user_id,type,urgency,status,description,area,lat,lng,photo_url,assigned_to,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  [
    ['r_1','u_amina','Illegal dumping','High','In Progress','Pile of mixed waste blocking the drainage channel near the market entrance.','Nakasero Market',0.3430,32.5760,null,'Joseph Okello',t-2*3600000],
    ['r_2','u_amina','Overflowing bin','Medium','Assigned','Community bin overflowing for 3 days, attracting flies.','Bukoto',0.3380,32.6040,null,'Joseph Okello',t-26*3600000],
    ['r_3','u_amina','Missed collection','Low','Completed','Tuesday pickup was missed on our street.','Kololo',0.3350,32.5900,null,'Joseph Okello',t-4*day],
    ['r_4','u_brian','Hazardous waste','High','Pending','Used car batteries and oil dumped behind the workshop.','Industrial Area',0.3290,32.5700,null,null,t-40*60000],
    ['r_5','u_grace','Sewage leak','High','In Progress','Sewage overflow on the roadside, strong smell.','Ntinda',0.3510,32.6100,null,'Grace A.',t-5*3600000],
  ].forEach(r => insReport.run(...r));

  const insSch = db.prepare(`INSERT INTO schedules (id,user_id,type,date,slot,status,truck,kg,created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
  insSch.run('s_1','u_amina','Household waste',t+day,'08:00 – 10:00','confirmed','UAX 442K',null,t);
  insSch.run('s_2','u_amina','Plastic recycling',t+4*day,'10:00 – 12:00','confirmed','UBG 119Z',null,t);
  // history (completed schedules)
  [['sh_1','Household waste',t-6*day,14],['sh_2','Plastic recycling',t-9*day,6],['sh_3','Garden waste',t-13*day,22],['sh_4','E-waste',t-20*day,3]]
    .forEach(([id,type,date,kg])=> insSch.run(id,'u_amina',type,date,'08:00 – 10:00','completed','UAX 442K',kg,date));

  const insRec = db.prepare(`INSERT INTO recycle_log (id,user_id,material,qty,pts,created_at) VALUES (?,?,?,?,?,?)`);
  [['rl_1','Plastic bottles','24 bottles',120,t-2*day],['rl_2','Paper / cardboard','3.2 kg',64,t-5*day],['rl_3','Aluminium cans','40 cans',200,t-8*day]]
    .forEach(r=> insRec.run(r[0],'u_amina',r[1],r[2],r[3],r[4]));

  const insRw = db.prepare(`INSERT INTO rewards (id,name,cost,kind,icon,sort) VALUES (?,?,?,?,?,?)`);
  [['rw1','MTN MoMo Airtime 5,000 UGX',600,'cash','📱',1],['rw2','10% off at GreenMart',400,'coupon','🛒',2],
   ['rw3','Reusable EcoCycle Tote',900,'item','👜',3],['rw4','Tree planted in your name',300,'impact','🌳',4],
   ['rw5','1,000 UGX cash to bank',1200,'cash','💳',5]].forEach(r=> insRw.run(...r));

  const insBin = db.prepare(`INSERT INTO bins (id,code,area,type,lat,lng,fill,cap,owner,freq,iot,temp,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  [['b1','KLA-BK-014','Bukoto Street','General',0.3392,32.5982,82,240,'Amina Nakato','2× / week',1,31,'Near full'],
   ['b2','KLA-KL-007','Kololo Ave','Recyclables',0.3352,32.5905,34,360,'Kololo Estate','Weekly',1,28,'OK'],
   ['b3','KLA-NK-021','Nakasero Mkt','Organic',0.3431,32.5762,96,660,'KCCA','Daily',1,36,'Critical'],
   ['b4','KLA-NT-003','Ntinda Mall','General',0.3512,32.6101,51,240,'Ntinda Mall','2× / week',0,null,'OK'],
   ['b5','KLA-IA-009','Industrial Area','Hazardous',0.3291,32.5705,18,120,'EcoCycle','On call',1,29,'OK']].forEach(b=> insBin.run(...b));

  const insC = db.prepare(`INSERT INTO centers (id,name,area,lat,lng,accepts,hours,buys) VALUES (?,?,?,?,?,?,?,?)`);
  [['c1','Kampala Recycling Hub','Nakawa',0.3289,32.6162,JSON.stringify(['Plastic','Paper','Metal','Glass']),'Mon–Sat 8–6',1],
   ['c2','GreenTech E-Waste Point','Industrial Area',0.3270,32.5740,JSON.stringify(['Electronics','Batteries']),'Mon–Fri 9–5',1],
   ['c3','Plastic Collective','Kawempe',0.3680,32.5640,JSON.stringify(['Plastic','Bottles']),'Daily 7–7',1]].forEach(c=> insC.run(...c));

  const insT = db.prepare(`INSERT INTO trucks (id,plate,driver_id,driver,lat,lng,cap,status,speed,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  [['t1','UAX 442K','u_collector','Joseph Okello',0.3401,32.5860,62,'En route',24,t],
   ['t2','UBG 119Z',null,'Grace Atim',0.3360,32.6050,38,'Collecting',0,t],
   ['t3','UAP 770M',null,'David Ssali',0.3300,32.5760,88,'To depot',31,t]].forEach(r=> insT.run(...r));

  const insJob = db.prepare(`INSERT INTO jobs (id,collector_id,addr,type,slot,status,lat,lng,customer,est,report_id,proof_url,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  [['j1','Plot 14, Bukoto Street','Household waste','08:00','pending',0.3392,32.5982,'Amina Nakato','14 kg',null],
   ['j2','Nakasero Market (Bin KLA-NK-021)','Organic — CRITICAL','08:40','pending',0.3431,32.5762,'KCCA','≈ 600 L',null],
   ['j3','Kololo Ave, House 22','Plastic recycling','09:20','pending',0.3352,32.5905,'Kololo Estate','9 kg',null],
   ['j4','Bukoto — overflow report','Overflowing bin','10:00','pending',0.3380,32.6040,'Community','unknown','r_2']]
   .forEach(j=> insJob.run(j[0],'u_collector',j[1],j[2],j[3],j[4],j[5],j[6],j[7],j[8],j[9]||null,null,t));

  const insN = db.prepare(`INSERT INTO notifications (id,user_id,icon,title,body,kind,unread,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  [['n1','🚛','Truck arriving soon','Your household waste pickup is ~15 min away.','truck',1,t-12*60000],
   ['n2','✅','Report resolved','Your missed-collection report in Kololo was completed.','report',1,t-6*3600000],
   ['n3','🎁','+200 Green Points','You earned points for recycling 40 cans. Keep going!','reward',0,t-30*3600000],
   ['n4','🗑️','Bin almost full','Bin KLA-BK-014 is at 82%. A pickup is scheduled.','bin',0,t-50*3600000],
   ['n5','📅','Collection tomorrow','Household waste pickup tomorrow, 08:00–10:00.','schedule',0,t-60*3600000]]
   .forEach(n=> insN.run(n[0],'u_amina',n[1],n[2],n[3],n[4],n[5],n[6]));

  const insCp = db.prepare(`INSERT INTO complaints (id,user_id,by_name,subject,status,created_at) VALUES (?,?,?,?,?,?)`);
  [['cp1','u_amina','Amina Nakato','Bin not replaced after damage','Open',t-2*day],
   ['cp2','u_brian','Brian Mukasa','Collector skipped our lane twice','In Review',t-5*day],
   ['cp3','u_grace','Faith Apio','Suggestion: weekend pickups','Resolved',t-11*day]].forEach(c=> insCp.run(...c));

  console.log('✓ Database seeded with demo data');
}
seed();

module.exports = { db, uid, now };
