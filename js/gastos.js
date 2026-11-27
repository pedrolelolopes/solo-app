// Regras de gasto (puras, sem IA): peso variável, planejado x esquecido essencial x impulso,
// preparar itens da compra e conferir o cupom contra o carrinho.
const _NomesG = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;

const r2 = n => Math.round(n * 100) / 100;

function valorPorPeso(precoKg, pesoG) {
  if (!Number.isFinite(precoKg) || !Number.isFinite(pesoG) || precoKg <= 0 || pesoG <= 0) return null;
  return Math.round(precoKg * pesoG / 1000 * 100) / 100;
}

// "634", "634g", "0,634 kg", "1.2kg" -> gramas; null se inválido, zero ou negativo.
function lerPesoG(texto) {
  const m = String(texto === null || texto === undefined ? '' : texto).trim().toLowerCase()
    .match(/^(\d+(?:[.,]\d+)?)\s*(kg|g)?$/);
  if (!m) return null;
  let n = parseFloat(m[1].replace(',', '.'));
  if (m[2] === 'kg') n *= 1000;
  n = Math.round(n * 1000) / 1000;
  return n > 0 ? n : null;
}

function classificarItem({ produtoId, chave, essencial }, planejados) {
  const ids = (planejados && planejados.ids) || new Set();
  const chaves = (planejados && planejados.chaves) || new Set();
  if ((produtoId && ids.has(produtoId)) || (chave && chaves.has(chave))) return 'planejado';
  if (essencial === true) return 'esquecido_essencial';
  if (essencial === false) return 'impulso';
  return null;
}

function resumoCompra(itens) {
  const r = { planejado: 0, esquecido_essencial: 0, impulso: 0, sem_classe: 0, total: 0 };
  for (const it of itens || []) {
    const v = Number(it.subtotal) || 0;
    const k = ['planejado', 'esquecido_essencial', 'impulso'].includes(it.classe) ? it.classe : 'sem_classe';
    r[k] += v; r.total += v;
  }
  for (const k of Object.keys(r)) r[k] = r2(r[k]);
  return r;
}

function gastosPorProduto(itens) {
  const mapa = new Map();
  for (const it of itens || []) {
    const chave = it.produto_id || _NomesG.normalizar(it.nome);
    const g = mapa.get(chave) || { chave, nome: it.nome, total: 0, compras: 0, qtd: 0 };
    g.total += Number(it.subtotal) || 0;
    g.qtd += Number(it.qtd) || 1;
    g.compras += 1;
    mapa.set(chave, g);
  }
  return [...mapa.values()]
    .map(g => ({ chave: g.chave, nome: g.nome, total: r2(g.total), compras: g.compras, precoMedio: r2(g.total / (g.qtd || 1)) }))
    .sort((a, b) => b.total - a.total);
}

// Para cada item do carrinho: resolve o produto, a classe e o essencial.
// respostas[cartId] = {essencial: boolean, mesmoQue?: produtoId}
function prepararItensCompra(cart, produtos, hojeList, respostas) {
  const planejados = { ids: new Set(), chaves: new Set() };
  for (const h of hojeList || []) {
    if (h.produto_id) planejados.ids.add(h.produto_id);
    planejados.chaves.add(_NomesG.normalizar(h.nome));
  }
  return (cart || []).map(c => {
    const resp = (respostas && respostas[c.id]) || {};
    let produto = null;
    if (resp.mesmoQue) produto = (produtos || []).find(p => p.id === resp.mesmoQue) || null;
    if (!produto) {
      const s = _NomesG.sugerirProdutos(c.nome, produtos || [], 1)[0];
      if (s && s.motivo === 'igual') produto = s.produto;
    }
    const essencial = typeof resp.essencial === 'boolean' ? resp.essencial
      : (produto && typeof produto.essencial === 'boolean' ? produto.essencial : null);
    const chave = produto ? produto.chave : _NomesG.normalizar(c.nome);
    const classe = classificarItem({ produtoId: produto ? produto.id : null, chave, essencial }, planejados);
    return { cartId: c.id, nome: c.nome, produtoNome: produto ? produto.nome : c.nome, produtoId: produto ? produto.id : null, classe, essencial };
  });
}

// Cupom x carrinho. itensApp: {nome, subtotal}; itensCupom: {nome, preco, qtd} (preco = unitário).
function compararCupom(itensApp, itensCupom) {
  const app = (itensApp || []).map(i => ({ nome: i.nome, subtotal: Number(i.subtotal) || 0 }));
  const cup = (itensCupom || []).map(i => ({ nome: i.nome, subtotal: r2((Number(i.preco) || 0) * (Number(i.qtd) || 1)) }));
  const usados = new Set();
  const iguais = [], precoDiferente = [], soNoCupom = [];
  const comuns = (a, b) => { const A = _NomesG.palavras(a); let c = 0; _NomesG.palavras(b).forEach(w => { if (A.has(w)) c++; }); return c; };
  for (const c of cup) {
    let melhor = -1, nota = 0;
    app.forEach((a, i) => {
      if (usados.has(i)) return;
      const n = _NomesG.normalizar(a.nome) === _NomesG.normalizar(c.nome) ? 1000 : comuns(a.nome, c.nome);
      if (n > nota) { nota = n; melhor = i; }
    });
    if (melhor < 0) { soNoCupom.push({ nome: c.nome, subtotal: c.subtotal }); continue; }
    usados.add(melhor);
    const a = app[melhor];
    if (Math.abs(a.subtotal - c.subtotal) > 0.01) precoDiferente.push({ nome: a.nome, app: a.subtotal, cupom: c.subtotal });
    else iguais.push({ nome: a.nome, subtotal: a.subtotal });
  }
  const soNoApp = app.filter((_, i) => !usados.has(i));
  const totalApp = app.reduce((s, i) => s + i.subtotal, 0);
  const totalCupom = cup.reduce((s, i) => s + i.subtotal, 0);
  return { iguais, precoDiferente, soNoCupom, soNoApp, diferencaTotal: r2(totalCupom - totalApp) };
}

const _gastosApi = { valorPorPeso, lerPesoG, classificarItem, resumoCompra, gastosPorProduto, prepararItensCompra, compararCupom };
if (typeof module !== 'undefined') module.exports = _gastosApi; else window.Gastos = _gastosApi;
