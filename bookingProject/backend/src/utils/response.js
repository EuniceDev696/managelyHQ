exports.success = (res, data = null, message = "Success", status = 200) => {
  return res.status(status).json({ message, data });
};

exports.fail = (res, message = "Failed", status = 400) => {
  return res.status(status).json({ message });
};
