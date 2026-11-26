const test = require('node:test');
const assert = require('node:assert');
const { createAuth } = require('../js/auth.js');

function mem(inicial) {
  const d = new Map(Object.entries(inicial || {}));
  return { getItem: k => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: k => d.delete(k), _d: d };
}
function resp(status, corpo) { return { ok: status >= 200 && status < 300, status, json: async () => corpo }; }
const OK = { access_token: 'tok1', refresh_token: 'ref1', expires_in: 3600, user: { id: 'u1', email: 'a@b.com' } };
function mk(fetchFn, storage, agora = () => 1000) {
  return createAuth({ url: 'https://x.supabase.co', anonKey: 'anon', storage, fetchFn, agora });
}
const sessao = (exp, extra) => JSON.stringify({ access_token: 'velho', refresh_token: 'r', expires_at: exp, usuario: { id: 'u1', email: 'a@b.com' }, ...extra });

test('signIn com sucesso guarda a sessão e devolve o usuário', async () => {
  const st = mem(); let chamada;
  const a = mk(async (u, o) => { chamada = { u, o }; return resp(200, OK); }, st);
  const r = await a.signIn('a@b.com', 'senha');
  assert.deepStrictEqual(r, { ok: true, usuario: { id: 'u1', email: 'a@b.com' } });
  assert.match(chamada.u, /\/auth\/v1\/token\?grant_type=password$/);
  assert.strictEqual(chamada.o.headers.apikey, 'anon');
  const s = JSON.parse(st.getItem('solo-session'));
  assert.strictEqual(s.access_token, 'tok1'); assert.strictEqual(s.expires_at, 4600);
  assert.deepStrictEqual(a.getUsuario(), { id: 'u1', email: 'a@b.com' });
});
test("signIn com senha errada (HTTP 400) devolve erro 'E-mail ou senha incorretos.'", async () => {
  const a = mk(async () => resp(400, {}), mem());
  assert.deepStrictEqual(await a.signIn('a', 'b'), { ok: false, erro: 'E-mail ou senha incorretos.' });
});
test("signIn sem internet (fetch lança) devolve erro 'Sem conexão. Tente de novo.'", async () => {
  const a = mk(async () => { throw new TypeError('fail'); }, mem());
  assert.deepStrictEqual(await a.signIn('a', 'b'), { ok: false, erro: 'Sem conexão. Tente de novo.' });
});
test("signIn com outro erro devolve 'Não foi possível entrar. Tente de novo.'", async () => {
  const a = mk(async () => resp(500, {}), mem());
  assert.deepStrictEqual(await a.signIn('a', 'b'), { ok: false, erro: 'Não foi possível entrar. Tente de novo.' });
});
test('getAccessToken devolve o token guardado quando falta mais de 60 s', async () => {
  let n = 0;
  const a = mk(async () => { n++; return resp(200, OK); }, mem({ 'solo-session': sessao(1100) }));
  assert.strictEqual(await a.getAccessToken(), 'velho'); assert.strictEqual(n, 0);
});
test('getAccessToken renova quando faltam 30 s e guarda o novo token', async () => {
  const st = mem({ 'solo-session': sessao(1030) }); let corpo, url;
  const a = mk(async (u, o) => { url = u; corpo = JSON.parse(o.body); return resp(200, OK); }, st);
  assert.strictEqual(await a.getAccessToken(), 'tok1');
  assert.match(url, /grant_type=refresh_token$/); assert.deepStrictEqual(corpo, { refresh_token: 'r' });
  assert.strictEqual(JSON.parse(st.getItem('solo-session')).access_token, 'tok1');
});
test('getAccessToken devolve null e apaga a sessão quando a renovação falha', async () => {
  const st = mem({ 'solo-session': sessao(1030) });
  const a = mk(async () => resp(400, {}), st);
  assert.strictEqual(await a.getAccessToken(), null);
  assert.strictEqual(st.getItem('solo-session'), null);
});
test('getAccessToken sem sessão devolve null', async () => {
  assert.strictEqual(await mk(async () => resp(200, OK), mem()).getAccessToken(), null);
});
test('signOut apaga a sessão', async () => {
  const st = mem({ 'solo-session': sessao(5000) });
  const a = mk(async () => resp(200, OK), st); a.signOut();
  assert.strictEqual(st.getItem('solo-session'), null); assert.strictEqual(a.getUsuario(), null);
});
