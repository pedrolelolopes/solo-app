const test = require('node:test');
const assert = require('node:assert');
const { createIa, validarArquivo, montarConteudo, MODELO_BARATO, LIMITE_PDF_BYTES } = require('../js/ia.js');

const R = (ok, corpo, status) => ({ ok, status: status || (ok ? 200 : 400), json: async () => corpo });

test('MODELO_BARATO e limite', () => {
  assert.strictEqual(MODELO_BARATO, 'claude-haiku-4-5-20251001');
  assert.strictEqual(LIMITE_PDF_BYTES, 2_900_000);
});
test('validarArquivo aceita jpeg', () => {
  assert.strictEqual(validarArquivo({ type: 'image/jpeg', size: 5_000_000 }), null);
});
test('validarArquivo recusa PDF acima do limite', () => {
  assert.strictEqual(validarArquivo({ type: 'application/pdf', size: 3_000_000 }), 'PDF grande demais (máx. 2,9 MB). Divida em partes.');
});
test('validarArquivo aceita PDF pequeno', () => {
  assert.strictEqual(validarArquivo({ type: 'application/pdf', size: 1000 }), null);
});
test('validarArquivo recusa texto', () => {
  assert.strictEqual(validarArquivo({ type: 'text/plain', size: 10 }), 'Tipo de arquivo não aceito.');
});
test('montarConteudo PDF usa document', () => {
  const c = montarConteudo('oi', 'QUJD', 'application/pdf');
  assert.deepStrictEqual(c, [
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' } },
    { type: 'text', text: 'oi' },
  ]);
});
test('montarConteudo imagem usa image/jpeg', () => {
  const c = montarConteudo('oi', 'QUJD', 'image/png');
  assert.deepStrictEqual(c[0], { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' } });
});
test('claudeArquivo devolve texto juntado', async () => {
  let enviado;
  const ia = createIa({ claudeFetch: async (b) => { enviado = b; return R(true, { content: [{ text: 'a' }, { text: 'b' }], stop_reason: 'end_turn' }); } });
  const r = await ia.claudeArquivo({ prompt: 'p', b64: 'x', mime: 'image/jpeg', model: MODELO_BARATO, maxTokens: 300 });
  assert.deepStrictEqual(r, { texto: 'ab', cortado: false });
  assert.strictEqual(enviado.model, MODELO_BARATO);
  assert.strictEqual(enviado.max_tokens, 300);
});
test('claudeArquivo marca cortado', async () => {
  const ia = createIa({ claudeFetch: async () => R(true, { content: [{ text: 'a' }], stop_reason: 'max_tokens' }) });
  assert.strictEqual((await ia.claudeArquivo({ prompt: 'p', b64: 'x', mime: 'image/jpeg' })).cortado, true);
});
test('claudeArquivo lança mensagem do servidor', async () => {
  const ia = createIa({ claudeFetch: async () => R(false, { error: { message: 'Modelo não permitido.' } }, 400) });
  await assert.rejects(ia.claudeArquivo({ prompt: 'p', b64: 'x', mime: 'image/jpeg' }), /Modelo não permitido\./);
});
