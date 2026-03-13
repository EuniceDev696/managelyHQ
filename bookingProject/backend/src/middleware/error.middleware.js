module.exports = (error, req, res, _next) => {
  const status = error.status || 500;
  const method = req?.method || "UNKNOWN";
  const path = req?.originalUrl || req?.url || "";
  const stamp = new Date().toISOString();

  if (status >= 500) {
    console.error(`[${stamp}] ${method} ${path}`, error);
  } else {
    console.warn(`[${stamp}] ${method} ${path}`, error.message || "Request error");
  }

  res.status(status).json({ message: error.message || "Internal server error" });
};
