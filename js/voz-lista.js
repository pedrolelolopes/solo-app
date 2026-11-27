// Separa uma nota falada ou digitada em itens de compra (regras locais, sem IA).
// conhecidos (opcional): nomes de produtos que o app já conhece (dicionário + histórico do Pedro).
// Com eles, "café manteiga desodorante" vira 3 itens e "papel manteiga" continua 1 só.
const _NomesV = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;

// mais longos primeiro, para "acabou o" vencer "acabou"
const PREFIXOS_VOZ = ['eu preciso lembrar de comprar', 'preciso lembrar de comprar', 'eu preciso comprar', 'eu preciso de',
  'lembrar de comprar', 'tenho que comprar', 'preciso comprar', 'preciso de', 'colocar na lista', 'acabou o', 'acabou a',
  'acabou', 'adicionar', 'comprar', 'faltou', 'falta', 'anotar', 'anota'];
const ARTIGOS_VOZ = ['o', 'a', 'os', 'as', 'um', 'uma'];
const LIGACAO_VOZ = new Set(['de', 'da', 'do', 'com', 'sem', 'e']);
const MAX_PALAVRAS_NOME = 6;
const CONECT_VOZ = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'pra']);

function limparTrecho(t) {
  let s = t.trim();
  for (let mudou = true; mudou;) {
    mudou = false;
    const baixo = s.toLowerCase();
    for (const p of PREFIXOS_VOZ) {
      if (baixo === p || baixo.startsWith(p + ' ')) { s = s.slice(p.length).trim(); mudou = true; break; }
    }
    if (mudou) continue;
    for (const a of ARTIGOS_VOZ) {
      if (baixo.startsWith(a + ' ')) { s = s.slice(a.length + 1).trim(); mudou = true; break; }
    }
  }
  return s;
}

// Parte um trecho em nomes que o app conhece (o mais longo primeiro). Sem nenhum nome conhecido, devolve o trecho inteiro.
function segmentarConhecidos(trecho, conhecidos) {
  const palavras = trecho.split(/\s+/).filter(Boolean);
  if (palavras.length < 2 || !conhecidos || !conhecidos.size) return [trecho];
  const norm = palavras.map(w => _NomesV.normalizar(w));
  const partes = []; // {texto, conhecido}
  let resto = [];
  const soltarResto = () => { if (resto.length) { partes.push({ texto: resto.join(' '), conhecido: false }); resto = []; } };
  for (let i = 0; i < palavras.length;) {
    let achou = 0;
    for (let n = Math.min(MAX_PALAVRAS_NOME, palavras.length - i); n >= 1; n--) {
      const janela = norm.slice(i, i + n);
      if (CONECT_VOZ.has(janela[0]) || CONECT_VOZ.has(janela[n - 1])) continue; // nome não começa nem termina em "de/para"
      if (conhecidos.has(_NomesV.canonico(janela.join(' ')))) { achou = n; break; }
    }
    if (achou) { soltarResto(); partes.push({ texto: palavras.slice(i, i + achou).join(' '), conhecido: true }); i += achou; }
    else { resto.push(palavras[i]); i++; }
  }
  soltarResto();
  if (!partes.some(p => p.conhecido)) return [trecho];
  // sobra só de palavra de ligação entre nomes ("café com leite"): é um item só
  if (partes.some(p => !p.conhecido && p.texto.split(' ').every(w => LIGACAO_VOZ.has(_NomesV.normalizar(w))))) return [trecho];
  // palavras sem nome conhecido logo depois de um nome conhecido são detalhe dele ("leite ninho", "esponja de pia")
  const juntas = [];
  for (const p of partes) {
    if (!p.conhecido && juntas.length) juntas[juntas.length - 1].texto += ' ' + p.texto;
    else juntas.push({ ...p });
  }
  return juntas.map(p => p.texto);
}

// Palavras de fala solta que não fazem parte do nome ("chá de cidreira, né").
const ENCHIMENTO_FIM = new Set(['né', 'ne', 'tá', 'ta', 'então', 'assim', 'tipo', 'aí', 'ai', 'também', 'ok', 'certo', 'pronto', 'entendeu']);
const ENCHIMENTO_INICIO = new Set(['então', 'aí', 'ai', 'tipo', 'assim', 'ah', 'hum', 'é']);
const tiraPontuacao = w => w.replace(/^[.!?…]+|[.!?…]+$/g, '');

// Tira enchimento nas pontas e palavra repetida em seguida ("leite leites" -> "leite").
function limparFala(trecho) {
  let palavras = trecho.split(/\s+/).map(tiraPontuacao).filter(Boolean);
  while (palavras.length > 1 && ENCHIMENTO_FIM.has(palavras[palavras.length - 1].toLowerCase())) palavras.pop();
  while (palavras.length > 1 && ENCHIMENTO_INICIO.has(palavras[0].toLowerCase())) palavras.shift();
  const saida = [];
  for (const w of palavras) {
    const ant = saida[saida.length - 1];
    if (ant && _NomesV.chaveBase(ant) === _NomesV.chaveBase(w) && _NomesV.chaveBase(w)) continue;
    saida.push(w);
  }
  return saida.join(' ');
}

