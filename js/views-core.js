/* ===========================================================================
   EcoCycle — Core views: auth, dashboards, map, report, AI, scan, schedule, track
   =========================================================================== */
import { Store, REPORT_TYPES, WASTE_BOOK_TYPES, CATEGORIES, CITY } from './store.js';
import { icon, toast, openSheet, closeSheet, rel, dateShort, esc, statusBadge, urgencyBadge, meter, ugx } from './ui.js';
import { makeMap, pin, emojiPin, animateAlong, COLORS } from './maps.js';
import { mediaURL } from './api.js';

const go = (h) => location.hash = h;
const greet = () => { const h = new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; };
const photoSwatch = (kind) => {
  const m = { dump:'#7c5e3b', bin:'#8a7a52', hazard:'#9a3412', sewage:'#3f6212', default:'#475569' };
  return `linear-gradient(135deg, ${m[kind]||m.default}, #1f2937)`;
};

/* =========================================================================
   AUTH  — onboarding + login + role pick + OTP demo
   ========================================================================= */
function auth() {
  let role = 'citizen';
  const roles = [
    { k:'citizen', t:'Citizen', d:'Report, schedule & earn rewards', ic:'user', c:'green' },
    { k:'collector', t:'Collector', d:'Routes, pickups & proof', ic:'truck', c:'amber' },
    { k:'admin', t:'City Admin', d:'Fleet, analytics & control', ic:'shield', c:'violet' },
  ];
  const demo = { citizen:'amina.n@gmail.com', collector:'j.okello@ecocycle.ug', admin:'s.mbabazi@ecocycle.ug' };
  return {
    bar:false, nav:false, full:true,
    html:`
    <div class="auth">
      <div class="auth__top">
        <div class="auth__logo">♻️</div>
        <div class="auth__h">EcoCycle</div>
        <div class="auth__p">Smart waste management for clean, circular cities — connecting citizens, collectors and councils.</div>
        <div class="sdg-pills">
          <span class="sdg-pill">🏙️ SDG 11</span>
          <span class="sdg-pill">♻️ SDG 12</span>
          <span class="sdg-pill">🌍 SDG 13</span>
        </div>
      </div>
      <div class="auth__card">
        <div class="h2 mb-12">Sign in to continue</div>
        <div class="label">I am a…</div>
        <div class="stack gap-8 mb-16" id="roles">
          ${roles.map(r=>`
            <button class="role-card ${r.k==='citizen'?'is-on':''}" data-role="${r.k}">
              <div class="ibub ibub--${r.c}">${icon(r.ic)}</div>
              <div class="flex1"><div class="h3">${r.t}</div><div class="tiny muted">${r.d}</div></div>
              <div class="chev">${icon('check')}</div>
            </button>`).join('')}
        </div>
        <div class="field"><div class="label">Email</div>
          <div class="input-icon">${icon('mail')}<input class="input" id="em" value="${demo.citizen}"></div></div>
        <div class="field"><div class="label">Password</div>
          <div class="input-icon">${icon('lock')}<input class="input" id="pw" type="password" value="ecocycle"></div>
          <div class="help">Demo accounts are pre-filled — just tap Sign In.</div></div>
        <button class="btn btn--brand btn--lg" id="signin">${icon('logout')} Sign In</button>
        <div class="between mt-12">
          <button class="chip chip--out" id="otp">📲 Verify with OTP</button>
          <button class="chip chip--out" id="forgot">Forgot password?</button>
        </div>
        <div class="divider">or continue with</div>
        <div class="social">
          <button class="btn" id="g">${icon('google')} Google</button>
          <button class="btn" id="f">${icon('facebook')} Facebook</button>
        </div>
        <p class="tiny muted center mt-16">New here? <button id="signup" style="background:none;border:none;color:var(--brand);font-weight:800;font-size:12px">Create an account</button> · Secured with JWT + OTP</p>
      </div>
    </div>`,
    onMount(root) {
      const emEl = root.querySelector('#em'), pwEl = root.querySelector('#pw'), signin = root.querySelector('#signin');
      root.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>{
        role = b.dataset.role;
        root.querySelectorAll('[data-role]').forEach(x=>x.classList.toggle('is-on', x===b));
        emEl.value = demo[role]; pwEl.value = 'ecocycle';
      }));
      const doLogin = async () => {
        signin.disabled = true; signin.innerHTML = 'Signing in…';
        try {
          const u = await Store.login(emEl.value.trim(), pwEl.value);
          toast(`Welcome, ${u.name.split(' ')[0]} 🌱`, 'ok'); go('#/home');
        } catch (e) { toast(e.message || 'Login failed', 'err'); signin.disabled = false; signin.innerHTML = `${icon('logout')} Sign In`; }
      };
      signin.addEventListener('click', doLogin);
      pwEl.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
      root.querySelector('#g').addEventListener('click', googleSignIn);
      root.querySelector('#f').addEventListener('click', ()=> toast('Facebook login is ready — add app keys to enable','info'));
      root.querySelector('#forgot').addEventListener('click', ()=> toast('Password reset is ready — enable email (SMTP) in .env','info'));
      root.querySelector('#otp').addEventListener('click', ()=> otpSheet(emEl.value.trim()));
      root.querySelector('#signup').addEventListener('click', registerSheet);
    }
  };
}

