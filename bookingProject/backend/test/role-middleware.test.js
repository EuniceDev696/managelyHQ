const test = require("node:test");
const assert = require("node:assert/strict");
const requireOwner = require("../src/middleware/require-owner.middleware");
const requireRoles = require("../src/middleware/require-roles.middleware");

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return response;
};

test("requireOwner allows owner", async () => {
  let called = false;
  requireOwner({ auth: { role: "owner" } }, createResponse(), () => {
    called = true;
  });
  assert.equal(called, true);
});

test("requireOwner blocks non-owner", async () => {
  const response = createResponse();
  requireOwner({ auth: { role: "manager" } }, response, () => {});
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { message: "Owner access required." });
});

test("requireRoles allows configured role", async () => {
  let called = false;
  requireRoles(["owner", "manager"])({ auth: { role: "manager" } }, createResponse(), () => {
    called = true;
  });
  assert.equal(called, true);
});

test("requireRoles blocks missing role", async () => {
  const response = createResponse();
  requireRoles(["owner", "admin"])({ auth: { role: "staff" } }, response, () => {});
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { message: "You do not have permission to access this resource." });
});
