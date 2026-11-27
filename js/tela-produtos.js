// Aba Produtos: lotes (compra até "acabou"), duração, custo por dia e sugeridos para a lista.
// No navegador: window.TelaProdutos = createTelaProdutos({...}) (criado no index.html).
const _Lt = typeof require !== 'undefined' ? require('./lotes.js') : window.Lotes;
const _TsP = typeof require !== 'undefined' ? require('./texto-seguro.js') : window.TextoSeguro;

const CHAVE_DISPENSADOS = 'solo-sugeridos-dispensados';
const brl = n => 'R$ ' + (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const num = n => String(Math.round(n * 10) / 10).replace('.', ',');

// hoje(): 'AAAA-MM-DD' local. storage: opcional (localStorage) para lembrar sugeridos removidos.
function createTelaProdutos({ db, produtos, doc, hoje, avisar, storage }) {
  const esc = _TsP.escapar;
  let lotes = [];
  let abertos = new Set(); // produtos com "Ver compras" aberto

  async function carregar() {
    const r = await db.dbGet('lotes', 'select=*&order=inicio.desc');
    lotes = Array.isArray(r) ? r : [];
  }

  const dispensados = () => {
    try { return new Set(JSON.parse((storage && storage.getItem(CHAVE_DISPENSADOS)) || '[]')); } catch { return new Set(); }
  };

  async function registrarLotes(itens, dataCompra, localTipo) {
    // junta itens do mesmo produto na mesma compra (um lote só)
    const juntos = new Map();
    for (const it of itens || []) {
      if (!it.produtoId) continue;
      const j = juntos.get(it.produtoId) || { produtoId: it.produtoId, preco: 0, qtd: 0 };
      j.preco += Number(it.preco) || 0; j.qtd += Number(it.qtd) || 1;
      juntos.set(it.produtoId, j);
    }
    for (const it of juntos.values()) {
      const aberto = _Lt.abertoDe(lotes, it.produtoId);
      if (aberto && dataCompra >= aberto.inicio) {
        await db.dbPatch('lotes', aberto.id, { fim: dataCompra });
        aberto.fim = dataCompra;
      }
      const novo = await db.dbPost('lotes', {
        produto_id: it.produtoId, comprado_em: dataCompra, inicio: dataCompra,
        preco_total: Math.round(it.preco * 100) / 100, qtd: it.qtd, local_tipo: localTipo || 'mercado',
      });
      if (novo) lotes.unshift(novo);
    }
  }

  // Compra editada no Histórico: acha o lote dessa compra (mesmo produto, data e preço) e acompanha a edição.
  const achaLote = (produtoId, data, preco) => lotes.find(l => l.produto_id === produtoId && String(l.comprado_em).slice(0, 10) === data
    && Math.abs(Number(l.preco_total) - Number(preco)) < 0.01);
  async function ajustarLote(produtoId, dataAntiga, precoAntigo, novo) { // novo: {data, preco, qtd}
    const l = achaLote(produtoId, dataAntiga, precoAntigo);
    if (!l) return false;
    const campos = { comprado_em: novo.data, inicio: novo.data, preco_total: novo.preco, qtd: novo.qtd };
    await db.dbPatch('lotes', l.id, campos);
    Object.assign(l, campos);
    return true;
  }
  async function removerLote(produtoId, data, preco) {
    const l = achaLote(produtoId, data, preco);
    if (!l) return false;
    await db.dbDel('lotes', l.id);
    lotes = lotes.filter(x => x !== l);
    return true;
  }

  async function acabou(produtoId) {
    const aberto = _Lt.abertoDe(lotes, produtoId);
    if (!aberto) { avisar('Esse produto não tem compra em uso.'); return; }
    await db.dbPatch('lotes', aberto.id, { fim: hoje() });
    aberto.fim = hoje();
    render();
  }

  async function marcar(produtoId, campos) {
    await produtos.marcar(produtoId, campos);
    render();
  }

  const estimativa = (id, texto) => {
    const n = parseInt(String(texto).replace(/\D/g, ''), 10);
    return marcar(id, { duracao_estimada_dias: n > 0 ? n : null });
  };

  function sugeridos(pendentesProdutoIds) {
    return _Lt.sugeridosParaLista(hoje(), produtos.lista(), lotes, pendentesProdutoIds, dispensados());
  }

  // Pedro removeu um sugerido da lista: só volta com nova compra (novo lote).
  function dispensarSugerido(produtoId) {
    const aberto = _Lt.abertoDe(lotes, produtoId);
    if (!aberto || !storage) return;
    const d = dispensados(); d.add(aberto.id);
    storage.setItem(CHAVE_DISPENSADOS, JSON.stringify([...d]));
  }

  const temAberto = produtoId => !!_Lt.abertoDe(lotes, produtoId);

  function verCompras(id) { if (abertos.has(id)) abertos.delete(id); else abertos.add(id); render(); }

  function cartao(p) {
    const meus = lotes.filter(l => l.produto_id === p.id);
    const aberto = _Lt.abertoDe(lotes, p.id);
    const dur = _Lt.duracaoMedia(meus, p);
    const linhas = [];
    if (dur.dias !== null) {
      linhas.push(`≈ ${num(dur.dias)} dias por unidade (${dur.fonte === 'dados' ? 'dados reais' : 'sua estimativa'})`);
    } else linhas.push('Ainda sem duração. Diga quantos dias dura.');
    if (meus.length) {
      const ult = [...meus].sort((a, b) => (a.inicio < b.inicio ? 1 : -1))[0];
      linhas.push(`Custo por dia (última compra): ${brl(_Lt.custoPorDia(ult, hoje()))}/dia`);
    }
    if (aberto) {
      const d = _Lt.diasParaAcabar(aberto, dur, hoje());
      if (d !== null) linhas.push(`Acaba em ${d} dias`);
    }
    const ess = p.essencial === true ? 'true' : p.essencial === false ? 'false' : '';
    const sel = (v, t, atual) => `<option value="${v}"${atual === v ? ' selected' : ''}>${t}</option>`;
    const compras = abertos.has(p.id)
      ? '<div class="li-sub">' + (_Lt.comparar(meus, hoje()).map(c =>
        `${esc(c.inicio)} · ${c.dias} dias · ${brl(c.preco_total)} · ${brl(c.custoDia)}/dia`).join('<br>') || 'Sem compras.') + '</div>'
      : '';
    return `<div class="card" style="margin-bottom:8px">
      <div style="font-weight:600;font-size:15px">${esc(p.nome)}</div>
      <div style="display:flex;gap:6px;margin:6px 0;flex-wrap:wrap">
        <select onchange="TelaProdutos.marcar('${esc(p.id)}',{essencial:this.value===''?null:this.value==='true'})">
          ${sel('', 'Essencial?', ess)}${sel('true', 'Essencial', ess)}${sel('false', 'Supérfluo', ess)}
        </select>
        <select onchange="TelaProdutos.marcar('${esc(p.id)}',{urgencia:this.value})">
          ${sel('sem_pressa', 'Sem pressa', p.urgencia)}${sel('semana', 'Até uma semana', p.urgencia)}${sel('amanha', 'Até amanhã', p.urgencia)}
        </select>
      </div>
      ${linhas.map(l => `<div class="li-sub">${esc(l)}</div>`).join('')}
      <div style="margin-top:6px"><label class="li-sub">Quantos dias dura? (sua estimativa)</label>
        <input value="${p.duracao_estimada_dias || ''}" inputmode="numeric" style="width:80px" onchange="TelaProdutos.estimativa('${esc(p.id)}',this.value)"></div>
      <div class="btn-row" style="margin-top:8px">
        ${aberto ? `<button class="btn btn-s btn-sm" onclick="TelaProdutos.acabou('${esc(p.id)}')">Acabou</button>` : ''}
        <button class="btn btn-s btn-sm" onclick="TelaProdutos.verCompras('${esc(p.id)}')">Ver compras</button>
      </div>${compras}
    </div>`;
  }

  function render() {
    const el = doc.getElementById('produtos-lista');
    const ps = produtos.lista();
    el.innerHTML = ps.length ? ps.map(cartao).join('')
      : '<div class="empty"><i class="ti ti-box"></i><p>Nenhum produto ainda. Eles aparecem quando você anota ou compra.</p></div>';
  }

  return { carregar, render, registrarLotes, ajustarLote, removerLote, acabou, marcar, estimativa, sugeridos, dispensarSugerido, verCompras, temAberto };
}

if (typeof module !== 'undefined') module.exports = { createTelaProdutos };
else window.SoloTelaProdutos = { createTelaProdutos };
