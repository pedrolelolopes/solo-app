// Mostra texto da IA (ou digitado) sem deixar passar HTML: escapa primeiro, formata depois.
function escapar(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function mdSimples(s) {
  const linhas = escapar(s).split(/\r?\n/)
    .filter(l => !/^\s*-{3,}\s*$/.test(l))
    .map(l => {
      const t = l.match(/^\s*#{1,3}\s+(.*)$/);
      if (t) return `<strong>${t[1].replace(/\*\*/g, '')}</strong>`;
      return l.replace(/^\s*[-*]\s+/, '• ').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    });
  return linhas.join('<br>');
}
if (typeof module !== 'undefined') module.exports = { escapar, mdSimples };
else window.TextoSeguro = { escapar, mdSimples };
