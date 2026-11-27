const test = require('node:test');
const assert = require('node:assert');
const { precoPorBase } = require('../js/unidades.js');

test('g vira preço por kg', () => assert.deepStrictEqual(precoPorBase(5, 500, 'g'), { valor: 10, base: 'kg' }));
test('kg fica por kg', () => assert.deepStrictEqual(precoPorBase(9, 1, 'kg'), { valor: 9, base: 'kg' }));
test('ml vira preço por L', () => assert.deepStrictEqual(precoPorBase(4, 500, 'ml'), { valor: 8, base: 'L' }));
test('L maiúsculo ou minúsculo', () => assert.deepStrictEqual(precoPorBase(6, 2, 'l'), { valor: 3, base: 'L' }));
test('un, pç, cx, pct viram un', () => assert.deepStrictEqual(precoPorBase(6, 3, 'pç'), { valor: 2, base: 'un' }));
test('quantidade zero devolve null', () => assert.strictEqual(precoPorBase(3, 0, 'g'), null));
test('unidade desconhecida devolve null', () => assert.strictEqual(precoPorBase(3, 2, 'xyz'), null));