async function googleSignIn() {
  const cid = Store.get().googleClientId;
  if ((Store.get().integrations || {}).google !== 'live' || !cid) {
    return toast('Google login is wired & ready — add GOOGLE_CLIENT_ID to .env to go live', 'info');
  }
  try {
    await loadScript('https://accounts.google.com/gsi/client');
    const handle = async (resp) => {
      try { const u = await Store.googleLogin(resp.credential); closeSheet(); toast(`Welcome, ${u.name.split(' ')[0]} 🌱`,'ok'); go('#/home'); }
      catch(e){ toast(e.message || 'Google sign-in failed', 'err'); }
    };
    window.google.accounts.id.initialize({ client_id: cid, callback: handle });
    openSheet(`<div class="center"><div style="font-size:40px">🔐</div><div class="h2 mt-8">Continue with Google</div>
      <p class="lead mt-8 mb-16">Sign in with your Google account.</p>
      <div id="gbtn" style="display:flex;justify-content:center"></div></div>`, { center:true });
    window.google.accounts.id.renderButton(document.getElementById('gbtn'), { theme:'filled_blue', size:'large', shape:'pill', text:'continue_with', width:260 });
    window.google.accounts.id.prompt(); // also show One-Tap if available
  } catch (e) { toast('Could not load Google sign-in', 'err'); }
}
function loadScript(src){ return new Promise((res,rej)=>{ if(document.querySelector(`script[src="${src}"]`)) return res(); const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }

function registerSheet() {
  let role = 'citizen';
  const { close } = openSheet(`
    <div class="h2 mb-12">Create your account 🌱</div>
    <div class="field"><div class="label">Full name</div><input class="input" id="rn" placeholder="e.g. Arnold Kigozi"></div>
    <div class="field"><div class="label">Email</div><input class="input" id="re" type="email" placeholder="you@example.com"></div>
    <div class="field"><div class="label">Phone</div><input class="input" id="rp" placeholder="+256 7XX XXX XXX"></div>
    <div class="field"><div class="label">Password</div><input class="input" id="rpw" type="password" placeholder="Min 6 characters"></div>
    <div class="field"><div class="label">I am a…</div>
      <div class="seg" id="rrole">${['citizen','collector','admin'].map((r,i)=>`<button class="${i===0?'is-on':''}" data-r="${r}" style="text-transform:capitalize">${r}</button>`).join('')}</div></div>
    <button class="btn btn--brand btn--lg" id="rgo">Create account</button>
    <p class="tiny muted center mt-8">You'll earn +50 Green Points instantly 🎁</p>`);
  document.querySelectorAll('#rrole [data-r]').forEach(b=>b.addEventListener('click',()=>{ role=b.dataset.r; document.querySelectorAll('#rrole [data-r]').forEach(x=>x.classList.toggle('is-on',x===b)); }));
  const btn = document.getElementById('rgo');
  btn.addEventListener('click', async ()=>{
    const name=document.getElementById('rn').value.trim(), email=document.getElementById('re').value.trim(),
      phone=document.getElementById('rp').value.trim(), password=document.getElementById('rpw').value;
    if(!name||!email||password.length<6) return toast('Fill name, email and a 6+ char password','err');
    btn.disabled=true; btn.textContent='Creating…';
    try { const u=await Store.register({name,email,phone,password,role}); close(); toast(`Welcome, ${u.name.split(' ')[0]}! 🎉`,'ok'); go('#/home'); }
    catch(e){ toast(e.message||'Could not register','err'); btn.disabled=false; btn.textContent='Create account'; }
  });
}

function otpSheet(identifier) {
  const id = identifier || '+256772113044';
  const { close } = openSheet(`
    <div class="center">
      <div style="font-size:40px">📲</div>
      <div class="h2 mt-8">Verify with OTP</div>
      <p class="lead" id="otp-sub">Sending a code to <b>${esc(id)}</b>…</p>
      <div class="otp" id="otp">${[0,1,2,3,4,5].map(i=>`<input maxlength="1" inputmode="numeric" data-i="${i}" style="width:42px">`).join('')}</div>
      <button class="btn btn--brand" id="verify">Verify</button>
      <p class="tiny muted mt-12" id="otp-hint">Real OTP via SMS · sandbox shows the code here</p>
    </div>`, { center:true });
  const inputs = [...document.querySelectorAll('#otp input')];
  inputs.forEach((inp,i)=> inp.addEventListener('input',()=>{ if(inp.value && inputs[i+1]) inputs[i+1].focus(); }));
  Store.requestOtp('sms', id).then(r=>{
    document.getElementById('otp-sub').innerHTML = `Code sent to <b>${esc(r.target||id)}</b>`;
    if (r.sandbox && r.preview) { document.getElementById('otp-hint').innerHTML = `Sandbox code: <b style="color:var(--brand)">${r.preview}</b> (add SMS keys for real texts)`;
      String(r.preview).split('').forEach((d,i)=>{ if(inputs[i]) inputs[i].value=d; }); }
  }).catch(e=> document.getElementById('otp-sub').textContent = e.message);
  document.getElementById('verify').addEventListener('click', async ()=>{
    const code = inputs.map(i=>i.value).join('');
    try { await Store.verifyOtp(code, id); close(); toast('Verified ✓','ok'); }
    catch(e){ toast(e.message||'Verification failed','err'); }
  });
}

/* =========================================================================
   HOME — role dashboards
   ========================================================================= */
function home() {
  const role = Store.role;
  if (role === 'collector') return collectorHome();
  if (role === 'admin') return adminHome();
  return citizenHome();
}

function citizenHome() {
  const s = Store.get(); const me = Store.me;
  const next = s.schedule[0];
  const days = next ? Math.max(0, Math.round((next.date - Date.now())/86400000)) : null;
  const myReports = s.reports.filter(r=>r.by===me.id);
  const open = myReports.filter(r=>r.status!=='Completed').length;
  const quick = [
    {ic:'camera',l:'Report',go:'#/report',c:'red'},
    {ic:'calendar',l:'Schedule',go:'#/schedule',c:'green'},
    {ic:'scan',l:'Scan Bin',go:'#/scan',c:'blue'},
    {ic:'sparkle',l:'AI Identify',go:'#/ai',c:'violet'},
    {ic:'truck',l:'Track',go:'#/track',c:'amber'},
    {ic:'gift',l:'Rewards',go:'#/rewards',c:'green'},
    {ic:'leaf',l:'Learn',go:'#/edu',c:'teal'},
    {ic:'chat',l:'Support',go:'#/chat',c:'blue'},
  ];
  return {
    bar:false,
    html:`
    <div class="hero">
      <div class="between">
        <div class="row gap-12">
          <div class="avatar" style="background:rgba(255,255,255,.2);color:#fff">${me.avatar}</div>
          <div><div class="tiny" style="opacity:.85">${greet()},</div><div class="h3" style="color:#fff">${me.name.split(' ')[0]} 👋</div></div>
        </div>
        <div class="row gap-8">
          <button class="iconbtn" data-go="#/notifications" style="background:rgba(255,255,255,.16);color:#fff">${icon('bell')}<span class="dot"></span></button>
        </div>
      </div>
      <div class="statline">
        <div class="statpill"><div class="v">${ugx(me.points)}</div><div class="l">🌿 Green Points</div></div>
        <div class="statpill"><div class="v">Lv ${me.level}</div><div class="l">${me.levelName}</div></div>
        <div class="statpill"><div class="v">${me.streak}🔥</div><div class="l">Day streak</div></div>
      </div>
    </div>
    <div class="hero-curve"></div>

    <div class="wrap stack gap-16">
      <div class="card card-pad card-tap" data-go="#/track" style="background:linear-gradient(135deg,var(--green-600),var(--green-800));color:#fff;border:none">
        <div class="between">
          <div>
            <div class="tiny" style="opacity:.85">NEXT COLLECTION</div>
            <div class="h3" style="color:#fff;margin-top:2px">${next?esc(next.type):'None scheduled'}</div>
            <div class="tiny mt-4" style="opacity:.9">${next?`${days===0?'Today':days===1?'Tomorrow':dateShort(next.date)} · ${next.slot}`:'Tap to schedule a pickup'}</div>
          </div>
          <div class="center">
            <div style="font-size:30px">🚛</div>
            <div class="tiny" style="opacity:.9">${next?'Track live':''}</div>
          </div>
        </div>
      </div>

      <div>
        <div class="section-title" style="margin:0 0 10px">Quick actions</div>
        <div class="qgrid">
          ${quick.map(q=>`<button class="qaction" data-go="${q.go}"><div class="ibub ibub--${q.c}">${icon(q.ic)}</div><span>${q.l}</span></button>`).join('')}
        </div>
      </div>

      <div class="grid grid-3">
        <div class="statcard"><div class="v">${myReports.length}</div><div class="l">Reports</div><div class="trend up">${open} open</div></div>
        <div class="statcard"><div class="v">${s.history.length}</div><div class="l">Pickups</div><div class="trend up">${icon('check')} done</div></div>
        <div class="statcard"><div class="v">${s.kpi.recyclingRate}%</div><div class="l">Recycle rate</div><div class="trend up">↑ ${s.kpi.recyclingTrend}%</div></div>
      </div>

      <div class="card card-pad card-tap" data-go="#/impact">
        <div class="between mb-12"><div class="h3">🌍 Your impact this month</div><span class="chev">${icon('chev')}</span></div>
        <div class="grid grid-3 center">
          <div><div class="h2 gradient-text">${(s.history.reduce((a,b)=>a+b.kg,0)/1000).toFixed(2)}t</div><div class="tiny muted">Diverted</div></div>
          <div><div class="h2 gradient-text">${Math.round(s.history.reduce((a,b)=>a+b.kg,0)*0.75)}kg</div><div class="tiny muted">CO₂ saved</div></div>
          <div><div class="h2 gradient-text">${s.recycleLog.length}</div><div class="tiny muted">Recycled</div></div>
        </div>
      </div>

      <div>
        <div class="section-title">Your reports <a data-go="#/reports">View all</a></div>
        <div class="list">
          ${myReports.slice(0,3).map(r=>reportRow(r)).join('') || emptyMini('No reports yet')}
        </div>
      </div>
    </div>`,
    onMount(root){ wireGo(root); }
  };
}

function reportRow(r){
  const t = REPORT_TYPES.find(x=>x.k===r.type);
  return `<button class="lrow" data-go="#/report/${r.id}">
    <div class="ibub ibub--${r.urgency==='High'?'red':r.urgency==='Medium'?'amber':'green'}">${t?`<span style="font-size:20px">${t.icon}</span>`:icon('alert')}</div>
    <div class="lrow__main"><div class="lrow__title">${esc(r.type)}</div><div class="lrow__sub">${esc(r.area)} · ${rel(r.when)}</div></div>
    <div class="lrow__end">${statusBadge(r.status)}</div>
  </button>`;
}
const emptyMini = (t)=>`<div class="empty" style="padding:24px"><div class="e">🍃</div><div>${t}</div></div>`;

/* ---- Collector dashboard ---- */
function collectorHome() {
  const s = Store.get(); const me = Store.me;
  const pending = s.jobs.filter(j=>j.status==='pending');
  return {
    bar:false,
    html:`
    <div class="hero" style="background:linear-gradient(150deg,#7c2d12,#b45309 55%,#f59e0b 120%)">
      <div class="between">
        <div class="row gap-12">
          <div class="avatar" style="background:rgba(255,255,255,.2);color:#fff">${me.avatar}</div>
          <div><div class="tiny" style="opacity:.85">${greet()}, driver</div><div class="h3" style="color:#fff">${me.name.split(' ')[0]} · ${me.truck}</div></div>
        </div>
        <button class="iconbtn" data-go="#/notifications" style="background:rgba(255,255,255,.16);color:#fff">${icon('bell')}<span class="dot"></span></button>
      </div>
      <div class="statline">
        <div class="statpill"><div class="v">${pending.length}</div><div class="l">Jobs left</div></div>
        <div class="statpill"><div class="v">${s.jobsDone}</div><div class="l">Completed</div></div>
        <div class="statpill"><div class="v">${me.rating}★</div><div class="l">Rating</div></div>
      </div>
    </div>
    <div class="hero-curve"></div>
    <div class="wrap stack gap-16">
      <div class="grid grid-3">
        <div class="statcard"><div class="v">${s.jobsMissed}</div><div class="l">Missed</div><div class="trend down">needs review</div></div>
        <div class="statcard"><div class="v">${s.fuelL}L</div><div class="l">Fuel today</div><div class="trend up">on budget</div></div>
        <div class="statcard"><div class="v">62%</div><div class="l">Truck load</div><div class="trend up">capacity</div></div>
      </div>
      <button class="btn btn--brand btn--lg" data-go="#/route">${icon('nav')} Start optimized route</button>
      <div>
        <div class="section-title">Today's pickups <a data-go="#/route">Map</a></div>
        <div class="list">
          ${pending.map(j=>jobRow(j)).join('') || emptyMini('All jobs done! 🎉')}
        </div>
      </div>
      <button class="btn btn--ghost" data-go="#/chistory">${icon('list')} View collection history</button>
    </div>`,
    onMount(root){ wireGo(root); }
  };
}
function jobRow(j){
  return `<div class="lrow">
    <div class="ibub ibub--amber">${icon('pin')}</div>
    <div class="lrow__main"><div class="lrow__title">${esc(j.slot)} · ${esc(j.type)}</div><div class="lrow__sub">${esc(j.addr)} · ${esc(j.est)}</div></div>
    <button class="iconbtn" data-go="#/job/${j.id}" style="background:var(--brand-soft);color:var(--brand-strong)">${icon('chev')}</button>
  </div>`;
}

/* ---- Admin dashboard ---- */
function adminHome() {
  const s = Store.get(); const k = s.kpi;
  return {
    bar:false,
    html:`
    <div class="hero" style="background:linear-gradient(150deg,#3730a3,#6d28d9 55%,#7c3aed 120%)">
      <div class="between">
        <div><div class="tiny" style="opacity:.85">City Operations · ${CITY.name}</div><div class="h2" style="color:#fff">EcoCycle Admin</div></div>
        <button class="iconbtn" data-go="#/emergency" style="background:rgba(255,255,255,.16);color:#fff">${icon('alert')}</button>
      </div>
      <div class="statline">
        <div class="statpill"><div class="v">${ugx(k.users)}</div><div class="l">Users</div></div>
        <div class="statpill"><div class="v">${k.activeTrucks}/${k.trucks}</div><div class="l">Trucks active</div></div>
        <div class="statpill"><div class="v">${k.collectionsToday}</div><div class="l">Pickups today</div></div>
      </div>
    </div>
    <div class="hero-curve"></div>
    <div class="wrap stack gap-16">
      <div class="grid grid-2">
        <div class="statcard"><div class="v">${k.recyclingRate}%</div><div class="l">Recycling rate</div><div class="trend up">↑ ${k.recyclingTrend}% MoM</div></div>
        <div class="statcard"><div class="v">${k.revenue}M</div><div class="l">Revenue (UGX)</div><div class="trend up">↑ ${k.revenueTrend}%</div></div>
        <div class="statcard"><div class="v">${k.openComplaints}</div><div class="l">Open complaints</div><div class="trend down">action needed</div></div>
        <div class="statcard"><div class="v">${ugx(k.tonnesDiverted)}t</div><div class="l">Diverted (YTD)</div><div class="trend up">SDG 12</div></div>
      </div>
      <div class="card card-pad">
        <div class="between mb-12"><div class="h3">Waste this week (tonnes)</div><a class="tiny" data-go="#/analytics">Details</a></div>
        <div style="height:180px"><canvas id="wkChart"></canvas></div>
      </div>
      <div class="qgrid">
        <button class="qaction" data-go="#/analytics"><div class="ibub ibub--violet">${icon('impact')}</div><span>Analytics</span></button>
        <button class="qaction" data-go="#/manage"><div class="ibub ibub--blue">${icon('layers')}</div><span>Manage</span></button>
        <button class="qaction" data-go="#/complaints"><div class="ibub ibub--amber">${icon('chat')}</div><span>Complaints</span></button>
        <button class="qaction" data-go="#/emergency"><div class="ibub ibub--red">${icon('alert')}</div><span>Alerts</span></button>
      </div>
      <div>
        <div class="section-title">Live reports <a data-go="#/reports">All</a></div>
        <div class="list">${s.reports.slice(0,4).map(r=>reportRow(r)).join('')}</div>
      </div>
    </div>`,
    onMount(root){
      wireGo(root);
      import('./charts.js').then(c=> c.barCompare('wkChart', s.series.weekDays, s.series.collected, s.series.recycled));
    }
  };
}

/* =========================================================================
   SMART MAP
   ========================================================================= */
function mapView() {
  const s = Store.get();
  const filters = [
    {k:'bins', l:'🗑️ Bins', on:true}, {k:'trucks', l:'🚛 Trucks', on:true},
    {k:'centers', l:'♻️ Centers', on:true}, {k:'reports', l:'⚠️ Reports', on:true},
  ];
  return {
    title:'Smart Map', back:true, flush:true,
    html:`
    <div class="map-wrap" style="height:calc(100dvh - 64px - var(--nav-h) - var(--safe-bottom))">
      <div class="map" id="bigmap"></div>
      <div class="scroll-x" style="position:absolute;top:10px;left:0;right:0;z-index:1000;padding:0 12px">
        ${filters.map(f=>`<button class="chip ${f.on?'is-on':''}" data-f="${f.k}">${f.l}</button>`).join('')}
      </div>
      <div class="map-legend">
        <div class="row gap-7"><span class="dotstat" style="background:${COLORS.red}"></span> Dumping / hotspot</div>
        <div class="row gap-7"><span class="dotstat" style="background:${COLORS.amber}"></span> Bin (fill level)</div>
        <div class="row gap-7"><span class="dotstat" style="background:${COLORS.green}"></span> Recycling centre</div>
        <div class="row gap-7"><span class="dotstat" style="background:${COLORS.blue}"></span> Collection truck</div>
      </div>
    </div>`,
    onMount(root){
      const map = makeMap('bigmap', { zoom:13 });
      if (!map) return;
      const layers = { bins:L.layerGroup().addTo(map), trucks:L.layerGroup().addTo(map), centers:L.layerGroup().addTo(map), reports:L.layerGroup().addTo(map) };
      s.bins.forEach(b=>{
        const col = b.fill>=85?'red':b.fill>=60?'amber':'green';
        L.marker([b.lat,b.lng],{icon:pin(col,'trash')}).addTo(layers.bins)
          .on('click',()=>mapCard(`🗑️ ${b.area}`, `${b.code} · ${b.type}<br>Fill: <b>${b.fill}%</b> · ${b.status}`, `#/bin/${b.id}`,'Open bin'));
      });
      s.centers.forEach(c=>{
        L.marker([c.lat,c.lng],{icon:pin('green','recycle')}).addTo(layers.centers)
          .on('click',()=>mapCard(`♻️ ${c.name}`, `${c.area} · ${c.hours}<br>Accepts: ${c.accepts.join(', ')}`, null));
      });
      s.trucks.forEach(t=>{
        L.marker([t.lat,t.lng],{icon:emojiPin('🚛',30)}).addTo(layers.trucks)
          .on('click',()=>mapCard(`🚛 ${t.plate}`, `${t.driver} · ${t.status}<br>Capacity: ${t.cap}% · ${t.speed} km/h`, '#/track','Track'));
      });
      s.reports.filter(r=>r.status!=='Completed').forEach(r=>{
        L.marker([r.lat,r.lng],{icon:pin('red','alert')}).addTo(layers.reports)
          .on('click',()=>mapCard(`⚠️ ${r.type}`, `${r.area} · ${r.urgency} urgency<br>${r.status}`, `#/report/${r.id}`,'View'));
      });
      root.querySelectorAll('[data-f]').forEach(btn=>btn.addEventListener('click',()=>{
        const k = btn.dataset.f; const on = btn.classList.toggle('is-on');
        if (on) layers[k].addTo(map); else map.removeLayer(layers[k]);
      }));
    }
  };
}
function mapCard(title, body, link, cta='Open'){
  const host = document.querySelector('.map-wrap');
  let card = document.getElementById('mapcard');
  if (!card){ card = document.createElement('div'); card.id='mapcard'; card.className='map-card'; host.appendChild(card); }
  card.innerHTML = `<div class="card card-pad"><div class="between"><div class="h3">${title}</div><button class="iconbtn" id="mc-x" style="width:30px;height:30px">${icon('x')}</button></div>
    <p class="lead mt-4">${body}</p>${link?`<button class="btn btn--brand btn--sm mt-12" data-go="${link}">${cta}</button>`:''}</div>`;
  card.querySelector('#mc-x').addEventListener('click',()=>card.remove());
  const b = card.querySelector('[data-go]'); if(b) b.addEventListener('click',()=>go(b.dataset.go));
}

/* =========================================================================
   REPORT WASTE
   ========================================================================= */
function report() {
  let sel = { type:'Illegal dumping', urgency:'Medium', photo:null, desc:'', area:'Detecting location…', lat:CITY.lat, lng:CITY.lng };
  return {
    title:'Report Waste', back:true,
    html:`
    <div class="wrap stack gap-16">
      <div class="banner banner--green">${icon('award')}<div class="tiny">Earn <b>+40 Green Points</b> for every verified report. Help keep ${CITY.name} clean.</div></div>

      <div><div class="label">What's the issue?</div>
        <div class="wrap-flex" id="types">
          ${REPORT_TYPES.map(t=>`<button class="chip ${t.k===sel.type?'is-on':''}" data-type="${t.k}">${t.icon} ${t.k}</button>`).join('')}
        </div>
      </div>

      <div><div class="label">Photo / video evidence</div>
        <label class="upload" id="up">
          <input type="file" accept="image/*" capture="environment" hidden id="file">
          <div class="ph">📷</div><div>Tap to take a photo or upload</div>
          <div class="tiny muted mt-4">AI will auto-suggest the waste type</div>
        </label>
      </div>

      <div><div class="label">Urgency</div>
        <div class="seg" id="urg">
          ${['Low','Medium','High'].map(u=>`<button class="${u===sel.urgency?'is-on':''}" data-urg="${u}">${u}</button>`).join('')}
        </div>
      </div>

      <div><div class="label">Description</div>
        <textarea class="textarea" id="desc" placeholder="Describe what you see — size, smell, how long it's been there…"></textarea>
      </div>

      <div class="card card-pad">
        <div class="row gap-10"><div class="ibub ibub--green">${icon('pin')}</div>
          <div class="flex1"><div class="h3" id="loc">${sel.area}</div><div class="tiny muted" id="coords">GPS: locating…</div></div>
          <button class="chip chip--out" id="pick">Map</button>
        </div>
      </div>

      <button class="btn btn--brand btn--lg" id="submit">${icon('send')} Submit report</button>
    </div>`,
    onMount(root){
      wireGo(root);
      // simulate GPS lock
      setTimeout(()=>{ sel.area='Bukoto Street, Kampala'; root.querySelector('#loc').textContent=sel.area;
        root.querySelector('#coords').textContent=`GPS: ${sel.lat.toFixed(4)}, ${sel.lng.toFixed(4)} · ±8m`; }, 1200);
      root.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>{ sel.type=b.dataset.type;
        root.querySelectorAll('[data-type]').forEach(x=>x.classList.toggle('is-on',x===b)); }));
      root.querySelectorAll('[data-urg]').forEach(b=>b.addEventListener('click',()=>{ sel.urgency=b.dataset.urg;
        root.querySelectorAll('[data-urg]').forEach(x=>x.classList.toggle('is-on',x===b)); }));
      const file = root.querySelector('#file'); const up = root.querySelector('#up');
      file.addEventListener('change',()=>{
        const f = file.files[0]; if(!f) return;
        const url = URL.createObjectURL(f); sel.photoFile = f;
        up.classList.add('has'); up.innerHTML = `<img src="${url}">`;
        toast('📷 Photo added · AI suggests: '+sel.type,'info');
      });
      root.querySelector('#pick').addEventListener('click',()=> toast('Drag the map pin to adjust (demo)','info'));
      const submit = root.querySelector('#submit');
      submit.addEventListener('click', async ()=>{
        sel.desc = root.querySelector('#desc').value || 'No description provided.';
        submit.disabled = true; submit.innerHTML = 'Submitting…';
        try {
          const id = await Store.addReport({ type:sel.type, urgency:sel.urgency, desc:sel.desc, area:sel.area, lat:sel.lat, lng:sel.lng, photoFile:sel.photoFile });
          successSheet('Report submitted! 🎉', `Your <b>${sel.type}</b> report is now <b>Pending</b>. You earned <b>+40 Green Points</b>. We'll notify you on progress.`,
            ()=>go('#/report/'+id), 'Track report');
        } catch(e){ toast(e.message||'Could not submit','err'); submit.disabled=false; submit.innerHTML=`${icon('send')} Submit report`; }
      });
    }
  };
}

