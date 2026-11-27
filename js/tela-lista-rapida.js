// Caixa "Nota rápida" da aba Lista. Fala (microfone ligado até parar) ou texto vira uma PRÉVIA (rascunho);
// ✏️ digita o nome certo, 🎤 fala o nome certo, ✕ tira. Ao tocar "Adicionar à lista" os itens vão para a lista Hoje
// e a prévia some. Quando o Pedro corrige, o que foi ouvido vira apelido do produto certo ("deixa" -> "Dexa").
// Tudo por regras locais, sem IA. No navegador: window.TelaListaRapida = createTelaListaRapida({...}) (index.html).
const _Nm = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;
const _Vz = typeof require !== 'undefined' ? require('./voz-lista.js') : window.VozLista;
const _Ts = typeof require !== 'undefined' ? require('./texto-seguro.js') : window.TextoSeguro;
const _Dc = typeof require !== 'undefined' ? require('./dicionario.js') : window.Dicionario;

const SEM_VOZ = 'Seu navegador não tem voz. Use o microfone do teclado do iPhone.';
// frase que termina assim ainda está incompleta: espera o resto ("filtro de papel para" ... "café")
const FIM_INCOMPLETO = new Set(['para', 'pra', 'de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'em', 'no', 'na']);
// frase que começa assim continua o item anterior ("leite" ... "sem lactose")
const INICIO_CONTINUA = new Set(['sem', 'com', 'de', 'da', 'do', 'das', 'dos', 'para', 'pra', 'em']);

// getHoje(): linhas atuais da lista Hoje. voz: {suportado, iniciar(aoFinal, aoFim, {continuo, aoParcial, aoErro}), parar()}.
// perguntar(msg, valorInicial): texto digitado (window.prompt). aoAdicionar(linhas): a tela atualiza a lista Hoje.
function createTelaListaRapida({ db, produtos, doc, aoAdicionar, voz, getHoje, perguntar }) {
  const esc = _Ts.escapar;
  const el = id => doc.getElementById(id);
  let previa = []; // {uid, nome, original, detalhe}
  let negados = new Set(); // pares que o Pedro disse que NÃO são o mesmo (só nesta prévia)
  let refinaProximo = false; // acabou de falar uma descrição solta: o próximo item refina o anterior
  let seq = 0;
  let ouvindo = false;
  let sobra = ''; // começo de frase esperando o resto
  const aviso = t => { el('nr-aviso').textContent = t; };
  const canon = _Nm.canonico;
  const base = _Nm.chaveBase;

  const conhecidos = () => [..._Dc.ITENS_COMUNS, ...produtos.lista().flatMap(p => [p.nome, ...(p.apelidos || [])])];
  const palavrasDe = nome => new Set(canon(nome).split(' ').filter(Boolean));
  // "chá" está dentro de "chá de cidreira": podem ser o mesmo produto
  function relacionados(a, b) {
    const A = palavrasDe(a), B = palavrasDe(b);
    const [menor, maior] = A.size <= B.size ? [A, B] : [B, A];
    return menor.size >= 1 && menor.size < maior.size && [...menor].every(w => maior.has(w));
  }

  const chavePar = (a, b) => [a.uid, b.uid].sort().join('|');
  // Pergunta só vale para os nomes de AGORA (se o nome mudou, a pergunta velha some) e uma vez por par.
  function perguntaDe(i) {
    const r = previa[i];
    return previa.slice(0, i).find(x => relacionados(x.nome, r.nome) && !negados.has(chavePar(x, r))) || null;
  }

  function desenhar() {
    el('nr-revisao').innerHTML = previa.map((r, i) => {
      const alvo = perguntaDe(i);
      const q = alvo
        ? `<div class="nr-q"><strong>${esc(r.nome)}</strong> é o mesmo que <strong>${esc(alvo.nome)}</strong>? ` +
          `<button onclick="TelaListaRapida.responder(${i},true)">Sim</button> ` +
          `<button onclick="TelaListaRapida.responder(${i},false)">Não</button></div>`
        : '';
      return `<div class="nr-item"><span>${esc(r.nome)}</span>${r.detalhe ? ` <small class="nr-det" style="color:#FB5C32">📝 ${esc(r.detalhe)}</small>` : ''} ` +
        `<button onclick="TelaListaRapida.editar(${i})" aria-label="Digitar o nome certo">✏️</button> ` +
        `<button onclick="TelaListaRapida.corrigir(${i})" aria-label="Falar o nome certo">🎤</button> ` +
        `<button onclick="TelaListaRapida.remover(${i})" aria-label="Tirar">✕</button>${q}</div>`;
    }).join('');
  }

  // Põe itens na prévia (sem repetir o que já está lá).
  function incluir(itens) {
    let n = 0;
    for (const it of itens) {
      if (previa.some(p => base(p.nome) === base(it.nome))) continue;
      const ult = previa[previa.length - 1];
      const refina = it.refina || refinaProximo;
      refinaProximo = false;
      if (refina && ult && relacionados(ult.nome, it.nome)) { // "tomate ... aquele pequenininho ... tomate cereja"
        if (palavrasDe(it.nome).size >= palavrasDe(ult.nome).size) ult.nome = it.nome;
        ult.detalhe = ult.detalhe || it.detalhe || '';
        continue;
      }
      previa.push({ uid: ++seq, nome: it.nome, original: it.nome, detalhe: it.detalhe || '' });
      n++;
    }
    desenhar();
    return n;
  }

  // Texto digitado ou frase falada já completa.
  function adicionarTexto(texto) {
    const itens = _Vz.separarItensComDetalhe(texto, conhecidos());
    const n = incluir(itens);
    if (itens.descricoes && !itens.length) refinaProximo = true;
    return n;
  }

  // Fala: junta pedaços ("filtro de papel para" + "café", "leite" + "sem lactose") antes de pôr na prévia.
  function adicionarFala(txt) {
    let t = (sobra + ' ' + String(txt || '')).trim();
    sobra = '';
    if (!t) return 0;
    const corr = _Vz.tirarCorrecao(t); // "quero dizer leite integral": troca o último item
    if (corr.corrige) {
      previa.pop();
      t = corr.resto;
      if (!t) { desenhar(); return 0; }
    }
    const palavras = _Nm.normalizar(t).split(' ');
    if (FIM_INCOMPLETO.has(palavras[palavras.length - 1])) { sobra = t; return 0; }
    const ult = previa[previa.length - 1];
    if (ult && INICIO_CONTINUA.has(palavras[0])) { // continua o item anterior
      ult.nome = (ult.nome + ' ' + t).replace(/\s+/g, ' ').trim();
      desenhar();
      return 0;
    }
    const itens = _Vz.separarItensComDetalhe(t, conhecidos());
    if (itens.descricoes && !itens.length) { refinaProximo = true; return 0; }
    if (ult && itens.length) {
      if (base(ult.nome) === base(itens[0].nome)) itens.shift(); // eco ("leite", "leites")
      else {
        const junto = ult.nome + ' ' + itens[0].nome;
        if (conhecidos().some(k => canon(k) === canon(junto))) { // "filtro de papel" + "café"
          ult.nome = junto; if (itens[0].detalhe) ult.detalhe = itens[0].detalhe;
          itens.shift();
        }
      }
    }
    return incluir(itens);
  }

  function responder(i, sim) {
    const r = previa[i]; if (!r) return;
    const alvo = perguntaDe(i);
    if (!alvo) return;
    if (sim) {
      const maior = palavrasDe(r.nome).size >= palavrasDe(alvo.nome).size ? r : alvo;
      const outro = maior === r ? alvo : r;
      maior.detalhe = maior.detalhe || outro.detalhe;
      previa = previa.filter(x => x !== outro);
    } else negados.add(chavePar(alvo, r));
    desenhar();
  }

  function remover(i) { previa.splice(i, 1); desenhar(); }

  async function aplicarCorrecao(i, texto) {
    const r = previa[i]; if (!r) return;
    const nome = _Vz.separarItens(texto, conhecidos())[0] || String(texto || '').trim();
    if (!nome) return;
    const prod = await produtos.garantir(nome);
    if (!prod) { aviso('Não consegui corrigir. Tente de novo.'); return; }
    // aprende: o que foi ouvido/escrito errado passa a valer como esse produto
    if (r.original && canon(r.original) !== canon(prod.nome)) await produtos.adicionarApelido(prod.id, r.original);
    r.nome = prod.nome;
    aviso('Corrigido para ' + prod.nome + '.');
    desenhar();
  }

  // ✏️ digitar o nome certo.
  function editar(i) {
    const r = previa[i]; if (!r) return;
    const novo = perguntar ? perguntar('Nome certo do item:', r.nome) : null;
    if (novo && String(novo).trim()) return aplicarCorrecao(i, String(novo).trim());
  }

  // 🎤 ao lado de um item: fala o nome certo (uma frase só).
  function corrigir(i) {
    if (!voz || !voz.suportado) { aviso(SEM_VOZ); return; }
    aviso('Fale o nome certo...');
    voz.iniciar(txt => aplicarCorrecao(i, txt), () => {}, { continuo: false, aoErro: aviso });
  }

  // Botão "Adicionar à lista": o que está na prévia (e no texto digitado) vai para a lista Hoje.
  async function adicionar() {
    const digitado = el('nr-texto').value;
    if (digitado.trim()) { adicionarTexto(digitado); el('nr-texto').value = ''; }
    if (sobra) { const resto = sobra; sobra = ''; adicionarTexto(resto); }
    if (!previa.length) { aviso('Não achei itens. Escreva ou fale de novo.'); return 0; }
    const pend = (getHoje ? getHoje() : []).filter(h => !h.done).slice();
    const criados = [];
    let repetidos = 0;
    for (const it of previa) {
      const prod = await produtos.garantir(it.nome);
      if (!prod) continue;
      if (pend.some(h => h.produto_id === prod.id || canon(h.nome) === canon(prod.nome))) { repetidos++; continue; }
      const linha = await db.dbPost('lista_hoje', { nome: prod.nome, detalhe: it.detalhe || '', done: false, produto_id: prod.id, origem: 'anotada' });
      if (!linha) continue;
      criados.push(linha); pend.push(linha);
    }
    previa = []; negados = new Set(); refinaProximo = false;
    desenhar();
    if (criados.length && aoAdicionar) aoAdicionar(criados);
    if (criados.length) aviso(`${criados.length} item(ns) na lista.` + (repetidos ? ` ${repetidos} já estava(m).` : ''));
    else aviso('Nada novo: esses itens já estão na lista.');
    return criados.length;
  }

  // 🎤 Falar: fica ouvindo até tocar de novo; cada frase vai para a prévia.
  function alternarVoz() {
    const btn = el('nr-voz-btn');
    if (!voz || !voz.suportado) { aviso(SEM_VOZ); return; }
    if (ouvindo) {
      voz.parar(); ouvindo = false; btn.textContent = '🎤 Falar';
      if (sobra) { const resto = sobra; sobra = ''; adicionarTexto(resto); } // frase que ficou no meio
      aviso(previa.length ? 'Confira os itens e toque em Adicionar à lista.' : '');
      return;
    }
    ouvindo = true;
    btn.textContent = '⏹ Parar';
    aviso('Ouvindo... fale os itens. Toque em Parar quando terminar.');
    voz.iniciar(
      txt => adicionarFala(txt),
      () => { ouvindo = false; btn.textContent = '🎤 Falar'; },
      { continuo: true, aoParcial: t => { if (t) aviso('Ouvindo: ' + t); }, aoErro: m => { aviso(m); ouvindo = false; btn.textContent = '🎤 Falar'; } },
    );
  }

  return { adicionar, adicionarTexto, adicionarFala, alternarVoz, corrigir, editar, remover, responder };
}

if (typeof module !== 'undefined') module.exports = { createTelaListaRapida };
else window.SoloListaRapida = { createTelaListaRapida };
