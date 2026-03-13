const express = require("express");
const controller = require("./subscription.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/require-owner.middleware");
const validate = require("../middleware/validate.middleware");
const { subscription } = require("../validators/request.validators");

const router = express.Router();

router.get("/subscription", authMiddleware, requireOwner, controller.getSubscription);
router.patch("/subscription", authMiddleware, requireOwner, validate(subscription.update), controller.updateSubscription);
router.post("/subscription/warnings/send", authMiddleware, requireOwner, validate(subscription.sendWarning), controller.sendExpiryWarning);

module.exports = router;
