// An error that is safe to show to the client, with an HTTP status.
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(msg, details) { return new AppError(400, msg, details); }
  static unauthorized(msg = 'Not authorized') { return new AppError(401, msg); }
  static forbidden(msg = 'You do not have permission to do this') { return new AppError(403, msg); }
  static notFound(msg = 'Not found') { return new AppError(404, msg); }
  static conflict(msg) { return new AppError(409, msg); }
  static unavailable(msg) { return new AppError(503, msg); }
}

module.exports = AppError;
