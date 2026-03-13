const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/require-owner.middleware");
const controller = require("./uploads.controller");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("Only JPG, PNG, and WEBP images are allowed."));
  },
});

router.post("/uploads/service-image", authMiddleware, requireOwner, upload.single("file"), controller.uploadServiceImage);

module.exports = router;
