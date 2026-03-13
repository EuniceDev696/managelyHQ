const businessController = require("../business/business.controller");

exports.login = businessController.login;
exports.register = businessController.register;
exports.changeStaffPassword = businessController.changeStaffPassword;
exports.verifyEmail = businessController.verifyEmail;
exports.resendVerificationEmail = businessController.resendVerificationEmail;
