// Login com Supabase Auth (GoTrue). Sem dependencias; testavel no Node.
function createAuth({ url, anonKey, storage, fetchFn, agora }) {
  const CHAVE = 'solo-session';
  const cab = { apikey: anonKey, 'Content-Type': 'application/json' };

  function ler() {
    try { return JSON.parse(storage.getItem(CHAVE)); } catch { return null; }
  }
  function guardar(d) {
    const s = {
      access_token: d.access_token, refresh_token: d.refresh_token,
      expires_at: agora() + (d.expires_in || 3600),
      usuario: { id: d.user.id, email: d.user.email },
    };
    storage.setItem(CHAVE, JSON.stringify(s));
    return s;
  }
  function pedir(grant, corpo) {
    return fetchFn(`${url}/auth/v1/token?grant_type=${grant}`, { method: 'POST', headers: cab, body: JSON.stringify(corpo) });
  }

  async function signIn(email, senha) {
    let r;
    try { r = await pedir('password', { email, password: senha }); }
    catch { return { ok: false, erro: 'Sem conexão. Tente de novo.' }; }
    if (r.status === 400) return { ok: false, erro: 'E-mail ou senha incorretos.' };
    if (!r.ok) return { ok: false, erro: 'Não foi possível entrar. Tente de novo.' };
    try { return { ok: true, usuario: guardar(await r.json()).usuario }; }
    catch { return { ok: false, erro: 'Não foi possível entrar. Tente de novo.' }; }
  }

  async function getAccessToken() {
    const s = ler();
    if (!s || !s.access_token) return null;
    if (s.expires_at - agora() > 60) return s.access_token;
    let r;
    try { r = await pedir('refresh_token', { refresh_token: s.refresh_token }); }
    catch {
      // sem internet: nao derruba a sessao; usa o token enquanto ainda valer
      return s.expires_at > agora() ? s.access_token : null;
    }
    if (!r.ok) { storage.removeItem(CHAVE); return null; }
    try { return guardar(await r.json()).access_token; }
    catch { storage.removeItem(CHAVE); return null; }
  }

  function getUsuario() { const s = ler(); return s && s.usuario ? s.usuario : null; }
  function signOut() { storage.removeItem(CHAVE); }

  return { signIn, getAccessToken, getUsuario, signOut };
}
if (typeof module !== 'undefined') module.exports = { createAuth }; else window.SoloAuth = { createAuth };
