import { httpError } from '../utils/httpError.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return next(httpError(400, 'Validation failed', r.error.flatten()));
    }
    req.validatedBody = r.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.query);
    if (!r.success) {
      return next(httpError(400, 'Invalid query', r.error.flatten()));
    }
    req.validatedQuery = r.data;
    next();
  };
}
