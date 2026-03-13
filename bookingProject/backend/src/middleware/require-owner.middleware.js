module.exports = (req, res, next) => {
  if (req.auth?.role !== "owner") {
    return res.status(403).json({ message: "Owner access required." });
  }
  return next();
};
