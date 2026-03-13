const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../database/dbconnection");
const emailRoutes = require("../router/email.routes");
const { validateEmailRuntimeConfig } = require("../src/config/runtime");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const parseAllowedOrigins = () =>
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const createApp = () => {
  const app = express();
  const allowedOrigins = parseAllowedOrigins();

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
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "email-microservice",
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    });
  });

  app.use("/api/email", emailRoutes);

  app.use((error, _req, res, _next) => {
    console.error("[email-ms:error]", error.message);
    res.status(500).json({ message: error.message || "Internal server error." });
  });

  return app;
};

const startServer = async () => {
  const app = createApp();
  const port = Number(process.env.PORT || 5100);

  try {
    validateEmailRuntimeConfig();
    await connectDB();
    app.listen(port, () => {
      console.log(`[email-ms] server running on port ${port}`);
    });
  } catch (error) {
    console.error(`[email-ms] failed to start: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
