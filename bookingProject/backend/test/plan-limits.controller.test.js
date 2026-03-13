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

test("createStaff blocks when free plan limit is reached", async () => {
  let createCalled = false;

  const controller = loadModuleWithMocks("../src/staff/staff.controller", {
    "../src/staff/staff.schema": {
      countDocuments: async () => 2,
      findOne: async () => null,
      create: async () => {
        createCalled = true;
        return {};
      },
    },
    "../src/bookings/bookings.schema": {},
    "../src/subscription/plan-limits.service": {
      getPlanLimit: async () => 2,
    },
    "../src/auth/staff-password.service": {
      hashStaffPassword: async (value) => `hashed:${value}`,
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { name: "Jane", email: "jane@example.com", password: "secret" },
  };
  const res = makeRes();

  await controller.createStaff(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /allows up to 2 staff accounts/i);
  assert.equal(createCalled, false);
});

test("createStaff allows creation when plan is unlimited", async () => {
  let createdPayload = null;

  const controller = loadModuleWithMocks("../src/staff/staff.controller", {
    "../src/staff/staff.schema": {
      countDocuments: async () => 25,
      findOne: async () => null,
      create: async (payload) => {
        createdPayload = payload;
        return {
          toObject: () => ({ ...payload, _id: "507f1f77bcf86cd799439013" }),
        };
      },
    },
    "../src/bookings/bookings.schema": {},
    "../src/subscription/plan-limits.service": {
      getPlanLimit: async () => Number.POSITIVE_INFINITY,
    },
    "../src/auth/staff-password.service": {
      hashStaffPassword: async (value) => `hashed:${value}`,
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { name: "Jane", email: "jane@example.com", password: "secret", role: "manager" },
  };
  const res = makeRes();

  await controller.createStaff(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 201);
  assert.equal(createdPayload.role, "manager");
  assert.equal(createdPayload.password, "hashed:secret");
});

test("createService blocks when free plan limit is reached", async () => {
  let createCalled = false;

  const controller = loadModuleWithMocks("../src/services/services.controller", {
    "../src/services/services.schema": {
      countDocuments: async () => 3,
      create: async () => {
        createCalled = true;
        return {};
      },
    },
    "../src/staff/staff.schema": {},
    "../src/bookings/bookings.schema": {},
    "../src/subscription/plan-limits.service": {
      getPlanLimit: async () => 3,
    },
    "../src/uploads/cloudinary.service": {
      deleteImage: async () => null,
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { name: "Braiding", duration: 60, price: 5000 },
  };
  const res = makeRes();

  await controller.createService(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /allows up to 3 services/i);
  assert.equal(createCalled, false);
});

test("createService allows creation when plan is unlimited", async () => {
  let createdPayload = null;

  const controller = loadModuleWithMocks("../src/services/services.controller", {
    "../src/services/services.schema": {
      countDocuments: async () => 10,
      create: async (payload) => {
        createdPayload = payload;
        return payload;
      },
    },
    "../src/staff/staff.schema": {},
    "../src/bookings/bookings.schema": {},
    "../src/subscription/plan-limits.service": {
      getPlanLimit: async () => Number.POSITIVE_INFINITY,
    },
    "../src/uploads/cloudinary.service": {
      deleteImage: async () => null,
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { name: "Braiding", duration: 60, price: 5000, description: "Protective style" },
  };
  const res = makeRes();

  await controller.createService(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 201);
  assert.equal(createdPayload.name, "Braiding");
  assert.equal(createdPayload.price, 5000);
});
