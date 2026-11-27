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
const MAX_PALAVRAS_NOME = 5;

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
      if (conhecidos.has(norm.slice(i, i + n).join(' '))) { achou = n; break; }
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

function separarItens(texto, conhecidos) {
  const set = conhecidos ? new Set([...conhecidos].map(c => _NomesV.normalizar(c)).filter(Boolean)) : null;
  const partes = String(texto || '').split(/[,;\n]+|\s+e\s+/i);
  const vistos = new Set();
  const saida = [];
  for (const p of partes) {
    const limpo = limparTrecho(p);
    if (!_NomesV.normalizar(limpo)) continue;
    for (const item of segmentarConhecidos(limpo, set)) {
      const chave = _NomesV.normalizar(limparTrecho(item));
      const final = limparTrecho(item);
      if (!chave || chave === 'e' || vistos.has(chave)) continue;
      vistos.add(chave);
      saida.push(final);
    }
  }
  return saida;
}

if (typeof module !== 'undefined') module.exports = { separarItens };
else window.VozLista = { separarItens };
