const express = require("express");
const controller = require("./services.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireRoles = require("../middleware/require-roles.middleware");
const validate = require("../middleware/validate.middleware");
const { services } = require("../validators/request.validators");

const router = express.Router();

router.get("/services", authMiddleware, validate(services.list), controller.listServices);
router.post("/services", authMiddleware, requireRoles(["owner", "admin"]), validate(services.create), controller.createService);
router.patch("/services/:serviceId", authMiddleware, requireRoles(["owner", "admin"]), validate(services.update), controller.updateService);
router.delete("/services/:serviceId", authMiddleware, requireRoles(["owner", "admin"]), validate(services.remove), controller.deleteService);

module.exports = router;
