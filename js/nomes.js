// Normalizar e sugerir nomes de produto (sem IA): "Leite", "leite " e "LEITE" são o mesmo.
const LIGACAO_NOME = new Set(['de', 'da', 'do', 'com', 'sem', 'e']);

function normalizarNome(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Forma comparável: sem acento e sem "de/da/do/para": "filtro de papel para café" = "filtro papel café".
const CONECTORES_CANON = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'pra']);
function canonicoNome(texto) {
  return normalizarNome(texto).split(' ').filter(w => w && !CONECTORES_CANON.has(w)).join(' ');
}

// Chave para achar repetidos: como o canônico, mas "leites" = "leite".
function chaveBaseNome(texto) {
  return canonicoNome(texto).split(' ').map(w => (w.length > 3 ? w.replace(/s$/, '') : w)).join(' ');
}

function palavrasNome(texto) {
  return new Set(normalizarNome(texto).split(' ').filter(w => w.length >= 3 && !LIGACAO_NOME.has(w)));
}

function sugerirProdutos(texto, produtos, max = 3) {
  const n = normalizarNome(texto);
  if (!n) return [];
  const lista = produtos || [];
  const c = canonicoNome(n);
  const igual = lista.find(p => p.chave === n || (p.apelidos || []).some(a => normalizarNome(a) === n))
    || (c ? lista.find(p => canonicoNome(p.chave) === c || (p.apelidos || []).some(a => canonicoNome(a) === c)) : null);
  if (igual) return [{ produto: igual, motivo: 'igual' }];
  const mias = palavrasNome(n);
  return lista
    .map(p => {
      const alvo = new Set([...palavrasNome(p.chave), ...(p.apelidos || []).flatMap(a => [...palavrasNome(a)])]);
      let c = 0;
      mias.forEach(w => { if (alvo.has(w)) c++; });
      return { produto: p, motivo: 'parecido', c };
    })
    .filter(x => x.c > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, max)
    .map(({ produto, motivo }) => ({ produto, motivo }));
}

if (typeof module !== 'undefined') module.exports = { normalizar: normalizarNome, canonico: canonicoNome, chaveBase: chaveBaseNome, palavras: palavrasNome, sugerirProdutos };
else window.Nomes = { normalizar: normalizarNome, canonico: canonicoNome, chaveBase: chaveBaseNome, palavras: palavrasNome, sugerirProdutos };
