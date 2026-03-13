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

test("initializePayment creates pending subscription payment and returns checkout details", async () => {
  const originalFetch = global.fetch;
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "test_secret";

  let createdPayload = null;
  let saveCalled = false;

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: true,
      data: {
        authorization_url: "https://paystack.test/checkout",
        access_code: "ACCESS_123",
      },
    }),
  });

  const paymentDoc = {
    _id: "507f1f77bcf86cd799439021",
    reference: "pay_test_ref",
    status: "pending",
    amount: 25000,
    currency: "NGN",
    metadata: {},
    async save() {
      saveCalled = true;
      return this;
    },
  };

  const controller = loadModuleWithMocks("../src/payments/payments.controller", {
    "../src/payments/payments.schema": {
      create: async (payload) => {
        createdPayload = payload;
        Object.assign(paymentDoc, payload);
        return paymentDoc;
      },
    },
    "../src/business/business.schema": {
      findByIdAndUpdate: async () => null,
    },
    "../src/subscription/subscription.schema": {
      findOneAndUpdate: async () => null,
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011", email: "owner@example.com" },
    body: {
      amount: 25000,
      email: "owner@example.com",
      purpose: "subscription_upgrade",
      planId: "growth",
      callbackUrl: "https://example.com/callback",
    },
  };
  const res = makeRes();

  try {
    await controller.initializePayment(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 201);
    assert.equal(createdPayload.provider, "paystack");
    assert.equal(createdPayload.status, "pending");
    assert.equal(createdPayload.metadata.purpose, "subscription_upgrade");
    assert.equal(createdPayload.metadata.planId, "growth");
    assert.equal(res.body.authorizationUrl, "https://paystack.test/checkout");
    assert.equal(res.body.accessCode, "ACCESS_123");
    assert.equal(saveCalled, true);
  } finally {
    global.fetch = originalFetch;
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
  }
});

