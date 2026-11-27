const test = require('node:test');
const assert = require('node:assert');
const { createTelaListaRapida } = require('../js/tela-lista-rapida.js');
const { createProdutos } = require('../js/produtos.js');

function mkDoc() {
  const els = {};
  return { els, getElementById(id) { return els[id] || (els[id] = { innerHTML: '', textContent: '', value: '' }); } };
}
function mk({ prods = [], hoje = [], voz } = {}) {
  const calls = { post: [], patch: [], add: [] };
  let n = 0;
  const banco = prods.map(p => ({ apelidos: [], ...p }));
  const db = {
    dbGet: async () => banco.map(p => ({ ...p })),
    dbPost: async (t, d) => { calls.post.push([t, d]); const r = { id: t + (++n), apelidos: [], ...d }; if (t === 'produtos') banco.push(r); return r; },
    dbPatch: async (t, id, d) => { calls.patch.push([t, id, d]); return { id, ...d }; },
    dbDel: async () => {},
  };
  const produtos = createProdutos({ db });
  const doc = mkDoc();
  const t = createTelaListaRapida({ db, produtos, doc, aoAdicionar: l => calls.add.push(...l), voz, getHoje: () => hoje });
  return { t, calls, doc, produtos };
}

test('analisar mostra os itens separados', async () => {
  const { t, doc, produtos } = mk(); await produtos.carregar();
  doc.getElementById('nr-texto').value = 'arroz, feijão e sal';
  t.analisar();
  assert.match(doc.els['nr-revisao'].innerHTML, /arroz/);
  assert.match(doc.els['nr-revisao'].innerHTML, /sal/);
});
test('analisar sem itens mostra o aviso', () => {
  const { t, doc } = mk();
  doc.getElementById('nr-texto').value = ' e , ';
  t.analisar();
  assert.strictEqual(doc.els['nr-aviso'].textContent, 'Não achei itens. Escreva ou fale de novo.');
});
test('item parecido pergunta "É o mesmo que" e Sim usa o existente e guarda apelido', async () => {
  const { t, doc, calls, produtos } = mk({ prods: [{ id: 'p1', nome: 'Leite sem lactose', chave: 'leite sem lactose' }] });
  await produtos.carregar();
  doc.getElementById('nr-texto').value = 'leite 0';
  t.analisar();
  assert.match(doc.els['nr-revisao'].innerHTML, /É o mesmo que <strong>Leite sem lactose<\/strong>/);
  t.responder(0, true);
  const n = await t.confirmar();
  assert.strictEqual(n, 1);
  assert.strictEqual(calls.post.filter(c => c[0] === 'produtos').length, 0);
  assert.deepStrictEqual(calls.patch[0], ['produtos', 'p1', { apelidos: ['leite 0'] }]);
  assert.strictEqual(calls.post.find(c => c[0] === 'lista_hoje')[1].produto_id, 'p1');
});
test("confirmar cria produto e linha em lista_hoje com produto_id e origem 'anotada'", async () => {
  const { t, doc, calls, produtos } = mk(); await produtos.carregar();
  doc.getElementById('nr-texto').value = 'sabonete';
  t.analisar();
  await t.confirmar();
  assert.strictEqual(calls.post[0][0], 'produtos');
  const [, linha] = calls.post.find(c => c[0] === 'lista_hoje');
  assert.deepStrictEqual(linha, { nome: 'Sabonete', detalhe: '', done: false, produto_id: 'produtos1', origem: 'anotada' });
  assert.strictEqual(calls.add.length, 1);
});
test('confirmar não duplica item já pendente na lista', async () => {
  const { t, doc, calls, produtos } = mk({ prods: [{ id: 'p1', nome: 'Café', chave: 'cafe' }], hoje: [{ nome: 'Café', produto_id: 'p1', done: false }] });
  await produtos.carregar();
  doc.getElementById('nr-texto').value = 'café, sal';
  t.analisar();
  const n = await t.confirmar();
  assert.strictEqual(n, 1);
  assert.strictEqual(calls.post.filter(c => c[0] === 'lista_hoje').length, 1);
});
test('confirmar devolve a quantidade e limpa o texto', async () => {
  const { t, doc, produtos } = mk(); await produtos.carregar();
  doc.getElementById('nr-texto').value = 'pente, esponja';
  const n = await t.confirmar();
  assert.strictEqual(n, 2);
  assert.strictEqual(doc.els['nr-texto'].value, '');
  assert.strictEqual(doc.els['nr-revisao'].innerHTML, '');
  assert.strictEqual(doc.els['nr-aviso'].textContent, '2 item(ns) na lista.');
});
test('sem suporte de voz mostra o aviso e não lança', () => {
  const { t, doc } = mk({ voz: { suportado: false } });
  t.alternarVoz();
  assert.match(doc.els['nr-aviso'].textContent, /Seu navegador não tem voz/);
});
test('voz acrescenta o texto ouvido', () => {
  let cb;
  const { t, doc } = mk({ voz: { suportado: true, iniciar: (a) => { cb = a; }, parar() {} } });
  t.alternarVoz(); cb('leite');
  assert.strictEqual(doc.els['nr-texto'].value, 'leite');
});
test('nome com HTML aparece escapado na revisão', () => {
  const { t, doc } = mk();
  doc.getElementById('nr-texto').value = '<img src=x onerror=alert(1)>';
  t.analisar();
  assert.ok(!doc.els['nr-revisao'].innerHTML.includes('<img'));
  assert.match(doc.els['nr-revisao'].innerHTML, /&lt;img/);
});
