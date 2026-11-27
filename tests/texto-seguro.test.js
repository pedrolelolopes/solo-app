const test = require('node:test');
const assert = require('node:assert');
const { escapar, mdSimples } = require('../js/texto-seguro.js');

test('escapar troca tags', () => assert.strictEqual(escapar('<img onerror=x>'), '&lt;img onerror=x&gt;'));
test('escapar troca aspas e &', () => assert.strictEqual(escapar(`a&"'`), 'a&amp;&quot;&#39;'));
test('escapar null vira vazio', () => assert.strictEqual(escapar(null), ''));
test('mdSimples converte título, negrito, lista e remove ---', () => {
  assert.strictEqual(
    mdSimples('### Título\n**Leite** R$ 5\n- item\n---'),
    '<strong>Título</strong><br><strong>Leite</strong> R$ 5<br>• item'
  );
});
test('mdSimples escapa antes de formatar', () => {
  assert.strictEqual(mdSimples('**<b>x</b>**'), '<strong>&lt;b&gt;x&lt;/b&gt;</strong>');
});
test('mdSimples com null vira vazio', () => assert.strictEqual(mdSimples(null), ''));
