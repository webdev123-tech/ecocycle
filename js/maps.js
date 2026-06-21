/* ===========================================================================
   EcoCycle — Map helpers (Leaflet + OpenStreetMap, no API key)
   =========================================================================== */
import { CITY } from './store.js';
import { icon } from './ui.js';

const TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '© OpenStreetMap';

const COLORS = {
  green:'#039855', amber:'#f59e0b', red:'#ef4444', blue:'#2563eb',
  violet:'#7c3aed', teal:'#0d9488', slate:'#475569',
};

export function pin(color='green', ic='pin') {
  const c = COLORS[color] || color;
  return L.divIcon({
    className:'', iconSize:[34,34], iconAnchor:[17,32], popupAnchor:[0,-30],
    html:`<div class="mk" style="background:${c}">${icon(ic)}</div>`,
  });
}
export function emojiPin(emoji, size=30) {
  return L.divIcon({ className:'', iconSize:[size,size], iconAnchor:[size/2,size/2],
    html:`<div class="truck-mk" style="font-size:${size}px">${emoji}</div>` });
}

let activeMaps = [];
export function makeMap(elId, { center=CITY, zoom=13, interactive=true } = {}) {
  const el = document.getElementById(elId);
  if (!el) return null;
  const map = L.map(el, { zoomControl:false, attributionControl:false,
    dragging:interactive, scrollWheelZoom:interactive, tap:interactive, doubleClickZoom:interactive });
  map.setView([center.lat, center.lng], zoom);
  L.tileLayer(TILE, { maxZoom:19, attribution:TILE_ATTR }).addTo(map);
  if (interactive) L.control.zoom({ position:'topleft' }).addTo(map);
  activeMaps.push(map);
  // fix tile sizing after layout settles (guard: map may be removed by a re-render)
  const fix = () => { try { if (map._container && map._container.isConnected) map.invalidateSize(); } catch(e){} };
  setTimeout(fix, 120); setTimeout(fix, 420);
  return map;
}

export function clearMaps() { activeMaps.forEach(m=>{ try{m.remove();}catch(e){} }); activeMaps = []; }

/* animate a marker from A toward B; returns a stop(). Stops itself if the map was removed. */
export function animateAlong(marker, from, to, ms, onTick) {
  const start = performance.now();
  let raf;
  function step(t) {
    if (!marker._map) return; // map removed by a re-render → stop quietly
    const k = Math.min(1, (t - start) / ms);
    const lat = from.lat + (to.lat - from.lat) * k;
    const lng = from.lng + (to.lng - from.lng) * k;
    try { marker.setLatLng([lat, lng]); onTick && onTick(k, { lat, lng }); } catch(e){ return; }
    if (k < 1) raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export { COLORS };
