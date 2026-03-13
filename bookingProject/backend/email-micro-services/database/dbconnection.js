const mongoose = require("mongoose");

module.exports = async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn("[email-ms] MONGO_URI is not set. Database logging is disabled.");
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("[email-ms] database connected");
    return mongoose.connection;
  } catch (error) {
    console.error("[email-ms] database connection failed:", error.message);
    throw error;
  }
};
