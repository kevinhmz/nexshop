import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import {
  DomainErrorKind,
  DomainException,
} from "src/shared/domain/domain.exception";

const KIND_TO_STATUS: Record<DomainErrorKind, number> = {
  VALIDATION: HttpStatus.BAD_REQUEST, // 400
  NOT_FOUND: HttpStatus.NOT_FOUND, // 404
  CONFLICT: HttpStatus.CONFLICT, // 409
  PAYMENT_REQUIRED: HttpStatus.PAYMENT_REQUIRED, // 402
  UPSTREAM: HttpStatus.BAD_GATEWAY, // 502
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status = KIND_TO_STATUS[exception.kind];

    res.status(status).json({
      statusCode: status,
      code: exception.code ?? null,
      message: exception.message,
    });
  }
}
