const { uploadImage } = require("./cloudinary.service");

exports.uploadServiceImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required." });
    }

    const uploaded = await uploadImage(req.file);

    return res.status(200).json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      storage: uploaded.storage,
    });
  } catch (error) {
    return next(error);
  }
};
