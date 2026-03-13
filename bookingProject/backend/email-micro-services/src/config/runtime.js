const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";

const readEnv = (key) => String(process.env[key] || "").trim();

const fail = (message) => {
  throw new Error(message);
};

const warn = (message) => {
  console.warn(`[email-ms:config] ${message}`);
};

const requireInProduction = (key, message = `${key} is required in production.`) => {
  if (isProduction && !readEnv(key)) {
    fail(message);
  }
};

const validateEmailRuntimeConfig = () => {
  requireInProduction("ALLOWED_ORIGINS", "ALLOWED_ORIGINS is required in production so the API can call the email service.");
  requireInProduction("EMAIL_SERVICE");
  requireInProduction("EMAIL_USER");
  requireInProduction("EMAIL_PASS");
  requireInProduction("EMAIL_FROM");

  if (!readEnv("MONGO_URI")) {
    warn("MONGO_URI is missing. Email logs will not be persisted.");
  }
};

module.exports = { validateEmailRuntimeConfig };