test("verifyPayment marks successful paystack payment and activates subscription", async () => {
  const originalFetch = global.fetch;
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "test_secret";

  const businessUpdates = [];
  const subscriptionUpdates = [];
  let saveCount = 0;

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: true,
      data: {
        status: "success",
        paid_at: "2026-03-09T10:00:00.000Z",
      },
    }),
  });

  const paymentDoc = {
    businessId: "507f1f77bcf86cd799439011",
    provider: "paystack",
    reference: "pay_verify_ref",
    status: "pending",
    paidAt: null,
    metadata: { purpose: "subscription_upgrade", planId: "pro" },
    async save() {
      saveCount += 1;
      return this;
    },
  };

  const controller = loadModuleWithMocks("../src/payments/payments.controller", {
    "../src/payments/payments.schema": {
      findOne: async () => paymentDoc,
    },
    "../src/business/business.schema": {
      findByIdAndUpdate: async (...args) => {
        businessUpdates.push(args);
        return null;
      },
      findById: () => ({
        select: async () => ({ name: "Test Business", email: "" }),
      }),
    },
    "../src/subscription/subscription.schema": {
      findOneAndUpdate: async (...args) => {
        subscriptionUpdates.push(args);
        return null;
      },
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { reference: "pay_verify_ref" },
  };
  const res = makeRes();

  try {
    await controller.verifyPayment(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(paymentDoc.status, "success");
    assert.equal(saveCount, 1);
    assert.equal(businessUpdates.length, 1);
    assert.equal(subscriptionUpdates.length, 1);
    assert.equal(subscriptionUpdates[0][1].$set.plan, "pro");
    assert.equal(subscriptionUpdates[0][1].$set.status, "active");
  } finally {
    global.fetch = originalFetch;
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
  }
});

test("verifyPayment marks failed gateway payments as failed without activating subscription", async () => {
  const originalFetch = global.fetch;
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "test_secret";

  const businessUpdates = [];
  const subscriptionUpdates = [];
  let saveCount = 0;

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      status: true,
      data: {
        status: "failed",
      },
    }),
  });

  const paymentDoc = {
    businessId: "507f1f77bcf86cd799439011",
    provider: "paystack",
    reference: "pay_failed_ref",
    status: "pending",
    paidAt: null,
    metadata: { purpose: "subscription_upgrade", planId: "growth" },
    async save() {
      saveCount += 1;
      return this;
    },
  };

  const controller = loadModuleWithMocks("../src/payments/payments.controller", {
    "../src/payments/payments.schema": {
      findOne: async () => paymentDoc,
    },
    "../src/business/business.schema": {
      findByIdAndUpdate: async (...args) => {
        businessUpdates.push(args);
        return null;
      },
      findById: () => ({
        select: async () => ({ name: "Test Business", email: "" }),
      }),
    },
    "../src/subscription/subscription.schema": {
      findOneAndUpdate: async (...args) => {
        subscriptionUpdates.push(args);
        return null;
      },
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { reference: "pay_failed_ref" },
  };
  const res = makeRes();

  try {
    await controller.verifyPayment(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(paymentDoc.status, "failed");
    assert.equal(paymentDoc.paidAt, null);
    assert.equal(saveCount, 1);
    assert.equal(businessUpdates.length, 0);
    assert.equal(subscriptionUpdates.length, 0);
  } finally {
    global.fetch = originalFetch;
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
  }
});

test("handlePaystackWebhook rejects invalid signatures", async () => {
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "test_secret";

  const controller = loadModuleWithMocks("../src/payments/payments.controller", {
    "../src/payments/payments.schema": {
      findOne: async () => null,
    },
    "../src/business/business.schema": {
      findByIdAndUpdate: async () => null,
    },
    "../src/subscription/subscription.schema": {
      findOneAndUpdate: async () => null,
    },
  });

  const req = {
    headers: { "x-paystack-signature": "wrong_signature" },
    rawBody: JSON.stringify({ event: "charge.success" }),
    body: { event: "charge.success", data: { reference: "pay_ref" } },
  };
  const res = makeRes();

  try {
    await controller.handlePaystackWebhook(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /invalid webhook signature/i);
  } finally {
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
  }
});

test("handlePaystackWebhook marks matching payments successful on valid charge.success events", async () => {
  const crypto = require("crypto");
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "test_secret";

  const businessUpdates = [];
  const subscriptionUpdates = [];
  let saveCount = 0;

  const paymentDoc = {
    businessId: "507f1f77bcf86cd799439011",
    reference: "webhook_ref",
    status: "pending",
    paidAt: null,
    metadata: { purpose: "subscription_upgrade", planId: "growth" },
    async save() {
      saveCount += 1;
      return this;
    },
  };

  const controller = loadModuleWithMocks("../src/payments/payments.controller", {
    "../src/payments/payments.schema": {
      findOne: async ({ reference }) => (reference === "webhook_ref" ? paymentDoc : null),
    },
    "../src/business/business.schema": {
      findByIdAndUpdate: async (...args) => {
        businessUpdates.push(args);
        return null;
      },
      findById: () => ({
        select: async () => ({ name: "Test Business", email: "" }),
      }),
    },
    "../src/subscription/subscription.schema": {
      findOneAndUpdate: async (...args) => {
        subscriptionUpdates.push(args);
        return null;
      },
    },
  });

  const body = { event: "charge.success", data: { reference: "webhook_ref" } };
  const rawBody = JSON.stringify(body);
  const signature = crypto.createHmac("sha512", "test_secret").update(rawBody).digest("hex");
  const req = {
    headers: { "x-paystack-signature": signature },
    rawBody,
    body,
  };
  const res = makeRes();

  try {
    await controller.handlePaystackWebhook(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { received: true });
    assert.equal(paymentDoc.status, "success");
    assert.equal(saveCount, 1);
    assert.equal(businessUpdates.length, 1);
    assert.equal(subscriptionUpdates.length, 1);
  } finally {
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
  }
});

test("updateSubscription rejects invalid plans", async () => {
  const controller = loadModuleWithMocks("../src/subscription/subscription.controller", {
    "../src/business/business.schema": {
      findByIdAndUpdate: async () => null,
      findById: async () => null,
    },
    "../src/subscription/subscription.schema": {
      findOneAndUpdate: async () => null,
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { plan: "enterprise", status: "active" },
  };
  const res = makeRes();

  await controller.updateSubscription(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /invalid plan/i);
});

test("updateSubscription persists valid subscription changes", async () => {
  const businessUpdates = [];
  const subscriptionUpdates = [];

  const updatedBusiness = {
    _id: "507f1f77bcf86cd799439011",
    subscription: {
      plan: "free",
      status: "cancelled",
      renewalDate: null,
      trialEndsAt: null,
    },
  };

  const controller = loadModuleWithMocks("../src/subscription/subscription.controller", {
    "../src/business/business.schema": {
      findByIdAndUpdate: async (...args) => {
        businessUpdates.push(args);
        return null;
      },
      findById: () => ({
        select: async () => updatedBusiness,
      }),
    },
    "../src/subscription/subscription.schema": {
      findOneAndUpdate: async (...args) => {
        subscriptionUpdates.push(args);
        return null;
      },
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: {
      plan: "free",
      status: "cancelled",
      renewalDate: null,
      trialEndsAt: null,
    },
  };
  const res = makeRes();

  await controller.updateSubscription(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(businessUpdates.length, 1);
  assert.equal(subscriptionUpdates.length, 1);
  assert.equal(subscriptionUpdates[0][1].$set.status, "cancelled");
  assert.equal(res.body, updatedBusiness);
});