function successSheet(title, body, onCta, cta='Done'){
  const { close } = openSheet(`
    <div class="center">
      <div style="width:78px;height:78px;border-radius:50%;background:var(--green-100);color:var(--green-700);display:grid;place-content:center;margin:6px auto 14px">
        <div style="transform:scale(1.7)">${icon('checkcircle')}</div></div>
      <div class="h2">${title}</div>
      <p class="lead mt-8 mb-16">${body}</p>
      <div class="btn-row">
        <button class="btn btn--ghost" data-close>Close</button>
        <button class="btn btn--brand" id="ss-cta">${cta}</button>
      </div>
    </div>`, { center:true });
  document.getElementById('ss-cta').addEventListener('click',()=>{ close(); onCta && onCta(); });
}

/* ---- Report detail / status timeline ---- */
function reportDetail(p) {
  const s = Store.get(); const r = s.reports.find(x=>x.id===p.id);
  if (!r) return notFound('Report');
  const steps = ['Pending','Assigned','In Progress','Completed'];
  const at = steps.indexOf(r.status);
  return {
    title:'Report Details', back:true,
    html:`
    <div style="height:${r.photo?'200px':'160px'};background:${photoSwatch('default')};position:relative;display:grid;place-content:center">
      ${r.photo ? `<img src="${mediaURL(r.photo)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
        : `<div style="font-size:46px;opacity:.6">${REPORT_TYPES.find(t=>t.k===r.type)?.icon||'📷'}</div>`}
      <div style="position:absolute;left:14px;bottom:12px;z-index:2">${urgencyBadge(r.urgency)} ${statusBadge(r.status)}</div>
    </div>
    <div class="wrap stack gap-16">
      <div><div class="h2">${esc(r.type)}</div><div class="muted">${esc(r.area)} · reported ${rel(r.when)}</div></div>
      <div class="card card-pad"><p class="lead">${esc(r.desc)}</p></div>
      <div class="card card-pad">
        <div class="h3 mb-12">Progress</div>
        <div class="timeline">
          ${steps.map((st,i)=>`<div class="tl-item ${i<at?'done':i===at?'active':''}">
            <div class="t">${st}</div><div class="s">${i<=at?(i===at?'Current status':'Completed'):'Pending'}</div></div>`).join('')}
        </div>
      </div>
      <div class="lrow"><div class="ibub ibub--blue">${icon('truck')}</div>
        <div class="lrow__main"><div class="lrow__title">${r.assignedTo?esc(r.assignedTo):'Awaiting assignment'}</div>
        <div class="lrow__sub">${r.assignedTo?'Assigned collector':'A team will be assigned shortly'}</div></div></div>
      <div class="map" id="rmap" style="height:160px;border-radius:16px;overflow:hidden"></div>
      <button class="btn btn--ghost" data-go="#/chat">${icon('chat')} Contact support about this</button>
    </div>`,
    onMount(root){ wireGo(root); const m = makeMap('rmap',{center:{lat:r.lat,lng:r.lng},zoom:15,interactive:false});
      if(m) L.marker([r.lat,r.lng],{icon:pin('red','alert')}).addTo(m); }
  };
}

/* ---- Reports list ---- */
function reportsList() {
  const s = Store.get();
  const isAdmin = Store.role==='admin';
  const list = isAdmin ? s.reports : s.reports.filter(r=>r.by===Store.me.id);
  return {
    title:isAdmin?'All Reports':'My Reports', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="scroll-x" style="padding:0">
        ${['All','Pending','In Progress','Completed'].map((f,i)=>`<button class="chip ${i===0?'is-on':''}" data-filter="${f}">${f}</button>`).join('')}
      </div>
      <div class="list" id="rlist">${list.map(r=>reportRow(r)).join('') || emptyMini('No reports')}</div>
    </div>`,
    onMount(root){
      wireGo(root);
      root.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
        root.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('is-on',x===b));
        const f=b.dataset.filter; const fl = f==='All'?list:list.filter(r=>r.status===f);
        root.querySelector('#rlist').innerHTML = fl.map(r=>reportRow(r)).join('')||emptyMini('Nothing here');
        wireGo(root);
      }));
    }
  };
}

