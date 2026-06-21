/* ===========================================================================
   EcoCycle — API client (talks to the real backend)
   =========================================================================== */
const TOKEN_KEY = 'ecocycle:token';

// Same-origin when served by the Node server (:4000); otherwise reach it directly.
export const API_ORIGIN = (location.port === '4000' || location.protocol === 'file:')
  ? '' : `${location.protocol}//${location.hostname}:4000`;
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
