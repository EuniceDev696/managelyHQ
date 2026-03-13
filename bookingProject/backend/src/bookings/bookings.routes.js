const express = require("express");
const controller = require("./bookings.controller");
const authMiddleware = require("../middleware/auth.middleware");
const requireRoles = require("../middleware/require-roles.middleware");
const validate = require("../middleware/validate.middleware");
const { bookings } = require("../validators/request.validators");

const router = express.Router();

router.get("/bookings", authMiddleware, controller.listBookings);
router.post("/bookings", authMiddleware, validate(bookings.create), controller.createBooking);
router.patch("/bookings/:bookingId", authMiddleware, validate(bookings.update), controller.updateBooking);
router.patch("/bookings/:bookingId/status", authMiddleware, validate(bookings.updateStatus), controller.updateBookingStatus);
router.post("/bookings/reminders/send", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(bookings.sendReminders), controller.sendBookingReminders);
router.post("/bookings/:bookingId/notifications/resend", authMiddleware, requireRoles(["owner", "admin", "manager"]), validate(bookings.resendNotification), controller.resendBookingNotification);
router.delete("/bookings/:bookingId", authMiddleware, validate(bookings.remove), controller.deleteBooking);

module.exports = router;
