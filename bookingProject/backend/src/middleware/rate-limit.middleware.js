const stores = new Map();

const getStore = (namespace) => {
  const key = String(namespace || "default");
  if (!stores.has(key)) {
    stores.set(key, new Map());
  }
  return stores.get(key);
};

const defaultKeyGenerator = (req) => String(req.ip || req.headers["x-forwarded-for"] || "unknown");

const createRateLimit = ({ namespace, windowMs, max, message, keyGenerator = defaultKeyGenerator }) => {
  const store = getStore(namespace);
  const ttl = Number(windowMs || 0);
  const limit = Number(max || 0);

  return (req, res, next) => {
    const now = Date.now();
    const key = String(keyGenerator(req) || "unknown");
    const current = store.get(key);

    if (!current || current.expiresAt <= now) {
      store.set(key, { count: 1, expiresAt: now + ttl });
      return next();
    }

    if (current.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: message || "Too many requests. Please try again later.",
      });
    }

    current.count += 1;
    store.set(key, current);
    return next();
  };
};

createRateLimit.resetAll = () => {
  stores.clear();
};

createRateLimit.reset = (namespace, key) => {
  if (!namespace) return;
  const store = stores.get(String(namespace));
  if (!store) return;
  if (!key) {
    store.clear();
    return;
  }
  store.delete(String(key));
};

module.exports = createRateLimit;
