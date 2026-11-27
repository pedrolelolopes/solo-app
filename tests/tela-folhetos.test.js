const test = require('node:test');
const assert = require('node:assert');
const { createTelaFolhetos } = require('../js/tela-folhetos.js');
const F = require('../js/folhetos.js');

function mkDoc() {
  const els = {};
  return {
    els,
    getElementById(id) {
      return els[id] || (els[id] = { innerHTML: '', textContent: '', value: '', disabled: false, style: {}, files: [] });
    },
  };
}
const file = (name, type = 'image/jpeg', size = 1000) => ({ name, type, size });

function mk({ lista = [], gets = {}, iaTexto = [], cortado = false, iaErro = [] } = {}) {
  const calls = { post: [], patch: [], del: [], get: [], ia: [], avisos: [] };
  let n = 0;
  const db = {
    dbGet: async (t, qs) => { calls.get.push([t, qs]); const g = gets[t]; return typeof g === 'function' ? g(qs) : (g || []); },
    dbPost: async (t, d) => { calls.post.push([t, d]); return { id: t + (++n), ...d }; },
    dbPatch: async (t, id, d) => { calls.patch.push([t, id, d]); return { id, ...d }; },
    dbDel: async (t, id) => { calls.del.push([t, id]); },
  };
  let k = 0;
  const ia = {
    claudeArquivo: async (a) => {
      calls.ia.push(a);
      const i = k++;
      if (iaErro.includes(i)) throw new Error('falhou');
      return { texto: iaTexto[i] !== undefined ? iaTexto[i] : 'Arroz 5kg|22,90|kg', cortado };
    },
  };
  const doc = mkDoc();
  const claudeTexto = async (prompt, maxTokens, model) => {
    calls.ia.push({ prompt, maxTokens, model });
    return iaTexto[k++];
  };
  const t = createTelaFolhetos({
    db, ia, toB64: async () => 'B64', doc, avisar: m => calls.avisos.push(m),
    getLista: () => lista, confirmar: () => true, claudeTexto,
  });
  return { t, calls, doc };
}

test('processarArquivos continua após falha', async () => {
  const { t, calls } = mk({ iaTexto: ['Arroz|10|kg', '', 'Feijão|8|kg'], iaErro: [1] });
  const r = await t.processarArquivos([file('a.jpg'), file('b.jpg'), file('c.jpg')], 'Atacadão');
  assert.strictEqual(r.lidos, 2);
  assert.deepStrictEqual(r.falhas, ['b.jpg']);
  assert.strictEqual(calls.post.filter(c => c[0] === 'folhetos').length, 1);
  assert.strictEqual(calls.patch.length, 1);
  assert.strictEqual(calls.patch[0][2].itens.length, 2);
});

test('processarArquivos recusa PDF grande sem chamar a IA', async () => {
  const { t, calls } = mk();
  const r = await t.processarArquivos([file('g.pdf', 'application/pdf', 3_000_000)], 'X');
  assert.strictEqual(calls.ia.length, 0);
  assert.strictEqual(r.lidos, 0);
  assert.deepStrictEqual(r.falhas, ['g.pdf']);
  assert.strictEqual(calls.post.length, 0);
});

test('processarArquivos avisa quando cortado', async () => {
  const { t, calls } = mk({ cortado: true });
  const r = await t.processarArquivos([file('a.jpg')], 'X');
  assert.strictEqual(r.cortado, true);
  assert.ok(calls.avisos.some(m => m.includes('Folheto grande: alguns itens podem ter ficado de fora. Envie em partes.')));
});

test('processarArquivos usa modelo barato e 1500 tokens', async () => {
  const { t, calls } = mk();
  await t.processarArquivos([file('a.jpg')], 'X');
  assert.strictEqual(calls.ia[0].model, 'claude-haiku-4-5-20251001');
  assert.strictEqual(calls.ia[0].maxTokens, 1500);
  assert.strictEqual(calls.ia[0].prompt, F.PROMPT_LEITURA);
});

test('falha ao gravar no banco avisa e mantém na tela', async () => {
  const { doc } = mk();
  const calls2 = [];
  const t2 = createTelaFolhetos({
    db: { dbGet: async () => [], dbPost: async () => null, dbPatch: async () => null, dbDel: async () => {} },
    ia: { claudeArquivo: async () => ({ texto: 'Arroz|10|kg', cortado: false }) },
    toB64: async () => 'B', doc, avisar: m => calls2.push(m), getLista: () => [], confirmar: () => true,
  });
  await t2.processarArquivos([file('a.jpg')], 'Mercado X');
  assert.ok(calls2.some(m => m.includes('Não salvei no banco. Toque em Salvar para tentar de novo.')));
  assert.ok(doc.getElementById('folhetos-list').innerHTML.includes('não salvo'));
});

test('adicionarPaginas relê antes de gravar', async () => {
  const outro = { id: 'f1', mercado: 'Atacadão', itens: [{ nome: 'Leite', preco: 5, unidade: 'L' }] };
  const { t, calls } = mk({ gets: { folhetos: qs => (qs.includes('id=eq.f1') ? [outro] : [outro]) }, iaTexto: ['Arroz|10|kg'] });
  await t.abrir();
  const r = await t.adicionarPaginas('f1', [file('p2.jpg')]);
  assert.strictEqual(r.lidos, 1);
  assert.ok(calls.get.some(c => c[0] === 'folhetos' && c[1].includes('id=eq.f1')));
  const p = calls.patch.find(c => c[0] === 'folhetos' && c[1] === 'f1');
  assert.deepStrictEqual(p[2].itens.map(i => i.nome).sort(), ['Arroz', 'Leite']);
});

