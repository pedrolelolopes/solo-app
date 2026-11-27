const test = require('node:test');
const assert = require('node:assert');
const { normalizar, sugerirProdutos } = require('../js/nomes.js');

const P = (nome, apelidos = []) => ({ id: nome, nome, chave: normalizar(nome), apelidos });

test('normalizar tira acento, caixa e espaços', () => assert.strictEqual(normalizar('  Açúcar  Refinado '), 'acucar refinado'));
test("normalizar de vazio devolve ''", () => { assert.strictEqual(normalizar(''), ''); assert.strictEqual(normalizar(null), ''); });
test('sugerirProdutos acha igual por chave', () => {
  const r = sugerirProdutos('LEITE ', [P('Leite'), P('Leite sem lactose')]);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].motivo, 'igual');
});
test('sugerirProdutos acha igual por apelido', () => {
  const r = sugerirProdutos('Leite 0', [P('Leite sem lactose', ['leite 0'])]);
  assert.deepStrictEqual(r.map(x => x.motivo), ['igual']);
});
test('leite 0 sugere Leite sem lactose como parecido', () => {
  const r = sugerirProdutos('leite 0', [P('Leite sem lactose'), P('Arroz')]);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].motivo, 'parecido');
  assert.strictEqual(r[0].produto.nome, 'Leite sem lactose');
});
test('parecido ignora palavras de ligação', () => {
  assert.deepStrictEqual(sugerirProdutos('pasta de dente', [P('Suco de uva')]), []);
});
test('respeita max e ordena por palavras em comum', () => {
  const ps = [P('Leite condensado'), P('Leite integral caixa'), P('Leite integral'), P('Leite em po')];
  const r = sugerirProdutos('leite integral caixa grande', ps, 2);
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0].produto.nome, 'Leite integral caixa');
});
test('texto vazio devolve []', () => assert.deepStrictEqual(sugerirProdutos('  ', [P('Leite')]), []));

test('igual ignora "de/da/do/para" (filtro papel café = filtro de papel para café)', () => {
  const r = sugerirProdutos('filtro papel café', [P('Filtro de papel para café')]);
  assert.deepStrictEqual(r.map(x => x.motivo), ['igual']);
});
test('"sem" e "com" continuam diferenciando', () =>
  assert.deepStrictEqual(sugerirProdutos('leite com lactose', [P('Leite sem lactose')]).map(x => x.motivo), ['parecido']));
