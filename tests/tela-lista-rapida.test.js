const test = require('node:test');
const assert = require('node:assert');
const { createTelaListaRapida } = require('../js/tela-lista-rapida.js');
const { createProdutos } = require('../js/produtos.js');

function mkDoc() {
  const els = {};
  return { els, getElementById(id) { return els[id] || (els[id] = { innerHTML: '', textContent: '', value: '' }); } };
}
function mk({ prods = [], hoje = [], voz, resposta } = {}) {
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
  const t = createTelaListaRapida({
    db, produtos, doc, voz, getHoje: () => hoje, perguntar: () => resposta,
    aoAdicionar: l => calls.add.push(...l),
  });
  return { t, calls, doc, produtos };
}
const linhas = calls => calls.post.filter(c => c[0] === 'lista_hoje').map(c => c[1]);
const previaTxt = doc => doc.els['nr-revisao'].innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function mkFala(opts) {
  let aoFinal;
  const voz = { suportado: true, iniciar: (a) => { aoFinal = a; }, parar() {} };
  const m = mk({ ...opts, voz });
  return { ...m, falar: async txt => aoFinal(txt) };
}

test('falar/digitar só cria prévia: nada vai para a lista até Adicionar', async () => {
  const { t, doc, calls, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('arroz, feijão e sal');
  assert.strictEqual(linhas(calls).length, 0);
  assert.match(previaTxt(doc), /arroz.*feijão.*sal/);
});
test('Adicionar manda a prévia para a lista Hoje e a prévia some', async () => {
  const { t, doc, calls, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('arroz, feijão e sal');
  const n = await t.adicionar();
  assert.strictEqual(n, 3);
  assert.strictEqual(linhas(calls).length, 3);
  assert.strictEqual(doc.els['nr-revisao'].innerHTML, '');
  assert.strictEqual(doc.els['nr-aviso'].textContent, '3 item(ns) na lista.');
  assert.strictEqual(calls.add.length, 3);
});
test("linha criada tem produto_id e origem 'anotada'", async () => {
  const { t, calls, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('esponja de pia');
  await t.adicionar();
  assert.strictEqual(calls.post[0][0], 'produtos');
  assert.deepStrictEqual(linhas(calls)[0], { nome: 'Esponja de pia', detalhe: '', done: false, produto_id: 'produtos1', origem: 'anotada' });
});
test('texto digitado na caixa entra ao tocar Adicionar', async () => {
  const { t, doc, calls, produtos } = mk(); await produtos.carregar();
  doc.getElementById('nr-texto').value = 'sabonete, esponja';
  assert.strictEqual(await t.adicionar(), 2);
  assert.strictEqual(doc.els['nr-texto'].value, '');
});
test('sem itens mostra o aviso', async () => {
  const { t, doc } = mk();
  doc.getElementById('nr-texto').value = ' e , ';
  await t.adicionar();
  assert.strictEqual(doc.els['nr-aviso'].textContent, 'Não achei itens. Escreva ou fale de novo.');
});
test('não duplica item já pendente na lista', async () => {
  const { t, calls, produtos } = mk({ prods: [{ id: 'p1', nome: 'Café', chave: 'cafe' }], hoje: [{ nome: 'Café', produto_id: 'p1', done: false }] });
  await produtos.carregar();
  t.adicionarTexto('café, sal');
  assert.strictEqual(await t.adicionar(), 1);
  assert.strictEqual(linhas(calls).length, 1);
});
test('"chá pro Manuel" guarda o Manuel como detalhe da linha', async () => {
  const { t, doc, calls, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('chá pro Manuel');
  assert.match(previaTxt(doc), /chá 📝 pro Manuel/);
  await t.adicionar();
  assert.deepStrictEqual([linhas(calls)[0].nome, linhas(calls)[0].detalhe], ['Chá', 'pro Manuel']);
});
test('"chá de cidreira" depois de "chá": pergunta se é o mesmo; Sim fica com o nome mais completo e o detalhe', async () => {
  const { t, doc, calls, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('chá pro Manuel');
  t.adicionarTexto('chá de cidreira, né');
  assert.match(previaTxt(doc), /chá de cidreira é o mesmo que chá/);
  t.responder(1, true);
  await t.adicionar();
  assert.strictEqual(linhas(calls).length, 1);
  assert.deepStrictEqual([linhas(calls)[0].nome, linhas(calls)[0].detalhe], ['Chá de cidreira', 'pro Manuel']);
});
test('Não mantém os dois itens', async () => {
  const { t, calls, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('chá');
  t.adicionarTexto('chá de cidreira');
  t.responder(1, false);
  await t.adicionar();
  assert.strictEqual(linhas(calls).length, 2);
});
test('nome parecido de produto cadastrado não pergunta nada', async () => {
  const { t, doc, produtos } = mk({ prods: [{ id: 'p1', nome: 'Leite sem lactose', chave: 'leite sem lactose' }] });
  await produtos.carregar();
  t.adicionarTexto('leite 0');
  assert.ok(!doc.els['nr-revisao'].innerHTML.includes('é o mesmo que'));
});
test('"filtro papel café" é o mesmo produto de "Filtro de papel para café"', async () => {
  const { t, calls, produtos } = mk({ prods: [{ id: 'p1', nome: 'Filtro de papel para café', chave: 'filtro de papel para cafe' }] });
  await produtos.carregar();
  t.adicionarTexto('filtro papel café');
  await t.adicionar();
  assert.strictEqual(calls.post.filter(c => c[0] === 'produtos').length, 0);
  assert.strictEqual(linhas(calls)[0].produto_id, 'p1');
});
test('remover tira da prévia', async () => {
  const { t, doc, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('sabonete, esponja');
  t.remover(0);
  assert.ok(!previaTxt(doc).includes('sabonete'));
});
test('frase que termina em "para" espera o resto: "filtro de papel para" + "café" = 1 item', async () => {
  const { t, falar, calls, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('preciso comprar filtro de papel para');
  await falar('café');
  await t.adicionar();
  assert.deepStrictEqual(linhas(calls).map(l => l.nome), ['Filtro de papel para café']);
});
test('"leite", eco "leites" e "sem lactose" viram "Leite sem lactose"', async () => {
  const { t, falar, calls, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('leite');
  await falar('leites');
  await falar('sem lactose');
  await t.adicionar();
  assert.deepStrictEqual(linhas(calls).map(l => l.nome), ['Leite sem lactose']);
});
test('"filtro de papel" + pausa + "café" junta num item conhecido', async () => {
  const { t, falar, doc, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('filtro de papel');
  await falar('café');
  assert.match(previaTxt(doc), /^filtro de papel café/i);
  assert.ok(!/ café ✏️/.test(previaTxt(doc).replace('filtro de papel café', '')));
});
test('voz: "café manteiga desodorante" vira 3 e "papel manteiga" 1', async () => {
  const { t, falar, calls, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('café manteiga desodorante');
  await falar('papel manteiga');
  await t.adicionar();
  assert.deepStrictEqual(linhas(calls).map(l => l.nome), ['Café', 'Manteiga', 'Desodorante', 'Papel manteiga']);
});
test('parar com frase no meio ainda põe o item na prévia', async () => {
  const { t, falar, doc, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('manteiga e');
  t.alternarVoz();
  assert.match(previaTxt(doc), /manteiga/);
  assert.strictEqual(doc.els['nr-aviso'].textContent, 'Confira os itens e toque em Adicionar à lista.');
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
test('corrigir ensina: o que foi ouvido vira apelido do produto certo', async () => {
  const { t, calls, produtos } = mk({ resposta: 'Dexa' }); await produtos.carregar();
  t.adicionarTexto('deixa');
  await t.editar(0);
  const ap = calls.patch.find(c => c[0] === 'produtos');
  assert.deepStrictEqual(ap[2], { apelidos: ['deixa'] });
  await t.adicionar();
  assert.strictEqual(linhas(calls)[0].nome, 'Dexa');
});
test('depois de ensinado, "deixa" vira Dexa sozinho', async () => {
  const { t, calls, produtos } = mk({ prods: [{ id: 'p9', nome: 'Dexa', chave: 'dexa', apelidos: ['deixa'] }] });
  await produtos.carregar();
  t.adicionarTexto('deixa');
  await t.adicionar();
  assert.deepStrictEqual([linhas(calls)[0].nome, linhas(calls)[0].produto_id], ['Dexa', 'p9']);
});
test('corrigir falando troca o nome na prévia', async () => {
  let cb;
  const { t, doc, produtos } = mk({ voz: { suportado: true, iniciar: (a) => { cb = a; }, parar() {} } });
  await produtos.carregar();
  t.adicionarTexto('sabonete');
  t.corrigir(0);
  await cb('desodorante');
  assert.match(previaTxt(doc), /Desodorante/);
});
test('editar sem digitar nada não muda nada', async () => {
  const { t, calls, produtos } = mk({ resposta: '' }); await produtos.carregar();
  t.adicionarTexto('sabonete');
  await t.editar(0);
  assert.strictEqual(calls.patch.length, 0);
});
test('nome com HTML aparece escapado na prévia', async () => {
  const { t, doc, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('<img src=x onerror=alert(1)>');
  assert.ok(!doc.els['nr-revisao'].innerHTML.includes('<img'));
  assert.match(doc.els['nr-revisao'].innerHTML, /&lt;img/);
});

test('pergunta velha some quando o nome muda: "leite de magnésio", "leite" + "sem lactose"', async () => {
  const { t, falar, doc, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('leite de magnésio');
  await falar('leite');
  assert.match(previaTxt(doc), /é o mesmo que/); // "leite" ⊂ "leite de magnésio": ainda pode ser o mesmo
  await falar('sem lactose');
  assert.ok(!previaTxt(doc).includes('é o mesmo que'));
});
test('responder Não não pergunta de novo o mesmo par', async () => {
  const { t, doc, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('chá');
  t.adicionarTexto('chá de cidreira');
  t.responder(1, false);
  t.adicionarTexto('arroz');
  assert.ok(!previaTxt(doc).includes('é o mesmo que'));
});
test('"leite sem" + "quero dizer leite integral" (frases separadas) fica "Leite integral"', async () => {
  const { t, falar, calls, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('leite sem');
  await falar('quero dizer leite integral');
  await t.adicionar();
  assert.deepStrictEqual(linhas(calls).map(l => l.nome), ['Leite integral']);
});
test('"tomate, aquele tomate pequenininho, tomate cereja" (falado em partes) vira "Tomate cereja"', async () => {
  const { t, falar, calls, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('tomate');
  await falar('aquele tomate pequenininho');
  await falar('tomate cereja');
  await t.adicionar();
  assert.deepStrictEqual(linhas(calls).map(l => l.nome), ['Tomate cereja']);
});
test('"tomate, aquele tomate pequenininho, tomate cereja" (digitado de uma vez) vira 1 item', async () => {
  const { t, calls, produtos } = mk(); await produtos.carregar();
  t.adicionarTexto('tomate, aquele tomate pequenininho, tomate cereja');
  await t.adicionar();
  assert.deepStrictEqual(linhas(calls).map(l => l.nome), ['Tomate cereja']);
});

test('voz: "chá para o manuel" (minúscula) vira Chá + lembrete e "chá de cidreira, né" pergunta se é o mesmo', async () => {
  const { t, falar, doc, calls, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('chá para o manuel');
  assert.match(previaTxt(doc), /chá 📝 para o manuel/);
  await falar('chá de cidreira, né');
  assert.match(previaTxt(doc), /chá de cidreira é o mesmo que chá/);
  t.responder(1, true);
  await t.adicionar();
  assert.deepStrictEqual([linhas(calls).length, linhas(calls)[0].nome, linhas(calls)[0].detalhe], [1, 'Chá de cidreira', 'para o manuel']);
});
test('voz: "tomate" e depois "aquele tomatinho pequeno, como é que é o nome? tomate cereja" vira "Tomate cereja"', async () => {
  const { t, falar, calls, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('tomate');
  await falar('aquele tomatinho pequeno, como é que é o nome? tomate cereja');
  await t.adicionar();
  assert.deepStrictEqual(linhas(calls).map(l => l.nome), ['Tomate cereja']);
});
test('voz: tudo numa frase só ("tomate, aquele tomatinho pequeno, como é que é o nome? tomate cereja")', async () => {
  const { t, falar, calls, produtos } = mkFala(); await produtos.carregar();
  t.alternarVoz();
  await falar('tomate, aquele tomatinho pequeno, como é que é o nome? tomate cereja');
  await t.adicionar();
  assert.deepStrictEqual(linhas(calls).map(l => l.nome), ['Tomate cereja']);
});
