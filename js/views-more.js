/* ===========================================================================
   EcoCycle — More views: rewards, impact, education, chat, profile,
   settings, payments, help, collector & admin screens
   =========================================================================== */
import { Store, CATEGORIES, QUIZ, EDU, FAQ, CITY } from './store.js';
import { icon, toast, openSheet, closeSheet, confirmDialog, rel, dateShort, esc, ugx, statusBadge, urgencyBadge, meter } from './ui.js';
import { makeMap, pin, emojiPin, COLORS } from './maps.js';
import { wireGo, notFound } from './views-core.js';

const go = (h)=> location.hash = h;

/* =========================================================================
   REWARDS + RECYCLING
   ========================================================================= */
function rewards(){
  const s = Store.get(); const me = Store.me;
  return {
    bar:false,
    html:`
    <div class="hero" style="background:linear-gradient(150deg,#065f46,#059669 55%,#10b981 120%)">
      <div class="between"><button class="iconbtn" data-back style="background:rgba(255,255,255,.16);color:#fff">${icon('back')}</button>
        <div class="h3" style="color:#fff">Rewards</div>
        <button class="iconbtn" data-go="#/leaderboard" style="background:rgba(255,255,255,.16);color:#fff">${icon('award')}</button></div>
      <div class="center mt-16">
        <div class="tiny" style="opacity:.85">YOUR GREEN POINTS</div>
        <div style="font-size:46px;font-weight:800;line-height:1.1">${ugx(me.points)} 🌿</div>
        <div class="tiny" style="opacity:.9">Level ${me.level} · ${me.levelName} · ${me.streak}🔥 streak</div>
      </div>
      <div class="statline">
        <button class="statpill" id="logBtn" style="text-align:left"><div class="v">＋ Log</div><div class="l">Recycling</div></button>
        <div class="statpill"><div class="v">#3</div><div class="l">City rank</div></div>
        <div class="statpill"><div class="v">${s.recycleLog.length}</div><div class="l">Actions</div></div>
      </div>
    </div>
    <div class="hero-curve"></div>
    <div class="wrap stack gap-16">
      <div><div class="section-title" style="margin:0 0 10px">Redeem your points</div>
        <div class="scroll-x" style="padding:0">
          ${s.rewards.map(r=>`<div class="card card-pad" style="min-width:170px">
            <div style="font-size:30px">${r.icon}</div>
            <div class="h3 mt-8" style="min-height:38px">${esc(r.name)}</div>
            <div class="between mt-8"><span class="badge badge--green">${ugx(r.cost)} pts</span>
            <button class="btn btn--brand btn--sm" data-redeem="${r.id}">Redeem</button></div>
          </div>`).join('')}
        </div></div>

      <div><div class="section-title" style="margin:0 0 10px">Badges</div>
        <div class="grid" style="grid-template-columns:repeat(3,1fr)">
          ${s.badges.map(b=>`<div class="tile center" style="opacity:${b.got?1:.4}">
            <div style="font-size:30px">${b.icon}</div><div class="tiny mt-4" style="font-weight:700">${b.name}</div>
            ${b.got?'<div class="badge badge--green mt-4">Earned</div>':'<div class="badge badge--slate mt-4">Locked</div>'}</div>`).join('')}
        </div></div>

      <div class="card card-pad card-tap" data-go="#/leaderboard">
        <div class="between"><div class="h3">🏆 Community leaderboard</div><span class="chev">${icon('chev')}</span></div>
        <div class="stack gap-8 mt-12">${s.leaderboard.slice(0,3).map((u,i)=>lbRow(u,i)).join('')}</div>
      </div>

      <div><div class="section-title" style="margin:0 0 10px">Recent recycling</div>
        <div class="list">${s.recycleLog.slice(0,4).map(l=>`<div class="lrow">
          <div class="ibub ibub--green">${icon('recycle')}</div>
          <div class="lrow__main"><div class="lrow__title">${esc(l.material)}</div><div class="lrow__sub">${esc(l.qty)} · ${rel(l.when)}</div></div>
          <div class="badge badge--green">+${l.pts}</div></div>`).join('')}</div></div>
    </div>`,
    onMount(root){
      wireBack(root); wireGo(root);
      root.querySelector('#logBtn').addEventListener('click', logRecycleSheet);
      root.querySelectorAll('[data-redeem]').forEach(b=>b.addEventListener('click', async ()=>{
        const rw = s.rewards.find(x=>x.id===b.dataset.redeem);
        if (await Store.redeem(rw)) toast(`Redeemed: ${rw.name} 🎁`,'ok');
        else toast('Not enough points yet','err');
      }));
    }
  };
}
function lbRow(u,i){
  const rk = ['gold','silver','bronze'][i]||'';
  return `<div class="lb-row ${u.me?'me':''}"><div class="lb-rank ${rk}">${i+1}</div>
    <div class="avatar avatar--sm">${u.avatar}</div>
    <div class="lrow__main"><div class="lrow__title">${esc(u.name)}${u.me?' (You)':''}</div></div>
    <div class="badge badge--green">${ugx(u.pts)} pts</div></div>`;
}
function logRecycleSheet(){
  const mats = [{m:'Plastic bottles',u:'bottles',p:5},{m:'Aluminium cans',u:'cans',p:5},{m:'Paper / cardboard',u:'kg',p:20},{m:'Glass bottles',u:'bottles',p:4},{m:'E-waste',u:'items',p:40}];
  let sel = mats[0];
  const { close } = openSheet(`
    <div class="h2 mb-12">Log recycling ♻️</div>
    <div class="label">Material</div>
    <div class="wrap-flex mb-16" id="mats">${mats.map((x,i)=>`<button class="chip ${i===0?'is-on':''}" data-m="${i}">${x.m}</button>`).join('')}</div>
    <div class="label">Quantity</div>
    <input class="input mb-16" id="qty" type="number" value="10" min="1">
    <div class="banner banner--green mb-16">${icon('award')}<div class="tiny">You'll earn <b id="ptsPrev">50</b> Green Points</div></div>
    <button class="btn btn--brand btn--lg" id="save">Log & earn points</button>`);
  const qty = document.getElementById('qty'); const prev=document.getElementById('ptsPrev');
  const calc=()=> prev.textContent = Math.max(1,(+qty.value||0))*sel.p;
  qty.addEventListener('input',calc);
  document.querySelectorAll('#mats [data-m]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#mats [data-m]').forEach(x=>x.classList.toggle('is-on',x===b)); sel=mats[+b.dataset.m]; calc(); }));
  const saveBtn = document.getElementById('save');
  saveBtn.addEventListener('click', async ()=>{
    const q = Math.max(1,(+qty.value||0)); const pts=q*sel.p;
    saveBtn.disabled=true; saveBtn.textContent='Saving…';
    try { await Store.addRecycle(sel.m, `${q} ${sel.u}`, pts); close(); toast(`+${pts} points! ♻️`,'ok'); }
    catch(e){ toast(e.message||'Could not save','err'); saveBtn.disabled=false; saveBtn.textContent='Log & earn points'; }
  });
}

