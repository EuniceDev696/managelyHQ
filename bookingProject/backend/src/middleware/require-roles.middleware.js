module.exports = (allowedRoles = []) => (req, res, next) => {
  const currentRole = String(req.auth?.role || "").toLowerCase();
  if (!allowedRoles.map((role) => String(role).toLowerCase()).includes(currentRole)) {
    return res.status(403).json({ message: "You do not have permission to access this resource." });
  }
  return next();
};
