// Dicionario leve de itens comuns de casa e mercado. Serve para a fala: "papel manteiga" e um item so,
// "cafe manteiga desodorante" sao tres. Os produtos que o Pedro ja anotou/comprou tambem entram (ver tela-lista-rapida.js).
// Para ensinar um nome novo, basta anota-lo uma vez na lista.
const ITENS_COMUNS_SOLO = [
  'papel higienico', 'papel toalha', 'papel manteiga', 'papel aluminio', 'papel filme', 'filtro de cafe', 'filtro de papel',
  'pasta de dente', 'escova de dente', 'fio dental', 'enxaguante bucal', 'sabonete', 'sabonete liquido', 'shampoo', 'condicionador',
  'desodorante', 'perfume', 'creme dental', 'absorvente', 'cotonete', 'algodao', 'protetor solar', 'hidratante', 'lamina de barbear',
  'sabao em po', 'sabao em barra', 'sabao liquido', 'amaciante', 'detergente', 'agua sanitaria', 'desinfetante', 'limpador multiuso',
  'esponja', 'esponja de aco', 'pano de chao', 'pano de prato', 'saco de lixo', 'vassoura', 'rodo', 'luva', 'alcool', 'veja', 'cloro',
  'cafe', 'cafe em po', 'acucar', 'acucar refinado', 'acucar mascavo', 'sal', 'sal grosso', 'oleo', 'oleo de soja', 'azeite', 'vinagre',
  'arroz', 'arroz integral', 'feijao', 'feijao preto', 'macarrao', 'macarrao instantaneo', 'molho de tomate', 'extrato de tomate',
  'farinha de trigo', 'farinha de mandioca', 'fermento', 'fermento em po', 'maisena', 'amido de milho', 'aveia', 'granola', 'cereal',
  'leite', 'leite integral', 'leite desnatado', 'leite sem lactose', 'leite condensado', 'creme de leite', 'leite em po', 'leite de coco',
  'manteiga', 'margarina', 'queijo', 'queijo ralado', 'queijo mussarela', 'requeijao', 'iogurte', 'cream cheese', 'ovo', 'ovos',
  'pao', 'pao de forma', 'pao de queijo', 'bolacha', 'biscoito', 'biscoito recheado', 'torrada', 'bolo', 'chocolate', 'achocolatado',
  'frango', 'peito de frango', 'carne moida', 'carne', 'bife', 'linguica', 'salsicha', 'presunto', 'mortadela', 'bacon', 'peixe', 'tilapia',
  'tomate', 'cebola', 'alho', 'batata', 'cenoura', 'alface', 'banana', 'maca', 'laranja', 'limao', 'mamao', 'abacate', 'melancia', 'uva',
  'agua', 'agua mineral', 'agua com gas', 'suco', 'refrigerante', 'cerveja', 'vinho', 'cha', 'cha mate', 'gelo',
  'pilha', 'lampada', 'fosforo', 'vela', 'cola', 'fita adesiva', 'ovo de pascoa', 'racao', 'areia de gato',
];
if (typeof module !== 'undefined') module.exports = { ITENS_COMUNS: ITENS_COMUNS_SOLO }; else window.Dicionario = { ITENS_COMUNS: ITENS_COMUNS_SOLO };
