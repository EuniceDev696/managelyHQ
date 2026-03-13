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

test("resendBookingNotification resends confirmation emails and audits the retry", async () => {
  const auditEvents = [];
  const controller = loadModuleWithMocks("../src/bookings/bookings.controller", {
    "../src/bookings/bookings.schema": {
      findOne: async () => ({
        _id: "507f1f77bcf86cd799439099",
        businessId: "507f1f77bcf86cd799439011",
        branchId: "507f1f77bcf86cd799439055",
        customer: "Ada",
        email: "ada@example.com",
        service: "Facial",
        date: "2026-03-12",
        time: "10:00",
      }),
      find: () => ({ sort: async () => [] }),
    },
    "../src/customers/customers.schema": { findOne: async () => null },
    "../src/payments/payments.schema": { findOne: async () => null, create: async () => ({}) },
    "../src/services/services.schema": { findOne: async () => null },
    "../src/staff/staff.schema": { findOne: async () => null },
    "../src/business/business.schema": {
      findById: () => ({ select: async () => ({ name: "Demo Spa", notificationSettings: {} }) }),
    },
    "../src/branches/branches.schema": {
      findOne: () => ({ select: async () => ({ name: "Main", address: "12 Test St" }) }),
    },
    "../src/branches/branch-access.service": {
      resolveBranchId: async () => ({ ok: true, branchId: null }),
      getScopedBranchFilter: async () => ({ ok: true, filter: {} }),
    },
    "../src/utils/audit-log": { auditLog: (...args) => auditEvents.push(args) },
    "../src/email/email-client": {
      sendBookingConfirmationEmail: async () => ({ ok: true }),
      sendOwnerNewBookingAlertEmail: async () => ({ ok: true }),
      sendStaffAssignedEmail: async () => ({ ok: true }),
      sendBookingReminderEmail: async () => ({ ok: true }),
      sendBookingCancelledEmail: async () => ({ ok: true }),
      sendBookingRescheduledEmail: async () => ({ ok: true }),
      sendPaymentReceiptEmail: async () => ({ ok: true }),
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011", role: "owner" },
    params: { bookingId: "507f1f77bcf86cd799439099" },
    body: { purpose: "booking_confirmation" },
  };
  const res = makeRes();

  await controller.resendBookingNotification(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(auditEvents[0]?.[0], "notifications.email_sent");
  assert.equal(auditEvents[0]?.[1]?.purpose, "booking_confirmation");
});
