// Caixa "Nota rápida" da aba Lista: fala (microfone sempre ligado até parar) ou texto vira itens na lista Hoje.
// Os itens entram sozinhos, sem perguntas; ✕ remove, ✏️ digita o nome certo e 🎤 fala o nome certo.
// Quando o Pedro corrige, o que foi ouvido vira apelido do produto certo ("deixa" -> "Dexa"): aprende sem IA.
// No navegador: window.TelaListaRapida = createTelaListaRapida({...}) (criado no index.html).
const _Nm = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;
const _Vz = typeof require !== 'undefined' ? require('./voz-lista.js') : window.VozLista;
const _Ts = typeof require !== 'undefined' ? require('./texto-seguro.js') : window.TextoSeguro;
const _Dc = typeof require !== 'undefined' ? require('./dicionario.js') : window.Dicionario;

const SEM_VOZ = 'Seu navegador não tem voz. Use o microfone do teclado do iPhone.';
// frase que termina assim ainda está incompleta: espera o resto ("filtro de papel para" ... "café")
const FIM_INCOMPLETO = new Set(['para', 'pra', 'de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'e', 'em', 'no', 'na']);

// getHoje(): linhas atuais da lista Hoje. voz: {suportado, iniciar(aoFinal, aoFim, {continuo, aoParcial, aoErro}), parar()}.
// perguntar(msg, valorInicial): texto digitado (window.prompt). aoAdicionar/aoRemover/aoAtualizar mantêm a lista na tela.
function createTelaListaRapida({ db, produtos, doc, aoAdicionar, aoRemover, aoAtualizar, voz, getHoje, perguntar }) {
  const esc = _Ts.escapar;
  const el = id => doc.getElementById(id);
  let recentes = []; // {id, nome, original}
  let ouvindo = false;
  let sobra = ''; // começo de frase esperando o resto
  const aviso = t => { el('nr-aviso').textContent = t; };
  const maiuscula = s => s.charAt(0).toUpperCase() + s.slice(1);
  const canon = _Nm.canonico;

  const conhecidos = () => [..._Dc.ITENS_COMUNS, ...produtos.lista().flatMap(p => [p.nome, ...(p.apelidos || [])])];

  function desenhar() {
    el('nr-revisao').innerHTML = recentes.map((r, i) =>
      `<div class="nr-item"><span>${esc(r.nome)}</span> ` +
      `<button onclick="TelaListaRapida.editar(${i})" aria-label="Digitar o nome certo">✏️</button> ` +
      `<button onclick="TelaListaRapida.corrigir(${i})" aria-label="Falar o nome certo">🎤</button> ` +
      `<button onclick="TelaListaRapida.remover(${i})" aria-label="Remover">✕</button></div>`).join('');
  }

  // Cria as linhas na lista Hoje a partir do texto (falado ou digitado). Devolve quantas entraram.
  async function adicionarTextoAgora(texto) {
    const nomes = _Vz.separarItens(texto, conhecidos());
    const pend = (getHoje ? getHoje() : []).filter(h => !h.done).slice();
    const criados = [];
    for (const nome of nomes) {
      const prod = await produtos.garantir(nome);
      if (!prod) continue;
      if (pend.some(h => h.produto_id === prod.id || canon(h.nome) === canon(prod.nome))) continue;
      const linha = await db.dbPost('lista_hoje', { nome: prod.nome, detalhe: '', done: false, produto_id: prod.id, origem: 'anotada' });
      if (!linha) continue;
      criados.push(linha); pend.push(linha);
      recentes.push({ id: linha.id, nome: prod.nome, original: nome });
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

  // Fala: junta pedaços ("filtro de papel para" + "café") antes de criar os itens.
  async function adicionarFalaAgora(txt) {
    let t = (sobra + ' ' + String(txt || '')).trim();
    sobra = '';
    if (!t) return 0;
    const ultima = _Nm.normalizar(t).split(' ').pop();
    if (FIM_INCOMPLETO.has(ultima)) { sobra = t; return 0; }
    const itens = _Vz.separarItens(t, conhecidos());
    // "filtro de papel" + pausa + "café": se juntos formam um nome conhecido, é um item só
    const ult = recentes[recentes.length - 1];
    if (ult && itens.length) {
      const junto = ult.nome + ' ' + itens[0];
      const cj = canon(junto);
      if (conhecidos().some(k => canon(k) === cj)) {
        const prod = await produtos.garantir(junto);
        if (prod) {
          const linha = await db.dbPatch('lista_hoje', ult.id, { nome: prod.nome, produto_id: prod.id });
          ult.nome = prod.nome;
          if (linha && aoAtualizar) aoAtualizar(linha);
          itens.shift();
          desenhar();
        }
      }
    }
    if (!itens.length) return 0;
    return adicionarTextoAgora(itens.join(', '));
  }
  function adicionarFala(txt) {
    fila = fila.then(() => adicionarFalaAgora(txt), () => adicionarFalaAgora(txt));
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

  async function remover(i) {
    const r = recentes[i]; if (!r) return;
    await db.dbDel('lista_hoje', r.id);
    if (aoRemover) aoRemover(r.id);
    recentes.splice(i, 1);
    desenhar();
  }

  async function aplicarCorrecao(i, texto) {
    const r = recentes[i]; if (!r) return;
    const nome = _Vz.separarItens(texto, conhecidos())[0] || String(texto || '').trim();
    if (!nome) return;
    const prod = await produtos.garantir(nome);
    if (!prod) { aviso('Não consegui corrigir. Tente de novo.'); return; }
    const linha = await db.dbPatch('lista_hoje', r.id, { nome: prod.nome, produto_id: prod.id });
    // aprende: o que foi ouvido/escrito errado passa a valer como esse produto
    if (r.original && canon(r.original) !== canon(prod.nome)) await produtos.adicionarApelido(prod.id, r.original);
    r.nome = prod.nome;
    if (linha && aoAtualizar) aoAtualizar(linha);
    aviso('Corrigido para ' + prod.nome + '.');
    desenhar();
  }

  // ✏️ digitar o nome certo.
  function editar(i) {
    const r = recentes[i]; if (!r) return;
    const novo = perguntar ? perguntar('Nome certo do item:', r.nome) : null;
    if (novo && String(novo).trim()) return aplicarCorrecao(i, String(novo).trim());
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
    if (ouvindo) {
      voz.parar(); ouvindo = false; btn.textContent = '🎤 Falar'; aviso('');
      if (sobra) { const resto = sobra; sobra = ''; adicionarTexto(resto); } // frase que ficou no meio
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

  return { adicionar, adicionarTexto, adicionarFala, alternarVoz, corrigir, editar, remover };
}

if (typeof module !== 'undefined') module.exports = { createTelaListaRapida };
else window.SoloListaRapida = { createTelaListaRapida };
