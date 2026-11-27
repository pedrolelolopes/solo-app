// Regras de gasto (puras, sem IA): peso variável, planejado x esquecido essencial x impulso,
// preparar itens da compra e conferir o cupom contra o carrinho.
const _NomesG = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;

const r2Gastos = n => Math.round(n * 100) / 100;

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
  for (const k of Object.keys(r)) r[k] = r2Gastos(r[k]);
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
    .map(g => ({ chave: g.chave, nome: g.nome, total: r2Gastos(g.total), compras: g.compras, precoMedio: r2Gastos(g.total / (g.qtd || 1)) }))
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
    // essencial ou supérfluo é por COMPRA: pergunta sempre (um dia o sorvete é essencial, noutro não)
    const essencial = typeof resp.essencial === 'boolean' ? resp.essencial : null;
    const chave = produto ? produto.chave : _NomesG.normalizar(c.nome);
    const classe = classificarItem({ produtoId: produto ? produto.id : null, chave, essencial }, planejados);
    return { cartId: c.id, nome: c.nome, produtoNome: produto ? produto.nome : c.nome, produtoId: produto ? produto.id : null, classe, essencial };
  });
}

// Cupom x carrinho. itensApp: {nome, subtotal}; itensCupom: {nome, preco, qtd} (preco = unitário).
function compararCupom(itensApp, itensCupom) {
  const comId = i => (i.id === undefined ? {} : { id: i.id });
  const app = (itensApp || []).map(i => ({ nome: i.nome, subtotal: Number(i.subtotal) || 0, ...comId(i) }));
  const cup = (itensCupom || []).map(i => ({ nome: i.nome, subtotal: r2Gastos((Number(i.preco) || 0) * (Number(i.qtd) || 1)), preco: Number(i.preco) || 0, qtd: Number(i.qtd) || 1 }));
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
    if (melhor < 0) { soNoCupom.push({ ...c }); continue; }
    usados.add(melhor);
    const a = app[melhor];
    if (Math.abs(a.subtotal - c.subtotal) > 0.01) precoDiferente.push({ nome: a.nome, app: a.subtotal, cupom: c.subtotal, precoCupom: c.preco, qtdCupom: c.qtd, ...comId(a) });
    else iguais.push({ nome: a.nome, subtotal: a.subtotal });
  }
  const soNoApp = app.filter((_, i) => !usados.has(i));
  const totalApp = app.reduce((s, i) => s + i.subtotal, 0);
  const totalCupom = cup.reduce((s, i) => s + i.subtotal, 0);
  return { iguais, precoDiferente, soNoCupom, soNoApp, diferencaTotal: r2Gastos(totalCupom - totalApp) };
}

// Número do cupom: aceita 117.77, "117,77" e "1.117,77".
function numeroCupom(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const t = String(v === null || v === undefined ? '' : v).replace(/[R$\s]/g, '');
  if (!t) return 0;
  const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) ? n : 0;
}

// Resposta da leitura do cupom (lista ou objeto) -> {local, tipo, data, itens, descontoGeral, total}.
function normalizarCupom(parsed) {
  const obj = Array.isArray(parsed) ? { itens: parsed } : (parsed || {});
  const lista = obj.itens || obj.items || [];
  const itens = lista.map(i => ({
    nome: String(i.nome || i.name || 'Item').trim() || 'Item',
    preco: numeroCupom(i.preco !== undefined ? i.preco : i.price),
    qtd: numeroCupom(i.qtd !== undefined ? i.qtd : (i.qty !== undefined ? i.qty : 1)) || 1,
    desconto: Math.abs(numeroCupom(i.desconto !== undefined ? i.desconto : i.discount)),
  })).filter(i => i.preco > 0);
  const tipo = String(obj.tipo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return {
    local: String(obj.local || obj.estabelecimento || '').trim(),
    tipo: ['mercado', 'farmacia', 'acougue', 'outro'].includes(tipo) ? tipo : '',
    data: /^\d{4}-\d{2}-\d{2}$/.test(String(obj.data || '')) ? obj.data : '',
    itens,
    descontoGeral: Math.abs(numeroCupom(obj.desconto_geral !== undefined ? obj.desconto_geral : obj.descontoGeral)),
    total: numeroCupom(obj.total),
  };
}

// Preço pago de verdade: tira o desconto de cada item e reparte o desconto geral (sem dono) pelos itens.
// Devolve itens com preco = preço unitário líquido, precoOriginal, desconto (item + parte do geral).
function aplicarDescontos(itens, descontoGeral) {
  const base = (itens || []).map(i => {
    const bruto = (Number(i.preco) || 0) * (Number(i.qtd) || 1);
    const desc = Math.min(bruto, Math.max(0, Number(i.desconto) || 0));
    return { ...i, bruto, liquido: bruto - desc, descItem: desc };
  });
  const somaLiq = base.reduce((s, i) => s + i.liquido, 0);
  let geral = Math.min(Math.max(0, Number(descontoGeral) || 0), somaLiq);
  let restante = geral;
  return base.map((i, k) => {
    let parte = k === base.length - 1 ? restante : (somaLiq ? r2Gastos(geral * i.liquido / somaLiq) : 0);
    parte = Math.min(parte, restante);
    restante = r2Gastos(restante - parte);
    const final = r2Gastos(i.liquido - parte);
    const qtd = Number(i.qtd) || 1;
    return { nome: i.nome, qtd, precoOriginal: Number(i.preco) || 0, desconto: r2Gastos(i.descItem + parte), preco: final / qtd };
  });
}

const _gastosApi = { numeroCupom, normalizarCupom, aplicarDescontos, valorPorPeso, lerPesoG, classificarItem, resumoCompra, gastosPorProduto, prepararItensCompra, compararCupom };
if (typeof module !== 'undefined') module.exports = _gastosApi; else window.Gastos = _gastosApi;
