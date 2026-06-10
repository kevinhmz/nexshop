import {
  DomainErrorKind,
  DomainException,
} from "src/shared/domain/domain.exception";

export class PaymentError extends DomainException {
  constructor(
    message: string,
    readonly kind: DomainErrorKind, // "PAYMENT_REQUIRED" | "UPSTREAM"
    code?: string,
  ) {
    super(message, code);
  }
}
