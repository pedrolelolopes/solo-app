// Caixa "Nota rápida" da aba Lista: texto ou voz vira itens na lista Hoje (regras locais, sem IA).
// No navegador: window.TelaListaRapida = SoloListaRapida.createTelaListaRapida({...}) (criado no index.html).
const _Nm = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;
const _Vz = typeof require !== 'undefined' ? require('./voz-lista.js') : window.VozLista;
const _Ts = typeof require !== 'undefined' ? require('./texto-seguro.js') : window.TextoSeguro;

const SEM_VOZ = 'Seu navegador não tem voz. Use o microfone do teclado do iPhone.';

// getHoje(): linhas atuais da lista Hoje (para não duplicar pendente igual).
function createTelaListaRapida({ db, produtos, doc, aoAdicionar, voz, getHoje }) {
  const esc = _Ts.escapar;
  const el = id => doc.getElementById(id);
  let itens = []; // {nome, sugestao: Produto|null, igual: Produto|null, usar: true|false|null}
  let ouvindo = false;

  const aviso = t => { el('nr-aviso').textContent = t; };

  function desenhar() {
    el('nr-revisao').innerHTML = itens.map((it, i) => {
      let q = '';
      if (it.sugestao && it.usar === null) {
        q = `<div class="nr-q">É o mesmo que <strong>${esc(it.sugestao.nome)}</strong>? ` +
          `<button onclick="TelaListaRapida.responder(${i},true)">Sim</button> ` +
          `<button onclick="TelaListaRapida.responder(${i},false)">Não</button></div>`;
      } else if (it.sugestao && it.usar) {
        q = `<div class="nr-q">Vai como <strong>${esc(it.sugestao.nome)}</strong></div>`;
      }
      return `<div class="nr-item"><span>${esc(it.nome)}</span> ` +
        `<button onclick="TelaListaRapida.remover(${i})" aria-label="Remover">✕</button>${q}</div>`;
    }).join('');
  }

  function analisar() {
    const nomes = _Vz.separarItens(el('nr-texto').value);
    itens = nomes.map(nome => {
      const s = _Nm.sugerirProdutos(nome, produtos.lista(), 1)[0];
      if (s && s.motivo === 'igual') return { nome, sugestao: null, igual: s.produto, usar: null };
      return { nome, sugestao: s ? s.produto : null, igual: null, usar: null };
    });
    if (!itens.length) { el('nr-revisao').innerHTML = ''; aviso('Não achei itens. Escreva ou fale de novo.'); return; }
    aviso('');
    desenhar();
  }

  function responder(i, sim) {
    if (!itens[i]) return;
    itens[i].usar = !!sim;
    desenhar();
  }
  function remover(i) { itens.splice(i, 1); desenhar(); }
  function cancelar() { itens = []; el('nr-revisao').innerHTML = ''; aviso(''); }

  async function confirmar() {
    if (!itens.length) analisar();
    const pendentes = (getHoje ? getHoje() : []).filter(h => !h.done).slice();
    const jaTem = prod => pendentes.some(h =>
      h.produto_id === prod.id || _Nm.normalizar(h.nome) === _Nm.normalizar(prod.nome));
    const criados = [];
    for (const it of itens) {
      let prod;
      if (it.igual) prod = it.igual;
      else if (it.sugestao && it.usar) {
        prod = it.sugestao;
        await produtos.adicionarApelido(prod.id, it.nome);
      } else prod = await produtos.garantir(it.nome);
      if (!prod || jaTem(prod)) continue;
      const linha = await db.dbPost('lista_hoje', { nome: prod.nome, detalhe: '', done: false, produto_id: prod.id, origem: 'anotada' });
      if (linha) { criados.push(linha); pendentes.push(linha); }
    }
    if (criados.length && aoAdicionar) aoAdicionar(criados);
    const tinha = itens.length > 0;
    itens = [];
    el('nr-texto').value = '';
    el('nr-revisao').innerHTML = '';
    if (criados.length) aviso(`${criados.length} item(ns) na lista.`);
    else if (tinha) aviso('Nada novo: esses itens já estão na lista.');
    return criados.length;
  }

  function alternarVoz() {
    if (!voz || !voz.suportado) { aviso(SEM_VOZ); return; }
    if (ouvindo) { voz.parar(); ouvindo = false; el('nr-voz-btn').textContent = '🎤 Falar'; return; }
    ouvindo = true;
    el('nr-voz-btn').textContent = '⏹ Parar';
    voz.iniciar(
      txt => { const a = el('nr-texto'); a.value = (a.value ? a.value + ', ' : '') + String(txt).trim(); },
      () => { ouvindo = false; el('nr-voz-btn').textContent = '🎤 Falar'; },
    );
  }

  return { analisar, confirmar, cancelar, alternarVoz, responder, remover };
}

if (typeof module !== 'undefined') module.exports = { createTelaListaRapida };
else window.SoloListaRapida = { createTelaListaRapida };
