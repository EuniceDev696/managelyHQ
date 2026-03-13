const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const loadRouterWithMocks = (routeModulePath, mocks) => {
  const routePath = require.resolve(routeModulePath);
  delete require.cache[routePath];

  Object.entries(mocks).forEach(([modulePath, exports]) => {
    const resolved = require.resolve(modulePath);
    require.cache[resolved] = {
      id: resolved,
      filename: resolved,
      loaded: true,
      exports,
    };
  });

  return require(routeModulePath);
};

const createApp = (router) => {
  const app = express();
  app.use(express.json());
  app.use(router);
  const server = app.listen(0);
  const { port } = server.address();
  return {
    server,
    url: `http://127.0.0.1:${port}`,
  };
};

const testAuthMiddleware = (req, res, next) => {
  req.auth = {
    sub: "507f1f77bcf86cd799439011",
    role: req.headers["x-test-role"] || "staff",
    email: "test@example.com",
    staffId: "507f1f77bcf86cd799439012",
  };
  next();
};

const passthroughValidate = () => (req, res, next) => next();

test("staff routes allow owner/admin/manager and block ordinary staff", async () => {
  const router = loadRouterWithMocks("../src/staff/staff.routes", {
    "../src/staff/staff.controller": {
      listStaff: (req, res) => res.status(200).json({ ok: true }),
      createStaff: (req, res) => res.status(201).json({ ok: true }),
      updateStaff: (req, res) => res.status(200).json({ ok: true }),
      deleteStaff: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    for (const role of ["owner", "admin", "manager"]) {
      const response = await fetch(`${url}/staff`, { headers: { "x-test-role": role } });
      assert.equal(response.status, 200);
    }

    const ownerCreate = await fetch(`${url}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "owner" },
      body: JSON.stringify({ name: "Manager Jane" }),
    });
    assert.equal(ownerCreate.status, 201);

    const adminCreate = await fetch(`${url}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "admin" },
      body: JSON.stringify({ name: "Manager Jane" }),
    });
    assert.equal(adminCreate.status, 201);

    const managerCreate = await fetch(`${url}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "manager" },
      body: JSON.stringify({ name: "Manager Jane" }),
    });
    assert.equal(managerCreate.status, 403);

    const blocked = await fetch(`${url}/staff`, { headers: { "x-test-role": "staff" } });
    assert.equal(blocked.status, 403);
  } finally {
    server.close();
  }
});

test("services write routes allow owner/admin and block manager", async () => {
  const router = loadRouterWithMocks("../src/services/services.routes", {
    "../src/services/services.controller": {
      listServices: (req, res) => res.status(200).json({ ok: true }),
      createService: (req, res) => res.status(201).json({ ok: true }),
      updateService: (req, res) => res.status(200).json({ ok: true }),
      deleteService: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    const ownerCreate = await fetch(`${url}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "owner" },
      body: JSON.stringify({ name: "Hair cut" }),
    });
    assert.equal(ownerCreate.status, 201);

    const adminCreate = await fetch(`${url}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "admin" },
      body: JSON.stringify({ name: "Hair cut" }),
    });
    assert.equal(adminCreate.status, 201);

    const managerCreate = await fetch(`${url}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "manager" },
      body: JSON.stringify({ name: "Hair cut" }),
    });
    assert.equal(managerCreate.status, 403);
  } finally {
    server.close();
  }
});