/* =========================================================================
   AI WASTE RECOGNITION
   ========================================================================= */
function ai() {
  const samples = [
    { k:'plastic', label:'Plastic bottle', emoji:'🥤' },
    { k:'ewaste', label:'Old phones', emoji:'📱' },
    { k:'organic', label:'Banana', emoji:'🍌' },
    { k:'metal', label:'Tin cans', emoji:'🥫' },
  ];
  return {
    title:'AI Waste Scanner', back:true,
    html:`
    <div class="wrap stack gap-16">
      <div class="banner banner--green">${icon('sparkle')}<div class="tiny">Real on-device AI (TensorFlow.js + MobileNet). Take a photo of any item — it identifies it and tells you <b>how to dispose of it</b>.</div></div>
      <label class="upload" id="up">
        <input type="file" accept="image/*" capture="environment" hidden id="file">
        <div class="ph">🤖📷</div><div>Take a photo to identify</div>
        <div class="tiny muted mt-4">Runs in your browser · no photo leaves your device</div>
      </label>
      <div><div class="label">Or try a sample photo</div>
        <div class="grid grid-2">
          ${samples.map(s=>`<button class="card card-pad card-tap row gap-10" data-sample="${s.k}" data-src="assets/samples/${s.k}.jpg">
            <span style="font-size:26px">${s.emoji}</span><span class="h3">${s.label}</span></button>`).join('')}
        </div>
      </div>
      <div id="result"></div>
    </div>`,
    onMount(root){
      const file = root.querySelector('#file'); const up = root.querySelector('#up');
      // warm the model up in the background so the first scan is fast
      import('./ai.js').then(m => m.loadAI().catch(()=>{}));
      file.addEventListener('change',()=>{ const f=file.files[0]; if(!f) return;
        const url=URL.createObjectURL(f); up.classList.add('has'); up.innerHTML=`<img src="${url}" id="aiImg">`;
        runAI(root, document.getElementById('aiImg'), null); });
      root.querySelectorAll('[data-sample]').forEach(b=>b.addEventListener('click',()=>{
        up.classList.add('has'); up.innerHTML=`<img src="${b.dataset.src}" id="aiImg" crossorigin="anonymous">`;
        runAI(root, document.getElementById('aiImg'), b.dataset.sample);
      }));
    }
  };
}
async function runAI(root, imgEl, fallbackKey){
  const res = root.querySelector('#result');
  res.innerHTML = `<div class="card card-pad center"><div class="typing" style="justify-content:center"><i></i><i></i><i></i></div>
    <p class="lead mt-12">🤖 Analyzing image with on-device AI…</p><div class="tiny muted mt-4">First run downloads the model (~few seconds)</div></div>`;
  let result, preds = [];
  try {
    const { classifyImage, toCategory } = await import('./ai.js');
    if (!imgEl.complete || !imgEl.naturalWidth) await new Promise((ok,no)=>{ imgEl.onload=ok; imgEl.onerror=no; });
    preds = await classifyImage(imgEl);
    result = toCategory(preds);
  } catch (e) {
    // offline / model failed → graceful fallback (uses the sample hint if present)
    const key = fallbackKey || 'plastic';
    result = { key, label: CATEGORIES.find(c=>c.key===key)?.name || 'Item', conf: 0.9, offline: true };
  }
  renderAIResult(root, result, preds);
}
function renderAIResult(root, m, preds){
  const c = CATEGORIES.find(x=>x.key===m.key) || CATEGORIES[1];
  const conf = Math.round((m.conf || 0.9) * 100);
  const center = Store.get().centers.find(ct=>ct.accepts.some(a=>a.toLowerCase().startsWith(c.name.toLowerCase().slice(0,4)))) || Store.get().centers[0];
  const others = (preds||[]).slice(0,3).map(p=>`<span class="chip chip--out tiny">${esc(p.className.split(',')[0])} · ${Math.round(p.probability*100)}%</span>`).join('');
  root.querySelector('#result').innerHTML = `
    <div class="card card-pad view-anim">
      <div class="between mb-12">
        <div class="row gap-10"><div style="font-size:34px">${c.emoji}</div>
          <div><div class="h2">${c.name}</div><div class="tiny muted">AI saw: “${esc(m.label)}”${m.offline?' (offline guess)':''}</div></div></div>
        <div class="center"><div class="h2 gradient-text">${conf}%</div><div class="tiny muted">confidence</div></div>
      </div>
      ${others?`<div class="wrap-flex mb-12">${others}</div>`:''}
      <div class="banner banner--green mb-12">${icon('checkcircle')}<div class="tiny">${esc(c.tips)}</div></div>
      <div class="label">How to dispose</div>
      <div class="stack gap-8 mb-12">
        ${c.how.map((h,i)=>`<div class="row gap-10"><div class="badge badge--green">${i+1}</div><div class="lead">${esc(h)}</div></div>`).join('')}
      </div>
      <div class="lrow"><div class="ibub ibub--green">${icon('pin')}</div>
        <div class="lrow__main"><div class="lrow__title">Nearest: ${esc(center.name)}</div><div class="lrow__sub">${esc(center.area)} · ${esc(center.hours)}</div></div>
        <button class="iconbtn" data-go="#/map" style="background:var(--brand-soft);color:var(--brand-strong)">${icon('nav')}</button></div>
      <div class="btn-row mt-12">
        <button class="btn btn--ghost" data-go="#/scan">Scan a bin</button>
        <button class="btn btn--brand" data-go="#/rewards">${icon('gift')} Log & earn</button>
      </div>
    </div>`;
  wireGo(root);
  toast(`Identified: ${c.name} (${conf}%)`,'ok');
}

