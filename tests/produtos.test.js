const test = require('node:test');
const assert = require('node:assert');
const { createProdutos } = require('../js/produtos.js');

function mk({ inicial = [], falhaPost = false, dupe = false } = {}) {
  const calls = { post: [], patch: [], get: 0 };
  let banco = inicial.map(p => ({ ...p }));
  let n = 0;
  const db = {
    dbGet: async () => { calls.get++; return banco.map(p => ({ ...p })); },
    dbPost: async (t, d) => {
      calls.post.push([t, d]);
      if (falhaPost) return null;
      if (dupe) { banco.push({ id: 'x1', apelidos: [], essencial: false, urgencia: 'sem_pressa', duracao_estimada_dias: null, ...d }); dupe = false; return null; }
      const r = { id: 'p' + (++n), apelidos: [], essencial: false, urgencia: 'sem_pressa', duracao_estimada_dias: null, ...d };
      banco.push(r); return r;
    },
    dbPatch: async (t, id, d) => { calls.patch.push([t, id, d]); const p = banco.find(x => x.id === id); Object.assign(p, d); return { ...p }; },
    dbDel: async () => {},
  };
  return { p: createProdutos({ db }), calls };
}
const leite = { id: 'a1', nome: 'Leite', chave: 'leite', apelidos: [], essencial: false, urgencia: 'sem_pressa', duracao_estimada_dias: null };

test('garantir cria produto novo com chave normalizada', async () => {
  const { p, calls } = mk();
  const r = await p.garantir(' leite  Integral ');
  assert.strictEqual(r.nome, 'Leite  Integral');
  assert.strictEqual(r.chave, 'leite integral');
  assert.strictEqual(calls.post.length, 1);
});
test('garantir devolve o existente sem criar de novo', async () => {
  const { p, calls } = mk({ inicial: [leite] });
  await p.carregar();
  const r = await p.garantir('LEITE');
  assert.strictEqual(r.id, 'a1');
  assert.strictEqual(calls.post.length, 0);
});
test('garantir acha por apelido', async () => {
  const { p, calls } = mk({ inicial: [{ ...leite, apelidos: ['leite 0'] }] });
  await p.carregar();
  assert.strictEqual((await p.garantir('Leite 0')).id, 'a1');
  assert.strictEqual(calls.post.length, 0);
});
test('garantir com nome vazio devolve null', async () => {
  const { p } = mk();
  assert.strictEqual(await p.garantir('   '), null);
});
test('garantir devolve null quando o banco falha', async () => {
  const { p } = mk({ falhaPost: true });
  assert.strictEqual(await p.garantir('Arroz'), null);
});
test('garantir com chave repetida recarrega e acha', async () => {
  const { p } = mk({ dupe: true });
  const r = await p.garantir('Sabonete');
  assert.strictEqual(r.id, 'x1');
});
test('marcar atualiza essencial e urgencia e a memória', async () => {
  const { p, calls } = mk({ inicial: [leite] });
  await p.carregar();
  const r = await p.marcar('a1', { essencial: true, urgencia: 'amanha' });
  assert.strictEqual(r.essencial, true);
  assert.deepStrictEqual(calls.patch[0], ['produtos', 'a1', { essencial: true, urgencia: 'amanha' }]);
  assert.strictEqual(p.lista()[0].urgencia, 'amanha');
});
test('adicionarApelido não repete', async () => {
  const { p, calls } = mk({ inicial: [leite] });
  await p.carregar();
  await p.adicionarApelido('a1', 'Leite 0');
  await p.adicionarApelido('a1', 'leite  0');
  assert.strictEqual(calls.patch.length, 1);
  assert.deepStrictEqual(p.lista()[0].apelidos, ['leite 0']);
});
