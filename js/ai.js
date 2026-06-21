/* ===========================================================================
   EcoCycle — Real on-device AI waste recognition (TensorFlow.js + MobileNet)
   Classifies a photo in the browser, then maps the label to a waste category.
   =========================================================================== */

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src));
    document.head.appendChild(s);
  });
}

let modelP = null;
export function loadAI() {
  if (modelP) return modelP;
  modelP = (async () => {
    await loadScript('vendor/tf.min.js');
    await loadScript('vendor/mobilenet.min.js');
    await window.tf.ready();
    // load the model from our own server (vendored) → works offline, no Google dependency
    return window.mobilenet.load({ version: 2, alpha: 1.0, modelUrl: 'vendor/mobilenet-model/model.json' });
  })();
  return modelP;
}

export async function classifyImage(imgEl) {
  const model = await loadAI();
  return model.classify(imgEl, 5); // [{className, probability}]
}

/* ImageNet label -> waste category (first keyword hit wins) */
const MAP = [
  { cat:'ewaste',  kw:['cellular','cellphone','telephone','phone','laptop','computer','keyboard','mouse','remote','monitor','screen','television','ipod','hard disc','modem','printer','charger','battery','desktop','notebook'] },
  { cat:'plastic', kw:['bottle','water bottle','pop bottle','plastic','container','cup','tupperware','packet','wrapper','bucket','jug','lighter','syringe'] },
  { cat:'metal',   kw:['can','tin','beer can','pop can','aluminium','aluminum','soup','spoon','fork','knife','nail','metal','foil','tin can','milk can','grocery','shopping cart','canned'] },
  { cat:'glass',   kw:['glass','wine','goblet','beer glass','jar','vase','bottle cap'] },
  { cat:'paper',   kw:['carton','box','book','paper','envelope','newspaper','cardboard','tissue','napkin','menu','jigsaw'] },
  { cat:'organic', kw:['banana','orange','apple','lemon','fig','food','fruit','vegetable','corn','broccoli','mushroom','pizza','bread','plate','strawberry','pineapple','cucumber','cabbage','potato','bell pepper','zucchini','squash'] },
];

export function toCategory(preds) {
  for (const p of preds) {
    const n = (p.className || '').toLowerCase();
    for (const m of MAP) if (m.kw.some(k => n.includes(k))) return { key: m.cat, label: p.className.split(',')[0], conf: p.probability };
  }
  return { key: 'plastic', label: (preds[0]?.className || 'item').split(',')[0], conf: preds[0]?.probability || 0, fallback: true };
}
