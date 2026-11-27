const test = require('node:test');
const assert = require('node:assert');
const { valorPorPeso, lerPesoG, classificarItem, resumoCompra, gastosPorProduto } = require('../js/gastos.js');

test('valorPorPeso tomate 18/kg com 634 g = 11.41', () => assert.strictEqual(valorPorPeso(18, 634), 11.41));
test('valorPorPeso com zero ou negativo devolve null', () => {
  assert.strictEqual(valorPorPeso(0, 634), null);
  assert.strictEqual(valorPorPeso(18, 0), null);
  assert.strictEqual(valorPorPeso(-1, 100), null);
  assert.strictEqual(valorPorPeso(NaN, 100), null);
});
test('lerPesoG entende 634, 634g, 0,634 kg e 1.2kg', () => {
  assert.strictEqual(lerPesoG('634'), 634);
  assert.strictEqual(lerPesoG('634g'), 634);
  assert.strictEqual(lerPesoG('0,634 kg'), 634);
  assert.strictEqual(lerPesoG('1.2kg'), 1200);
});
test('lerPesoG inválido devolve null', () => {
  for (const t of ['abc', '', '-5', '0', '0 kg', null]) assert.strictEqual(lerPesoG(t), null);
});
const plan = { ids: new Set(['p1']), chaves: new Set(['arroz']) };
test('classificarItem: planejado por id e por chave', () => {
  assert.strictEqual(classificarItem({ produtoId: 'p1', chave: 'x', essencial: null }, plan), 'planejado');
  assert.strictEqual(classificarItem({ produtoId: null, chave: 'arroz', essencial: false }, plan), 'planejado');
});
test('classificarItem: fora da lista e essencial = esquecido_essencial', () =>
  assert.strictEqual(classificarItem({ produtoId: 'p2', chave: 'leite', essencial: true }, plan), 'esquecido_essencial'));
test('classificarItem: fora da lista e supérfluo = impulso', () =>
  assert.strictEqual(classificarItem({ produtoId: 'p2', chave: 'bala', essencial: false }, plan), 'impulso'));
test('classificarItem: sem resposta = null', () =>
  assert.strictEqual(classificarItem({ produtoId: 'p2', chave: 'bala', essencial: null }, plan), null));
test('resumoCompra soma por classe e total', () => {
  const r = resumoCompra([
    { classe: 'planejado', subtotal: 10.1 }, { classe: 'planejado', subtotal: 5.2 },
    { classe: 'impulso', subtotal: 3 }, { classe: 'esquecido_essencial', subtotal: 7.5 }, { classe: null, subtotal: 1 },
  ]);
  assert.deepStrictEqual(r, { planejado: 15.3, esquecido_essencial: 7.5, impulso: 3, sem_classe: 1, total: 26.8 });
});
test('gastosPorProduto agrupa nomes diferentes do mesmo produto_id e ordena por total', () => {
  const r = gastosPorProduto([
    { produto_id: 'a', nome: 'Leite', subtotal: 5, qtd: 1 },
    { produto_id: 'a', nome: 'leite 0', subtotal: 7, qtd: 1 },
    { produto_id: null, nome: 'Carne ', subtotal: 40, qtd: 2 },
    { produto_id: null, nome: 'carne', subtotal: 20, qtd: 1 },
  ]);
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0].nome, 'Carne ');
  assert.strictEqual(r[0].total, 60);
  assert.strictEqual(r[0].precoMedio, 20);
  assert.strictEqual(r[1].compras, 2);
  assert.strictEqual(r[1].total, 12);
});

const { interpretarEtiqueta } = require('../js/gastos.js');
test('interpretarEtiqueta: produto de prateleira', () => {
  const r = interpretarEtiqueta({ nome: 'Leite Integral', marca: 'Italac', tamanho: '1', unidade: 'L', preco: '5,99', preco_por_kg: false });
  assert.deepStrictEqual(r, { nome: 'Leite Integral', marca: 'Italac', tamanho: '1', unidade: 'L', preco: 5.99, porKg: false, pesoG: 0, precoTotal: 0 });
});
test('interpretarEtiqueta: tomate a R$ 18/kg vira porKg e "null" vira vazio', () => {
  const r = interpretarEtiqueta({ nome: 'Tomate', marca: 'null', tamanho: null, unidade: 'kg', preco: 18, preco_por_kg: true });
  assert.deepStrictEqual([r.nome, r.marca, r.tamanho, r.preco, r.porKg], ['Tomate', '', '', 18, true]);
});
test('interpretarEtiqueta: resposta vazia não lança', () => assert.strictEqual(interpretarEtiqueta(null).nome, ''));

test('interpretarEtiqueta: etiqueta de balança (peso já pesado) preenche o peso em gramas', () => {
  const r = interpretarEtiqueta({ nome: 'Tomate', preco: '18,00', preco_por_kg: true, peso_kg: '0,634', preco_total: '11,41' });
  assert.deepStrictEqual([r.porKg, r.pesoG, r.preco, r.precoTotal], [true, 634, 18, 11.41]);
});
test('interpretarEtiqueta: só peso e total (sem preço por kg) calcula o preço por kg', () => {
  const r = interpretarEtiqueta({ nome: 'Queijo', preco_por_kg: false, peso: 0.25, preco_total: 15 });
  assert.deepStrictEqual([r.porKg, r.pesoG, r.preco], [true, 250, 60]);
});
test('interpretarEtiqueta: peso da embalagem sem balança não é peso pesado', () => {
  const r = interpretarEtiqueta({ nome: 'Arroz', tamanho: '5', unidade: 'kg', preco: 22.9, preco_por_kg: false });
  assert.deepStrictEqual([r.porKg, r.pesoG], [false, 0]);
});
