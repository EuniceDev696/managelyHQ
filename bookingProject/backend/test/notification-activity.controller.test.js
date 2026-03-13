const test = require("node:test");
const assert = require("node:assert/strict");

const makeRes = () => {
  const res = {
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
  };

  return res;
};

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

test("listNotificationActivity returns scoped email activity with sent and failed counts", async () => {
  const queries = [];
  const controller = loadModuleWithMocks("../src/business/business.controller", {
    "../src/business/business.schema": {},
    "../src/services/services.schema": {},
    "../src/staff/staff.schema": {},
    "../src/bookings/bookings.schema": {},
    "../src/customers/customers.schema": {},
    "../src/payments/payments.schema": {},
    "../src/expenses/expenses.schema": {},
    "../src/branches/branches.schema": {},
    "../src/subscription/subscription.schema": {},
    "../src/uploads/cloudinary.service": { deleteImage: async () => {} },
    "../src/auth/staff-password.service": { verifyStaffPassword: async () => ({ valid: false }) },
    "../src/utils/audit-log": { auditLog: () => {} },
    "../src/email/email-client": { sendOwnerWelcomeEmail: async () => {}, sendVerificationEmail: async () => ({ ok: true }) },
    "../src/auth/email-verification.service": {
      createEmailVerification: () => ({ token: "token", tokenHash: "hash", expiresAt: new Date() }),
      hashEmailVerificationToken: () => "hash",
      buildVerificationLink: () => "https://example.com/verify",
    },
    "../src/branches/branch-access.service": {
      getScopedBranchFilter: async () => ({ ok: true, filter: { branchId: "507f1f77bcf86cd799439055" } }),
    },
    "../src/audit/audit.schema": {
      find: (query) => {
        queries.push(query);
        return {
          sort: () => ({
            limit: async () => [
              {
                _id: "507f1f77bcf86cd799439099",
                event: "notifications.email_failed",
                branchId: "507f1f77bcf86cd799439055",
                email: "ada@example.com",
                purpose: "booking_reminder",
                reason: "smtp_failed",
              },
            ],
          }),
        };
      },
      countDocuments: async (query) => {
        queries.push(query);
        return query.event === "notifications.email_sent" ? 3 : 1;
      },
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011", role: "manager", branchId: "507f1f77bcf86cd799439055" },
    query: { limit: "6" },
  };
  const res = makeRes();

  await controller.listNotificationActivity(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.items.length, 1);
  assert.deepEqual(res.body.summary, { sent: 3, failed: 1 });
  assert.equal(String(queries[0].branchId), "507f1f77bcf86cd799439055");
});
