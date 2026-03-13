const express = require("express");
const controller = require("./auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const rateLimit = require("../middleware/rate-limit.middleware");
const validate = require("../middleware/validate.middleware");
const { business } = require("../validators/request.validators");

const router = express.Router();

const authIdentityKey = (req) => {
  const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
  const email = String(req.body?.email || "").toLowerCase().trim();
  return email ? `${ip}:${email}` : ip;
};

const loginLimit = rateLimit({
  namespace: "auth-login",
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: "Too many login attempts. Please wait a few minutes and try again.",
  keyGenerator: authIdentityKey,
});

const registerLimit = rateLimit({
  namespace: "auth-register",
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many registration attempts. Please wait a few minutes and try again.",
  keyGenerator: authIdentityKey,
});

const verifyLimit = rateLimit({
  namespace: "auth-verify-email",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many verification attempts. Please wait a few minutes and try again.",
  keyGenerator: authIdentityKey,
});

const resendLimit = rateLimit({
  namespace: "auth-resend-verification",
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many resend attempts. Please wait a few minutes and try again.",
  keyGenerator: authIdentityKey,
});

const passwordChangeLimit = rateLimit({
  namespace: "auth-staff-password",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many password attempts. Please wait a few minutes and try again.",
  keyGenerator: authIdentityKey,
});

router.post("/login", loginLimit, validate(business.login), controller.login);
router.post("/register", registerLimit, validate(business.register), controller.register);
router.post("/verify-email", verifyLimit, validate(business.verifyEmail), controller.verifyEmail);
router.post("/resend-verification", resendLimit, validate(business.resendVerification), controller.resendVerificationEmail);
router.post("/staff/password", authMiddleware, passwordChangeLimit, validate(business.changePassword), controller.changeStaffPassword);

module.exports = router;
