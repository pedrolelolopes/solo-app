const test = require('node:test');
const assert = require('node:assert');
const { createDb } = require('../js/db.js');

const R = (ok, corpo) => ({ ok, status: ok ? 200 : 400, json: async () => corpo, text: async () => '' });
function mk(fetchFn, tok = 'tok') {
  return createDb({ url: 'https://x.supabase.co', anonKey: 'anon', getToken: async () => tok, fetchFn });
}
test('dbGet usa o token do usuário e a URL REST', async () => {
  let c; const db = mk(async (u, o) => { c = { u, o }; return R(true, [{ id: 1 }]); });
  assert.deepStrictEqual(await db.dbGet('lista_hoje', 'select=*'), [{ id: 1 }]);
  assert.strictEqual(c.u, 'https://x.supabase.co/rest/v1/lista_hoje?select=*');
  assert.strictEqual(c.o.headers.Authorization, 'Bearer tok'); assert.strictEqual(c.o.headers.apikey, 'anon');
});
test('dbGet devolve [] quando a resposta não é ok', async () => {
  assert.deepStrictEqual(await mk(async () => R(false, {})).dbGet('t'), []);
});
test('dbGet devolve [] quando o fetch lança', async () => {
  assert.deepStrictEqual(await mk(async () => { throw new Error('x'); }).dbGet('t'), []);
});
test('dbPost devolve o primeiro item da resposta em lista', async () => {
  let o2; const db = mk(async (u, o) => { o2 = o; return R(true, [{ id: 9 }]); });
  assert.deepStrictEqual(await db.dbPost('t', { a: 1 }), { id: 9 });
  assert.strictEqual(o2.method, 'POST'); assert.strictEqual(o2.body, '{"a":1}');
});
test('dbPost devolve null quando não ok', async () => {
  assert.strictEqual(await mk(async () => R(false, {})).dbPost('t', {}), null);
});
test('dbPatch usa ?id=eq.<id> e devolve a linha', async () => {
  let u2; const db = mk(async (u) => { u2 = u; return R(true, [{ id: 5 }]); });
  assert.deepStrictEqual(await db.dbPatch('t', 5, { a: 2 }), { id: 5 });
  assert.match(u2, /\/rest\/v1\/t\?id=eq\.5$/);
});
test('dbDel não lança quando o fetch falha', async () => {
  await mk(async () => { throw new Error('x'); }).dbDel('t', 1);
});
test('sem token, dbGet devolve [] e não chama fetch', async () => {
  let n = 0; const db = mk(async () => { n++; return R(true, [1]); }, null);
  assert.deepStrictEqual(await db.dbGet('t'), []); assert.strictEqual(n, 0);
});
test('claudeFetch manda Bearer e corpo JSON para /api/claude', async () => {
  let c; const db = mk(async (u, o) => { c = { u, o }; return R(true, {}); });
  await db.claudeFetch({ model: 'm' });
  assert.strictEqual(c.u, '/api/claude'); assert.strictEqual(c.o.method, 'POST');
  assert.strictEqual(c.o.headers.Authorization, 'Bearer tok'); assert.strictEqual(c.o.body, '{"model":"m"}');
});
test('claudeFetch sem token lança sessao-expirada', async () => {
  await assert.rejects(mk(async () => R(true, {}), null).claudeFetch({}), /sessao-expirada/);
});