/* =========================================================================
   QR / SMART BIN SCAN
   ========================================================================= */
function scan() {
  const s = Store.get();
  return {
    title:'Scan Smart Bin', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="scanner"><div class="scanner__frame"><div class="scanline"></div></div></div>
      <p class="lead center">Point at a bin's QR code or tap a nearby bin below.</p>
      <button class="btn btn--brand btn--lg" id="sim">${icon('scan')} Simulate scan</button>
      <div class="section-title" style="margin:6px 0">Nearby smart bins</div>
      <div class="list">
        ${s.bins.map(b=>`<button class="lrow" data-go="#/bin/${b.id}">
          <div class="ibub ibub--${b.fill>=85?'red':b.fill>=60?'amber':'green'}">${icon('trash')}</div>
          <div class="lrow__main"><div class="lrow__title">${b.code} ${b.iot?'· 📡':''}</div><div class="lrow__sub">${b.area} · ${b.type}</div></div>
          <div class="lrow__end"><div class="h3">${b.fill}%</div><div class="tiny muted">full</div></div>
        </button>`).join('')}
      </div>
    </div>`,
    onMount(root){ wireGo(root);
      root.querySelector('#sim').addEventListener('click',()=>{ toast('QR detected ✓','ok'); setTimeout(()=>go('#/bin/'+s.bins[0].id),500); }); }
  };
}

function binDetail(p){
  const s = Store.get(); const b = s.bins.find(x=>x.id===p.id);
  if(!b) return notFound('Bin');
  return {
    title:'Smart Bin', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="card card-pad center">
        <div class="badge badge--${b.fill>=85?'red':b.fill>=60?'amber':'green'} mb-12">${b.status}</div>
        <div class="ring" style="--p:${b.fill};margin:0 auto"><div class="ring__txt"><div class="v">${b.fill}%</div><div class="l">${b.cap}L bin</div></div></div>
        <div class="h3 mt-12">${b.code}</div><div class="muted">${b.area} · ${b.type} waste</div>
      </div>
      ${b.iot?`<div class="card card-pad">
        <div class="h3 mb-12">📡 IoT sensors <span class="badge badge--green">Live</span></div>
        <div class="grid grid-3 center">
          <div><div class="h2">${b.fill}%</div><div class="tiny muted">Fill</div></div>
          <div><div class="h2">${b.temp}°C</div><div class="tiny muted">Temp</div></div>
          <div><div class="h2">94%</div><div class="tiny muted">Battery</div></div>
        </div>
        ${b.fill>=85?`<div class="banner banner--amber mt-12">${icon('alert')}<div class="tiny">Auto-scheduled for pickup — bin is near capacity.</div></div>`:''}
      </div>`:`<div class="banner banner--amber">${icon('alert')}<div class="tiny">Standard bin — no IoT sensor. Fill level last reported manually.</div></div>`}
      <div class="list">
        ${binRow('Owner', b.owner)} ${binRow('Collection', b.freq)} ${binRow('Type', b.type+' waste')}
      </div>
      <div class="btn-row">
        <button class="btn btn--ghost" data-go="#/report">${icon('alert')} Report issue</button>
        <button class="btn btn--brand" data-go="#/schedule">${icon('truck')} Request pickup</button>
      </div>
    </div>`,
    onMount(root){ wireGo(root); }
  };
}
const binRow=(l,v)=>`<div class="lrow"><div class="lrow__main"><div class="lrow__sub">${l}</div><div class="lrow__title">${esc(v)}</div></div></div>`;

