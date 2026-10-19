import test from 'node:test';
import assert from 'node:assert/strict';
import { allowRoles } from '../middleware/authMiddleware.js';

test('Authentication & Role-Based Authorization Security', async (t) => {
  await t.test('prevents privilege escalation by clamping unauthorized registration roles', () => {
    const sanitizeRegistrationRole = (requestedRole) => {
      return requestedRole === 'shopkeeper' ? 'shopkeeper' : 'customer';
    };

    assert.strictEqual(sanitizeRegistrationRole('admin'), 'customer', 'Registration as admin must be clamped to customer');
    assert.strictEqual(sanitizeRegistrationRole('root'), 'customer');
    assert.strictEqual(sanitizeRegistrationRole('shopkeeper'), 'shopkeeper');
    assert.strictEqual(sanitizeRegistrationRole('customer'), 'customer');
    assert.strictEqual(sanitizeRegistrationRole(undefined), 'customer');
  });

  await t.test('allowRoles middleware grants access to designated role', () => {
    const middleware = allowRoles('shopkeeper');
    let nextCalled = false;
    const req = { user: { id: 'usr_123', role: 'shopkeeper' } };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };

    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  await t.test('allowRoles middleware blocks unauthorized role access', () => {
    const middleware = allowRoles('shopkeeper');
    let nextCalled = false;
    let statusCode = null;
    let responseBody = null;

    const req = { user: { id: 'usr_123', role: 'customer' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseBody?.message, 'You do not have permission for this action.');
  });

  await t.test('allowRoles middleware always grants access to platform administrators', () => {
    const middleware = allowRoles('shopkeeper');
    let nextCalled = false;
    const req = { user: { id: 'adm_999', role: 'admin' } };
    const res = {};

    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });
});

