module.exports = {
  authMiddleware: require("./auth.middleware"),
  errorMiddleware: require("./error.middleware"),
  rateLimit: require("./rate-limit.middleware"),
  requireRoles: require("./require-roles.middleware"),
  requireOwner: require("./require-owner.middleware"),
  validate: require("./validate.middleware"),
};
