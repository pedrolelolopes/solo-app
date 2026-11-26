// Acesso ao banco (REST do Supabase) e a /api/claude, sempre com o token do usuario.
function createDb({ url, anonKey, getToken, fetchFn }) {
  async function cab(extra) {
    const tok = await getToken();
    if (!tok) return null;
    return { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${tok}`, ...(extra || {}) };
  }
  async function dbGet(t, qs = '') {
    try {
      const h = await cab(); if (!h) return [];
      const r = await fetchFn(`${url}/rest/v1/${t}?${qs}`, { headers: h });
      if (!r.ok) { console.error('dbGet error', t, r.status); return []; }
      return await r.json();
    } catch (e) { console.error('dbGet catch', t, e); return []; }
  }
  async function enviar(metodo, caminho, data) {
    try {
      const h = await cab({ Prefer: 'return=representation' }); if (!h) return null;
      const r = await fetchFn(`${url}/rest/v1/${caminho}`, { method: metodo, headers: h, body: JSON.stringify(data) });
      if (!r.ok) return null;
      const d = await r.json(); return Array.isArray(d) ? d[0] : d;
    } catch { return null; }
  }
  const dbPost = (t, data) => enviar('POST', t, data);
  const dbPatch = (t, id, data) => enviar('PATCH', `${t}?id=eq.${id}`, data);
  async function dbDel(t, id) {
    try {
      const h = await cab(); if (!h) return;
      await fetchFn(`${url}/rest/v1/${t}?id=eq.${id}`, { method: 'DELETE', headers: h });
    } catch {}
  }
  async function claudeFetch(body) {
    const tok = await getToken();
    if (!tok) throw new Error('sessao-expirada');
    return fetchFn('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify(body),
    });
  }
  return { dbGet, dbPost, dbPatch, dbDel, claudeFetch };
}
if (typeof module !== 'undefined') module.exports = { createDb }; else window.SoloDb = { createDb };
