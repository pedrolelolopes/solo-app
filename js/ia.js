// Chamada de IA com imagem ou PDF (via /api/claude).
const MODELO_BARATO = 'claude-haiku-4-5-20251001';
const LIMITE_PDF_BYTES = 2_900_000; // base64 cabe nos 4 MB do servidor

function validarArquivo(file) {
  const tipo = (file && file.type) || '';
  if (tipo === 'application/pdf') {
    return file.size > LIMITE_PDF_BYTES ? 'PDF grande demais (máx. 2,9 MB). Divida em partes.' : null;
  }
  if (tipo.startsWith('image/')) return null;
  return 'Tipo de arquivo não aceito.';
}

function montarConteudo(prompt, b64, mime) {
  const bloco = mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
    : { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } };
  return [bloco, { type: 'text', text: prompt }];
}

function createIa({ claudeFetch }) {
  async function claudeArquivo({ prompt, b64, mime, model = MODELO_BARATO, maxTokens = 1500 }) {
    const r = await claudeFetch({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: montarConteudo(prompt, b64, mime) }],
    });
    const d = await r.json();
    if (!r.ok) throw new Error((d && d.error && d.error.message) || 'Erro HTTP ' + r.status);
    if (d.error) throw new Error(d.error.message);
    const texto = (d.content || []).map(b => b.text || '').join('');
    return { texto, cortado: d.stop_reason === 'max_tokens' };
  }
  return { claudeArquivo };
}

if (typeof module !== 'undefined') module.exports = { createIa, validarArquivo, montarConteudo, MODELO_BARATO, LIMITE_PDF_BYTES };
else window.SoloIa = { createIa, validarArquivo, montarConteudo, MODELO_BARATO, LIMITE_PDF_BYTES };
