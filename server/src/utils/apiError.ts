export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: any) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message: string = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message: string = 'Access denied') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message: string = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static internal(message: string = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_SERVER_ERROR', message);
  }
}