/* =========================================================================
   SCHEDULE COLLECTION
   ========================================================================= */
function schedule(){
  let sel = { type:'Household waste', date:null, slot:'08:00 – 10:00' };
  const days = [...Array(7)].map((_,i)=>{ const d=new Date(Date.now()+ (i+1)*86400000); return { ts:d.getTime(), label:d.toLocaleDateString('en-GB',{weekday:'short'}), num:d.getDate() }; });
  sel.date = days[0].ts;
  const slots = ['08:00 – 10:00','10:00 – 12:00','12:00 – 14:00','14:00 – 16:00'];
  return {
    title:'Schedule Pickup', back:true,
    html:`<div class="wrap stack gap-16">
      <div><div class="label">Waste type</div>
        <div class="wrap-flex" id="types">
          ${WASTE_BOOK_TYPES.map(t=>`<button class="chip ${t===sel.type?'is-on':''}" data-type="${t}">${t}</button>`).join('')}
        </div></div>
      <div><div class="label">Pick a day</div>
        <div class="scroll-x" style="padding:0" id="days">
          ${days.map((d,i)=>`<button class="card card-pad center ${i===0?'is-on':''}" data-day="${d.ts}" style="min-width:62px;${i===0?'border-color:var(--brand);background:var(--brand-soft)':''}">
            <div class="tiny muted">${d.label}</div><div class="h2">${d.num}</div></button>`).join('')}
        </div></div>
      <div><div class="label">Time slot</div>
        <div class="grid grid-2" id="slots">
          ${slots.map((sl,i)=>`<button class="chip ${i===0?'is-on':''}" data-slot="${sl}" style="justify-content:center;padding:13px">${sl}</button>`).join('')}
        </div></div>
      <div class="card card-pad row gap-10"><div class="ibub ibub--green">${icon('pin')}</div>
        <div class="lrow__main"><div class="h3">Plot 14, Bukoto Street</div><div class="tiny muted">Your saved address</div></div>
        <button class="chip chip--out">Change</button></div>
      <button class="btn btn--brand btn--lg" id="confirm">${icon('calendar')} Confirm booking</button>
    </div>`,
    onMount(root){
      const pick=(grp,attr,fn)=>root.querySelectorAll(`[data-${attr}]`).forEach(b=>b.addEventListener('click',()=>{
        root.querySelectorAll(`[data-${attr}]`).forEach(x=>{x.classList.toggle('is-on',x===b); if(attr==='day'){ x.style.borderColor=x===b?'var(--brand)':''; x.style.background=x===b?'var(--brand-soft)':'';}});
        fn(b.dataset[grp]);
      }));
      pick('type','type',v=>sel.type=v);
      pick('day','day',v=>sel.date=+v);
      pick('slot','slot',v=>sel.slot=v);
      const confirm = root.querySelector('#confirm');
      confirm.addEventListener('click', async ()=>{
        confirm.disabled = true; confirm.innerHTML = 'Booking…';
        try {
          await Store.addSchedule({ type:sel.type, date:sel.date, slot:sel.slot });
          successSheet('Pickup booked! ✅', `<b>${sel.type}</b> on <b>${dateShort(sel.date)}</b>, ${sel.slot}. We'll remind you and you can track the truck live.`,
            ()=>go('#/home'), 'Back home');
        } catch(e){ toast(e.message||'Could not book','err'); confirm.disabled=false; confirm.innerHTML=`${icon('calendar')} Confirm booking`; }
      });
    }
  };
}

