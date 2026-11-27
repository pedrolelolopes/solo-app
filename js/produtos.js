// Produtos no banco: achar, criar sem duplicar, marcar essencial/urgência e guardar apelidos.
// No navegador: window.SoloProdutos.createProdutos({ db }).
const _NomesP = typeof require !== 'undefined' ? require('./nomes.js') : window.Nomes;

function createProdutos({ db }) {
  let memoria = [];
  const lista = () => memoria.map(p => ({ ...p }));

  async function carregar() {
    const r = await db.dbGet('produtos', 'select=*&order=nome.asc');
    memoria = Array.isArray(r) ? r : [];
    return lista();
  }
  function achar(nome) {
    const r = _NomesP.sugerirProdutos(nome, memoria, 1);
    return r.length && r[0].motivo === 'igual' ? r[0].produto : null;
  }
  async function garantir(nome) {
    const limpo = String(nome || '').trim();
    if (!limpo) return null;
    const existente = achar(limpo);
    if (existente) return existente;
    const novoNome = (limpo.charAt(0).toUpperCase() + limpo.slice(1)).slice(0, 80);
    const criado = await db.dbPost('produtos', { nome: novoNome, chave: _NomesP.normalizar(limpo) });
    if (criado && criado.id) { memoria.push(criado); return criado; }
    await carregar(); // pode ter sido chave repetida
    return achar(limpo);
  }
  async function marcar(id, campos) {
    const r = await db.dbPatch('produtos', id, campos);
    if (!r) return null;
    const i = memoria.findIndex(p => p.id === id);
    if (i >= 0) memoria[i] = { ...memoria[i], ...campos };
    return i >= 0 ? memoria[i] : r;
  }
  async function adicionarApelido(id, apelido) {
    const p = memoria.find(x => x.id === id);
    const ap = _NomesP.normalizar(apelido);
    if (!p || !ap) return null;
    if (ap === p.chave || (p.apelidos || []).includes(ap)) return p;
    return marcar(id, { apelidos: [...(p.apelidos || []), ap] });
  }
  return { carregar, lista, achar, garantir, marcar, adicionarApelido };
}

if (typeof module !== 'undefined') module.exports = { createProdutos };
else window.SoloProdutos = { createProdutos };
