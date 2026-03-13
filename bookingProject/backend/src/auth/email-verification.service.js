const crypto = require("crypto");

const hashToken = (token) => crypto.createHash("sha256").update(String(token || "")).digest("hex");
const OTP_LENGTH = 6;
const VERIFICATION_WINDOW_MS = 30 * 60 * 1000;

exports.createEmailVerification = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const otp = String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  const expiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MS);
  return {
    token,
    otp,
    tokenHash: hashToken(token),
    otpHash: hashToken(otp),
    expiresAt,
  };
};

exports.hashEmailVerificationToken = hashToken;
exports.hashEmailVerificationOtp = hashToken;

exports.buildVerificationLink = (token, email = "") => {
  const baseUrl = String(process.env.EMAIL_VERIFICATION_URL || "http://localhost:5173/verify-email").replace(/\/+$/, "");
  const search = new URLSearchParams();
  search.set("token", String(token || ""));
  if (email) {
    search.set("email", String(email || "").toLowerCase().trim());
  }
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${search.toString()}`;
};
