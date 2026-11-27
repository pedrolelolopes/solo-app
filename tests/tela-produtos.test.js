const test = require('node:test');
const assert = require('node:assert');
const { createTelaProdutos } = require('../js/tela-produtos.js');
const { createProdutos } = require('../js/produtos.js');

function mk({ prods = [], lotes = [], hoje = '2026-01-11' } = {}) {
  const calls = { post: [], patch: [], avisos: [] };
  const els = {};
  const doc = { getElementById: id => els[id] || (els[id] = { innerHTML: '' }) };
  let n = 0;
  const db = {
    dbGet: async t => (t === 'lotes' ? lotes.map(l => ({ ...l })) : prods.map(p => ({ ...p }))),
    dbPost: async (t, d) => { calls.post.push([t, d]); return { id: 'l' + (++n), fim: null, ...d }; },
    dbPatch: async (t, id, d) => { calls.patch.push([t, id, d]); return { id, ...d }; },
    dbDel: async () => {},
  };
  const produtos = createProdutos({ db });
  const t = createTelaProdutos({ db, produtos, doc, hoje: () => hoje, avisar: m => calls.avisos.push(m) });
  return { t, calls, els, produtos };
}
const P = (o = {}) => ({ id: 'p1', nome: 'Desodorante X', chave: 'desodorante x', apelidos: [], essencial: true, urgencia: 'sem_pressa', duracao_estimada_dias: null, ...o });
const L = (o = {}) => ({ id: 'a', produto_id: 'p1', inicio: '2026-01-01', fim: null, preco_total: 24, qtd: 1, comprado_em: '2026-01-01', ...o });

test('registrarLotes cria lote novo com início na data da compra', async () => {
  const { t, calls, produtos } = mk({ prods: [P()] }); await produtos.carregar(); await t.carregar();
  await t.registrarLotes([{ produtoId: 'p1', preco: 24, qtd: 1 }], '2026-01-05', 'farmacia');
  assert.deepStrictEqual(calls.post[0], ['lotes', { produto_id: 'p1', comprado_em: '2026-01-05', inicio: '2026-01-05', preco_total: 24, qtd: 1, local_tipo: 'farmacia' }]);
});
test('registrarLotes fecha o lote aberto anterior do mesmo produto com a data da nova compra', async () => {
  const { t, calls, produtos } = mk({ prods: [P()], lotes: [L()] }); await produtos.carregar(); await t.carregar();
  await t.registrarLotes([{ produtoId: 'p1', preco: 25, qtd: 1 }], '2026-02-01', 'mercado');
  assert.deepStrictEqual(calls.patch[0], ['lotes', 'a', { fim: '2026-02-01' }]);
  assert.strictEqual(calls.post.length, 1);
});
test('registrarLotes junta itens do mesmo produto numa compra só', async () => {
  const { t, calls, produtos } = mk({ prods: [P()] }); await produtos.carregar(); await t.carregar();
  await t.registrarLotes([{ produtoId: 'p1', preco: 10, qtd: 1 }, { produtoId: 'p1', preco: 12, qtd: 2 }], '2026-01-05', 'mercado');
  assert.strictEqual(calls.post.length, 1);
  assert.strictEqual(calls.post[0][1].preco_total, 22);
  assert.strictEqual(calls.post[0][1].qtd, 3);
});
test('acabou grava fim = hoje no lote aberto', async () => {
  const { t, calls, produtos } = mk({ prods: [P()], lotes: [L()] }); await produtos.carregar(); await t.carregar();
  await t.acabou('p1');
  assert.deepStrictEqual(calls.patch[0], ['lotes', 'a', { fim: '2026-01-11' }]);
});
test('acabou sem lote aberto avisa e não grava', async () => {
  const { t, calls, produtos } = mk({ prods: [P()] }); await produtos.carregar(); await t.carregar();
  await t.acabou('p1');
  assert.strictEqual(calls.patch.length, 0);
  assert.deepStrictEqual(calls.avisos, ['Esse produto não tem compra em uso.']);
});
test('marcar grava essencial e urgencia', async () => {
  const { t, calls, produtos } = mk({ prods: [P()] }); await produtos.carregar(); await t.carregar();
  await t.marcar('p1', { essencial: false, urgencia: 'amanha' });
  assert.deepStrictEqual(calls.patch[0], ['produtos', 'p1', { essencial: false, urgencia: 'amanha' }]);
});
test('render mostra custo por dia e "acaba em N dias"', async () => {
  const { t, els, produtos } = mk({ prods: [P({ duracao_estimada_dias: 45 })], lotes: [L()] }); await produtos.carregar(); await t.carregar();
  t.render();
  assert.match(els['produtos-lista'].innerHTML, /R\$ 2,40\/dia/);
  assert.match(els['produtos-lista'].innerHTML, /Acaba em 35 dias/);
});
test('render mostra a estimativa do Pedro quando há menos de 2 lotes fechados', async () => {
  const { t, els, produtos } = mk({ prods: [P({ duracao_estimada_dias: 45 })], lotes: [L()] }); await produtos.carregar(); await t.carregar();
  t.render();
  assert.match(els['produtos-lista'].innerHTML, /45 dias por unidade \(sua estimativa\)/);
});
test('render usa dados reais com 2 lotes fechados', async () => {
  const lotes = [L({ id: 'a', fim: '2026-01-31' }), L({ id: 'b', inicio: '2026-02-01', fim: '2026-03-03' })];
  const { t, els, produtos } = mk({ prods: [P()], lotes }); await produtos.carregar(); await t.carregar();
  t.render();
  assert.match(els['produtos-lista'].innerHTML, /30 dias por unidade \(dados reais\)/);
});
test('sugeridos não repete produto já pendente na lista', async () => {
  const { t, produtos } = mk({ prods: [P({ duracao_estimada_dias: 5, urgencia: 'amanha' })], lotes: [L()] }); await produtos.carregar(); await t.carregar();
  assert.strictEqual(t.sugeridos(new Set()).length, 1);
  assert.strictEqual(t.sugeridos(new Set(['p1'])).length, 0);
});
test('nome de produto com HTML sai escapado', async () => {
  const { t, els, produtos } = mk({ prods: [P({ nome: '<img src=x onerror=alert(1)>' })] }); await produtos.carregar(); await t.carregar();
  t.render();
  assert.ok(!els['produtos-lista'].innerHTML.includes('<img'));
});

test('temAberto diz se há compra em uso', async () => {
  const { t, produtos } = mk({ prods: [P()], lotes: [L()] }); await produtos.carregar(); await t.carregar();
  assert.strictEqual(t.temAberto('p1'), true);
  assert.strictEqual(t.temAberto('outro'), false);
});
