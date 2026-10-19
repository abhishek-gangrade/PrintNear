import test from 'node:test';
import assert from 'node:assert/strict';

test('Real-Time OTP Verification & Lifecycle', async (t) => {
  await t.test('generates valid 6-digit numeric OTP code', () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    assert.strictEqual(code.length, 6);
    assert.strictEqual(/^\d{6}$/.test(code), true);
  });

  await t.test('verifies matching OTP code within expiration window', () => {
    const record = {
      otp: '654321',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    };

    const isOtpValid = (submitted, rec) => {
      if (!rec || !submitted) return false;
      if (rec.expiresAt < new Date()) return false;
      return submitted === rec.otp;
    };

    assert.strictEqual(isOtpValid('654321', record), true);
    assert.strictEqual(isOtpValid('111111', record), false, 'Wrong code must fail');
    assert.strictEqual(isOtpValid('', record), false, 'Empty code must fail');
  });

  await t.test('rejects expired OTP code', () => {
    const expiredRecord = {
      otp: '654321',
      expiresAt: new Date(Date.now() - 1000) // 1 second in the past
    };

    const isOtpValid = (submitted, rec) => {
      if (!rec || !submitted) return false;
      if (rec.expiresAt < new Date()) return false;
      return submitted === rec.otp;
    };

    assert.strictEqual(isOtpValid('654321', expiredRecord), false);
  });
});

