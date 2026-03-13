const express = require("express");
const controller = require("./customers.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireRoles = require("../middleware/require-roles.middleware");
const validate = require("../middleware/validate.middleware");
const { customers } = require("../validators/request.validators");

const router = express.Router();

router.get("/customers", authMiddleware, validate(customers.list), controller.listCustomers);
router.get("/customers/:customerId", authMiddleware, validate(customers.detail), controller.getCustomerDetail);
router.patch("/customers/:customerId", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(customers.update), controller.updateCustomer);

module.exports = router;