function leaderboard(){
  const s = Store.get();
  return { title:'Leaderboard', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="banner banner--green">${icon('award')}<div class="tiny">Top recyclers in ${CITY.name} this month. Keep recycling to climb! 🏆</div></div>
      <div class="stack gap-10">${s.leaderboard.map((u,i)=>lbRow(u,i)).join('')}</div>
    </div>`, onMount(root){ wireGo(root); } };
}

/* =========================================================================
   IMPACT — SDG dashboard
   ========================================================================= */
function impact(){
  const s = Store.get(); const k = s.kpi;
  const myKg = s.history.reduce((a,b)=>a+b.kg,0);
  const sdg = [
    { n:11, name:'Sustainable Cities', color:'#f59e0b', pct:72, note:`${k.collectionsToday} pickups/day keeping streets clean` },
    { n:12, name:'Responsible Consumption', color:'#bf8b2e', pct:k.recyclingRate, note:`${k.recyclingRate}% recycling rate, rising ${k.recyclingTrend}%` },
    { n:13, name:'Climate Action', color:'#3f7e44', pct:64, note:`${ugx(k.co2Saved)} t CO₂ avoided this year` },
  ];
  return {
    bar:false,
    html:`
    <div class="hero">
      <div class="between"><button class="iconbtn" data-back style="background:rgba(255,255,255,.16);color:#fff">${icon('back')}</button>
        <div class="h3" style="color:#fff">Impact Dashboard</div><div style="width:42px"></div></div>
      <div class="center mt-16"><div style="font-size:40px">🌍</div>
        <div class="h2" style="color:#fff;margin-top:6px">Together we've diverted</div>
        <div style="font-size:44px;font-weight:800;line-height:1.1">${ugx(k.tonnesDiverted)} t</div>
        <div class="tiny" style="opacity:.9">of waste from landfill in ${CITY.name}, 2026</div></div>
    </div>
    <div class="hero-curve"></div>
    <div class="wrap stack gap-16">
      <div class="grid grid-3">
        <div class="statcard center"><div class="v gradient-text">${ugx(k.co2Saved)}t</div><div class="l">CO₂ saved</div></div>
        <div class="statcard center"><div class="v gradient-text">${ugx(k.treesEq)}</div><div class="l">Trees equiv.</div></div>
        <div class="statcard center"><div class="v gradient-text">${k.recyclingRate}%</div><div class="l">Recycled</div></div>
      </div>

      <div class="card card-pad">
        <div class="h3 mb-12">Waste diverted (tonnes / month)</div>
        <div style="height:170px"><canvas id="trend"></canvas></div>
      </div>

      <div class="card card-pad">
        <div class="h3 mb-12">Waste composition</div>
        <div style="height:170px"><canvas id="mix"></canvas></div>
      </div>

      <div><div class="section-title" style="margin:0 0 10px">UN Sustainable Development Goals</div>
        <div class="stack gap-12">
          ${sdg.map(g=>`<div class="card card-pad">
            <div class="row gap-12 mb-8"><div class="ibub" style="background:${g.color}22;color:${g.color};font-weight:800">${g.n}</div>
              <div class="flex1"><div class="h3">SDG ${g.n}: ${g.name}</div><div class="tiny muted">${g.note}</div></div>
              <div class="h2" style="color:${g.color}">${g.pct}%</div></div>
            <div class="bar"><i style="width:${g.pct}%;background:${g.color}"></i></div>
          </div>`).join('')}
        </div></div>

      <div class="card card-pad">
        <div class="h3 mb-4">🔄 Circular economy — waste to resource</div>
        <div class="tiny muted mb-12">Diverted waste turned back into value instead of landfill</div>
        <div class="grid grid-3 center">
          <div><div class="h2 gradient-text">312t</div><div class="tiny muted">Compost made</div></div>
          <div><div class="h2 gradient-text">48k m³</div><div class="tiny muted">Biogas potential</div></div>
          <div><div class="h2 gradient-text">UGX 96M</div><div class="tiny muted">Value recovered</div></div>
        </div>
        <div class="banner banner--green mt-12">${icon('leaf')}<div class="tiny">Organics → compost & biogas · Plastics, metal & paper → recyclers · E-waste → safe recovery.</div></div>
      </div>

      <div class="card card-pad" style="background:linear-gradient(135deg,var(--green-600),var(--green-800));color:#fff;border:none">
        <div class="h3" style="color:#fff">🌱 Your personal contribution</div>
        <div class="grid grid-3 center mt-12">
          <div><div class="h2" style="color:#fff">${(myKg/1000).toFixed(2)}t</div><div class="tiny" style="opacity:.9">Diverted</div></div>
          <div><div class="h2" style="color:#fff">${Math.round(myKg*0.75)}kg</div><div class="tiny" style="opacity:.9">CO₂ saved</div></div>
          <div><div class="h2" style="color:#fff">${Store.me.points}</div><div class="tiny" style="opacity:.9">Points</div></div>
        </div>
      </div>
    </div>`,
    onMount(root){
      wireBack(root); wireGo(root);
      import('./charts.js').then(c=>{ c.lineTrend('trend', s.series.months, s.series.diverted); c.doughnut('mix', s.series.mix); });
    }
  };
}

/* =========================================================================
   EDUCATION CENTER
   ========================================================================= */
function edu(){
  const s = Store.get();
  return {
    title:'Learn & Sort', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="card card-pad card-tap" data-go="#/quiz" style="background:linear-gradient(135deg,#0d9488,#115e59);color:#fff;border:none">
        <div class="between"><div><div class="h3" style="color:#fff">🧠 Waste IQ Quiz</div><div class="tiny mt-4" style="opacity:.9">Test your knowledge · earn 50 pts</div></div>
          <div class="center"><div class="h2" style="color:#fff">${s.quizBest}/5</div><div class="tiny" style="opacity:.9">best</div></div></div>
      </div>

      <div><div class="section-title" style="margin:0 0 10px">How to sort your waste</div>
        <div class="cat-grid">
          ${CATEGORIES.map(c=>`<button class="cat card-tap" style="background:${c.color}" data-cat="${c.key}">
            <div class="emoji">${c.emoji}</div><div><div class="n">${c.name}</div><div class="d">Tap for tips</div></div></button>`).join('')}
        </div></div>

      <div><div class="section-title" style="margin:0 0 10px">Articles & videos</div>
        <div class="list">${EDU.map(e=>`<button class="lrow" data-go="#/edu/${e.id}">
          <div class="ibub ibub--teal" style="font-size:20px">${e.emoji}</div>
          <div class="lrow__main"><div class="lrow__title">${esc(e.title)}</div><div class="lrow__sub">${e.kind} · ${e.mins} min ${s.eduDone.includes(e.id)?'· ✓ read':''}</div></div>
          <span class="chev">${icon('chev')}</span></button>`).join('')}</div></div>
    </div>`,
    onMount(root){
      wireGo(root);
      root.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>catSheet(b.dataset.cat)));
    }
  };
}
function catSheet(key){
  const c = CATEGORIES.find(x=>x.key===key); if(!c) return;
  openSheet(`
    <div class="center mb-8"><div style="font-size:46px">${c.emoji}</div><div class="h2">${c.name} waste</div></div>
    <div class="banner banner--green mb-16">${icon('leaf')}<div class="tiny">${esc(c.tips)}</div></div>
    <div class="label">How to handle it</div>
    <div class="stack gap-10 mb-12">${c.how.map((h,i)=>`<div class="row gap-10"><div class="badge badge--green">${i+1}</div><div class="lead">${esc(h)}</div></div>`).join('')}</div>
    <button class="btn btn--brand" data-close>Got it</button>`);
}
function eduDetail(p){
  const e = EDU.find(x=>x.id===p.id); if(!e) return notFound('Article');
  return { title:e.kind, back:true,
    html:`<div style="height:150px;background:linear-gradient(135deg,#0d9488,#115e59);display:grid;place-content:center;font-size:54px">${e.emoji}</div>
      <div class="wrap stack gap-16">
        <div><div class="h1">${esc(e.title)}</div><div class="muted mt-4">${e.kind} · ${e.mins} min read</div></div>
        <p class="lead">${esc(e.body)}</p>
        <p class="lead">Small, consistent actions add up. By following this guidance, you directly reduce the waste that ends up in Kampala's drainage channels and landfills — and you earn Green Points along the way.</p>
        <button class="btn btn--brand btn--lg" id="done">${icon('check')} Mark as read</button>
      </div>`,
    onMount(root){ root.querySelector('#done').addEventListener('click',()=>{ Store.finishEdu(e.id); toast('Marked as read ✓','ok'); go('#/edu'); }); }
  };
}
function quiz(){
  let i=0, score=0;
  const render = ()=>{
    const q = QUIZ[i];
    return `<div class="wrap stack gap-16">
      <div class="between"><span class="badge badge--green">Question ${i+1}/${QUIZ.length}</span><span class="badge badge--slate">Score ${score}</span></div>
      <div class="bar"><i style="width:${(i/QUIZ.length)*100}%"></i></div>
      <div class="h2">${esc(q.q)}</div>
      <div class="stack gap-10">${q.a.map((a,ix)=>`<button class="btn btn--ghost" style="justify-content:flex-start" data-ans="${ix}">${esc(a)}</button>`).join('')}</div>
    </div>`;
  };
  return { title:'Waste IQ Quiz', back:true, html:`<div id="quizroot">${render()}</div>`,
    onMount(root){
      const bind=()=> root.querySelectorAll('[data-ans]').forEach(b=>b.addEventListener('click',()=>{
        const correct = +b.dataset.ans===QUIZ[i].c;
        b.style.background = correct?'var(--green-100)':'#fee2e2'; b.style.borderColor = correct?'var(--green-500)':'var(--red)';
        if(correct) score++; toast(correct?'Correct! ✓':'Not quite','ok');
        setTimeout(()=>{ i++; if(i<QUIZ.length){ root.querySelector('#quizroot').innerHTML=render(); bind(); }
          else finishQuiz(); },700);
      }));
      const finishQuiz=()=>{
        Store.setQuiz(score);
        root.querySelector('#quizroot').innerHTML = `<div class="empty"><div class="e">${score>=4?'🏆':'🌱'}</div>
          <div class="h1">${score}/${QUIZ.length}</div><p class="lead">${score>=4?'Excellent! You earned +50 Green Points.':'Good effort — try again to master waste sorting!'}</p>
          <div class="btn-row mt-16"><button class="btn btn--ghost" data-go="#/edu">Learn more</button><button class="btn btn--brand" data-go="#/quiz">Retry</button></div></div>`;
        wireGo(root);
      };
      bind();
    }
  };
}

