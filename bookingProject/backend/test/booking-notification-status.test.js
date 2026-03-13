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

test("listBookings attaches latest email notification status per booking", async () => {
  const controller = loadModuleWithMocks("../src/bookings/bookings.controller", {
    "../src/bookings/bookings.schema": {
      find: () => ({
        sort: async () => [
          {
            _id: "507f1f77bcf86cd799439099",
            customer: "Ada",
            date: "2026-03-12",
            time: "10:00",
            toObject() {
              return { _id: this._id, customer: this.customer, date: this.date, time: this.time };
            },
          },
        ],
      }),
    },
    "../src/audit/audit.schema": {
      find: () => ({
        sort: async () => [
          {
            bookingId: "507f1f77bcf86cd799439099",
            event: "notifications.email_failed",
            purpose: "booking_reminder",
            reason: "smtp_failed",
            createdAt: "2026-03-10T12:00:00.000Z",
          },
        ],
      }),
    },
    "../src/customers/customers.schema": { findOne: async () => null },
    "../src/payments/payments.schema": { findOne: async () => null, create: async () => ({}) },
    "../src/services/services.schema": { findOne: async () => null },
    "../src/staff/staff.schema": { findOne: async () => null },
    "../src/business/business.schema": { findById: () => ({ select: async () => ({ name: "Demo Spa" }) }) },
    "../src/branches/branches.schema": { findOne: () => ({ select: async () => null }) },
    "../src/branches/branch-access.service": {
      resolveBranchId: async () => ({ ok: true, branchId: null }),
      getScopedBranchFilter: async () => ({ ok: true, filter: {} }),
    },
    "../src/utils/audit-log": { auditLog: () => {} },
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
    query: {},
  };
  const res = makeRes();

  await controller.listBookings(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].notificationStatus.event, "notifications.email_failed");
  assert.equal(res.body[0].notificationStatus.reason, "smtp_failed");
});
