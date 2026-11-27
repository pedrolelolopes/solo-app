const test = require('node:test');
const assert = require('node:assert');
const { createTelaListaRapida } = require('../js/tela-lista-rapida.js');
const { createProdutos } = require('../js/produtos.js');

function mkDoc() {
  const els = {};
  return { els, getElementById(id) { return els[id] || (els[id] = { innerHTML: '', textContent: '', value: '' }); } };
}
function mk({ prods = [], hoje = [], voz } = {}) {
  const calls = { post: [], patch: [], del: [], add: [], rem: [], upd: [] };
  let n = 0;
  const banco = prods.map(p => ({ apelidos: [], ...p }));
  const db = {
    dbGet: async () => banco.map(p => ({ ...p })),
    dbPost: async (t, d) => { calls.post.push([t, d]); const r = { id: t + (++n), apelidos: [], ...d }; if (t === 'produtos') banco.push(r); return r; },
    dbPatch: async (t, id, d) => { calls.patch.push([t, id, d]); return { id, ...d }; },
    dbDel: async (t, id) => { calls.del.push([t, id]); },
  };
  const produtos = createProdutos({ db });
  const doc = mkDoc();
  const t = createTelaListaRapida({
    db, produtos, doc, voz, getHoje: () => hoje,
    aoAdicionar: l => calls.add.push(...l), aoRemover: id => calls.rem.push(id), aoAtualizar: l => calls.upd.push(l),
  });
  return { t, calls, doc, produtos };
}

