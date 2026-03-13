const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const mongoose = require("mongoose");
const path = require("path");
const connectDB = require("./database/dbconnection");
const authRoutes = require("./src/auth/auth.routes");
const bookingsRoutes = require("./src/bookings/bookings.routes");
const branchesRoutes = require("./src/branches/branches.routes");
const businessRoutes = require("./src/business/business.routes");
const customersRoutes = require("./src/customers/customers.routes");
const expensesRoutes = require("./src/expenses/expenses.routes");
const onboardingRoutes = require("./src/onboarding/onboarding.routes");
const paymentsRoutes = require("./src/payments/payments.routes");
const publicRoutes = require("./src/public/public.routes");
const servicesRoutes = require("./src/services/services.routes");
const staffRoutes = require("./src/staff/staff.routes");
const subscriptionRoutes = require("./src/subscription/subscription.routes");
const uploadsRoutes = require("./src/uploads/uploads.routes");
const { validateApiRuntimeConfig } = require("./src/config/runtime");
const { errorMiddleware } = require("./src/middleware");

dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

const parseAllowedOrigins = () =>
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const createApp = () => {
  const app = express();
  const allowedOrigins = parseAllowedOrigins();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin not allowed by CORS."));
      },
    }),
  );
  app.use(
    express.json({
      limit: process.env.JSON_BODY_LIMIT || "2mb",
      verify: (req, _res, buffer) => {
        req.rawBody = buffer.toString("utf8");
      },
    }),
  );

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "booking-api",
      environment: process.env.NODE_ENV || "development",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
  });

  app.use("/api", businessRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api", branchesRoutes);
  app.use("/api", servicesRoutes);
  app.use("/api", staffRoutes);
  app.use("/api", bookingsRoutes);
  app.use("/api", customersRoutes);
  app.use("/api", expensesRoutes);
  app.use("/api", subscriptionRoutes);
  app.use("/api", onboardingRoutes);
  app.use("/api", paymentsRoutes);
  app.use("/api", publicRoutes);
  app.use("/api", uploadsRoutes);

  app.use(errorMiddleware);

  return app;
};

const startServer = async () => {
  const app = createApp();
  const port = Number(process.env.PORT || 5000);

  try {
    validateApiRuntimeConfig();
    await connectDB();
    app.listen(port, () => {
      console.log(`[api] server running on port ${port}`);
    });
  } catch (error) {
    console.error(`[api] failed to start: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
