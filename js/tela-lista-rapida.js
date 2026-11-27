// Caixa "Nota rápida" da aba Lista: fala (microfone sempre ligado até parar) ou texto vira itens na lista Hoje.
// Os itens entram sozinhos; ✕ remove, 🎤 corrige, e "É o mesmo que X?" junta nomes parecidos. Regras locais, sem IA.
// No navegador: window.TelaListaRapida = createTelaListaRapida({...}) (criado no index.html).
const _Nm = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;
const _Vz = typeof require !== 'undefined' ? require('./voz-lista.js') : window.VozLista;
const _Ts = typeof require !== 'undefined' ? require('./texto-seguro.js') : window.TextoSeguro;
const _Dc = typeof require !== 'undefined' ? require('./dicionario.js') : window.Dicionario;

const SEM_VOZ = 'Seu navegador não tem voz. Use o microfone do teclado do iPhone.';

// getHoje(): linhas atuais da lista Hoje. voz: {suportado, iniciar(aoFinal, aoFim, {continuo, aoParcial, aoErro}), parar()}.
// aoAdicionar(linhas), aoRemover(id), aoAtualizar(linha): o index.html mantém a lista na tela.
function createTelaListaRapida({ db, produtos, doc, aoAdicionar, aoRemover, aoAtualizar, voz, getHoje }) {
  const esc = _Ts.escapar;
  const el = id => doc.getElementById(id);
  let recentes = []; // {id, nome, sugestao: Produto|null}
  let ouvindo = false;
  const aviso = t => { el('nr-aviso').textContent = t; };
  const maiuscula = s => s.charAt(0).toUpperCase() + s.slice(1);

  const conhecidos = () => [..._Dc.ITENS_COMUNS, ...produtos.lista().flatMap(p => [p.nome, ...(p.apelidos || [])])];

  function desenhar() {
    el('nr-revisao').innerHTML = recentes.map((r, i) => {
      const q = r.sugestao
        ? `<div class="nr-q">Mesmo que <strong>${esc(r.sugestao.nome)}</strong>? ` +
          `<button onclick="TelaListaRapida.responder(${i},true)">Sim</button> ` +
          `<button onclick="TelaListaRapida.responder(${i},false)">Não</button></div>`
        : '';
      return `<div class="nr-item"><span>${esc(r.nome)}</span> ` +
        `<button onclick="TelaListaRapida.corrigir(${i})" aria-label="Corrigir falando">🎤</button> ` +
        `<button onclick="TelaListaRapida.remover(${i})" aria-label="Remover">✕</button>${q}</div>`;
    }).join('');
  }

  // Cria as linhas na lista Hoje a partir do texto (falado ou digitado). Devolve quantas entraram.
  async function adicionarTextoAgora(texto) {
    const nomes = _Vz.separarItens(texto, conhecidos());
    const pend = (getHoje ? getHoje() : []).filter(h => !h.done).slice();
    const jaTem = (prod, nome) => pend.some(h => (prod && h.produto_id === prod.id) || _Nm.normalizar(h.nome) === _Nm.normalizar(prod ? prod.nome : nome));
    const criados = [];
    for (const nome of nomes) {
      const s = _Nm.sugerirProdutos(nome, produtos.lista(), 1)[0];
      let prod = null, sugestao = null;
      if (s && s.motivo === 'igual') prod = s.produto;
      else if (s) sugestao = s.produto; // parecido: pergunta depois, sem criar produto ainda
      else prod = await produtos.garantir(nome);
      if (!prod && !sugestao) continue;
      const nomeLinha = prod ? prod.nome : maiuscula(nome);
      if (jaTem(prod, nomeLinha)) continue;
      const linha = await db.dbPost('lista_hoje', { nome: nomeLinha, detalhe: '', done: false, produto_id: prod ? prod.id : null, origem: 'anotada' });
      if (!linha) continue;
      criados.push(linha); pend.push(linha);
      recentes.push({ id: linha.id, nome: nomeLinha, sugestao });
    }
    if (criados.length && aoAdicionar) aoAdicionar(criados);
    recentes = recentes.slice(-20);
    desenhar();
    return criados.length;
  }

  // Uma frase por vez (a fala pode mandar várias seguidas): evita criar o mesmo item duas vezes.
  let fila = Promise.resolve();
  function adicionarTexto(texto) {
    fila = fila.then(() => adicionarTextoAgora(texto), () => adicionarTextoAgora(texto));
    return fila;
  }

  // Botão "Adicionar à lista" (texto digitado).
  async function adicionar() {
    const txt = el('nr-texto').value;
    const n = await adicionarTexto(txt);
    el('nr-texto').value = '';
    if (n) aviso(`${n} item(ns) na lista.`);
    else aviso(_Vz.separarItens(txt).length ? 'Nada novo: esses itens já estão na lista.' : 'Não achei itens. Escreva ou fale de novo.');
    return n;
  }

  async function responder(i, sim) {
    const r = recentes[i]; if (!r || !r.sugestao) return;
    let linha;
    if (sim) {
      await produtos.adicionarApelido(r.sugestao.id, r.nome);
      linha = await db.dbPatch('lista_hoje', r.id, { nome: r.sugestao.nome, produto_id: r.sugestao.id });
      r.nome = r.sugestao.nome;
    } else {
      const prod = await produtos.garantir(r.nome);
      linha = await db.dbPatch('lista_hoje', r.id, { produto_id: prod ? prod.id : null });
    }
    r.sugestao = null;
    if (linha && aoAtualizar) aoAtualizar(linha);
    desenhar();
  }

  async function remover(i) {
    const r = recentes[i]; if (!r) return;
    await db.dbDel('lista_hoje', r.id);
    if (aoRemover) aoRemover(r.id);
    recentes.splice(i, 1);
    desenhar();
  }

  async function aplicarCorrecao(i, texto) {
    const r = recentes[i]; if (!r) return;
    const nome = _Vz.separarItens(texto)[0] || String(texto).trim();
    if (!nome) return;
    const prod = await produtos.garantir(nome);
    if (!prod) { aviso('Não consegui corrigir. Tente de novo.'); return; }
    const linha = await db.dbPatch('lista_hoje', r.id, { nome: prod.nome, produto_id: prod.id });
    r.nome = prod.nome; r.sugestao = null;
    if (linha && aoAtualizar) aoAtualizar(linha);
    aviso('Corrigido para ' + prod.nome + '.');
    desenhar();
  }

  // 🎤 ao lado de um item: fala o nome certo (uma frase só).
  function corrigir(i) {
    if (!voz || !voz.suportado) { aviso(SEM_VOZ); return; }
    aviso('Fale o nome certo...');
    voz.iniciar(txt => aplicarCorrecao(i, txt), () => {}, { continuo: false, aoErro: aviso });
  }

  // 🎤 Falar: fica ouvindo até tocar de novo; cada frase já vira itens na lista.
  function alternarVoz() {
    const btn = el('nr-voz-btn');
    if (!voz || !voz.suportado) { aviso(SEM_VOZ); return; }
    if (ouvindo) { voz.parar(); ouvindo = false; btn.textContent = '🎤 Falar'; aviso(''); return; }
    ouvindo = true;
    btn.textContent = '⏹ Parar';
    aviso('Ouvindo... fale os itens. Toque em Parar quando terminar.');
    voz.iniciar(
      txt => adicionarTexto(txt),
      () => { ouvindo = false; btn.textContent = '🎤 Falar'; },
      { continuo: true, aoParcial: t => { if (t) aviso('Ouvindo: ' + t); }, aoErro: m => { aviso(m); ouvindo = false; btn.textContent = '🎤 Falar'; } },
    );
  }

  return { adicionar, adicionarTexto, alternarVoz, corrigir, responder, remover };
}

if (typeof module !== 'undefined') module.exports = { createTelaListaRapida };
else window.SoloListaRapida = { createTelaListaRapida };
