const test = require('node:test');
const assert = require('node:assert');
const { separarItens } = require('../js/voz-lista.js');

test('separa por vírgula e "e"', () => assert.deepStrictEqual(
  separarItens('papel higiênico, filtro de café e sabonete'), ['papel higiênico', 'filtro de café', 'sabonete']));
test('tira prefixos de fala', () => assert.deepStrictEqual(separarItens('preciso comprar leite e acabou o café'), ['leite', 'café']));
test('separa por linha', () => assert.deepStrictEqual(separarItens('arroz\nfeijão\n\nsal'), ['arroz', 'feijão', 'sal']));
test('não parte "pão de queijo"', () => assert.deepStrictEqual(separarItens('pão de queijo'), ['pão de queijo']));
test('texto vazio, só vírgulas ou só "e" devolve []', () => {
  assert.deepStrictEqual(separarItens(''), []);
  assert.deepStrictEqual(separarItens(' , ,; '), []);
  assert.deepStrictEqual(separarItens(' e '), []);
  assert.deepStrictEqual(separarItens('preciso de'), []);
});
test('remove repetidos sem diferenciar caixa', () => assert.deepStrictEqual(separarItens('Leite, leite'), ['Leite']));
test('ponto e vírgula e artigos', () => assert.deepStrictEqual(separarItens('o sabão; uma esponja'), ['sabão', 'esponja']));
