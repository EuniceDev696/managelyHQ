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

test("getCustomerDetail returns booking history and favourite services", async () => {
  const controller = loadModuleWithMocks("../src/customers/customers.controller", {
    "../src/customers/customers.schema": {
      findOne: async () => ({
        _id: "507f1f77bcf86cd799439099",
        name: "Ada",
        notes: "VIP",
        totalSpend: 20000,
      }),
    },
    "../src/bookings/bookings.schema": {
      find: () => ({
        sort: () => ({
          limit: async () => [
            { _id: "1", service: "Facial", status: "completed", date: "2026-03-12", time: "10:00" },
            { _id: "2", service: "Facial", status: "cancelled", date: "2026-03-15", time: "11:00" },
            { _id: "3", service: "Massage", status: "completed", date: "2026-03-18", time: "12:00" },
          ],
        }),
      }),
    },
    "../src/branches/branch-access.service": {
      getScopedBranchFilter: async () => ({ ok: true, filter: {} }),
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011", role: "owner" },
    params: { customerId: "507f1f77bcf86cd799439099" },
    query: {},
  };
  const res = makeRes();

  await controller.getCustomerDetail(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.history.counts.completed, 2);
  assert.equal(res.body.history.counts.cancelled, 1);
  assert.equal(res.body.history.favoriteServices[0].name, "Facial");
});

test("updateCustomer saves notes", async () => {
  let saved = false;
  const controller = loadModuleWithMocks("../src/customers/customers.controller", {
    "../src/customers/customers.schema": {
      findOne: async () => ({
        _id: "507f1f77bcf86cd799439099",
        notes: "",
        save: async function save() {
          saved = this.notes === "Prefers weekends";
        },
      }),
    },
    "../src/bookings/bookings.schema": {},
    "../src/branches/branch-access.service": {
      getScopedBranchFilter: async () => ({ ok: true, filter: {} }),
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011", role: "manager" },
    params: { customerId: "507f1f77bcf86cd799439099" },
    query: {},
    body: { notes: "Prefers weekends" },
  };
  const res = makeRes();

  await controller.updateCustomer(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(saved, true);
});
