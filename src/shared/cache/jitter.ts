/**
 * Aleatoriza un valor de segundos ±ratio para evitar expiración sincronizada
 * de múltiples keys creadas en el mismo instante.
 */
export function applyJitter(seconds: number, ratio = 0.1): number {
  const delta = seconds * ratio;
  return Math.max(1, Math.round(seconds + (Math.random() * 2 - 1) * delta));
}
