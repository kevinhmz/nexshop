import { DomainErrorKind, DomainException } from "../domain/domain.exception";

export class IdempotencyError extends DomainException {
  constructor(
    message: string,
    readonly kind: DomainErrorKind,
    code?: string,
  ) {
    super(message, code);
  }
}
