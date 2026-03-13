const express = require("express");
const controller = require("./business.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/require-owner.middleware");
const requireRoles = require("../middleware/require-roles.middleware");
const rateLimit = require("../middleware/rate-limit.middleware");
const validate = require("../middleware/validate.middleware");
const { business } = require("../validators/request.validators");

const router = express.Router();
const authBurstLimit = rateLimit({
  namespace: "business-auth",
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many authentication attempts. Please wait a few minutes and try again.",
});

router.post("/register", authBurstLimit, validate(business.register), controller.register);
router.post("/login", authBurstLimit, validate(business.login), controller.login);
router.get("/business/me", authMiddleware, controller.getBusinessMe);
router.get("/business/me/notifications/activity", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(business.notificationActivity), controller.listNotificationActivity);
router.patch("/business/me", authMiddleware, requireOwner, validate(business.updateMe), controller.updateBusinessMe);
router.patch("/business/me/password", authMiddleware, authBurstLimit, requireOwner, validate(business.changePassword), controller.changePassword);
router.delete("/business/me", authMiddleware, requireOwner, controller.deleteBusinessMe);

module.exports = router;
