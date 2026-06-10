export type DomainErrorKind =
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYMENT_REQUIRED"
  | "UPSTREAM"; // fallo de un servicio externo (Stripe, etc.)

export abstract class DomainException extends Error {
  abstract readonly kind: DomainErrorKind;

  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
