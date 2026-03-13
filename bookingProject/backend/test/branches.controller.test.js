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

test("createBranch rejects manager assignments for staff outside the business", async () => {
  const controller = loadModuleWithMocks("../src/branches/branches.controller", {
    "../src/subscription/plan-limits.service": { canAccessBranches: async () => true },
    "../src/audit/audit.schema": { find: () => ({ sort: () => ({ limit: async () => [] }) }) },
    "../src/utils/audit-log": { auditLog: () => {} },
    "../src/branches/branches.schema": {
      findOne: async () => null,
      create: async () => {
        throw new Error("branch should not be created");
      },
    },
    "../src/staff/staff.schema": {
      findOne: () => ({ select: async () => null }),
      countDocuments: async () => 0,
    },
    "../src/services/services.schema": { countDocuments: async () => 0 },
    "../src/bookings/bookings.schema": { countDocuments: async () => 0 },
    "../src/payments/payments.schema": { countDocuments: async () => 0 },
    "../src/customers/customers.schema": { countDocuments: async () => 0 },
    "../src/expenses/expenses.schema": { countDocuments: async () => 0 },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    body: { name: "Victoria Island", managerStaffId: "507f1f77bcf86cd799439022" },
  };
  const res = makeRes();

  await controller.createBranch(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /does not belong to this business/i);
});

test("deleteBranch blocks deletion when linked branch records still exist", async () => {
  const controller = loadModuleWithMocks("../src/branches/branches.controller", {
    "../src/subscription/plan-limits.service": { canAccessBranches: async () => true },
    "../src/audit/audit.schema": { find: () => ({ sort: () => ({ limit: async () => [] }) }) },
    "../src/utils/audit-log": { auditLog: () => {} },
    "../src/branches/branches.schema": {
      findOne: async () => ({ _id: "507f1f77bcf86cd799439099" }),
      deleteOne: async () => ({ deletedCount: 1 }),
    },
    "../src/staff/staff.schema": { countDocuments: async () => 1, findOne: () => ({ select: async () => null }) },
    "../src/services/services.schema": { countDocuments: async () => 0 },
    "../src/bookings/bookings.schema": { countDocuments: async () => 2 },
    "../src/payments/payments.schema": { countDocuments: async () => 0 },
    "../src/customers/customers.schema": { countDocuments: async () => 0 },
    "../src/expenses/expenses.schema": { countDocuments: async () => 0 },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    params: { branchId: "507f1f77bcf86cd799439099" },
  };
  const res = makeRes();

  await controller.deleteBranch(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.usage.staff, 1);
  assert.equal(res.body.usage.bookings, 2);
});

test("reassignBranch moves linked records and deletes the source branch", async () => {
  const updates = [];
  const deletes = [];
  const audits = [];

  const controller = loadModuleWithMocks("../src/branches/branches.controller", {
    "../src/subscription/plan-limits.service": { canAccessBranches: async () => true },
    "../src/audit/audit.schema": { find: () => ({ sort: () => ({ limit: async () => [] }) }) },
    "../src/utils/audit-log": { auditLog: (...args) => audits.push(args) },
    "../src/branches/branches.schema": {
      findOne: async ({ _id }) => (_id === "source" ? { _id: "source", name: "Source" } : { _id: "target", name: "Target" }),
      deleteOne: async (payload) => {
        deletes.push(payload);
        return { deletedCount: 1 };
      },
    },
    "../src/staff/staff.schema": {
      countDocuments: async () => 1,
      updateMany: async (query, payload) => updates.push({ model: "staff", query, payload }),
      findOne: () => ({ select: async () => null }),
    },
    "../src/services/services.schema": {
      countDocuments: async () => 2,
      updateMany: async (query, payload) => updates.push({ model: "services", query, payload }),
    },
    "../src/bookings/bookings.schema": {
      countDocuments: async () => 3,
      updateMany: async (query, payload) => updates.push({ model: "bookings", query, payload }),
    },
    "../src/payments/payments.schema": {
      countDocuments: async () => 4,
      updateMany: async (query, payload) => updates.push({ model: "payments", query, payload }),
    },
    "../src/customers/customers.schema": {
      countDocuments: async () => 5,
      updateMany: async (query, payload) => updates.push({ model: "customers", query, payload }),
    },
    "../src/expenses/expenses.schema": {
      countDocuments: async () => 6,
      updateMany: async (query, payload) => updates.push({ model: "expenses", query, payload }),
    },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    params: { branchId: "source" },
    body: { targetBranchId: "target", deleteSource: true },
  };
  const res = makeRes();

  await controller.reassignBranch(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(updates.length, 6);
  assert.equal(deletes.length, 1);
  assert.equal(res.body.deletedSource, true);
  assert.equal(res.body.reassigned.expenses, 6);
  assert.equal(audits[0]?.[0], "branches.reassigned");
});

test("listBranchActivity returns recent branch audit items for the business", async () => {
  const controller = loadModuleWithMocks("../src/branches/branches.controller", {
    "../src/subscription/plan-limits.service": { canAccessBranches: async () => true },
    "../src/audit/audit.schema": {
      find: (query) => ({
        sort: () => ({
          limit: async (limit) => [
            {
              _id: "507f1f77bcf86cd799439091",
              event: "branches.updated",
              businessId: query.businessId,
              meta: { branchId: "507f1f77bcf86cd799439099", branchName: "Main", updatedFields: ["name"] },
              createdAt: new Date("2026-03-10T14:40:00.000Z"),
            },
          ].slice(0, limit),
        }),
      }),
    },
    "../src/utils/audit-log": { auditLog: () => {} },
    "../src/branches/branches.schema": { findOne: async () => null },
    "../src/staff/staff.schema": { countDocuments: async () => 0, findOne: () => ({ select: async () => null }) },
    "../src/services/services.schema": { countDocuments: async () => 0 },
    "../src/bookings/bookings.schema": { countDocuments: async () => 0 },
    "../src/payments/payments.schema": { countDocuments: async () => 0 },
    "../src/customers/customers.schema": { countDocuments: async () => 0 },
    "../src/expenses/expenses.schema": { countDocuments: async () => 0 },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
    query: { branchId: "507f1f77bcf86cd799439099", limit: "5" },
  };
  const res = makeRes();

  await controller.listBranchActivity(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(res.body), true);
  assert.equal(res.body[0].event, "branches.updated");
});

test("listBranches blocks free plan businesses", async () => {
  const controller = loadModuleWithMocks("../src/branches/branches.controller", {
    "../src/subscription/plan-limits.service": { canAccessBranches: async () => false },
    "../src/audit/audit.schema": { find: () => ({ sort: () => ({ limit: async () => [] }) }) },
    "../src/utils/audit-log": { auditLog: () => {} },
    "../src/branches/branches.schema": {
      find: async () => {
        throw new Error("branches should not be listed");
      },
      findOne: async () => null,
    },
    "../src/staff/staff.schema": { countDocuments: async () => 0, findOne: () => ({ select: async () => null }) },
    "../src/services/services.schema": { countDocuments: async () => 0 },
    "../src/bookings/bookings.schema": { countDocuments: async () => 0 },
    "../src/payments/payments.schema": { countDocuments: async () => 0 },
    "../src/customers/customers.schema": { countDocuments: async () => 0 },
    "../src/expenses/expenses.schema": { countDocuments: async () => 0 },
  });

  const req = {
    auth: { sub: "507f1f77bcf86cd799439011" },
  };
  const res = makeRes();

  await controller.listBranches(req, res, (error) => {
    throw error;
  });

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /growth and pro plans only/i);
});
