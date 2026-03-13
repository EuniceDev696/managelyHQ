const jwt = require("jsonwebtoken");
const { syncExpiredSubscription } = require("../subscription/subscription.service");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    await syncExpiredSubscription(payload.sub);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
