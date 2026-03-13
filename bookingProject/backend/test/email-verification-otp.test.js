const test = require("node:test");
const assert = require("node:assert/strict");

const makeRes = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const loadModuleWithMocks = (modulePath, mocks) => {
  const resolvedModulePath = require.resolve(modulePath);
  delete require.cache[resolvedModulePath];

  for (const [mockPath, exports] of Object.entries(mocks)) {
    const resolvedMockPath = require.resolve(mockPath);
    require.cache[resolvedMockPath] = {
      id: resolvedMockPath,
      filename: resolvedMockPath,
      loaded: true,
      exports,
    };
  }

  return require(modulePath);
};

test("verifyEmail accepts a valid owner OTP", async () => {
  const saved = { count: 0 };
  const auditEvents = [];
  const businessRecord = {
    _id: "507f1f77bcf86cd799439011",
    email: "owner@example.com",
    name: "Demo Spa",
    emailVerified: false,
    emailVerificationTokenHash: "token-hash",
    emailVerificationOtpHash: "otp-hash",
    emailVerificationExpiresAt: new Date("2026-03-10T12:00:00.000Z"),
    async save() {
      saved.count += 1;
    },
  };

  const controller = loadModuleWithMocks("../src/business/business.controller", {
    bcryptjs: { hash: async () => "hashed", compare: async () => true },
    jsonwebtoken: { sign: () => "token" },
    slugify: () => "demo-spa",
    "../src/business/business.schema": {
      findOne: async (query) => {
        if (query.email === "owner@example.com" && query.emailVerificationOtpHash === "otp-hash") {
          return businessRecord;
        }
        return null;
      },
      findById: async () => null,
      create: async () => null,
      deleteOne: async () => ({}),
    },
    "../src/services/services.schema": { find: async () => [], deleteMany: async () => ({}) },
    "../src/staff/staff.schema": { findOne: async () => null, deleteMany: async () => ({}) },
    "../src/bookings/bookings.schema": { deleteMany: async () => ({}) },
    "../src/customers/customers.schema": { deleteMany: async () => ({}) },
    "../src/payments/payments.schema": { deleteMany: async () => ({}) },
    "../src/expenses/expenses.schema": { deleteMany: async () => ({}) },
    "../src/branches/branches.schema": { deleteMany: async () => ({}) },
    "../src/subscription/subscription.schema": { deleteMany: async () => ({}) },
    "../src/audit/audit.schema": { find: async () => [], countDocuments: async () => 0 },
    "../src/uploads/cloudinary.service": { deleteImage: async () => ({}) },
    "../src/auth/staff-password.service": { verifyStaffPassword: async () => ({ valid: true, upgradedHash: "" }) },
    "../src/utils/audit-log": { auditLog: (...args) => auditEvents.push(args) },
    "../src/branches/branch-access.service": { getScopedBranchFilter: async () => ({ ok: true, filter: {} }) },
    "../src/email/email-client": {
      sendOwnerWelcomeEmail: async () => ({ ok: true }),
      sendVerificationEmail: async () => ({ ok: true }),
    },
    "../src/auth/email-verification.service": {
      createEmailVerification: () => ({ token: "token", otp: "123456", tokenHash: "token-hash", otpHash: "otp-hash", expiresAt: new Date("2026-03-10T12:00:00.000Z") }),
      hashEmailVerificationToken: () => "token-hash",
      hashEmailVerificationOtp: () => "otp-hash",
      buildVerificationLink: () => "http://example.com/verify",
    },
  });

  const req = { body: { email: "owner@example.com", otp: "123456" } };
  const res = makeRes();

  await controller.verifyEmail(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(businessRecord.emailVerified, true);
  assert.equal(businessRecord.emailVerificationOtpHash, "");
  assert.equal(saved.count, 1);
  assert.equal(auditEvents[0]?.[0], "auth.email_verified");
  assert.equal(auditEvents[0]?.[1]?.method, "otp");
});

test("resendVerificationEmail issues and emails a fresh OTP", async () => {
  const auditEvents = [];
  const sentPayloads = [];
  const businessRecord = {
    _id: "507f1f77bcf86cd799439011",
    name: "Demo Spa",
    email: "owner@example.com",
    emailVerified: false,
    emailVerificationTokenHash: "",
    emailVerificationOtpHash: "",
    emailVerificationExpiresAt: null,
    async save() {
      return this;
    },
  };

  const controller = loadModuleWithMocks("../src/business/business.controller", {
    bcryptjs: { hash: async () => "hashed", compare: async () => true },
    jsonwebtoken: { sign: () => "token" },
    slugify: () => "demo-spa",
    "../src/business/business.schema": {
      findOne: async ({ email }) => (email === "owner@example.com" ? businessRecord : null),
      findById: async () => null,
      create: async () => null,
      deleteOne: async () => ({}),
    },
    "../src/services/services.schema": { find: async () => [], deleteMany: async () => ({}) },
    "../src/staff/staff.schema": { findOne: async () => null, deleteMany: async () => ({}) },
    "../src/bookings/bookings.schema": { deleteMany: async () => ({}) },
    "../src/customers/customers.schema": { deleteMany: async () => ({}) },
    "../src/payments/payments.schema": { deleteMany: async () => ({}) },
    "../src/expenses/expenses.schema": { deleteMany: async () => ({}) },
    "../src/branches/branches.schema": { deleteMany: async () => ({}) },
    "../src/subscription/subscription.schema": { deleteMany: async () => ({}) },
    "../src/audit/audit.schema": { find: async () => [], countDocuments: async () => 0 },
    "../src/uploads/cloudinary.service": { deleteImage: async () => ({}) },
    "../src/auth/staff-password.service": { verifyStaffPassword: async () => ({ valid: true, upgradedHash: "" }) },
    "../src/utils/audit-log": { auditLog: (...args) => auditEvents.push(args) },
    "../src/branches/branch-access.service": { getScopedBranchFilter: async () => ({ ok: true, filter: {} }) },
    "../src/email/email-client": {
      sendOwnerWelcomeEmail: async () => ({ ok: true }),
      sendVerificationEmail: async (payload) => {
        sentPayloads.push(payload);
        return { ok: true };
      },
    },
    "../src/auth/email-verification.service": {
      createEmailVerification: () => ({
        token: "token-2",
        otp: "654321",
        tokenHash: "token-hash-2",
        otpHash: "otp-hash-2",
        expiresAt: new Date("2026-03-10T12:00:00.000Z"),
      }),
      hashEmailVerificationToken: () => "token-hash",
      hashEmailVerificationOtp: () => "otp-hash",
      buildVerificationLink: () => "http://example.com/verify?token=token-2&email=owner@example.com",
    },
  });

  const req = { body: { email: "owner@example.com" } };
  const res = makeRes();

  await controller.resendVerificationEmail(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(businessRecord.emailVerificationTokenHash, "token-hash-2");
  assert.equal(businessRecord.emailVerificationOtpHash, "otp-hash-2");
  assert.equal(sentPayloads.length, 1);
  assert.equal(sentPayloads[0]?.verificationOtp, "654321");
  assert.equal(auditEvents[0]?.[0], "auth.verification_resent");
});
