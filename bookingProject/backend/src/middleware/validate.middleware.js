const validate = (schemas = {}) => (req, res, next) => {
  const sources = ["params", "query", "body"];

  for (const source of sources) {
    const schema = schemas[source];
    if (!schema) continue;

    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      return res.status(400).json({ message });
    }

    req[source] = value;
  }

  return next();
};

module.exports = validate;
