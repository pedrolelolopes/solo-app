const test = require('node:test');
const assert = require('node:assert');
const { prepararItensCompra } = require('../js/gastos.js');

const prods = [
  { id: 'p1', nome: 'Arroz', chave: 'arroz', apelidos: [], essencial: true },
  { id: 'p2', nome: 'Leite sem lactose', chave: 'leite sem lactose', apelidos: ['leite 0'], essencial: null },
  { id: 'p3', nome: 'Bala', chave: 'bala', apelidos: [], essencial: false },
];
const item = (id, nome, extra = {}) => ({ id, nome, subtotal: 10, qtd: 1, ...extra });

test('item que está em hojeList vira planejado', () => {
  const r = prepararItensCompra([item(1, 'Arroz')], prods, [{ nome: 'Arroz', produto_id: 'p1' }], {});
  assert.strictEqual(r[0].classe, 'planejado');
});
test('item novo essencial vira esquecido_essencial', () => {
  const r = prepararItensCompra([item(1, 'Café')], prods, [], { 1: { essencial: true } });
  assert.strictEqual(r[0].classe, 'esquecido_essencial');
  assert.strictEqual(r[0].produtoId, null);
});
test('item novo supérfluo vira impulso', () => {
  const r = prepararItensCompra([item(1, 'Chiclete')], prods, [], { 1: { essencial: false } });
  assert.strictEqual(r[0].classe, 'impulso');
});
test('produto já marcado não precisa de resposta', () => {
  const r = prepararItensCompra([item(1, 'bala')], prods, [], {});
  assert.strictEqual(r[0].classe, 'impulso');
});
test('produto sem marca e sem resposta fica com classe null', () => {
  const r = prepararItensCompra([item(1, 'Leite sem lactose')], prods, [], {});
  assert.strictEqual(r[0].classe, null);
});
test('nome que casa por apelido usa o produtoId do produto', () => {
  const r = prepararItensCompra([item(1, 'Leite 0')], prods, [], { 1: { essencial: true } });
  assert.strictEqual(r[0].produtoId, 'p2');
  assert.strictEqual(r[0].produtoNome, 'Leite sem lactose');
});
test('item por peso mantém produtoNome', () => {
  const r = prepararItensCompra([item(1, 'Tomate', { precoKg: 18, pesoG: 634, subtotal: 11.41 })], prods, [], { 1: { essencial: true } });
  assert.strictEqual(r[0].produtoNome, 'Tomate');
});
test('"É o mesmo que X?" Sim usa o produto escolhido', () => {
  const r = prepararItensCompra([item(1, 'Leite zero')], prods, [], { 1: { mesmoQue: 'p2', essencial: true } });
  assert.strictEqual(r[0].produtoId, 'p2');
  assert.strictEqual(r[0].classe, 'esquecido_essencial');
});