test('adicionar cria os itens da nota na lista Hoje', async () => {
  const { t, doc, calls, produtos } = mk(); await produtos.carregar();
  doc.getElementById('nr-texto').value = 'arroz, feijão e sal';
  const n = await t.adicionar();
  assert.strictEqual(n, 3);
  assert.strictEqual(calls.post.filter(c => c[0] === 'lista_hoje').length, 3);
  assert.strictEqual(doc.els['nr-texto'].value, '');
  assert.strictEqual(doc.els['nr-aviso'].textContent, '3 item(ns) na lista.');
  assert.match(doc.els['nr-revisao'].innerHTML, /Arroz/);
});
test("linha criada tem produto_id e origem 'anotada'", async () => {
  const { t, doc, calls, produtos } = mk(); await produtos.carregar();
  doc.getElementById('nr-texto').value = 'esponja de pia';
  await t.adicionar();
  assert.strictEqual(calls.post[0][0], 'produtos');
  const linha = calls.post.find(c => c[0] === 'lista_hoje')[1];
  assert.deepStrictEqual(linha, { nome: 'Esponja de pia', detalhe: '', done: false, produto_id: 'produtos1', origem: 'anotada' });
});
test('sem itens mostra o aviso', async () => {
  const { t, doc } = mk();
  doc.getElementById('nr-texto').value = ' e , ';
  await t.adicionar();
  assert.strictEqual(doc.els['nr-aviso'].textContent, 'Não achei itens. Escreva ou fale de novo.');
});
test('não duplica item já pendente na lista', async () => {
  const { t, doc, calls, produtos } = mk({ prods: [{ id: 'p1', nome: 'Café', chave: 'cafe' }], hoje: [{ nome: 'Café', produto_id: 'p1', done: false }] });
  await produtos.carregar();
  doc.getElementById('nr-texto').value = 'café, sal';
  assert.strictEqual(await t.adicionar(), 1);
  assert.strictEqual(calls.post.filter(c => c[0] === 'lista_hoje').length, 1);
});
test('nome parecido entra na lista e pergunta "Mesmo que"; Sim junta e guarda apelido', async () => {
  const { t, doc, calls, produtos } = mk({ prods: [{ id: 'p1', nome: 'Leite sem lactose', chave: 'leite sem lactose' }] });
  await produtos.carregar();
  await t.adicionarTexto('leite 0');
  assert.strictEqual(calls.post.filter(c => c[0] === 'produtos').length, 0);
  assert.match(doc.els['nr-revisao'].innerHTML, /Mesmo que <strong>Leite sem lactose<\/strong>/);
  await t.responder(0, true);
  assert.deepStrictEqual(calls.patch.find(c => c[0] === 'lista_hoje'), ['lista_hoje', 'lista_hoje1', { nome: 'Leite sem lactose', produto_id: 'p1' }]);
  assert.deepStrictEqual(calls.patch.find(c => c[0] === 'produtos'), ['produtos', 'p1', { apelidos: ['leite 0'] }]);
  assert.ok(!doc.els['nr-revisao'].innerHTML.includes('Mesmo que'));
});
test('Não cria o produto novo e liga à linha', async () => {
  const { t, calls, produtos } = mk({ prods: [{ id: 'p1', nome: 'Leite sem lactose', chave: 'leite sem lactose' }] });
  await produtos.carregar();
  await t.adicionarTexto('leite 0');
  await t.responder(0, false);
  assert.strictEqual(calls.post.filter(c => c[0] === 'produtos').length, 1);
  assert.strictEqual(calls.patch.find(c => c[0] === 'lista_hoje')[2].produto_id, 'produtos2');
});
test('remover apaga a linha e avisa a tela', async () => {
  const { t, calls, produtos } = mk(); await produtos.carregar();
  await t.adicionarTexto('sabonete');
  await t.remover(0);
  assert.deepStrictEqual(calls.del, [['lista_hoje', 'lista_hoje2']]);
  assert.deepStrictEqual(calls.rem, ['lista_hoje2']);
});
test('corrigir falando troca o nome da linha', async () => {
  let cb;
  const { t, calls, produtos } = mk({ voz: { suportado: true, iniciar: (a) => { cb = a; }, parar() {} } });
  await produtos.carregar();
  await t.adicionarTexto('sabonete');
  t.corrigir(0);
  await cb('desodorante');
  const p = calls.patch.find(c => c[0] === 'lista_hoje');
  assert.strictEqual(p[2].nome, 'Desodorante');
  assert.strictEqual(calls.upd.length, 1);
});
test('voz ligada: cada frase vira itens sem tocar na caixa de texto', async () => {
  let aoFinal, op;
  const voz = { suportado: true, iniciar: (a, f, o) => { aoFinal = a; op = o; }, parar() {} };
  const { t, doc, calls, produtos } = mk({ voz }); await produtos.carregar();
  t.alternarVoz();
  assert.strictEqual(op.continuo, true);
  assert.strictEqual(doc.els['nr-voz-btn'].textContent, '⏹ Parar');
  await aoFinal('eu preciso lembrar de comprar café, manteiga');
  await aoFinal('papel manteiga');
  await new Promise(r => setTimeout(r, 10));
  assert.strictEqual(calls.post.filter(c => c[0] === 'lista_hoje').length, 3);
});
test('voz: "café manteiga desodorante" sem pausa vira 3 itens e "papel manteiga" 1', async () => {
  let aoFinal;
  const voz = { suportado: true, iniciar: (a) => { aoFinal = a; }, parar() {} };
  const { t, calls, produtos } = mk({ voz }); await produtos.carregar();
  t.alternarVoz();
  await aoFinal('café manteiga desodorante');
  await aoFinal('papel manteiga');
  const nomes = calls.post.filter(c => c[0] === 'lista_hoje').map(c => c[1].nome);
  assert.deepStrictEqual(nomes, ['Café', 'Manteiga', 'Desodorante', 'Papel manteiga']);
});
test('tocar de novo para a voz', () => {
  let parou = 0;
  const { t, doc } = mk({ voz: { suportado: true, iniciar() {}, parar() { parou++; } } });
  t.alternarVoz(); t.alternarVoz();
  assert.strictEqual(parou, 1);
  assert.strictEqual(doc.els['nr-voz-btn'].textContent, '🎤 Falar');
});
test('sem suporte de voz mostra o aviso e não lança', () => {
  const { t, doc } = mk({ voz: { suportado: false } });
  t.alternarVoz();
  assert.match(doc.els['nr-aviso'].textContent, /Seu navegador não tem voz/);
});
test('nome com HTML aparece escapado na prévia', async () => {
  const { t, doc, produtos } = mk(); await produtos.carregar();
  await t.adicionarTexto('<img src=x onerror=alert(1)>');
  assert.ok(!doc.els['nr-revisao'].innerHTML.includes('<img'));
  assert.match(doc.els['nr-revisao'].innerHTML, /&lt;img/);
});
