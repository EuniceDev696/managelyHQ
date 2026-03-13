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

test("createPublicBooking skips confirmation email when business default disables confirmations", async () => {
  let confirmationCalls = 0;
  let auditEvents = [];
  const CustomerMock = function Customer(doc) {
    return { ...doc, _id: "507f1f77bcf86cd799439088", save: async () => {} };
  };
  CustomerMock.findOne = async () => null;
  const controller = loadModuleWithMocks("../src/public/public.controller", {
    "../src/business/business.schema": {
      findOne: ({ slug }) => ({
        select: async () =>
          slug
            ? {
                _id: "507f1f77bcf86cd799439011",
                name: "Demo Spa",
                defaultDuration: 30,
                notificationSettings: { customerConfirmation: false },
              }
            : null,
      }),
      findById: () => ({ select: async () => ({ notificationSettings: { customerConfirmation: false } }) }),
    },
    "../src/services/services.schema": { findOne: async () => null },
    "../src/staff/staff.schema": { findOne: async () => null },
    "../src/bookings/bookings.schema": {
      findOne: async () => null,
      create: async (payload) => ({
        ...payload,
        _id: "507f1f77bcf86cd799439099",
        save: async () => {},
      }),
    },
    "../src/customers/customers.schema": CustomerMock,
    "../src/branches/branches.schema": { findOne: async () => null },
    "../src/email/email-client": { sendBookingConfirmationEmail: async () => { confirmationCalls += 1; return { ok: true }; } },
    "../src/branches/branch-access.service": { resolveBranchId: async () => ({ ok: true, branchId: null }) },
    "../src/utils/audit-log": { auditLog: (...args) => auditEvents.push(args) },
  });

  const req = {
    params: { slug: "demo-spa" },
    body: { customer: "Ada", email: "ada@example.com", phone: "08012345678", date: "2026-03-12", time: "10:00" },
  };
  const res = makeRes();

  await controller.createPublicBooking(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 201);
  assert.equal(confirmationCalls, 0);
  assert.equal(auditEvents.length, 0);
});

test("createPublicBooking sends confirmation email when branch override enables it", async () => {
  let confirmationCalls = 0;
  let auditEvents = [];
  const CustomerMock = function Customer(doc) {
    return { ...doc, _id: "507f1f77bcf86cd799439088", save: async () => {} };
  };
  CustomerMock.findOne = async () => null;
  const controller = loadModuleWithMocks("../src/public/public.controller", {
    "../src/business/business.schema": {
      findOne: ({ slug }) => ({
        select: async () =>
          slug
            ? {
                _id: "507f1f77bcf86cd799439011",
                name: "Demo Spa",
                defaultDuration: 30,
                notificationSettings: { customerConfirmation: false },
              }
            : null,
      }),
      findById: () => ({ select: async () => ({ notificationSettings: { customerConfirmation: false } }) }),
    },
    "../src/services/services.schema": { findOne: async () => null },
    "../src/staff/staff.schema": { findOne: async () => null },
    "../src/bookings/bookings.schema": {
      findOne: async () => null,
      create: async (payload) => ({
        ...payload,
        _id: "507f1f77bcf86cd799439099",
        save: async () => {},
      }),
    },
    "../src/customers/customers.schema": CustomerMock,
    "../src/branches/branches.schema": {
      findOne: ({ _id }) => ({
        select: async () =>
          _id ? { _id, name: "Ikoyi", address: "12 Test St", notificationSettings: { customerConfirmation: true } } : null,
      }),
    },
    "../src/email/email-client": { sendBookingConfirmationEmail: async () => { confirmationCalls += 1; return { ok: true }; } },
    "../src/branches/branch-access.service": { resolveBranchId: async () => ({ ok: true, branchId: "507f1f77bcf86cd799439055" }) },
    "../src/utils/audit-log": { auditLog: (...args) => auditEvents.push(args) },
  });

  const req = {
    params: { slug: "demo-spa" },
    body: { customer: "Ada", email: "ada@example.com", phone: "08012345678", branchId: "507f1f77bcf86cd799439055", date: "2026-03-12", time: "10:00" },
  };
  const res = makeRes();

  await controller.createPublicBooking(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 201);
  assert.equal(confirmationCalls, 1);
  assert.equal(auditEvents[0]?.[0], "notifications.email_sent");
});

test("sendBookingReminders reports failed emails", async () => {
  const auditEvents = [];
  const controller = loadModuleWithMocks("../src/bookings/bookings.controller", {
    "../src/business/business.schema": {
      findById: () => ({ select: async () => ({ name: "Demo Spa", notificationSettings: { customerReminder: true } }) }),
    },
    "../src/branches/branches.schema": {
      findOne: ({ _id }) => ({
        select: async () =>
          _id
            ? {
                _id,
                name: "Main",
                address: "12 Test St",
                notificationSettings: { customerReminder: true },
              }
            : null,
      }),
    },
    "../src/bookings/bookings.schema": {
      find: () => ({
        sort: async () => [
          {
            _id: "507f1f77bcf86cd799439099",
            businessId: "507f1f77bcf86cd799439011",
            branchId: "507f1f77bcf86cd799439055",
            customer: "Ada",
            email: "ada@example.com",
            phone: "08012345678",
            service: "Facial",
            date: "2026-03-12",
            time: "10:00",
          },
        ],
      }),
    },
    "../src/customers/customers.schema": { findOne: async () => null },
    "../src/payments/payments.schema": { findOne: async () => null, create: async () => ({}) },
    "../src/services/services.schema": { findOne: async () => null },
    "../src/staff/staff.schema": { findOne: async () => null },
    "../src/branches/branch-access.service": {
      resolveBranchId: async () => ({ ok: true, branchId: null }),
      getScopedBranchFilter: async () => ({ ok: true, filter: {} }),
    },
    "../src/email/email-client": {
      sendOwnerNewBookingAlertEmail: async () => ({ ok: true }),
      sendStaffAssignedEmail: async () => ({ ok: true }),
      sendBookingReminderEmail: async () => ({ ok: false, error: "smtp_failed" }),
      sendBookingCancelledEmail: async () => ({ ok: true }),
      sendBookingRescheduledEmail: async () => ({ ok: true }),
      sendPaymentReceiptEmail: async () => ({ ok: true }),
    },
    "../src/utils/audit-log": { auditLog: (...args) => auditEvents.push(args) },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { date: "2026-03-12" },
  };
  const res = makeRes();

  await controller.sendBookingReminders(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sent, 0);
  assert.equal(res.body.failed, 1);
  assert.equal(auditEvents[0]?.[0], "notifications.email_failed");
});
