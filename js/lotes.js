// Duração, custo por dia, previsão e sugeridos (puro: "hoje" sempre vem de fora; datas AAAA-MM-DD).
const DIA = 86400000;
const _utc = d => { const [a, m, dia] = String(d).slice(0, 10).split('-').map(Number); return Date.UTC(a, m - 1, dia); };
const _fmt = ms => new Date(ms).toISOString().slice(0, 10);
const _r2 = n => Math.round(n * 100) / 100;

function diasEntre(de, ate) { return Math.max(0, Math.round((_utc(ate) - _utc(de)) / DIA)); }

function custoPorDia(lote, hoje) {
  const fim = lote.fim === undefined || lote.fim === null ? hoje : lote.fim;
  return _r2(Number(lote.preco_total) / Math.max(1, diasEntre(lote.inicio, fim)));
}

function duracaoPorUnidade(lote) {
  if (lote.fim === undefined || lote.fim === null) return NaN;
  return diasEntre(lote.inicio, lote.fim) / (Number(lote.qtd) || 1);
}

// Dias por unidade: média dos 3 últimos lotes fechados (com 2 ou mais); senão a estimativa do Pedro.
function duracaoMedia(lotes, produto) {
  const fechados = (lotes || []).filter(l => l.fim !== undefined && l.fim !== null)
    .sort((a, b) => (a.fim < b.fim ? 1 : a.fim > b.fim ? -1 : 0));
  if (fechados.length >= 2) {
    const ult = fechados.slice(0, 3).map(duracaoPorUnidade);
    return { dias: ult.reduce((s, x) => s + x, 0) / ult.length, fonte: 'dados' };
  }
  const est = produto && produto.duracao_estimada_dias;
  if (est > 0) return { dias: est, fonte: 'estimativa' };
  return { dias: null, fonte: 'nenhuma' };
}

function fimPrevisto(loteAberto, duracao) {
  if (!duracao || duracao.dias === null || duracao.dias === undefined) return null;
  return _fmt(_utc(loteAberto.inicio) + Math.round(duracao.dias * (Number(loteAberto.qtd) || 1)) * DIA);
}

function diasParaAcabar(loteAberto, duracao, hoje) {
  const f = fimPrevisto(loteAberto, duracao);
  return f === null ? null : diasEntre(hoje, f);
}

function dataDeEntrada(fim, urgencia) {
  const antes = urgencia === 'amanha' ? 1 : urgencia === 'semana' ? 7 : 0;
  return _fmt(_utc(fim) - antes * DIA);
}

const abertoDe = (lotes, produtoId) => (lotes || [])
  .filter(l => l.produto_id === produtoId && (l.fim === undefined || l.fim === null))
  .sort((a, b) => (a.inicio < b.inicio ? 1 : -1))[0] || null;

// dispensados: ids de lotes cujo sugerido o Pedro já removeu (volta só com nova compra).
function sugeridosParaLista(hoje, produtos, lotes, pendentesProdutoIds, dispensados) {
  const pend = pendentesProdutoIds || new Set();
  const disp = dispensados || new Set();
  return (produtos || []).filter(p => {
    if (pend.has(p.id)) return false;
    const aberto = abertoDe(lotes, p.id);
    if (!aberto || disp.has(aberto.id)) return false;
    const dur = duracaoMedia((lotes || []).filter(l => l.produto_id === p.id), p);
    const fim = fimPrevisto(aberto, dur);
    if (fim === null) return false;
    return hoje >= dataDeEntrada(fim, p.urgencia || 'sem_pressa');
  });
}

function comparar(produtoLotes, hoje) {
  return (produtoLotes || []).slice()
    .sort((a, b) => (a.inicio < b.inicio ? 1 : a.inicio > b.inicio ? -1 : 0))
    .map(l => ({
      inicio: l.inicio, fim: l.fim || null, dias: diasEntre(l.inicio, l.fim || hoje),
      preco_total: Number(l.preco_total), custoDia: custoPorDia(l, hoje),
    }));
}

const _lotesApi = { diasEntre, custoPorDia, duracaoPorUnidade, duracaoMedia, fimPrevisto, diasParaAcabar, dataDeEntrada, abertoDe, sugeridosParaLista, comparar };
if (typeof module !== 'undefined') module.exports = _lotesApi; else window.Lotes = _lotesApi;