test('importarCsv cria um folheto por mercado', async () => {
  const csv = 'mercado;produto;preco;unidade\nA;Arroz;10,00;kg\nA;Feijão;8,00;kg\nB;Arroz;9,50;kg\nB;ruim;abc;kg\n';
  const { t, calls } = mk();
  const r = await t.importarCsv({ name: 'f.csv', text: async () => csv });
  assert.strictEqual(r.criados, 2);
  assert.strictEqual(r.ignoradas, 1);
  assert.strictEqual(calls.post.filter(c => c[0] === 'folhetos').length, 2);
});

const LISTA = [{ nome: 'Arroz' }, { nome: 'Feijão' }];
const FOLHS = [
  { id: 'f1', mercado: 'A', itens: [{ nome: 'Arroz Tio João', preco: 10, unidade: 'kg' }, { nome: 'Feijão Preto', preco: 8, unidade: 'kg' }] },
  { id: 'f2', mercado: 'B', itens: [{ nome: 'Arroz Camil', preco: 9, unidade: 'kg' }, { nome: 'Feijão Carioca', preco: 7, unidade: 'kg' }] },
];

test('comparar salva em comparativos', async () => {
  const { t, calls } = mk({ lista: LISTA, gets: { folhetos: FOLHS } });
  await t.abrir();
  await t.comparar();
  const esperado = F.calcularComparativo(LISTA, FOLHS, F.casarLocal(LISTA, FOLHS).pares);
  const p = calls.post.find(c => c[0] === 'comparativos');
  assert.ok(p);
  assert.strictEqual(p[1].nota, esperado.nota);
  assert.deepStrictEqual(p[1].folheto_ids, ['f1', 'f2']);
});

test('comparar não chama a IA quando todos casam', async () => {
  const { t, calls, doc } = mk({ lista: LISTA, gets: { folhetos: FOLHS } });
  await t.abrir();
  await t.comparar();
  assert.strictEqual(calls.ia.length, 0);
  assert.ok(!doc.getElementById('fol-result').innerHTML.includes('Procurar com IA'));
});

test('nota: Vale a pena! em destaque e cada linha em parágrafo', async () => {
  const lista = [{ nome: 'Arroz' }];
  const folhs = [
    { id: 'f1', mercado: 'A', itens: [{ nome: 'Arroz', preco: 100, unidade: null }] },
    { id: 'f2', mercado: 'B', itens: [{ nome: 'Arroz', preco: 10, unidade: null }] },
  ];
  const { t, doc } = mk({ lista, gets: { folhetos: folhs } });
  await t.abrir(); await t.comparar();
  const h = doc.getElementById('fol-result').innerHTML;
  assert.ok(h.includes('#FB5C32'));
  assert.ok(/<p[^>]*>Base:/.test(h));
});

test('Procurar com IA manda só os itens sem par', async () => {
  const lista = [{ nome: 'Arroz' }, { nome: 'Queijo Minas' }];
  const folhs = [{ id: 'f1', mercado: 'A', itens: [{ nome: 'Arroz Tio João', preco: 10, unidade: 'kg' }, { nome: 'Minas Frescal', preco: 30, unidade: 'kg' }] }];
  const { t, calls, doc } = mk({ lista, gets: { folhetos: folhs }, iaTexto: ['{"pares":[[1,0,1]]}'] });
  await t.abrir(); await t.comparar();
  assert.ok(doc.getElementById('fol-result').innerHTML.includes('Procurar com IA'));
  assert.strictEqual(calls.ia.length, 0);
  await t.procurarComIA();
  assert.strictEqual(calls.ia.length, 1);
  const prompt = calls.ia[0].prompt;
  assert.ok(prompt.includes('Queijo Minas'));
  assert.ok(!/(^|\n)0: Arroz\s*$/m.test(prompt));
  assert.ok(prompt.includes('Minas Frescal'));
  assert.strictEqual(calls.ia[0].model, 'claude-haiku-4-5-20251001');
  assert.strictEqual(calls.ia[0].maxTokens, 1500);
  assert.ok(calls.patch.some(c => c[0] === 'comparativos') || calls.post.filter(c => c[0] === 'comparativos').length === 2);
  assert.ok(doc.getElementById('fol-result').innerHTML.includes('Queijo Minas'));
});

test('nome com <script> aparece escapado no cartão', async () => {
  const { t, doc } = mk({ gets: { folhetos: [{ id: 'f1', mercado: '<script>alert(1)</script>', itens: [{ nome: '<img src=x onerror=1>', preco: 1, unidade: null }], criado_em: '2026-11-26T10:00:00Z' }] } });
  await t.abrir();
  t.alternar('f1');
  const h = doc.getElementById('folhetos-list').innerHTML;
  assert.ok(!h.includes('<script>'));
  assert.ok(!h.includes('<img'));
  assert.ok(h.includes('&lt;script&gt;'));
});

test('remover apaga no banco após confirmar', async () => {
  const { t, calls } = mk({ gets: { folhetos: [{ id: 'f1', mercado: 'A', itens: [] }] } });
  await t.abrir();
  await t.remover('f1');
  assert.deepStrictEqual(calls.del, [['folhetos', 'f1']]);
});

test('limpar zera a tela', async () => {
  const { t, doc } = mk({ gets: { folhetos: [{ id: 'f1', mercado: 'A', itens: [] }] } });
  await t.abrir();
  t.limpar();
  assert.strictEqual(doc.getElementById('folhetos-list').innerHTML, '');
});
