const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Um erro de sintaxe num <script> do index.html derruba o app inteiro (login não responde).
test('todos os <script> inline do index.html têm sintaxe válida', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const blocos = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(blocos.length >= 1);
  blocos.forEach((codigo, i) => {
    assert.doesNotThrow(() => new vm.Script(codigo, { filename: 'index.html#script' + i }), 'script inline ' + i);
  });
});

test('arquivos js/ têm sintaxe válida', () => {
  const dir = path.join(__dirname, '..', 'js');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(dir, f), 'utf8'), { filename: f }), f);
  }
});
