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

const CONHECIDOS = ['papel manteiga', 'manteiga', 'café', 'desodorante', 'perfume', 'sabonete', 'filtro de café', 'papel higiênico'];
test('frase com "eu preciso lembrar de comprar"', () =>
  assert.deepStrictEqual(separarItens('eu preciso lembrar de comprar manteiga'), ['manteiga']));
test('sem pausa, nomes conhecidos viram itens separados', () =>
  assert.deepStrictEqual(separarItens('café manteiga desodorante', CONHECIDOS), ['café', 'manteiga', 'desodorante']));
test('"papel manteiga" conhecido continua um item só', () =>
  assert.deepStrictEqual(separarItens('papel manteiga', CONHECIDOS), ['papel manteiga']));
test('nome composto conhecido mais longo vence', () =>
  assert.deepStrictEqual(separarItens('filtro de café sabonete', CONHECIDOS), ['filtro de café', 'sabonete']));
test('sem nomes conhecidos o trecho fica inteiro', () =>
  assert.deepStrictEqual(separarItens('papel manteiga'), ['papel manteiga']));
test('palavra desconhecida antes de nomes conhecidos vira item próprio', () =>
  assert.deepStrictEqual(separarItens('tinta azul perfume sabonete', CONHECIDOS), ['tinta azul', 'perfume', 'sabonete']));
test('palavra desconhecida depois de nome conhecido é detalhe dele', () => {
  assert.deepStrictEqual(separarItens('leite ninho', [...CONHECIDOS, 'leite']), ['leite ninho']);
  assert.deepStrictEqual(separarItens('perfume sabonete de glicerina', CONHECIDOS), ['perfume', 'sabonete de glicerina']);
});
test('só ligação entre conhecidos mantém um item ("café com leite")', () =>
  assert.deepStrictEqual(separarItens('café com leite', [...CONHECIDOS, 'leite']), ['café com leite']));
test('vírgula continua separando mesmo com nomes conhecidos', () =>
  assert.deepStrictEqual(separarItens('papel, manteiga', CONHECIDOS), ['papel', 'manteiga']));
