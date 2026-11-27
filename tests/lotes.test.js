const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/lotes.js');

const lote = (id, inicio, fim, preco = 30, qtd = 1, produto_id = 'p1') => ({ id, produto_id, inicio, fim, preco_total: preco, qtd, comprado_em: inicio });

test('diasEntre conta dias e nunca é negativo', () => {
  assert.strictEqual(L.diasEntre('2026-01-01', '2026-01-31'), 30);
  assert.strictEqual(L.diasEntre('2026-02-10', '2026-02-01'), 0);
});
test('custoPorDia: 30 reais em 30 dias = 1.00', () => assert.strictEqual(L.custoPorDia(lote('a', '2026-01-01', '2026-01-31'), '2026-03-01'), 1));
test('custoPorDia no mesmo dia não divide por zero', () => assert.strictEqual(L.custoPorDia(lote('a', '2026-01-01', '2026-01-01', 12), '2026-03-01'), 12));
test('custoPorDia de lote aberto usa hoje', () => assert.strictEqual(L.custoPorDia(lote('a', '2026-01-01', null, 20), '2026-01-11'), 2));
test('duracaoMedia usa a estimativa com menos de 2 lotes fechados', () => {
  const r = L.duracaoMedia([lote('a', '2026-01-01', '2026-01-11')], { duracao_estimada_dias: 45 });
  assert.deepStrictEqual(r, { dias: 45, fonte: 'estimativa' });
});
test('duracaoMedia usa a média dos 3 últimos com 2 ou mais lotes fechados', () => {
  const ls = [
    lote('a', '2026-01-01', '2026-01-11'),   // 10 (mais antigo, fica de fora)
    lote('b', '2026-01-11', '2026-02-10'),   // 30
    lote('c', '2026-02-10', '2026-03-12'),   // 30
    lote('d', '2026-03-12', '2026-04-21'),   // 40
  ];
  const r = L.duracaoMedia(ls, { duracao_estimada_dias: 5 });
  assert.strictEqual(r.fonte, 'dados');
  assert.ok(Math.abs(r.dias - (30 + 30 + 40) / 3) < 1e-9);
});
test('duracaoMedia normaliza pela quantidade', () => {
  const r = L.duracaoMedia([lote('a', '2026-01-01', '2026-01-16', 30, 6), lote('b', '2026-02-01', '2026-02-16', 30, 6)], {});
  assert.strictEqual(r.dias, 2.5);
});
test('duracaoMedia sem dados nem estimativa devolve fonte nenhuma', () =>
  assert.deepStrictEqual(L.duracaoMedia([], { duracao_estimada_dias: null }), { dias: null, fonte: 'nenhuma' }));
test('fimPrevisto e diasParaAcabar', () => {
  const ab = lote('a', '2026-01-01', null);
  assert.strictEqual(L.fimPrevisto(ab, { dias: 45 }), '2026-02-15');
  assert.strictEqual(L.diasParaAcabar(ab, { dias: 45 }, '2026-02-01'), 14);
  assert.strictEqual(L.fimPrevisto(ab, { dias: null }), null);
});
test('diasParaAcabar nunca negativo', () => assert.strictEqual(L.diasParaAcabar(lote('a', '2026-01-01', null), { dias: 10 }, '2026-03-01'), 0));
test('dataDeEntrada: amanha = fim-1, semana = fim-7, sem_pressa = fim', () => {
  assert.strictEqual(L.dataDeEntrada('2026-03-10', 'amanha'), '2026-03-09');
  assert.strictEqual(L.dataDeEntrada('2026-03-10', 'semana'), '2026-03-03');
  assert.strictEqual(L.dataDeEntrada('2026-03-10', 'sem_pressa'), '2026-03-10');
});
const prod = (urgencia, dur = 10) => ({ id: 'p1', nome: 'X', urgencia, duracao_estimada_dias: dur });
test('sugeridosParaLista inclui o produto na data de entrada', () => {
  const ls = [lote('a', '2026-01-01', null)]; // fim previsto 2026-01-11
  assert.strictEqual(L.sugeridosParaLista('2026-01-10', [prod('amanha')], ls, new Set()).length, 1);
  assert.strictEqual(L.sugeridosParaLista('2026-01-04', [prod('semana')], ls, new Set()).length, 1);
  assert.strictEqual(L.sugeridosParaLista('2026-01-11', [prod('sem_pressa')], ls, new Set()).length, 1);
});
test('sugeridosParaLista não inclui antes da data', () => {
  const ls = [lote('a', '2026-01-01', null)];
  assert.strictEqual(L.sugeridosParaLista('2026-01-09', [prod('amanha')], ls, new Set()).length, 0);
  assert.strictEqual(L.sugeridosParaLista('2026-01-10', [prod('sem_pressa')], ls, new Set()).length, 0);
});
test('sugeridosParaLista não duplica produto já pendente na lista', () => {
  const ls = [lote('a', '2026-01-01', null)];
  assert.strictEqual(L.sugeridosParaLista('2026-01-20', [prod('amanha')], ls, new Set(['p1'])).length, 0);
});
test('sugeridosParaLista respeita lote dispensado e ignora produto sem lote aberto', () => {
  const ls = [lote('a', '2026-01-01', null)];
  assert.strictEqual(L.sugeridosParaLista('2026-01-20', [prod('amanha')], ls, new Set(), new Set(['a'])).length, 0);
  assert.strictEqual(L.sugeridosParaLista('2026-01-20', [prod('amanha')], [lote('a', '2026-01-01', '2026-01-05')], new Set()).length, 0);
});
test('comparar devolve custo por dia por lote, mais recente primeiro', () => {
  const r = L.comparar([lote('a', '2026-01-01', '2026-01-31', 30), lote('b', '2026-02-01', null, 20)], '2026-02-11');
  assert.deepStrictEqual(r.map(x => x.inicio), ['2026-02-01', '2026-01-01']);
  assert.deepStrictEqual(r.map(x => x.custoDia), [2, 1]);
  assert.strictEqual(r[0].dias, 10);
});
