// Zod Validation helper middleware for Express routes

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Input validation failed.',
      details: result.error.flatten().fieldErrors
    });
  }
  // Attach validated and parsed data to request
  req.validatedBody = result.data;
  next();
};
