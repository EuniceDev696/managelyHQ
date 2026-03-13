const express = require("express");
const controller = require("./expenses.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireRoles = require("../middleware/require-roles.middleware");
const validate = require("../middleware/validate.middleware");
const { expenses } = require("../validators/request.validators");

const router = express.Router();

router.get("/expenses", authMiddleware, validate(expenses.list), controller.listExpenses);
router.post("/expenses", authMiddleware, requireRoles(["owner", "admin", "manager", "staff"]), validate(expenses.create), controller.createExpense);
router.delete("/expenses/:expenseId", authMiddleware, requireRoles(["owner", "admin", "manager", "staff"]), validate(expenses.remove), controller.deleteExpense);

module.exports = router;
