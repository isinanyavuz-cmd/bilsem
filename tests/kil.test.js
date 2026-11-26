const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { Shapes: S } = require('../js/shapes.js');

const root = path.join(__dirname, '..');

test('her şeklin kil gölge resmi ve kırpma yolu var', () => {
  const defs = S.defs();
  for (const id of Object.keys(S.SHAPES)) {
    assert.ok(fs.existsSync(path.join(root, S.SHAPES[id].art)), id + ' resmi eksik (node tools/kil-sekiller.js)');
    assert.ok(defs.includes('id="bz-cp-' + id + '"'), id + ' kırpma yolu eksik');
    assert.ok(S.figSvg({ shape: id, color: 'red' }).includes(S.SHAPES[id].art));
  }
  assert.ok(fs.existsSync(path.join(root, 'assets/kil/sekil-hucre.webp')));
});

test('aynı görünen şekiller aynı çizilir (gölge simetri açısına göre döner)', () => {
  assert.strictEqual(S.figSvg({ shape: 'square', color: 'blue', rot: 90 }), S.figSvg({ shape: 'square', color: 'blue', rot: 0 }));
  assert.strictEqual(S.figSvg({ shape: 'circle', color: 'red', rot: 45 }), S.figSvg({ shape: 'circle', color: 'red' }));
  assert.notStrictEqual(S.figSvg({ shape: 'flag', color: 'red', rot: 90 }), S.figSvg({ shape: 'flag', color: 'red' }));
});

test('gölge siluetleri (mürekkep rengi) düz kalır', () => {
  assert.ok(!S.figSvg({ shape: 'star', color: 'ink' }).includes('sekil-star.webp'));
});
