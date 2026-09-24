import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const file of ['work/app.js', 'work/planos.js']) {
  test(`${file} configures the required Card Payment Brick ready callback`, async () => {
    const source = await readFile(file, 'utf8');
    const cardConfig = source.match(/create\('cardPayment',[\s\S]*?\}\);/);

    assert.ok(cardConfig, 'Card Payment Brick configuration was not found');
    assert.match(cardConfig[0], /onReady\s*:/);
  });
}
