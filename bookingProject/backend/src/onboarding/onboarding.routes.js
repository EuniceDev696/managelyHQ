const express = require("express");
const controller = require("./onboarding.controller");
const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { onboarding } = require("../validators/request.validators");

const router = express.Router();

router.post("/onboarding/complete", authMiddleware, validate(onboarding.complete), controller.completeOnboarding);

module.exports = router;
