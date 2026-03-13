const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Staff = require("../src/staff/staff.schema");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const dbstring = process.env.DBSTRING;

const connectDB = async () => {
  if (!dbstring) {
    throw new Error("DBSTRING is not configured.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  console.log("[api] connecting to database...");
  await mongoose.connect(dbstring, {});
  await Staff.syncIndexes();
  console.log("[api] database connected");
  return mongoose.connection;
};

module.exports = connectDB;