/* =========================================================================
   NOTIFICATIONS
   ========================================================================= */
function notifications(){
  const s = Store.get();
  return { title:'Notifications', back:true,
    actions:[{icon:'check', id:'readall'}],
    html:`<div class="wrap stack gap-12">
      ${s.notifications.length?s.notifications.map(n=>`<div class="lrow" style="${n.unread?'border-color:var(--brand)':''}">
        <div class="ibub ibub--green" style="font-size:20px">${n.icon}</div>
        <div class="lrow__main"><div class="lrow__title">${esc(n.title)} ${n.unread?'<span class="dotstat" style="background:var(--brand);margin-left:4px"></span>':''}</div>
          <div class="lrow__sub" style="white-space:normal">${esc(n.body)}</div><div class="tiny muted-3 mt-4">${rel(n.when)}</div></div>
      </div>`).join(''):emptyMini('No notifications')}
    </div>`,
    onMount(root){
      const ra = document.getElementById('readall'); if(ra) ra.addEventListener('click', async ()=>{ await Store.markAllRead(); toast('All marked read','ok'); });
    }
  };
}
const emptyMini=(t)=>`<div class="empty"><div class="e">🔔</div><div>${t}</div></div>`;

/* =========================================================================
   CHAT SUPPORT (AI chatbot, rule-based)
   ========================================================================= */
