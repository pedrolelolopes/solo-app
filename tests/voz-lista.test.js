const test = require('node:test');
const assert = require('node:assert');
const { separarItens, separarItensComDetalhe, tirarCorrecao } = require('../js/voz-lista.js');

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

test('tira "né" e enchimento no fim', () => {
  assert.deepStrictEqual(separarItens('chá de cidreira, né'), ['chá de cidreira']);
  assert.deepStrictEqual(separarItens('então café tá'), ['café']);
});
test('palavra repetida em seguida vira uma ("leite leites sem lactose")', () =>
  assert.deepStrictEqual(separarItens('leite leites sem lactose'), ['leite sem lactose']));
test('"chá pro Manuel" guarda o nome como detalhe', () =>
  assert.deepStrictEqual(separarItensComDetalhe('chá pro Manuel'), [{ nome: 'chá', detalhe: 'pro Manuel' }]));
test('"para a Maria" e "para o João" também', () => {
  assert.deepStrictEqual(separarItensComDetalhe('bolo para a Maria'), [{ nome: 'bolo', detalhe: 'para a Maria' }]);
  assert.deepStrictEqual(separarItensComDetalhe('presente para o João Pedro'), [{ nome: 'presente', detalhe: 'para o João Pedro' }]);
});
test('"para café" (minúscula) e nomes conhecidos não viram detalhe', () => {
  assert.deepStrictEqual(separarItensComDetalhe('filtro de papel para café', CONHECIDOS.concat('filtro de papel para café')), [{ nome: 'filtro de papel para café', detalhe: '' }]);
  assert.deepStrictEqual(separarItensComDetalhe('filtro para café'), [{ nome: 'filtro para café', detalhe: '' }]);
});
test('mesmo conhecido com maiúscula do reconhecedor não vira detalhe ("Filtro de papel para Café")', () =>
  assert.deepStrictEqual(separarItensComDetalhe('Filtro de papel para Café', CONHECIDOS.concat('filtro de papel para café')), [{ nome: 'Filtro de papel para Café', detalhe: '' }]));

test('"leite sem, quero dizer leite integral" fica só "leite integral"', () =>
  assert.deepStrictEqual(separarItens('leite sem, quero dizer leite integral'), ['leite integral']));
test('marcador no meio do trecho: vale o que vem depois', () =>
  assert.deepStrictEqual(separarItens('leite sem quero dizer leite integral'), ['leite integral']));
test('"na verdade" e "ou melhor" também corrigem, sem apagar itens anteriores', () => {
  assert.deepStrictEqual(separarItens('arroz, feijão, na verdade, macarrão'), ['arroz', 'macarrão']);
  assert.deepStrictEqual(separarItens('café, ou melhor, chá'), ['chá']);
});
test('tirarCorrecao detecta marcador no começo da frase', () => {
  assert.deepStrictEqual(tirarCorrecao('quero dizer leite integral'), { corrige: true, resto: 'leite integral' });
  assert.deepStrictEqual(tirarCorrecao('leite integral'), { corrige: false, resto: 'leite integral' });
});
test('"tomate, aquele tomate pequenininho, tomate cereja": descrição some e o último refina o primeiro', () => {
  const r = separarItensComDetalhe('tomate, aquele tomate pequenininho, tomate cereja');
  assert.deepStrictEqual(r.map(x => x.nome), ['tomate', 'tomate cereja']);
  assert.strictEqual(r[1].refina, true);
  assert.strictEqual(r.descricoes, 1);
});
