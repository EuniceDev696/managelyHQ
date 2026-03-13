const express = require("express");
const controller = require("./staff.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireRoles = require("../middleware/require-roles.middleware");
const validate = require("../middleware/validate.middleware");
const { staff } = require("../validators/request.validators");

const router = express.Router();

router.get("/staff", authMiddleware, requireRoles(["owner", "admin", "manager"]), controller.listStaff);
router.post("/staff", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(staff.create), controller.createStaff);
router.patch("/staff/:staffId", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(staff.update), controller.updateStaff);
router.delete("/staff/:staffId", authMiddleware, requireRoles(["owner", "admin"]), validate(staff.remove), controller.deleteStaff);

module.exports = router;
