/* ===========================================================================
   EcoCycle — API client (talks to the real backend)
   =========================================================================== */
const TOKEN_KEY = 'ecocycle:token';

// The Node server serves BOTH the PWA and /api on ONE origin — locally on :4000,
// or wherever it's deployed (e.g. Render over HTTPS on the default port). So the
// correct default is SAME-ORIGIN (''). Only build an absolute http://host:4000
// when the static files are opened from a different dev port (e.g. Live Server
// on :5500) or straight off the filesystem (file://).
export const API_ORIGIN =
  (location.protocol === 'file:')               ? 'http://localhost:4000'
  : (location.port && location.port !== '4000') ? `${location.protocol}//${location.hostname}:4000`
  :                                               '';
const BASE = API_ORIGIN + '/api';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

/** Prefix server-relative media (uploads) with the API origin. */
export const mediaURL = (p) => !p ? p : (/^(https?:|blob:|data:)/.test(p) ? p : API_ORIGIN + p);

async function req(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const tok = getToken();
  if (tok) headers.Authorization = 'Bearer ' + tok;
  let payload;
  if (form) payload = form;                  // FormData — let browser set content-type
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let r;
  try { r = await fetch(BASE + path, { method, headers, body: payload }); }
  catch (e) { throw new Error('Cannot reach the EcoCycle server. Is it running? (node server.js)'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const err = new Error(data.error || `Request failed (${r.status})`); err.status = r.status; throw err; }
  return data;
}

export const api = {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: 'POST', body }),
  postForm: (p, form) => req(p, { method: 'POST', form }),
  patch: (p, body) => req(p, { method: 'PATCH', body }),
};
