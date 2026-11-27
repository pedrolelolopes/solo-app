const test = require('node:test');
const assert = require('node:assert');
const F = require('../js/folhetos.js');

const fol = (mercado, itens, id) => ({ id: id || mercado, mercado, itens: itens.map(([nome, preco]) => ({ nome, preco, unidade: null })) });
// n itens "Pn" com preço a em A e b em B; lista com os mesmos nomes
function cenario(n, a, b) {
  const nomes = Array.from({ length: n }, (_, i) => 'Produto' + String.fromCharCode(97 + i) + 'xx');
  // A também tem um item extra (só nele), para ser a base (mais itens encontrados)
  const lista = nomes.map(nome => ({ nome })).concat([{ nome: 'Extra' }]);
  const folhetos = [fol('A', nomes.map(x => [x, a]).concat([['Extra', 1]])), fol('B', nomes.map(x => [x, b]))];
  const pares = [[n, 0, n]];
  nomes.forEach((_, i) => { pares.push([i, 0, i], [i, 1, i]); });
  return F.calcularComparativo(lista, folhetos, pares);
}

test('constantes e prompt', () => {
  assert.strictEqual(F.ECONOMIA_MINIMA, 5);
  assert.strictEqual(F.ECONOMIA_FORTE, 30);
  assert.strictEqual(F.PROMPT_LEITURA, 'Folheto de supermercado. Liste TODOS os produtos com preço, um por linha, no formato: nome|preço|unidade. Preço com ponto decimal, sem R$. Unidade: kg, g, L, ml, un ou vazio. Sem cabeçalho, sem texto extra.');
});
test('normalizar', () => {
  assert.strictEqual(F.normalizar('  Leite  Sem LACTOSE '), 'leite sem lactose');
  assert.strictEqual(F.normalizar('Pão Francês'), 'pao frances');
});
test('lerLinhasIA', () => {
  const r = F.lerLinhasIA('Arroz 5kg|22,90|un\nlixo\nTomate|R$ 7.99|kg\nGrátis|0|un');
  assert.strictEqual(r.length, 2);
  assert.strictEqual(r[0].preco, 22.9); assert.strictEqual(r[0].unidade, 'un');
  assert.strictEqual(r[1].preco, 7.99); assert.strictEqual(r[1].nome, 'Tomate');
  assert.strictEqual(F.lerLinhasIA('Sal|3,50|')[0].unidade, null);
});
test('lerCsv com BOM, 2 mercados e 1 linha ruim', () => {
  const t = '﻿mercado;produto;preco;unidade\nA;Arroz;10,5;kg\nB;Feijão;8;\nA;Ruim;abc;un\n';
  const r = F.lerCsv(t);
  assert.deepStrictEqual(Object.keys(r.porMercado).sort(), ['A', 'B']);
  assert.strictEqual(r.ignoradas, 1);
  assert.strictEqual(r.porMercado.B[0].unidade, null);
});
test('lerCsv cabeçalho errado', () => {
  const r = F.lerCsv('a;b;c\nA;Arroz;10;kg\nB;Feijão;8;kg');
  assert.deepStrictEqual(r.porMercado, {});
  assert.strictEqual(r.ignoradas, 2);
});
test('lerCsv com vírgula como separador', () => {
  const r = F.lerCsv('mercado,produto,preco,unidade\nA,Arroz,10.5,kg');
  assert.strictEqual(r.porMercado.A[0].preco, 10.5);
});
test('lerCsv exemplo do doc', () => {
  const t = 'mercado;produto;preco;unidade\nMercado Exemplo;Arroz Tipo 1 5kg;22,90;un\nMercado Exemplo;Tomate;7,99;kg\nOutro Mercado;Leite Integral 1L;4,49;un\n';
  const r = F.lerCsv(t);
  assert.strictEqual(Object.keys(r.porMercado).length, 2);
  assert.strictEqual(r.porMercado['Mercado Exemplo'].length, 2);
  assert.strictEqual(r.porMercado['Outro Mercado'].length, 1);
  assert.strictEqual(r.ignoradas, 0);
});
test('juntarItens', () => {
  const a = [{ nome: 'Leite', preco: 4, unidade: 'un' }];
  const b = [{ nome: 'leite', preco: 4, unidade: 'un' }, { nome: 'leite', preco: 5, unidade: 'un' }];
  const r = F.juntarItens(a, b);
  assert.strictEqual(r.length, 2); assert.strictEqual(r[1].preco, 5);
});
test('calcularComparativo tanto faz', () => {
  const r = cenario(3, 10, 9);
  assert.deepStrictEqual(r.recomendacoes, []);
  assert.strictEqual(r.nota, 'Base: A.\nTanto faz: compre tudo no A. Outro mercado economizaria só R$ 3,00.');
});
test('calcularComparativo usuário decide', () => {
  const r = cenario(4, 10, 7.5);
  assert.strictEqual(r.recomendacoes.length, 1);
  assert.ok(r.nota.split('\n').includes('No B você terá R$ 10,00 de economia total (4 itens). Compensa se o deslocamento não for grande.'));
});
test('calcularComparativo vale a pena', () => {
  const r = cenario(5, 20, 10);
  assert.ok(r.nota.split('\n').includes('No B você terá R$ 50,00 de economia (5 itens). Vale a pena!'));
});
test('calcularComparativo limite', () => {
  assert.strictEqual(cenario(1, 10, 5).recomendacoes.length, 1);
  assert.strictEqual(cenario(1, 10, 5.01).recomendacoes.length, 0);
  assert.ok(cenario(1, 40, 10).nota.includes('Vale a pena!'));
  assert.ok(!cenario(1, 39.99, 10).nota.includes('Vale a pena!'));
});
test('calcularComparativo ignora par inválido e lista soEm', () => {
  const lista = [{ nome: 'Arroz' }, { nome: 'Sal' }];
  const folhetos = [fol('A', [['Arroz', 10], ['Sal', 2]]), fol('B', [['Arroz', 9]])];
  const r = F.calcularComparativo(lista, folhetos, [[0, 0, 0], [1, 0, 1], [0, 1, 0], [9, 0, 0], [0, 5, 0], [0, 0, 9]]);
  assert.deepStrictEqual(r.soEm.A, ['Sal']);
  assert.deepStrictEqual(r.soEm.B, []);
  assert.strictEqual(r.base, 'A');
  assert.strictEqual(r.totais.A.encontrados, 2);
  assert.strictEqual(r.totais.B.total, 9);
  assert.strictEqual(r.linhas.length, 2);
});
test('calcularComparativo menor preço do mesmo mercado', () => {
  const lista = [{ nome: 'Leite' }];
  const folhetos = [fol('A', [['Leite Integral', 6], ['Leite Desnatado', 4]])];
  const r = F.calcularComparativo(lista, folhetos, [[0, 0, 0], [0, 0, 1]]);
  assert.strictEqual(r.linhas[0].precos.A, 4);
});
test('casarLocal casa por palavras', () => {
  const lista = [{ nome: 'Leite' }, { nome: 'Leite sem lactose' }, { nome: 'Café' }];
  const folhetos = [fol('A', [['Leite Integral Itambé 1L', 4], ['Leite Sem Lactose Piracanjuba 1L', 6], ['Açúcar 5kg', 20]])];
  const r = F.casarLocal(lista, folhetos);
  assert.deepStrictEqual(r.pares, [[0, 0, 0], [0, 0, 1], [1, 0, 1]]);
  assert.deepStrictEqual(r.semPar, [2]);
});
test('casarLocal ignora números e unidades', () => {
  const r = F.casarLocal([{ nome: 'Arroz 5kg' }], [fol('A', [['ARROZ TIO JOÃO 5 KG', 20]])]);
  assert.deepStrictEqual(r.pares, [[0, 0, 0]]);
  assert.deepStrictEqual(r.semPar, []);
});
