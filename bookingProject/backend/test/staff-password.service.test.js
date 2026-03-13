const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hashStaffPassword,
  isBcryptHash,
  verifyStaffPassword,
} = require("../src/auth/staff-password.service");

test("hashStaffPassword returns a bcrypt hash", async () => {
  const hashed = await hashStaffPassword("temporary123");
  assert.equal(isBcryptHash(hashed), true);
  assert.notEqual(hashed, "temporary123");
});

test("verifyStaffPassword accepts valid bcrypt password", async () => {
  const hashed = await hashStaffPassword("secure-pass");
  const result = await verifyStaffPassword(hashed, "secure-pass");
  assert.equal(result.valid, true);
  assert.equal(result.upgradedHash, null);
});

test("verifyStaffPassword upgrades legacy plain-text password", async () => {
  const result = await verifyStaffPassword("legacy-pass", "legacy-pass");
  assert.equal(result.valid, true);
  assert.equal(isBcryptHash(result.upgradedHash), true);
});

test("verifyStaffPassword rejects wrong password", async () => {
  const hashed = await hashStaffPassword("correct-pass");
  const result = await verifyStaffPassword(hashed, "wrong-pass");
  assert.deepEqual(result, { valid: false, upgradedHash: null });
});