// "chá pro Manuel" -> nome "chá", detalhe "pro Manuel" (só quando depois de pro/pra/para vem um nome próprio com maiúscula
// e o trecho inteiro não é um nome conhecido, como "filtro de papel para café").
function tirarDetalhe(trecho, set) {
  if (set && set.has(_NomesV.canonico(trecho))) return { nome: trecho, detalhe: '' };
  const m = trecho.match(/^(.+?)\s+(pro|pra|para o|para a|para)\s+(\S+(?:\s+\S+)?)$/i);
  if (!m || !_NomesV.normalizar(m[1])) return { nome: trecho, detalhe: '' };
  const cauda = m[3].split(/\s+/);
  const maiuscula = w => /^[A-ZÀ-Ý]/.test(w);
  // com maiúscula (nome próprio) vale sempre; em minúscula só se nenhuma palavra for um produto que o app conhece
  const nome = cauda.every(maiuscula) || (set && cauda.every(w => !set.has(_NomesV.canonico(w)) && !CONECT_VOZ.has(_NomesV.normalizar(w))));
  if (!nome) return { nome: trecho, detalhe: '' };
  return { nome: m[1], detalhe: m[2] + ' ' + m[3] };
}

// "leite sem, quero dizer leite integral": o que vem depois do marcador corrige e o que veio antes é descartado.
const MARCADOR_CORRECAO = /(?:^|\s)(?:quero dizer|quer dizer|ou melhor|melhor dizendo|na verdade|aliás|corrigindo|digo)(?:[,:]|\s|$)\s*/i;
// "como é que é o nome?": a pessoa está tentando lembrar; não faz parte do item.
const HESITACAO = /como (?:é|e) que (?:é|e) (?:o )?(?:nome|mesmo)|como (?:é|e) que se chama|como (?:é|e) mesmo|qual (?:é|e) (?:o )?(?:nome|mesmo)|como se chama|(?:não|nao) lembro(?: o nome)?|esqueci o nome|sei lá/gi;
const DEMONSTRATIVOS = new Set(['aquele', 'aquela', 'aqueles', 'aquelas', 'aquilo', 'esse', 'essa', 'esses', 'essas', 'isso']);

// Se o texto COMEÇA com um marcador de correção, devolve {corrige: true, resto}.
function tirarCorrecao(texto) {
  const t = String(texto || '').trim();
  const m = t.match(MARCADOR_CORRECAO);
  if (m && m.index === 0 || (m && t.slice(0, m.index).trim() === '')) return { corrige: true, resto: t.slice(m.index + m[0].length).trim() };
  return { corrige: false, resto: t };
}

// Devolve [{nome, detalhe, refina}] (e .descricoes = quantos trechos descritivos foram descartados).
// refina: veio depois de uma descrição solta ("aquele pequenininho"): refina o item anterior.
function separarItensComDetalhe(texto, conhecidos) {
  const set = conhecidos ? new Set([...conhecidos].map(c => _NomesV.canonico(c)).filter(Boolean)) : null;
  const brutos = [];
  for (const p of String(texto || '').replace(HESITACAO, ',§,').split(/[,;\n]+|\s+e\s+/i)) {
    let t = p.trim();
    const m = t.match(MARCADOR_CORRECAO);
    if (m) {
      const antes = t.slice(0, m.index).trim();
      if (!antes) brutos.pop();            // o trecho anterior era um engano
      t = t.slice(m.index + m[0].length).trim(); // dentro do mesmo trecho: vale só o que vem depois
    }
    if (t) brutos.push(t === '§' ? '§' : t);
  }
  const vistos = new Set();
  const saida = [];
  Object.defineProperty(saida, 'descricoes', { value: 0, writable: true, enumerable: false });
  let aposDescricao = false;
  for (const p of brutos) {
    if (p === '§') { saida.descricoes++; aposDescricao = true; continue; } // hesitação: o próximo item refina o anterior
    const limpo = limparFala(limparTrecho(limparFala(p)));
    if (!_NomesV.normalizar(limpo)) continue;
    if (ENCHIMENTO_FIM.has(limpo.toLowerCase()) || ENCHIMENTO_INICIO.has(limpo.toLowerCase())) continue; // só enchimento ("né")
    if (DEMONSTRATIVOS.has(_NomesV.normalizar(limpo).split(' ')[0])) { saida.descricoes++; aposDescricao = true; continue; } // "aquele tomate pequenininho"
    const { nome, detalhe } = tirarDetalhe(limpo, set);
    const itens = segmentarConhecidos(nome, set);
    itens.forEach((item, k) => {
      const final = limparTrecho(item);
      const chave = _NomesV.chaveBase(final);
      if (!chave || chave === 'e' || vistos.has(chave)) return;
      vistos.add(chave);
      const it = { nome: final, detalhe: k === itens.length - 1 ? detalhe : '' };
      if (aposDescricao && k === 0) it.refina = true;
      saida.push(it);
    });
    aposDescricao = false;
  }
  return saida;
}

function separarItens(texto, conhecidos) {
  return separarItensComDetalhe(texto, conhecidos).map(x => x.nome);
}

if (typeof module !== 'undefined') module.exports = { separarItens, separarItensComDetalhe, tirarCorrecao };
else window.VozLista = { separarItens, separarItensComDetalhe, tirarCorrecao };
