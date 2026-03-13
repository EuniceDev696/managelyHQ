process.env.NODE_ENV = process.env.NODE_ENV || "test";

require("./role-middleware.test");
require("./billing-controllers.test");
require("./plan-limits.controller.test");
require("./rate-limit.middleware.test");
require("./route-permissions.test");
require("./staff-password.service.test");
require("./branches.controller.test");
require("./customers.controller.test");
require("./notification-preferences.test");
require("./email-verification-otp.test");
require("./notification-activity.controller.test");
require("./resend-booking-notification.test");
require("./booking-notification-status.test");
