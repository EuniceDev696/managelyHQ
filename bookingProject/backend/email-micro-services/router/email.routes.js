const express = require("express");
const controller = require("../controller/email.controller");

const router = express.Router();

router.get("/health", controller.health);
router.get("/logs", controller.listEmailLogs);
router.post("/send", controller.sendEmail);

module.exports = router;
