import test from 'node:test';
import assert from 'node:assert/strict';

import { cardPaymentCustomization } from '../work/card-payment-style.js';

test('Card Payment Brick uses the Val Coworking visual theme', () => {
  const { visual } = cardPaymentCustomization;
  assert.equal(visual.style.theme, 'dark');
  assert.equal(visual.style.customVariables.formBackgroundColor, '#003833');
  assert.equal(visual.style.customVariables.baseColor, '#d9a64b');
  assert.equal(visual.style.customVariables.buttonTextColor, '#001e1b');
  assert.equal(visual.texts.formTitle, 'Pagamento com cartão');
  assert.equal(visual.texts.formSubmit, 'Pagar com cartão');
});
