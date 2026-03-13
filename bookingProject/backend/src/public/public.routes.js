const express = require("express");
const controller = require("./public.controller");
const validate = require("../middleware/validate.middleware");
const { public: publicValidators } = require("../validators/request.validators");

const router = express.Router();

router.get("/public/business/id/:businessId", controller.getPublicBusinessById);
router.get("/public/business/:slug", controller.getPublicBusiness);
router.get("/public/business/:slug/bookings", validate(publicValidators.listBookings), controller.listPublicBookings);
router.post("/public/business/:slug/bookings", validate(publicValidators.createBooking), controller.createPublicBooking);

module.exports = router;