function chat(){
  return {
    title:'Support', back:true, nav:false,
    html:`<div class="chat" id="chat" style="padding-bottom:80px">
      <div class="bubble bot">Hi! I'm <b>Bin</b> 🤖, your EcoCycle assistant. Ask me anything about waste collection, recycling, points or reports.</div>
      <div class="wrap-flex" style="padding:0 4px">
        ${['How do I schedule a pickup?','How do points work?','Report hazardous waste','Talk to a human'].map(q=>`<button class="chip chip--out" data-q="${esc(q)}">${q}</button>`).join('')}
      </div>
    </div>`,
    footer:`<div class="chat-input">
      <input class="input" id="msg" placeholder="Type a message…">
      <button class="iconbtn" id="send" style="background:var(--brand);color:#fff">${icon('send')}</button>
    </div>`,
    onMount(root){
      const box = root.querySelector('#chat'); const input = document.getElementById('msg');
      const scroll = ()=> { root.scrollTop = root.scrollHeight; };
      const add=(text,who)=>{ const b=document.createElement('div'); b.className=`bubble ${who}`; b.innerHTML=text; box.appendChild(b); scroll(); };
      const botReply=(q)=>{
        const t=q.toLowerCase(); let a;
        const f = FAQ.find(x=> t.includes('schedule')&&x.q.includes('schedule') || t.includes('point')&&x.q.includes('Points') || t.includes('hazard')&&x.q.includes('hazardous') || t.includes('anon')&&x.q.includes('anonymous'));
        if(f) a=f.a;
        else if(t.includes('human')||t.includes('agent')||t.includes('call')) a='Connecting you to a human agent… ☎️ Our team is available Mon–Sat, 8am–6pm on <b>0800-ECO-CYCLE</b>. Meanwhile I can still help!';
        else if(t.includes('truck')||t.includes('track')) a='You can track your collection truck live from the home screen → <b>Track</b>. You\'ll see its location and ETA in real time. 🚛';
        else if(t.includes('recycl')) a='Recycling is easy! Sort plastic, paper, metal and glass, then log it under <b>Rewards → Log recycling</b> to earn Green Points. ♻️';
        else if(t.includes('hi')||t.includes('hello')) a='Hello! 👋 How can I help with your waste today?';
        else a='Great question! You can report issues, schedule pickups, scan smart bins and earn rewards — all from the home screen. Could you tell me a bit more about what you need?';
        add(`<div class="typing"><i></i><i></i><i></i></div>`,'bot');
        setTimeout(()=>{ box.lastChild.remove(); add(a,'bot'); }, 900);
      };
      const send=(text)=>{ if(!text.trim()) return; add(esc(text),'me'); input.value=''; botReply(text); };
      document.getElementById('send').addEventListener('click',()=>send(input.value));
      input.addEventListener('keydown',e=>{ if(e.key==='Enter') send(input.value); });
      root.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>send(b.dataset.q)));
    }
  };
}

/* =========================================================================
   PROFILE  (with role switch — key for the demo)
   ========================================================================= */
