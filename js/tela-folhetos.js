// Tela Folhetos: lê fotos/PDF/CSV, salva no banco e compara com a lista permanente.
// No navegador: window.TelaFolhetos = createTelaFolhetos({...}) (criado no index.html).
const _F = typeof require !== 'undefined' ? require('./folhetos.js') : window.Folhetos;
const _T = typeof require !== 'undefined' ? require('./texto-seguro.js') : window.TextoSeguro;
const _I = typeof require !== 'undefined' ? require('./ia.js') : window.SoloIa;

const AVISO_CORTADO = 'Folheto grande: alguns itens podem ter ficado de fora. Envie em partes.';
const AVISO_NAO_SALVO = 'Não salvei no banco. Toque em Salvar para tentar de novo.';
const LARANJA = '#FB5C32';

function dataCurta(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d)) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

function lerJsonPares(texto) {
  const s = String(texto || '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a === -1 || b <= a) return [];
  try {
    const p = JSON.parse(s.slice(a, b + 1)).pares;
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

// claudeTexto(prompt, maxTokens, model) -> Promise<string> (só texto, '' se falhar); usado só em "Procurar com IA".
function createTelaFolhetos({ db, ia, toB64, doc, avisar, getLista, confirmar, claudeTexto }) {
  const esc = _T.escapar;
  const el = id => doc.getElementById(id);
  let folhetos = [];          // {id|null, chave, mercado, itens, criado_em, naoSalvo}
  let abertos = new Set();    // chaves dos cartões com itens visíveis
  let comp = null;            // {id, resultado, nota, pares, semPar, lista, folhetos}
  let seq = 0;
  let alvoPaginas = null;

  const chaveDe = f => f.id || f.chave;
  const novoLocal = (mercado, itens) => ({ id: null, chave: 'local' + (++seq), mercado, itens, criado_em: null, naoSalvo: true });
  const achar = chave => folhetos.find(f => chaveDe(f) === chave);

  // ── desenho ─────────────────────────────────────────────────────────
  function atualizarBotao() {
    const ok = String((el('fol-mercado') || {}).value || '').trim() !== '';
    const b = el('fol-btn');
    b.disabled = !ok;
    b.innerHTML = ok ? '<i class="ti ti-photo"></i>Adicionar fotos/PDF' : '<i class="ti ti-photo"></i>Digite o nome do mercado primeiro';
  }

  function desenharLista() {
    const l = el('folhetos-list');
    if (!folhetos.length) {
      l.innerHTML = '<div class="empty"><i class="ti ti-file-x"></i><p>Nenhum folheto adicionado</p></div>';
    } else {
      l.innerHTML = folhetos.map(f => {
        const k = esc(chaveDe(f));
        const aberto = abertos.has(chaveDe(f));
        const itens = aberto
          ? '<div style="margin-top:8px;font-size:13px">' + (f.itens || []).map(i =>
            `<div class="li-sub" style="white-space:normal">${esc(i.nome)}: ${esc(_F.fmt(i.preco))}${i.unidade ? '/' + esc(i.unidade) : ''}</div>`).join('') + '</div>'
          : '';
        const salvar = f.naoSalvo
          ? `<div style="margin-top:6px"><span class="li-sub" style="color:${LARANJA}">não salvo</span> <button class="btn btn-p btn-sm" onclick="TelaFolhetos.salvar('${k}')">Salvar</button></div>`
          : '';
        return `<div class="card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="flex:1;cursor:pointer" onclick="TelaFolhetos.alternar('${k}')"><div style="font-weight:500">${esc(f.mercado)}</div><div class="li-sub">${(f.itens || []).length} itens · ${esc(dataCurta(f.criado_em))}</div></div>
        <button class="btn btn-s btn-sm" onclick="TelaFolhetos.maisPaginas('${k}')">+ páginas</button>
        <button class="ico-btn" onclick="TelaFolhetos.remover('${k}')"><i class="ti ti-x"></i></button>
      </div>${salvar}${itens}</div>`;
      }).join('');
    }
    const lista = getLista() || [];
    el('fol-cmp-wrap').style.display = folhetos.length > 0 && lista.length > 0 ? 'block' : 'none';
  }

  function desenharComparativo() {
    const r = el('fol-result');
    if (!comp) { r.innerHTML = ''; return; }
    const res = comp.resultado || {};
    const mercados = Object.keys(res.totais || {});
    let h = '<div class="card" style="font-size:13px;line-height:1.7">';
    if ((res.linhas || []).length) {
      h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><th style="text-align:left;padding:4px">Item</th>'
        + mercados.map(m => `<th style="text-align:right;padding:4px">${esc(m)}</th>`).join('') + '</tr>';
      for (const l of res.linhas) {
        const min = Math.min(...Object.values(l.precos));
        h += `<tr><td style="padding:4px">${esc(l.item)}</td>` + mercados.map(m => {
          const p = l.precos[m];
          if (p === undefined) return '<td style="text-align:right;padding:4px;color:#8e8e93">-</td>';
          const dest = p === min ? `font-weight:700;color:${LARANJA}` : '';
          return `<td style="text-align:right;padding:4px;${dest}">${esc(_F.fmt(p))}</td>`;
        }).join('') + '</tr>';
      }
      h += '<tr style="border-top:1px solid #e5e5ea"><td style="padding:4px;font-weight:600">Total</td>'
        + mercados.map(m => `<td style="text-align:right;padding:4px;font-weight:600">${esc(_F.fmt(res.totais[m].total))} <span style="color:#8e8e93;font-weight:400">(${res.totais[m].encontrados})</span></td>`).join('') + '</tr></table></div>';
      for (const m of mercados) {
        if ((res.soEm[m] || []).length) h += `<p class="li-sub" style="white-space:normal;margin-top:6px">Só no ${esc(m)}: ${res.soEm[m].map(esc).join(', ')}</p>`;
      }
    }
    h += '<div class="tip-box">' + String(comp.nota || '').split('\n').filter(x => x.trim()).map(l =>
      l.includes('Vale a pena!')
        ? `<p style="margin:4px 0;font-weight:700;color:${LARANJA}">${esc(l)}</p>`
        : `<p style="margin:4px 0">${esc(l)}</p>`).join('') + '</div>';
    if (comp.semPar && comp.semPar.length) {
      h += `<p class="li-sub" style="margin-top:8px">${comp.semPar.length} itens não encontrados</p>`
        + '<button class="btn btn-s btn-bl" onclick="TelaFolhetos.procurarComIA()" id="fol-ia-btn"><i class="ti ti-sparkles"></i>Procurar com IA</button>';
    }
    r.innerHTML = h + '</div>';
  }

  // ── banco ───────────────────────────────────────────────────────────
  async function gravar(f) {
    if (f.id) {
      const r = await db.dbPatch('folhetos', f.id, { itens: f.itens });
      f.naoSalvo = !r;
    } else {
      const r = await db.dbPost('folhetos', { mercado: f.mercado, itens: f.itens });
      if (r && r.id) { f.id = r.id; f.criado_em = r.criado_em || f.criado_em; f.naoSalvo = false; } else f.naoSalvo = true;
    }
    return !f.naoSalvo;
  }

  async function salvar(chave) {
    const f = achar(chave); if (!f) return;
    if (await gravar(f)) avisar('Salvo.'); else avisar(AVISO_NAO_SALVO);
    desenharLista();
  }

  async function abrir() {
    atualizarBotao();
    const fs = await db.dbGet('folhetos', 'order=criado_em.desc');
    const naoSalvos = folhetos.filter(f => f.naoSalvo);
    folhetos = (Array.isArray(fs) ? fs : []).map(f => ({ ...f, itens: f.itens || [], naoSalvo: false })).concat(naoSalvos);
    desenharLista();
    const cs = await db.dbGet('comparativos', 'order=criado_em.desc&limit=1');
    const c = Array.isArray(cs) && cs[0];
    comp = c ? { id: c.id, resultado: c.resultado, nota: c.nota, semPar: [], pares: [] } : null;
    desenharComparativo();
  }

  function limpar() {
    folhetos = []; comp = null; abertos = new Set(); alvoPaginas = null;
    el('folhetos-list').innerHTML = '';
    el('fol-result').innerHTML = '';
    el('fol-cmp-wrap').style.display = 'none';
    el('fol-progresso').textContent = '';
    el('fol-mercado').value = '';
    atualizarBotao();
  }

  // ── leitura de arquivos ─────────────────────────────────────────────
  async function processarArquivos(files, mercado, folhetoId) {
    const out = { lidos: 0, falhas: [], cortado: false };
    const arquivos = Array.from(files || []);
    let f = null;
    if (folhetoId) {
      f = achar(folhetoId);
      if (f && f.id) {
        const r = await db.dbGet('folhetos', 'id=eq.' + encodeURIComponent(f.id));
        if (!Array.isArray(r) || !r[0]) {
          avisar('Não consegui abrir o folheto no banco. Tente de novo.');
          out.falhas = arquivos.map(a => a.name);
          return out;
        }
        f.itens = r[0].itens || [];
      }
      if (f) mercado = f.mercado;
    }
    for (let n = 0; n < arquivos.length; n++) {
      const a = arquivos[n];
      el('fol-progresso').textContent = `Lendo ${n + 1} de ${arquivos.length}...`;
      const erro = _I.validarArquivo(a);
      if (erro) { out.falhas.push(a.name); avisar(a.name + ': ' + erro); continue; }
      try {
        const b64 = await toB64(a);
        const r = await ia.claudeArquivo({ prompt: _F.PROMPT_LEITURA, b64, mime: a.type, model: _I.MODELO_BARATO, maxTokens: 1500 });
        const novos = _F.lerLinhasIA(r.texto);
        if (!novos.length) { out.falhas.push(a.name); avisar(a.name + ': não consegui ler. Tente foto mais clara.'); continue; }
        if (r.cortado) out.cortado = true;
        if (!f) { f = novoLocal(mercado, novos); folhetos.unshift(f); } else f.itens = _F.juntarItens(f.itens, novos);
        out.lidos++;
        if (!(await gravar(f))) avisar(AVISO_NAO_SALVO);
        desenharLista();
      } catch (e) {
        out.falhas.push(a.name);
        avisar(a.name + ': ' + (e && e.message ? e.message : 'erro ao ler'));
      }
    }
    el('fol-progresso').textContent = '';
    if (out.cortado) avisar(AVISO_CORTADO);
    if (out.falhas.length) avisar('Não consegui ler: ' + out.falhas.join(', '));
    return out;
  }

  const adicionarPaginas = (id, files) => processarArquivos(files, '', id);

  async function importarCsv(file) {
    const texto = await file.text();
    const { porMercado, ignoradas } = _F.lerCsv(texto);
    let criados = 0;
    for (const [mercado, itens] of Object.entries(porMercado)) {
      const f = novoLocal(mercado, itens);
      folhetos.unshift(f);
      if (await gravar(f)) criados++; else avisar(AVISO_NAO_SALVO);
    }
    desenharLista();
    avisar(`${criados} folhetos criados` + (ignoradas ? `; ${ignoradas} linhas ignoradas` : '') + '.');
    return { criados, ignoradas };
  }

  async function remover(chave) {
    const f = achar(chave); if (!f) return;
    if (!confirmar('Remover o folheto de ' + f.mercado + '?')) return;
    if (f.id) await db.dbDel('folhetos', f.id);
    folhetos = folhetos.filter(x => x !== f);
    abertos.delete(chave);
    desenharLista();
  }

  function alternar(chave) {
    if (abertos.has(chave)) abertos.delete(chave); else abertos.add(chave);
    desenharLista();
  }

  // ── comparativo ─────────────────────────────────────────────────────
  async function guardarComparativo() {
    const { nota, ...resultado } = comp.resultado;
    const corpo = { folheto_ids: comp.folhetos.filter(f => f.id).map(f => f.id), resultado, nota };
    if (comp.id) { const r = await db.dbPatch('comparativos', comp.id, corpo); if (!r) avisar('Não salvei o comparativo.'); return; }
    const r = await db.dbPost('comparativos', corpo);
    if (r && r.id) comp.id = r.id; else avisar('Não salvei o comparativo.');
  }

  function calcular(lista, fs, pares, semPar) {
    const completo = _F.calcularComparativo(lista, fs, pares);
    comp = Object.assign(comp && comp.id ? { id: comp.id } : { id: null },
      { resultado: completo, nota: completo.nota, pares, semPar, lista, folhetos: fs });
  }

  async function comparar() {
    const lista = getLista() || [];
    const fs = folhetos.slice();
    if (!fs.length || !lista.length) { avisar('Precisa de folheto e de lista.'); return; }
    const { pares, semPar } = _F.casarLocal(lista, fs);
    comp = null;
    calcular(lista, fs, pares, semPar);
    desenharComparativo();
    await guardarComparativo();
  }

  async function procurarComIA() {
    if (!comp || !comp.semPar.length) return;
    const { lista, folhetos: fs, semPar } = comp;
    const txtLista = semPar.map(i => `${i}: ${lista[i].nome}`).join('\n');
    const txtFol = fs.map((f, j) => `Folheto ${j} (${f.mercado}):\n` + f.itens.map((it, k) => `${k}: ${it.nome} ${_F.fmt(it.preco)}`).join('\n')).join('\n\n');
    const prompt = `Itens da minha lista (número: nome):\n${txtLista}\n\n${txtFol}\n\n`
      + 'Para cada item da lista, ache no folheto o MESMO produto ou equivalente (tamanhos diferentes não casam). '
      + 'Responda SOMENTE JSON: {"pares":[[iLista,iFolheto,iItem],...]} usando os números acima. Sem texto extra.';
    const btn = el('fol-ia-btn'); if (btn) btn.disabled = true;
    try {
      const texto = await claudeTexto(prompt, 1500, _I.MODELO_BARATO);
      if (!texto) { avisar('A IA não respondeu. Tente de novo.'); if (btn) btn.disabled = false; return; }
      const sem = new Set(semPar);
      const novos = lerJsonPares(texto).filter(p => Array.isArray(p) && p.length === 3 && sem.has(p[0])
        && fs[p[1]] && fs[p[1]].itens[p[2]]);
      const resolvidos = new Set(novos.map(p => p[0]));
      calcular(lista, fs, comp.pares.concat(novos), semPar.filter(i => !resolvidos.has(i)));
      desenharComparativo();
      await guardarComparativo();
    } catch (e) {
      avisar('Erro na IA: ' + (e && e.message ? e.message : 'tente de novo'));
      if (btn) btn.disabled = false;
    }
  }

  // ── ligações com o HTML ─────────────────────────────────────────────
  async function aoEscolherFotos(input) {
    const mercado = String(el('fol-mercado').value || '').trim();
    const files = Array.from(input.files || []);
    input.value = '';
    if (!mercado || !files.length) return;
    const r = await processarArquivos(files, mercado);
    if (r.lidos) el('fol-mercado').value = '';
    atualizarBotao();
  }
  async function aoEscolherCsv(input) {
    const f = input.files && input.files[0]; input.value = '';
    if (f) await importarCsv(f);
  }
  function maisPaginas(chave) { alvoPaginas = chave; el('fol-pag').click(); }
  async function aoEscolherPaginas(input) {
    const files = Array.from(input.files || []); input.value = '';
    if (alvoPaginas && files.length) await adicionarPaginas(alvoPaginas, files);
  }

  return { abrir, limpar, processarArquivos, importarCsv, adicionarPaginas, remover, comparar, procurarComIA, salvar, alternar,
    atualizarBotao, aoEscolherFotos, aoEscolherCsv, maisPaginas, aoEscolherPaginas };
}

if (typeof module !== 'undefined') module.exports = { createTelaFolhetos };
else window.createTelaFolhetos = createTelaFolhetos;
