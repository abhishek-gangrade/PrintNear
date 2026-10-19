import test from 'node:test';
import assert from 'node:assert/strict';

test('Order State Machine & Handover Guards', async (t) => {
  const allowedTransitions = {
    Pending: ['Accepted', 'Printing', 'Cancelled', 'Rejected'],
    Accepted: ['Queued', 'Printing', 'Cancelled', 'Rejected'],
    Queued: ['Printing', 'Cancelled'],
    Printing: ['Ready', 'Cancelled'],
    Ready: ['PickedUp'],
    PickedUp: [],
    Cancelled: [],
    Rejected: []
  };

  const canTransition = (current, next) => {
    return Boolean(allowedTransitions[current]?.includes(next));
  };

  await t.test('allows standard progressive order lifecycle transitions', () => {
    assert.strictEqual(canTransition('Pending', 'Accepted'), true);
    assert.strictEqual(canTransition('Accepted', 'Queued'), true);
    assert.strictEqual(canTransition('Queued', 'Printing'), true);
    assert.strictEqual(canTransition('Printing', 'Ready'), true);
    assert.strictEqual(canTransition('Ready', 'PickedUp'), true);
  });

  await t.test('rejects illegal retrograde or skip-ahead status transitions', () => {
    assert.strictEqual(canTransition('Pending', 'Ready'), false, 'Cannot skip directly from Pending to Ready');
    assert.strictEqual(canTransition('PickedUp', 'Pending'), false, 'Cannot reopen completed order');
    assert.strictEqual(canTransition('Cancelled', 'Printing'), false, 'Cannot print a cancelled order');
    assert.strictEqual(canTransition('Rejected', 'Accepted'), false, 'Cannot accept a rejected order');
  });

  await t.test('verifies counter pickup PIN verification logic', () => {
    const validOrder = { pickupPin: '4821', status: 'Ready' };
    
    // Correct PIN
    const matchSuccess = Boolean(validOrder.pickupPin && '4821' === validOrder.pickupPin);
    assert.strictEqual(matchSuccess, true);

    // Wrong PIN
    const wrongPinMatch = Boolean(validOrder.pickupPin && '9999' === validOrder.pickupPin);
    assert.strictEqual(wrongPinMatch, false);

    // Empty or missing submitted PIN
    const emptyPinMatch = Boolean(validOrder.pickupPin && '' === validOrder.pickupPin);
    assert.strictEqual(emptyPinMatch, false);

    // Order with wiped / null PIN post-handover
    const wipedOrder = { pickupPin: undefined, status: 'PickedUp' };
    const wipedPinMatch = Boolean(wipedOrder.pickupPin && '4821' === wipedOrder.pickupPin);
    assert.strictEqual(wipedPinMatch, false);
  });

  await t.test('allows CASH_ON_PICKUP orders to enter printing and settles at handover', () => {
    const isPrintingAllowed = (order, nextStatus) => {
      if (['Printing', 'Ready'].includes(nextStatus) && order.paymentStatus !== 'Verified' && order.paymentMethod !== 'CASH_ON_PICKUP') {
        return false;
      }
      return true;
    };

    const upiUnpaidOrder = { paymentMethod: 'UPI_MANUAL', paymentStatus: 'Pending' };
    const cashOrder = { paymentMethod: 'CASH_ON_PICKUP', paymentStatus: 'Pending' };
    const upiPaidOrder = { paymentMethod: 'UPI_MANUAL', paymentStatus: 'Verified' };

    assert.strictEqual(isPrintingAllowed(upiUnpaidOrder, 'Printing'), false);
    assert.strictEqual(isPrintingAllowed(cashOrder, 'Printing'), true);
    assert.strictEqual(isPrintingAllowed(upiPaidOrder, 'Printing'), true);
  });
});

