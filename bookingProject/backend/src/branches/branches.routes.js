const express = require("express");
const controller = require("./branches.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireRoles = require("../middleware/require-roles.middleware");
const validate = require("../middleware/validate.middleware");
const { branches } = require("../validators/request.validators");

const router = express.Router();

router.get("/branches", authMiddleware, validate(branches.list), controller.listBranches);
router.get("/branches/activity", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(branches.activity), controller.listBranchActivity);
router.post("/branches", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(branches.create), controller.createBranch);
router.post("/branches/:branchId/reassign", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(branches.reassign), controller.reassignBranch);
router.patch("/branches/:branchId", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(branches.update), controller.updateBranch);
router.delete("/branches/:branchId", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(branches.remove), controller.deleteBranch);

module.exports = router;
