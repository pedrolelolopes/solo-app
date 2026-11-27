const test = require('node:test');
const assert = require('node:assert');
const { compararCupom } = require('../js/gastos.js');

const app = (nome, subtotal) => ({ nome, subtotal });
const cup = (nome, preco, qtd = 1) => ({ nome, preco, qtd });

test('itens iguais', () => {
  const r = compararCupom([app('Arroz', 20), app('Feijão', 8)], [cup('ARROZ', 20), cup('FEIJAO', 4, 2)]);
  assert.strictEqual(r.iguais.length, 2);
  assert.strictEqual(r.precoDiferente.length, 0);
  assert.strictEqual(r.diferencaTotal, 0);
});
test('preço diferente (promoção que não valeu)', () => {
  const r = compararCupom([app('Biscoito', 5.99)], [cup('BISCOITO', 7.49)]);
  assert.strictEqual(r.precoDiferente.length, 1);
  assert.deepStrictEqual([r.precoDiferente[0].nome, r.precoDiferente[0].app, r.precoDiferente[0].cupom], ['Biscoito', 5.99, 7.49]);
  assert.strictEqual(r.diferencaTotal, 1.5);
});
test('item só no cupom (esquecido no app)', () => {
  const r = compararCupom([app('Arroz', 20)], [cup('Arroz', 20), cup('Sabonete', 3)]);
  assert.deepStrictEqual(r.soNoCupom.map(x => [x.nome, x.subtotal, x.preco, x.qtd]), [['Sabonete', 3, 3, 1]]);
  assert.strictEqual(r.diferencaTotal, 3);
});
test('item só no app, diferença negativa', () => {
  const r = compararCupom([app('Arroz', 20), app('Sal', 4)], [cup('Arroz', 20)]);
  assert.deepStrictEqual(r.soNoApp, [{ nome: 'Sal', subtotal: 4 }]);
  assert.strictEqual(r.diferencaTotal, -4);
});
test('nome de cupom abreviado em caixa alta casa por palavras em comum', () => {
  const r = compararCupom([app('Leite desnatado', 5)], [cup('LEITE UHT DESN 1L', 5)]);
  assert.strictEqual(r.iguais.length, 1);
  assert.strictEqual(r.soNoCupom.length, 0);
});
test('um item do app só casa com um do cupom', () => {
  const r = compararCupom([app('Leite', 5)], [cup('Leite A', 5), cup('Leite B', 5)]);
  assert.strictEqual(r.iguais.length + r.precoDiferente.length, 1);
  assert.strictEqual(r.soNoCupom.length, 1);
});
test('ids do app voltam em preço diferente e só no app', () => {
  const r = compararCupom([{ id: 7, nome: 'Biscoito', subtotal: 5 }, { id: 8, nome: 'Sal', subtotal: 2 }], [cup('BISCOITO', 6)]);
  assert.strictEqual(r.precoDiferente[0].id, 7);
  assert.strictEqual(r.precoDiferente[0].precoCupom, 6);
  assert.strictEqual(r.soNoApp[0].id, 8);
});

const { normalizarCupom, aplicarDescontos, numeroCupom } = require('../js/gastos.js');

test('numeroCupom entende ponto, vírgula e milhar', () => {
  assert.strictEqual(numeroCupom('117,77'), 117.77);
  assert.strictEqual(numeroCupom('R$ 1.117,77'), 1117.77);
  assert.strictEqual(numeroCupom(5.5), 5.5);
  assert.strictEqual(numeroCupom('abc'), 0);
});
test('normalizarCupom aceita lista antiga e objeto novo com local, tipo, data e descontos', () => {
  assert.strictEqual(normalizarCupom([{ nome: 'A', preco: 2, qtd: 1 }]).itens.length, 1);
  const c = normalizarCupom({ local: ' Drogaria X ', tipo: 'Farmácia', data: '2026-11-20', itens: [{ nome: 'Remédio', preco: '140,20', qtd: 1, desconto: '22,43' }], desconto_geral: 0, total: '117,77' });
  assert.deepStrictEqual([c.local, c.tipo, c.data, c.itens[0].preco, c.itens[0].desconto, c.total], ['Drogaria X', 'farmacia', '2026-11-20', 140.2, 22.43, 117.77]);
});
test('normalizarCupom: tipo ou data inválidos viram vazio e item sem preço sai', () => {
  const c = normalizarCupom({ tipo: 'padaria', data: '20/11', itens: [{ nome: 'x', preco: 0 }, { nome: 'y', preco: 1 }] });
  assert.deepStrictEqual([c.tipo, c.data, c.itens.length], ['', '', 1]);
});
test('desconto no item: remédio de 140,20 com desconto de 22,43 custou 117,77', () => {
  const r = aplicarDescontos([{ nome: 'Remédio', preco: 140.2, qtd: 1, desconto: 22.43 }], 0);
  assert.strictEqual(Math.round(r[0].preco * r[0].qtd * 100) / 100, 117.77);
  assert.deepStrictEqual([r[0].precoOriginal, r[0].desconto], [140.2, 22.43]);
});
test('desconto no item com quantidade 2 vale para a linha toda', () => {
  const r = aplicarDescontos([{ nome: 'A', preco: 10, qtd: 2, desconto: 4 }], 0);
  assert.strictEqual(r[0].preco, 8);
});
test('desconto geral sem dono é repartido pelos itens e a soma bate', () => {
  const r = aplicarDescontos([{ nome: 'A', preco: 10, qtd: 1 }, { nome: 'B', preco: 30, qtd: 1 }], 4);
  assert.deepStrictEqual(r.map(x => Math.round(x.preco * x.qtd * 100) / 100), [9, 27]);
});
test('desconto geral com divisão quebrada não perde nem cria centavo', () => {
  const r = aplicarDescontos([{ nome: 'A', preco: 10, qtd: 1 }, { nome: 'B', preco: 10, qtd: 1 }, { nome: 'C', preco: 10, qtd: 1 }], 1);
  const soma = r.reduce((s, x) => s + x.preco * x.qtd, 0);
  assert.strictEqual(Math.round(soma * 100) / 100, 29);
});
test('desconto maior que o item não deixa preço negativo', () => {
  const r = aplicarDescontos([{ nome: 'A', preco: 5, qtd: 1, desconto: 9 }], 0);
  assert.strictEqual(r[0].preco, 0);
});