/* =========================================================================
   LIVE TRUCK TRACKING
   ========================================================================= */
function track(){
  const s = Store.get(); const me = Store.me;
  const truck = s.trucks[0];
  const from = { lat:truck.lat, lng:truck.lng };
  const to = { lat: me.lat || 0.3392, lng: me.lng || 0.5982 };
  return {
    title:'Live Tracking', back:true, flush:true,
    html:`<div class="map-wrap" style="height:calc(100dvh - 64px)">
      <div class="map" id="tmap"></div>
      <div class="map-card">
        <div class="card card-pad">
          <div class="between mb-12">
            <div class="row gap-10"><div style="font-size:30px">🚛</div>
              <div><div class="h3">${truck.driver}</div><div class="tiny muted">${truck.plate} · ⭐ 4.8</div></div></div>
            <div class="center"><div class="h2 gradient-text" id="eta">8 min</div><div class="tiny muted">ETA</div></div>
          </div>
          <div class="bar mb-8"><i id="prog" style="width:10%"></i></div>
          <div class="between tiny muted"><span id="statustxt">En route to you</span><span id="dist">2.1 km away</span></div>
          <div class="btn-row mt-12">
            <button class="btn btn--ghost btn--sm" data-go="#/chat">${icon('chat')} Message</button>
            <button class="btn btn--soft btn--sm">${icon('phone')} Call driver</button>
          </div>
        </div>
      </div>
    </div>`,
    onMount(root){
      wireGo(root);
      const map = makeMap('tmap', { center:{lat:(from.lat+to.lat)/2, lng:(from.lng+to.lng)/2}, zoom:14, interactive:true });
      if(!map) return;
      L.marker([to.lat,to.lng],{icon:pin('green','home')}).addTo(map).bindPopup('Your location');
      const line = L.polyline([[from.lat,from.lng],[to.lat,to.lng]], {color:COLORS.green, weight:4, opacity:.5, dashArray:'8 8'}).addTo(map);
      const tm = L.marker([from.lat,from.lng],{icon:emojiPin('🚛',32)}).addTo(map);
      map.fitBounds(line.getBounds().pad(0.4));
      const eta=root.querySelector('#eta'), prog=root.querySelector('#prog'), dist=root.querySelector('#dist'), st=root.querySelector('#statustxt');
      animateAlong(tm, from, to, 16000, (k)=>{
        prog.style.width = Math.round(10+k*90)+'%';
        const mins = Math.max(0, Math.round(8*(1-k)));
        eta.textContent = mins<=0?'Arrived':mins+' min';
        dist.textContent = (2.1*(1-k)).toFixed(1)+' km away';
        if(k>0.6) st.textContent='Almost there';
        if(k>=1){ st.textContent='Truck has arrived ✓'; toast('Your truck has arrived! 🚛','ok'); }
      });
    }
  };
}

/* ---- shared ---- */
export function notFound(what){ return { title:'Not found', back:true,
  html:`<div class="empty"><div class="e">🔍</div><div class="h3">${what} not found</div><button class="btn btn--ghost mt-16" data-go="#/home">Go home</button></div>`,
  onMount(root){ wireGo(root); } }; }

export function wireGo(root){ root.querySelectorAll('[data-go]').forEach(el=>{ if(el.__wired) return; el.__wired=true;
  el.addEventListener('click',(e)=>{ e.stopPropagation(); go(el.dataset.go); }); }); }

export const routes = {
  'auth':auth, 'home':home, 'map':mapView, 'report':report, 'report/:id':reportDetail,
  'reports':reportsList, 'ai':ai, 'scan':scan, 'bin/:id':binDetail, 'schedule':schedule, 'track':track,
};
