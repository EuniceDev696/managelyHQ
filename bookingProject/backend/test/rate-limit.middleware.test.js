const test = require("node:test");
const assert = require("node:assert/strict");

const rateLimit = require("../src/middleware/rate-limit.middleware");

const makeRes = () => {
  const headers = {};
  return {
    statusCode: 200,
    body: undefined,
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

test("rateLimit allows requests within the configured threshold", () => {
  rateLimit.resetAll();
  const limiter = rateLimit({
    namespace: "test-allow",
    windowMs: 1000,
    max: 2,
    keyGenerator: () => "same-client",
  });

  let nextCount = 0;
  const next = () => {
    nextCount += 1;
  };

  limiter({ ip: "127.0.0.1", headers: {} }, makeRes(), next);
  limiter({ ip: "127.0.0.1", headers: {} }, makeRes(), next);

  assert.equal(nextCount, 2);
});

test("rateLimit blocks requests after the configured threshold", () => {
  rateLimit.resetAll();
  const limiter = rateLimit({
    namespace: "test-block",
    windowMs: 1000,
    max: 1,
    message: "Too many attempts.",
    keyGenerator: () => "same-client",
  });

  let nextCount = 0;
  const next = () => {
    nextCount += 1;
  };

  limiter({ ip: "127.0.0.1", headers: {} }, makeRes(), next);
  const res = makeRes();
  limiter({ ip: "127.0.0.1", headers: {} }, res, next);

  assert.equal(nextCount, 1);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.message, "Too many attempts.");
  assert.ok(Number(res.headers["Retry-After"]) >= 1);
});
