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
  assert.deepStrictEqual(r.precoDiferente, [{ nome: 'Biscoito', app: 5.99, cupom: 7.49 }]);
  assert.strictEqual(r.diferencaTotal, 1.5);
});
test('item só no cupom (esquecido no app)', () => {
  const r = compararCupom([app('Arroz', 20)], [cup('Arroz', 20), cup('Sabonete', 3)]);
  assert.deepStrictEqual(r.soNoCupom, [{ nome: 'Sabonete', subtotal: 3 }]);
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
