// Regras puras de folheto: leitura, CSV, casamento por palavras, comparativo e nota final.
const ECONOMIA_MINIMA = 5;
const ECONOMIA_FORTE = 30;
const PROMPT_LEITURA = 'Folheto de supermercado. Liste TODOS os produtos com preço, um por linha, no formato: nome|preço|unidade. Preço com ponto decimal, sem R$. Unidade: kg, g, L, ml, un ou vazio. Sem cabeçalho, sem texto extra.';

function normalizar(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
const r2 = n => Math.round(n * 100) / 100;
function fmt(v) {
  const [i, d] = r2(v).toFixed(2).split('.');
  return 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d;
}
function lerPreco(s) {
  let t = String(s == null ? '' : s).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!/^\d+([.,]\d+)*$/.test(t)) return NaN;
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  const n = parseFloat(t);
  return n > 0 ? n : NaN;
}
function mkItem(nome, preco, unidade) {
  const u = String(unidade == null ? '' : unidade).trim();
  return { nome: String(nome).trim(), preco, unidade: u || null };
}
function lerLinhasIA(texto) {
  const out = [];
  for (const l of String(texto || '').split(/\r?\n/)) {
    const p = l.split('|');
    if (p.length < 2 || !p[0].trim()) continue;
    const preco = lerPreco(p[1]);
    if (!(preco > 0)) continue;
    out.push(mkItem(p[0], preco, p[2]));
  }
  return out;
}
function lerCsv(texto) {
  const linhas = String(texto || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim() !== '');
  const porMercado = {};
  if (!linhas.length) return { porMercado, ignoradas: 0 };
  const cab = linhas[0].trim().toLowerCase().replace(/\s/g, '');
  const sep = cab === 'mercado;produto;preco;unidade' ? ';' : cab === 'mercado,produto,preco,unidade' ? ',' : null;
  if (!sep) return { porMercado, ignoradas: linhas.length - 1 };
  let ignoradas = 0;
  for (const l of linhas.slice(1)) {
    const p = l.split(sep);
    const mercado = (p[0] || '').trim(), produto = (p[1] || '').trim(), preco = lerPreco(p[2]);
    if (!mercado || !produto || !(preco > 0)) { ignoradas++; continue; }
    (porMercado[mercado] = porMercado[mercado] || []).push(mkItem(produto, preco, p[3]));
  }
  return { porMercado, ignoradas };
}
function juntarItens(a, b) {
  const vistos = new Set(), out = [];
  for (const it of [...(a || []), ...(b || [])]) {
    const k = normalizar(it.nome) + '|' + it.preco + '|' + (it.unidade || '');
    if (vistos.has(k)) continue;
    vistos.add(k); out.push(it);
  }
  return out;
}
const RUIDO = /^\d+([.,]\d+)?(kg|g|l|ml|un|lt|mg)?$/;
function palavras(s) {
  return normalizar(s).split(' ').filter(w => w.length > 2 && !RUIDO.test(w));
}
function casarLocal(lista, folhetos) {
  const pares = [], semPar = [];
  (lista || []).forEach((li, i) => {
    const w = palavras(li.nome);
    let achou = false;
    if (w.length) {
      (folhetos || []).forEach((f, j) => {
        (f.itens || []).forEach((it, k) => {
          const set = new Set(normalizar(it.nome).split(' '));
          if (w.every(x => set.has(x))) { pares.push([i, j, k]); achou = true; }
        });
      });
    }
    if (!achou) semPar.push(i);
  });
  return { pares, semPar };
}
function calcularComparativo(lista, folhetos, pares) {
  const mercados = [];
  (folhetos || []).forEach(f => { if (!mercados.includes(f.mercado)) mercados.push(f.mercado); });
  const porItem = new Map(); // iLista -> {mercado: menor preço}
  for (const [i, j, k] of pares || []) {
    const li = lista[i], f = folhetos[j], it = f && f.itens && f.itens[k];
    if (!li || !f || !it || !(it.preco > 0)) continue;
    const m = porItem.get(i) || {};
    m[f.mercado] = m[f.mercado] === undefined ? it.preco : Math.min(m[f.mercado], it.preco);
    porItem.set(i, m);
  }
  const idx = [...porItem.keys()].sort((a, b) => a - b);
  const linhas = idx.map(i => ({ item: lista[i].nome, precos: porItem.get(i) }));
  const totais = {};
  mercados.forEach(m => { totais[m] = { total: 0, encontrados: 0 }; });
  linhas.forEach(l => Object.entries(l.precos).forEach(([m, p]) => { totais[m].total = r2(totais[m].total + p); totais[m].encontrados++; }));
  const soEm = {};
  mercados.forEach(m => { soEm[m] = []; });
  linhas.forEach(l => { const ms = Object.keys(l.precos); if (ms.length === 1) soEm[ms[0]].push(l.item); });
  if (!linhas.length) return { linhas, totais, base: '', recomendacoes: [], soEm, nota: 'Nenhum item encontrado nos folhetos.' };
  const base = mercados.slice().sort((a, b) => totais[b].encontrados - totais[a].encontrados || totais[a].total - totais[b].total)[0];
  const economias = [];
  for (const m of mercados) {
    if (m === base) continue;
    let eco = 0; const itens = [];
    linhas.forEach(l => {
      if (l.precos[m] !== undefined && l.precos[base] !== undefined && l.precos[m] < l.precos[base]) { eco += l.precos[base] - l.precos[m]; itens.push(l.item); }
    });
    economias.push({ mercado: m, itens, economia: r2(eco) });
  }
  const recomendacoes = economias.filter(e => e.economia >= ECONOMIA_MINIMA).sort((a, b) => b.economia - a.economia);
  const out = ['Base: ' + base + '.'];
  recomendacoes.filter(e => e.economia >= ECONOMIA_FORTE).forEach(e =>
    out.push('No ' + e.mercado + ' você terá ' + fmt(e.economia) + ' de economia (' + e.itens.length + ' itens). Vale a pena!'));
  recomendacoes.filter(e => e.economia < ECONOMIA_FORTE).forEach(e =>
    out.push('No ' + e.mercado + ' você terá ' + fmt(e.economia) + ' de economia total (' + e.itens.length + ' itens). Compensa se o deslocamento não for grande.'));
  if (!recomendacoes.length) {
    let l = 'Tanto faz: compre tudo no ' + base + '.';
    const maior = Math.max(0, ...economias.map(e => e.economia));
    if (maior > 0) l += ' Outro mercado economizaria só ' + fmt(maior) + '.';
    out.push(l);
  }
  return { linhas, totais, base, recomendacoes, soEm, nota: out.join('\n') };
}

const api = { ECONOMIA_MINIMA, ECONOMIA_FORTE, PROMPT_LEITURA, normalizar, fmt, lerLinhasIA, lerCsv, juntarItens, casarLocal, calcularComparativo };
if (typeof module !== 'undefined') module.exports = api; else window.Folhetos = api;
