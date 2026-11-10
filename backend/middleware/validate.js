// Validate req.body / req.query / req.params against Zod schemas.
// Only the parsed (whitelisted) data reaches the route handler, which
// blocks mass-assignment (e.g. a client sending { role: 'admin' }).
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    // Express 5 makes req.query a getter, so store the parsed copy separately.
    if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;