function profile(){
  const me = Store.me; const role = Store.role;
  const menu = role==='citizen' ? [
    {ic:'list',l:'My reports',go:'#/reports'},{ic:'calendar',l:'My schedule',go:'#/home'},
    {ic:'gift',l:'Rewards & points',go:'#/rewards'},{ic:'cash',l:'Payments',go:'#/payments'},
    {ic:'impact',l:'My impact',go:'#/impact'},{ic:'leaf',l:'Learn',go:'#/edu'},
  ] : role==='collector' ? [
    {ic:'nav',l:'Today\'s route',go:'#/route'},{ic:'list',l:'Collection history',go:'#/chistory'},
    {ic:'truck',l:'My vehicle',go:'#/profile'},{ic:'award',l:'Performance',go:'#/profile'},
  ] : [
    {ic:'impact',l:'Analytics',go:'#/analytics'},{ic:'layers',l:'Manage system',go:'#/manage'},
    {ic:'chat',l:'Complaints',go:'#/complaints'},{ic:'alert',l:'Emergency alerts',go:'#/emergency'},
  ];
  return {
    title:'Profile', back:true,
    actions:[{icon:'settings', go:'#/settings'}],
    html:`<div class="wrap stack gap-16">
      <div class="card card-pad center">
        <div class="avatar avatar--lg" style="margin:0 auto">${me.avatar}</div>
        <div class="h2 mt-12">${esc(me.name)}</div>
        <div class="badge badge--${role==='admin'?'violet':role==='collector'?'amber':'green'} mt-4">${role.toUpperCase()}</div>
        <div class="list mt-16" style="text-align:left">
          ${pRow('phone', me.phone)} ${pRow('mail', me.email)} ${pRow('pin', me.address)}
        </div>
        <button class="btn btn--ghost btn--sm mt-12" style="width:auto;margin:0 auto" id="edit">${icon('edit')} Edit profile</button>
      </div>

      ${role==='citizen'?`<div class="grid grid-3">
        <div class="statcard center"><div class="v">${me.points}</div><div class="l">Points</div></div>
        <div class="statcard center"><div class="v">Lv ${me.level}</div><div class="l">${me.levelName}</div></div>
        <div class="statcard center"><div class="v">${me.streak}🔥</div><div class="l">Streak</div></div>
      </div>`:''}

      <div class="list">
        ${menu.map(m=>`<button class="lrow" data-go="${m.go}"><div class="ibub ibub--green">${icon(m.ic)}</div>
          <div class="lrow__main"><div class="lrow__title">${m.l}</div></div><span class="chev">${icon('chev')}</span></button>`).join('')}
        <button class="lrow" data-go="#/settings"><div class="ibub ibub--blue">${icon('settings')}</div>
          <div class="lrow__main"><div class="lrow__title">Settings</div></div><span class="chev">${icon('chev')}</span></button>
        <button class="lrow" data-go="#/help"><div class="ibub ibub--amber">${icon('chat')}</div>
          <div class="lrow__main"><div class="lrow__title">Help & FAQ</div></div><span class="chev">${icon('chev')}</span></button>
      </div>

      <div class="card card-pad">
        <div class="h3 mb-12">🔄 Switch role <span class="badge badge--slate">demo</span></div>
        <div class="grid grid-3">
          ${['citizen','collector','admin'].map(r=>`<button class="role-card ${r===role?'is-on':''}" data-role="${r}" style="flex-direction:column;text-align:center;padding:12px">
            <div class="ibub ibub--${r==='admin'?'violet':r==='collector'?'amber':'green'}">${icon(r==='admin'?'shield':r==='collector'?'truck':'user')}</div>
            <div class="tiny mt-4" style="font-weight:700;text-transform:capitalize">${r}</div></button>`).join('')}
        </div>
      </div>

      <button class="btn btn--ghost" id="signout" style="color:var(--red)">${icon('logout')} Sign out</button>
    </div>`,
    onMount(root){
      wireGo(root);
      root.querySelector('#edit').addEventListener('click',()=>toast('Edit profile (demo)','info'));
      root.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click', async ()=>{
        try { await Store.setRole(b.dataset.role); toast(`Switched to ${b.dataset.role} view`,'ok'); go('#/home'); }
        catch(e){ toast(e.message||'Could not switch','err'); }
      }));
      root.querySelector('#signout').addEventListener('click',()=>confirmDialog({title:'Sign out?',body:'You can sign back in anytime with your account.',ok:'Sign out',danger:true,onOk:()=>{ Store.logout(); toast('Signed out','info'); go('#/auth'); }}));
    }
  };
}
const pRow=(ic,v)=>`<div class="lrow" style="padding:10px 13px"><div class="ibub ibub--green" style="width:38px;height:38px">${icon(ic)}</div><div class="lrow__main"><div class="lrow__sub" style="white-space:normal">${esc(v)}</div></div></div>`;

/* =========================================================================
   SETTINGS
   ========================================================================= */
function settings(){
  const s = Store.get();
  const dark = s.meta.theme==='dark';
  const tog=(id,on)=>`<button class="seg" style="width:54px;padding:3px" data-toggle="${id}"><span style="flex:0 0 24px;height:22px;border-radius:99px;background:${on?'var(--brand)':'var(--border)'};position:relative;transition:.2s"><i style="position:absolute;top:2px;left:${on?'24px':'2px'};width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.3)"></i></span></button>`;
  const srow=(ic,label,right)=>`<div class="lrow"><div class="ibub ibub--green">${icon(ic)}</div><div class="lrow__main"><div class="lrow__title">${label}</div></div>${right}</div>`;
  return {
    title:'Settings', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="section-title" style="margin:0">Appearance</div>
      <div class="list">
        ${srow('moon','Dark mode', tog('theme',dark))}
        <div class="lrow"><div class="ibub ibub--blue">${icon('globe')}</div><div class="lrow__main"><div class="lrow__title">Language</div></div>
          <select class="select" id="lang" style="width:auto"><option>English</option><option>Luganda</option><option>Swahili</option><option>French</option></select></div>
      </div>
      <div class="section-title" style="margin:0">Notifications</div>
      <div class="list">
        ${srow('truck','Collection reminders', tog('n1',true))}
        ${srow('gift','Reward updates', tog('n2',true))}
        ${srow('alert','Emergency alerts', tog('n3',true))}
      </div>
      <div class="section-title" style="margin:0">Security & privacy</div>
      <div class="list">
        ${srow('shield','Two-factor authentication', tog('2fa',true))}
        ${srow('lock','Change password', `<span class="chev">${icon('chev')}</span>`)}
        ${srow('pin','Location permissions', `<span class="badge badge--green">Allowed</span>`)}
      </div>
      <div class="section-title" style="margin:0">About</div>
      <div class="list">
        ${srow('leaf','EcoCycle', `<span class="muted tiny">v1.0.0</span>`)}
        <button class="lrow" id="reset"><div class="ibub ibub--red">${icon('refresh')}</div><div class="lrow__main"><div class="lrow__title" style="color:var(--red)">Reset demo data</div></div></button>
      </div>
      <p class="tiny muted center">EcoCycle · Smart Waste, Clean Cities<br>Aligned with UN SDG 11 · 12 · 13</p>
    </div>`,
    onMount(root){
      root.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{
        if(b.dataset.toggle==='theme'){ Store.toggleTheme(); go('#/settings'); }
        else toast('Preference saved','ok');
      }));
      root.querySelector('#reset').addEventListener('click',()=>confirmDialog({title:'Sign out & clear session?',body:'This signs you out and clears your local session. Your account and data stay safe on the server.',ok:'Sign out',danger:true,onOk:()=>{ Store.reset(); toast('Signed out','ok'); go('#/auth'); }}));
      root.querySelector('#lang').addEventListener('change',(e)=>{ Store.setLang(e.target.value); toast('Language updated','ok'); });
    }
  };
}

/* =========================================================================
   PAYMENTS
   ========================================================================= */
function payments(){
  return { title:'Payments', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="card card-pad" style="background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;border:none">
        <div class="between"><div class="tiny" style="opacity:.8">Monthly waste service</div><span class="badge badge--green">Active</span></div>
        <div style="font-size:30px;font-weight:800;margin-top:6px">UGX 25,000<span style="font-size:14px;opacity:.7">/mo</span></div>
        <div class="tiny mt-4" style="opacity:.8">Next payment: 1 Jul 2026 · Auto-renew</div>
      </div>
      <div class="grid grid-2">
        <button class="btn btn--brand" id="pay">${icon('phone')} Pay with MoMo</button>
        <button class="btn btn--ghost" id="card">${icon('cash')} Pay with card</button>
      </div>
      <div class="section-title" style="margin:0">Payment history</div>
      <div class="list">
        ${[['Jun 2026','25,000','Paid'],['May 2026','25,000','Paid'],['Apr 2026','25,000','Paid'],['Mar 2026','25,000','Paid']].map(([m,a,st])=>`
          <div class="lrow"><div class="ibub ibub--green">${icon('cash')}</div>
            <div class="lrow__main"><div class="lrow__title">UGX ${a}</div><div class="lrow__sub">${m} · Mobile Money</div></div>
            <span class="badge badge--green">${st}</span></div>`).join('')}
      </div>
    </div>`,
    onMount(root){
      const pay = async (method)=>{
        toast('Initializing payment…','info');
        try {
          const r = await Store.initPayment(25000, method);
          if (r.link) { window.open(r.link,'_blank'); toast('Opening secure checkout…','ok'); return; }
          openSheet(`<div class="center"><div style="font-size:40px">${method==='card'?'💳':'📲'}</div>
            <div class="h2 mt-8">${method==='card'?'Card payment':'MTN Mobile Money'}</div>
            <p class="lead mt-8 mb-16">${r.sandbox
              ? 'Sandbox mode — a real STK push / card form appears once <b>FLW_SECRET_KEY</b> is added to .env.<br>Ref: <b>'+r.reference+'</b>'
              : 'Payment initiated. Approve the prompt on your phone.<br>Ref: <b>'+r.reference+'</b>'}</p>
            <button class="btn btn--brand" data-close>Done</button></div>`,{center:true});
        } catch(e){ toast(e.message||'Payment failed','err'); }
      };
      root.querySelector('#pay').addEventListener('click',()=>pay('momo'));
      root.querySelector('#card').addEventListener('click',()=>pay('card'));
    }
  };
}

