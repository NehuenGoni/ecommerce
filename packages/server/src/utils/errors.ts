export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Solicitud inválida") {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "No encontrado") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicto") {
    super(message, 409);
  }
}
