/* ===========================================================================
   EcoCycle — Chart helpers (Chart.js, vendored)
   =========================================================================== */

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
let charts = [];
export function clearCharts() { charts.forEach(c=>{ try{c.destroy();}catch(e){} }); charts = []; }

function base() {
  Chart.defaults.font.family = 'system-ui, sans-serif';
  Chart.defaults.color = css('--text-3');
  Chart.defaults.font.weight = '600';
}
/** Destroy any chart already bound to this canvas (prevents "canvas in use"). */
function freeCanvas(el) { try { const ex = Chart.getChart(el); if (ex) ex.destroy(); } catch(e){} }

export function barCompare(elId, labels, a, b, aLabel='Collected', bLabel='Recycled') {
  const el = document.getElementById(elId); if (!el) return; freeCanvas(el); base();
  const grad = el.getContext('2d');
  const g1 = grad.createLinearGradient(0,0,0,160); g1.addColorStop(0,'#32d583'); g1.addColorStop(1,'#039855');
  const c = new Chart(el, {
    type:'bar',
    data:{ labels, datasets:[
      { label:aLabel, data:a, backgroundColor:g1, borderRadius:6, barPercentage:.7, categoryPercentage:.6 },
      { label:bLabel, data:b, backgroundColor:css('--lime'), borderRadius:6, barPercentage:.7, categoryPercentage:.6 },
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ usePointStyle:true, boxWidth:8, padding:14 } } },
      scales:{ x:{ grid:{display:false} }, y:{ grid:{color:css('--border')}, ticks:{maxTicksLimit:5} } } }
  });
  charts.push(c); return c;
}

export function lineTrend(elId, labels, data, label='Diverted (t)') {
  const el = document.getElementById(elId); if (!el) return; freeCanvas(el); base();
  const ctx = el.getContext('2d');
  const g = ctx.createLinearGradient(0,0,0,180); g.addColorStop(0,'rgba(3,152,85,.35)'); g.addColorStop(1,'rgba(3,152,85,0)');
  const c = new Chart(el, {
    type:'line',
    data:{ labels, datasets:[{ label, data, fill:true, backgroundColor:g, borderColor:css('--green-500'),
      borderWidth:3, tension:.4, pointRadius:4, pointBackgroundColor:'#fff', pointBorderColor:css('--green-600'), pointBorderWidth:2 }]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ x:{grid:{display:false}}, y:{ grid:{color:css('--border')}, ticks:{maxTicksLimit:5} } } }
  });
  charts.push(c); return c;
}

export function doughnut(elId, obj) {
  const el = document.getElementById(elId); if (!el) return; freeCanvas(el); base();
  const palette = ['#65a30d','#0284c7','#f59e0b','#64748b','#0d9488','#7c3aed'];
  const c = new Chart(el, {
    type:'doughnut',
    data:{ labels:Object.keys(obj), datasets:[{ data:Object.values(obj), backgroundColor:palette, borderWidth:0, hoverOffset:6 }]},
    options:{ responsive:true, maintainAspectRatio:false, cutout:'66%',
      plugins:{ legend:{ position:'right', labels:{ usePointStyle:true, boxWidth:8, padding:10, font:{size:11} } } } }
  });
  charts.push(c); return c;
}

export function spark(elId, data, color) {
  const el = document.getElementById(elId); if (!el) return; freeCanvas(el); base();
  const c = new Chart(el, {
    type:'line',
    data:{ labels:data.map((_,i)=>i), datasets:[{ data, borderColor:color||css('--green-500'), borderWidth:2, tension:.4, pointRadius:0, fill:false }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{ x:{display:false}, y:{display:false} } }
  });
  charts.push(c); return c;
}
