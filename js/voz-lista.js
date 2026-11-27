// Separa uma nota falada ou digitada em itens de compra (regras locais, sem IA).
const _NomesV = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;

// mais longos primeiro, para "acabou o" vencer "acabou"
const PREFIXOS = ['preciso comprar', 'preciso de', 'colocar na lista', 'acabou o', 'acabou a', 'acabou',
  'adicionar', 'comprar', 'faltou', 'falta', 'anotar', 'anota'];
const ARTIGOS = ['o', 'a', 'os', 'as', 'um', 'uma'];

function limparTrecho(t) {
  let s = t.trim();
  for (let mudou = true; mudou;) {
    mudou = false;
    const baixo = s.toLowerCase();
    for (const p of PREFIXOS) {
      if (baixo === p || baixo.startsWith(p + ' ')) { s = s.slice(p.length).trim(); mudou = true; break; }
    }
    if (mudou) continue;
    for (const a of ARTIGOS) {
      if (baixo.startsWith(a + ' ')) { s = s.slice(a.length + 1).trim(); mudou = true; break; }
    }
  }
  return s;
}

function separarItens(texto) {
  const partes = String(texto || '').split(/[,;\n]+|\s+e\s+/i);
  const vistos = new Set();
  const saida = [];
  for (const p of partes) {
    const item = limparTrecho(p);
    const chave = _NomesV.normalizar(item);
    if (!chave || chave === 'e' || vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(item);
  }
  return saida;
}

if (typeof module !== 'undefined') module.exports = { separarItens };
else window.VozLista = { separarItens };