test("expenses mutations allow owner/admin while listing stays authenticated", async () => {
  const router = loadRouterWithMocks("../src/expenses/expenses.routes", {
    "../src/expenses/expenses.controller": {
      listExpenses: (req, res) => res.status(200).json({ ok: true }),
      createExpense: (req, res) => res.status(201).json({ ok: true }),
      deleteExpense: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    const staffList = await fetch(`${url}/expenses`, { headers: { "x-test-role": "staff" } });
    assert.equal(staffList.status, 200);

    const ownerCreate = await fetch(`${url}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "owner" },
      body: JSON.stringify({ title: "Fuel", amount: 1200 }),
    });
    assert.equal(ownerCreate.status, 201);

    const adminCreate = await fetch(`${url}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "admin" },
      body: JSON.stringify({ title: "Fuel", amount: 1200 }),
    });
    assert.equal(adminCreate.status, 201);

    const managerCreate = await fetch(`${url}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "manager" },
      body: JSON.stringify({ title: "Fuel", amount: 1200 }),
    });
    assert.equal(managerCreate.status, 403);

    const staffDelete = await fetch(`${url}/expenses/507f1f77bcf86cd799439099`, {
      method: "DELETE",
      headers: { "x-test-role": "staff" },
    });
    assert.equal(staffDelete.status, 403);
  } finally {
    server.close();
  }
});

test("payment billing routes allow owner/admin for finance access and block manager/staff", async () => {
  const router = loadRouterWithMocks("../src/payments/payments.routes", {
    "../src/payments/payments.controller": {
      listPayments: (req, res) => res.status(200).json({ ok: true }),
      initializePayment: (req, res) => res.status(201).json({ ok: true }),
      recordManualPayment: (req, res) => res.status(201).json({ ok: true }),
      verifyPayment: (req, res) => res.status(200).json({ ok: true }),
      updatePaymentStatus: (req, res) => res.status(200).json({ ok: true }),
      handlePaystackWebhook: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    const ownerList = await fetch(`${url}/payments`, { headers: { "x-test-role": "owner" } });
    assert.equal(ownerList.status, 200);

    const adminList = await fetch(`${url}/payments`, { headers: { "x-test-role": "admin" } });
    assert.equal(adminList.status, 200);

    const adminManual = await fetch(`${url}/payments/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "admin" },
      body: JSON.stringify({ amount: 5000, method: "cash" }),
    });
    assert.equal(adminManual.status, 201);

    const ownerInitialize = await fetch(`${url}/payments/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "owner" },
      body: JSON.stringify({ plan: "growth" }),
    });
    assert.equal(ownerInitialize.status, 201);

    const managerInitialize = await fetch(`${url}/payments/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "manager" },
      body: JSON.stringify({ plan: "growth" }),
    });
    assert.equal(managerInitialize.status, 403);

    const managerList = await fetch(`${url}/payments`, { headers: { "x-test-role": "manager" } });
    assert.equal(managerList.status, 403);

    const staffManual = await fetch(`${url}/payments/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "staff" },
      body: JSON.stringify({ amount: 5000, method: "cash" }),
    });
    assert.equal(staffManual.status, 403);

    const staffVerify = await fetch(`${url}/payments/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "staff" },
      body: JSON.stringify({ reference: "ref_123" }),
    });
    assert.equal(staffVerify.status, 403);

    const webhook = await fetch(`${url}/payments/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "charge.success" }),
    });
    assert.equal(webhook.status, 200);
  } finally {
    server.close();
  }
});

test("subscription routes are owner-only", async () => {
  const router = loadRouterWithMocks("../src/subscription/subscription.routes", {
    "../src/subscription/subscription.controller": {
      getSubscription: (req, res) => res.status(200).json({ ok: true }),
      updateSubscription: (req, res) => res.status(200).json({ ok: true }),
      sendExpiryWarning: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    const ownerGet = await fetch(`${url}/subscription`, { headers: { "x-test-role": "owner" } });
    assert.equal(ownerGet.status, 200);

    const adminGet = await fetch(`${url}/subscription`, { headers: { "x-test-role": "admin" } });
    assert.equal(adminGet.status, 403);

    const ownerUpdate = await fetch(`${url}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-test-role": "owner" },
      body: JSON.stringify({ plan: "free" }),
    });
    assert.equal(ownerUpdate.status, 200);

    const managerUpdate = await fetch(`${url}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-test-role": "manager" },
      body: JSON.stringify({ plan: "free" }),
    });
    assert.equal(managerUpdate.status, 403);
  } finally {
    server.close();
  }
});

test("branch routes are owner-only", async () => {
  const router = loadRouterWithMocks("../src/branches/branches.routes", {
    "../src/branches/branches.controller": {
      listBranches: (req, res) => res.status(200).json({ ok: true }),
      listBranchActivity: (req, res) => res.status(200).json({ ok: true }),
      createBranch: (req, res) => res.status(201).json({ ok: true }),
      reassignBranch: (req, res) => res.status(200).json({ ok: true }),
      updateBranch: (req, res) => res.status(200).json({ ok: true }),
      deleteBranch: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    const ownerList = await fetch(`${url}/branches`, { headers: { "x-test-role": "owner" } });
    assert.equal(ownerList.status, 200);

    const ownerCreate = await fetch(`${url}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "owner" },
      body: JSON.stringify({ name: "Main branch" }),
    });
    assert.equal(ownerCreate.status, 201);

    const ownerActivity = await fetch(`${url}/branches/activity`, {
      headers: { "x-test-role": "owner" },
    });
    assert.equal(ownerActivity.status, 200);

    const adminCreate = await fetch(`${url}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "admin" },
      body: JSON.stringify({ name: "Main branch" }),
    });
    assert.equal(adminCreate.status, 403);

    const managerActivity = await fetch(`${url}/branches/activity`, {
      headers: { "x-test-role": "manager" },
    });
    assert.equal(managerActivity.status, 403);

    const ownerReassign = await fetch(`${url}/branches/507f1f77bcf86cd799439099/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "owner" },
      body: JSON.stringify({ targetBranchId: "507f1f77bcf86cd799439098" }),
    });
    assert.equal(ownerReassign.status, 200);

    const managerReassign = await fetch(`${url}/branches/507f1f77bcf86cd799439099/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "manager" },
      body: JSON.stringify({ targetBranchId: "507f1f77bcf86cd799439098" }),
    });
    assert.equal(managerReassign.status, 403);
  } finally {
    server.close();
  }
});

test("notification activity route allows owner/admin/manager and blocks staff", async () => {
  const router = loadRouterWithMocks("../src/business/business.routes", {
    "../src/business/business.controller": {
      register: (req, res) => res.status(201).json({ ok: true }),
      login: (req, res) => res.status(200).json({ ok: true }),
      getBusinessMe: (req, res) => res.status(200).json({ ok: true }),
      listNotificationActivity: (req, res) => res.status(200).json({ ok: true }),
      updateBusinessMe: (req, res) => res.status(200).json({ ok: true }),
      changePassword: (req, res) => res.status(200).json({ ok: true }),
      deleteBusinessMe: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    for (const role of ["owner", "admin", "manager"]) {
      const response = await fetch(`${url}/business/me/notifications/activity`, { headers: { "x-test-role": role } });
      assert.equal(response.status, 200);
    }

    const blocked = await fetch(`${url}/business/me/notifications/activity`, { headers: { "x-test-role": "staff" } });
    assert.equal(blocked.status, 403);
  } finally {
    server.close();
  }
});

test("booking notification resend route allows owner/admin/manager and blocks staff", async () => {
  const router = loadRouterWithMocks("../src/bookings/bookings.routes", {
    "../src/bookings/bookings.controller": {
      listBookings: (req, res) => res.status(200).json({ ok: true }),
      createBooking: (req, res) => res.status(201).json({ ok: true }),
      updateBooking: (req, res) => res.status(200).json({ ok: true }),
      updateBookingStatus: (req, res) => res.status(200).json({ ok: true }),
      sendBookingReminders: (req, res) => res.status(200).json({ ok: true }),
      resendBookingNotification: (req, res) => res.status(200).json({ ok: true }),
      deleteBooking: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    for (const role of ["owner", "admin", "manager"]) {
      const response = await fetch(`${url}/bookings/507f1f77bcf86cd799439099/notifications/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-test-role": role },
        body: JSON.stringify({ purpose: "booking_reminder" }),
      });
      assert.equal(response.status, 200);
    }

    const blocked = await fetch(`${url}/bookings/507f1f77bcf86cd799439099/notifications/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-role": "staff" },
      body: JSON.stringify({ purpose: "booking_reminder" }),
    });
    assert.equal(blocked.status, 403);
  } finally {
    server.close();
  }
});

test("customer notes update allows owner/admin/manager and blocks staff", async () => {
  const router = loadRouterWithMocks("../src/customers/customers.routes", {
    "../src/customers/customers.controller": {
      listCustomers: (req, res) => res.status(200).json({ ok: true }),
      getCustomerDetail: (req, res) => res.status(200).json({ ok: true }),
      updateCustomer: (req, res) => res.status(200).json({ ok: true }),
    },
    "../src/middleware/auth.middleware": testAuthMiddleware,
    "../src/middleware/validate.middleware": passthroughValidate,
  });

  const { server, url } = createApp(router);

  try {
    for (const role of ["owner", "admin", "manager"]) {
      const response = await fetch(`${url}/customers/507f1f77bcf86cd799439099`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-test-role": role },
        body: JSON.stringify({ notes: "VIP customer" }),
      });
      assert.equal(response.status, 200);
    }

    const blocked = await fetch(`${url}/customers/507f1f77bcf86cd799439099`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-test-role": "staff" },
      body: JSON.stringify({ notes: "VIP customer" }),
    });
    assert.equal(blocked.status, 403);
  } finally {
    server.close();
  }
});
