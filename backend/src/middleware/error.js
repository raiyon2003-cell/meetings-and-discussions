export function notFound(req, res, next) {
  res.status(404).json({ message: 'Not found', path: req.originalUrl });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  } else {
    console.error(message);
  }
  res.status(status).json({
    message,
    ...(err.details ? { details: err.details } : {}),
  });
}