/* =========================================================================
   HELP / FAQ
   ========================================================================= */
function help(){
  return { title:'Help & FAQ', back:true,
    html:`<div class="wrap stack gap-12">
      <div class="card card-pad card-tap" data-go="#/chat" style="background:linear-gradient(135deg,var(--green-600),var(--green-800));color:#fff;border:none">
        <div class="row gap-12"><div style="font-size:30px">🤖</div><div><div class="h3" style="color:#fff">Chat with Bin</div><div class="tiny" style="opacity:.9">Instant AI support, 24/7</div></div></div>
      </div>
      ${FAQ.map(f=>`<details class="card card-pad"><summary class="h3" style="cursor:pointer;list-style:none">${esc(f.q)}</summary><p class="lead mt-8">${esc(f.a)}</p></details>`).join('')}
      <div class="card card-pad center"><div class="h3">Still need help?</div><p class="lead mt-4 mb-12">Call us Mon–Sat, 8am–6pm</p>
        <button class="btn btn--brand">${icon('phone')} 0800-ECO-CYCLE</button></div>
    </div>`,
    onMount(root){ wireGo(root); }
  };
}

/* =========================================================================
   COLLECTOR — route, job detail, history
   ========================================================================= */
function route(){
  const s = Store.get(); const jobs = s.jobs.filter(j=>j.status==='pending');
  return { title:'Optimized Route', back:true, flush:true,
    html:`<div class="map-wrap" style="height:calc(100dvh - 64px)">
      <div class="map" id="rtmap"></div>
      <div class="map-card"><div class="card card-pad">
        <div class="between mb-8"><div class="h3">${jobs.length} stops · 11.4 km</div><span class="badge badge--green">Optimized</span></div>
        <div class="tiny muted mb-12">Est. 1h 25m · 18.4 L fuel</div>
        <button class="btn btn--brand btn--sm" data-go="#/job/${jobs[0]?.id||''}">${icon('nav')} Start first stop</button>
      </div></div>
    </div>`,
    onMount(root){
      wireGo(root);
      const map = makeMap('rtmap',{zoom:13});
      if(!map) return;
      const pts = [[Store.me.lat||0.334, Store.me.lng||0.601]];
      jobs.forEach((j,i)=>{ L.marker([j.lat,j.lng],{icon:pin('amber','pin')}).addTo(map).bindPopup(`${i+1}. ${j.addr}`); pts.push([j.lat,j.lng]); });
      L.marker(pts[0],{icon:emojiPin('🚛',30)}).addTo(map);
      const line = L.polyline(pts,{color:COLORS.amber,weight:4,opacity:.7}).addTo(map);
      map.fitBounds(line.getBounds().pad(0.3));
    }
  };
}
function jobDetail(p){
  const s = Store.get(); const j = s.jobs.find(x=>x.id===p.id);
  if(!j) return notFound('Job');
  return { title:'Collection Job', back:true,
    html:`<div class="map" id="jmap" style="height:160px"></div>
    <div class="wrap stack gap-16">
      <div><div class="h2">${esc(j.type)}</div><div class="muted">${esc(j.addr)}</div></div>
      <div class="list">
        ${jr('Customer', j.customer)} ${jr('Time slot', j.slot)} ${jr('Est. load', j.est)} ${jr('Status', j.status==='done'?'Completed ✓':'Pending')}
      </div>
      <button class="btn btn--ghost" id="nav2">${icon('nav')} Navigate here</button>
      ${j.status==='done'?`<div class="banner banner--green">${icon('checkcircle')}<div>Collection completed.</div></div>`
        :`<button class="btn btn--brand btn--lg" id="complete">${icon('camera')} Proof & complete</button>`}
    </div>`,
    onMount(root){
      wireGo(root);
      const m = makeMap('jmap',{center:{lat:j.lat,lng:j.lng},zoom:16,interactive:false}); if(m) L.marker([j.lat,j.lng],{icon:pin('amber','pin')}).addTo(m);
      root.querySelector('#nav2').addEventListener('click',()=>toast('Opening turn-by-turn navigation…','info'));
      const c = root.querySelector('#complete');
      if(c) c.addEventListener('click',()=>proofSheet(j.id));
    }
  };
}
const jr=(l,v)=>`<div class="lrow"><div class="lrow__main"><div class="lrow__sub">${l}</div><div class="lrow__title">${esc(v)}</div></div></div>`;
function proofSheet(id){
  const { close } = openSheet(`
    <div class="h2 mb-12">Proof of collection</div>
    <label class="upload mb-16" id="pup"><input type="file" accept="image/*" capture="environment" hidden id="pfile"><div class="ph">📷</div><div>Photo of collected waste</div></label>
    <div class="label">Customer signature</div>
    <canvas id="sig" width="300" height="120" style="width:100%;height:120px;border:1.5px dashed var(--border);border-radius:14px;background:var(--surface-2);touch-action:none"></canvas>
    <button class="btn btn--ghost btn--sm mt-8" id="clear" style="width:auto">Clear signature</button>
    <button class="btn btn--brand btn--lg mt-12" id="done">${icon('check')} Mark as completed</button>`);
  const pf=document.getElementById('pfile'), pup=document.getElementById('pup');
  let proofFile=null;
  pf.addEventListener('change',()=>{ const f=pf.files[0]; if(!f)return; proofFile=f; pup.classList.add('has'); pup.innerHTML=`<img src="${URL.createObjectURL(f)}">`; });
  // signature pad
  const cv=document.getElementById('sig'), ctx=cv.getContext('2d'); ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--text'); ctx.lineWidth=2.5; ctx.lineCap='round';
  let drawing=false; const pos=e=>{ const r=cv.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:(t.clientX-r.left)*(cv.width/r.width),y:(t.clientY-r.top)*(cv.height/r.height)};};
  const start=e=>{drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault();};
  const move=e=>{ if(!drawing)return; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); e.preventDefault();};
  const end=()=>drawing=false;
  cv.addEventListener('mousedown',start); cv.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
  cv.addEventListener('touchstart',start); cv.addEventListener('touchmove',move); cv.addEventListener('touchend',end);
  document.getElementById('clear').addEventListener('click',()=>ctx.clearRect(0,0,cv.width,cv.height));
  const doneBtn=document.getElementById('done');
  doneBtn.addEventListener('click', async ()=>{ doneBtn.disabled=true; doneBtn.textContent='Saving…';
    try { await Store.completeJob(id, proofFile); close(); toast('Collection completed ✓','ok'); go('#/home'); }
    catch(e){ toast(e.message||'Could not complete','err'); doneBtn.disabled=false; doneBtn.textContent='Mark as completed'; } });
}
function chistory(){
  const s = Store.get();
  const items = [...s.history.map(h=>({...h, who:'You'})), {type:'Plastic recycling',date:Date.now()-2*86400000,kg:9,status:'completed'}, {type:'Organic — Nakasero',date:Date.now()-3*86400000,kg:32,status:'completed'}];
  return { title:'Collection History', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="grid grid-2">
        <div class="statcard"><div class="v">${s.jobsDone}</div><div class="l">Completed today</div></div>
        <div class="statcard"><div class="v">${s.jobsMissed}</div><div class="l">Missed today</div></div>
      </div>
      <div class="list">${items.map(h=>`<div class="lrow"><div class="ibub ibub--green">${icon('truck')}</div>
        <div class="lrow__main"><div class="lrow__title">${esc(h.type)}</div><div class="lrow__sub">${dateShort(h.date)} · ${h.kg} kg</div></div>
        <span class="badge badge--green">Done</span></div>`).join('')}</div>
    </div>`, onMount(root){ wireGo(root); } };
}

/* =========================================================================
   ADMIN — analytics, manage, emergency, complaints
   ========================================================================= */
function analytics(){
  const s = Store.get(); const k = s.kpi;
  return { title:'Analytics', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="grid grid-2">
        <div class="statcard"><div class="v">${k.collectionsToday}</div><div class="l">Collections today</div><div class="trend up">↑ ${k.collectionsTrend}%</div></div>
        <div class="statcard"><div class="v">94%</div><div class="l">Route efficiency</div><div class="trend up">↑ 2.1%</div></div>
        <div class="statcard"><div class="v">${s.jobsMissed+11}</div><div class="l">Missed (week)</div><div class="trend down">↓ 4%</div></div>
        <div class="statcard"><div class="v">${k.recyclingRate}%</div><div class="l">Recycling rate</div><div class="trend up">↑ ${k.recyclingTrend}%</div></div>
      </div>
      <div class="card card-pad"><div class="h3 mb-12">Collected vs recycled (week)</div><div style="height:180px"><canvas id="c1"></canvas></div></div>
      <div class="card card-pad"><div class="h3 mb-12">Waste diverted (monthly)</div><div style="height:170px"><canvas id="c2"></canvas></div></div>
      <div class="card card-pad"><div class="h3 mb-12">Composition</div><div style="height:170px"><canvas id="c3"></canvas></div></div>
      <div class="card card-pad">
        <div class="h3 mb-12">Hotspots</div>
        ${[['Nakasero Market',92],['Industrial Area',74],['Kawempe',61],['Bukoto',48]].map(([n,v])=>`
          <div class="mb-12"><div class="between tiny mb-4"><b>${n}</b><span>${v}</span></div>${meter(v)}</div>`).join('')}
      </div>
    </div>`,
    onMount(root){ wireGo(root);
      import('./charts.js').then(c=>{ c.barCompare('c1',s.series.weekDays,s.series.collected,s.series.recycled); c.lineTrend('c2',s.series.months,s.series.diverted); c.doughnut('c3',s.series.mix); });
    }
  };
}
function manage(){
  const s = Store.get();
  const tabs = {
    Users:[['Amina Nakato','Citizen · Bukoto'],['Brian Mukasa','Citizen · Kololo'],['Faith Apio','Citizen · Ntinda'],['+12,837 more','registered users']],
    Collectors:[['Joseph Okello','UAX 442K · ⭐4.8'],['Grace Atim','UBG 119Z · ⭐4.6'],['David Ssali','UAP 770M · ⭐4.9']],
    Vehicles:s.trucks.map(t=>[t.plate,`${t.driver} · ${t.status} · ${t.cap}%`]),
    Bins:s.bins.map(b=>[b.code,`${b.area} · ${b.fill}% · ${b.status}`]),
    Centers:s.centers.map(c=>[c.name,`${c.area} · ${c.accepts.join(', ')}`]),
  };
  const keys = Object.keys(tabs);
  return { title:'Manage System', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="scroll-x" style="padding:0" id="tabs">${keys.map((t,i)=>`<button class="chip ${i===0?'is-on':''}" data-tab="${t}">${t}</button>`).join('')}</div>
      <div class="list" id="tablist"></div>
    </div>`,
    onMount(root){
      const render=(t)=> root.querySelector('#tablist').innerHTML = tabs[t].map(([a,b])=>`<div class="lrow">
        <div class="ibub ibub--blue">${icon(t==='Vehicles'?'truck':t==='Bins'?'trash':t==='Centers'?'recycle':t==='Collectors'?'truck':'user')}</div>
        <div class="lrow__main"><div class="lrow__title">${esc(a)}</div><div class="lrow__sub">${esc(b)}</div></div>
        <button class="iconbtn" style="width:34px;height:34px">${icon('edit')}</button></div>`).join('');
      render('Users');
      root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{ root.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('is-on',x===b)); render(b.dataset.tab); }));
    }
  };
}
function emergency(){
  const types=[['Chemical spill','☣️'],['Flood debris','🌊'],['Medical waste','🩹','red'],['Fire waste','🔥']];
  return { title:'Emergency Alerts', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="banner banner--amber">${icon('alert')}<div class="tiny">Broadcast urgent waste alerts and dispatch emergency teams instantly.</div></div>
      <div><div class="label">Alert type</div><div class="grid grid-2" id="types">
        ${types.map((t,i)=>`<button class="card card-pad card-tap row gap-10 ${i===0?'is-on':''}" data-t="${t[0]}" style="${i===0?'border-color:var(--red)':''}"><span style="font-size:24px">${t[1]}</span><span class="h3">${t[0]}</span></button>`).join('')}
      </div></div>
      <div class="field"><div class="label">Location</div><input class="input" value="Industrial Area, Kampala"></div>
      <div class="field"><div class="label">Assign team</div><select class="select"><option>Hazmat Team A</option><option>Rapid Response B</option><option>KCCA Emergency Unit</option></select></div>
      <button class="btn btn--danger btn--lg" id="bc">${icon('alert')} Broadcast emergency alert</button>
      <div class="section-title" style="margin:0">Active alerts</div>
      <div class="list">
        <div class="lrow"><div class="ibub ibub--red">${icon('droplet')}</div><div class="lrow__main"><div class="lrow__title">Sewage leak · Ntinda</div><div class="lrow__sub">Team dispatched · 2 teams en route</div></div><span class="badge badge--red">Active</span></div>
        <div class="lrow"><div class="ibub ibub--amber">${icon('alert')}</div><div class="lrow__main"><div class="lrow__title">Hazardous waste · Industrial Area</div><div class="lrow__sub">Awaiting assignment</div></div><span class="badge badge--amber">Pending</span></div>
      </div>
    </div>`,
    onMount(root){
      root.querySelectorAll('[data-t]').forEach(b=>b.addEventListener('click',()=>{ root.querySelectorAll('[data-t]').forEach(x=>{x.classList.toggle('is-on',x===b); x.style.borderColor=x===b?'var(--red)':'';}); }));
      root.querySelector('#bc').addEventListener('click',()=>openSheet(`<div class="center"><div style="font-size:40px">🚨</div><div class="h2 mt-8">Alert broadcast!</div>
        <p class="lead mt-8 mb-16">Emergency teams notified and dispatched. Affected residents have received an SMS + push alert.</p>
        <button class="btn btn--brand" data-close>Done</button></div>`,{center:true}));
    }
  };
}
function complaints(){
  const s = Store.get();
  return { title:'Complaints', back:true,
    html:`<div class="wrap stack gap-16">
      <div class="grid grid-3">
        <div class="statcard center"><div class="v">${s.complaints.filter(c=>c.status==='Open').length}</div><div class="l">Open</div></div>
        <div class="statcard center"><div class="v">${s.complaints.filter(c=>c.status==='In Review').length}</div><div class="l">In review</div></div>
        <div class="statcard center"><div class="v">${s.complaints.filter(c=>c.status==='Resolved').length}</div><div class="l">Resolved</div></div>
      </div>
      <div class="list">${s.complaints.map(c=>`<div class="lrow">
        <div class="ibub ibub--amber">${icon('chat')}</div>
        <div class="lrow__main"><div class="lrow__title" style="white-space:normal">${esc(c.subject)}</div><div class="lrow__sub">${esc(c.by)} · ${rel(c.when)}</div></div>
        ${statusBadge(c.status)}</div>`).join('')}</div>
    </div>`, onMount(root){ wireGo(root); } };
}

/* ---- back helper ---- */
function wireBack(root){ root.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>history.length>1?history.back():go('#/home'))); }

export const routes = {
  'rewards':rewards, 'leaderboard':leaderboard, 'impact':impact, 'edu':edu, 'edu/:id':eduDetail,
  'quiz':quiz, 'notifications':notifications, 'chat':chat, 'profile':profile, 'settings':settings,
  'payments':payments, 'help':help, 'route':route, 'job/:id':jobDetail, 'chistory':chistory,
  'analytics':analytics, 'manage':manage, 'emergency':emergency, 'complaints':complaints,
};
