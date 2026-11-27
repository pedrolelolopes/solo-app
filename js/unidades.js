// Preço por unidade base (kg, L ou un), para comparar 500 g com 1 kg.
const FATORES = {
  g: [1000, 'kg'], kg: [1, 'kg'],
  ml: [1000, 'L'], l: [1, 'L'],
  un: [1, 'un'], 'pç': [1, 'un'], pc: [1, 'un'], cx: [1, 'un'], pct: [1, 'un'],
};
function precoPorBase(preco, qtd, un) {
  const f = FATORES[String(un || '').trim().toLowerCase()];
  if (!f || !(qtd > 0)) return null;
  return { valor: preco / (qtd / f[0]), base: f[1] };
}
if (typeof module !== 'undefined') module.exports = { precoPorBase }; else window.Unidades = { precoPorBase };
