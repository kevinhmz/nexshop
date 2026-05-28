import { randomUUID } from "crypto";
import Redis from "ioredis";

// Lua: solo borra la key si el token coincide.
// Evita que un proceso libere por error el lock de otro
// (escenario: tu operación tardó más que el TTL, el lock expiró,
// otro proceso lo tomó, y vos al terminar borrás el lock ajeno).
const RELEASE_LOCK_SCRIPT = `                                     
    if redis.call("get", KEYS[1]) == ARGV[1] then                                                                                                                                                                                                                              
      return redis.call("del", KEYS[1])           
    else                                                                                                                                                                                                                                                                       
      return 0                                                                                                                                                                                                                                                                 
    end                                         
  `;

export type Lock = {
  key: string;
  token: string;
};

export async function acquireLock(
  redis: Redis,
  key: string,
  ttlMs: number,
): Promise<Lock | null> {
  const token = randomUUID();
  const result = await redis.set(key, token, "PX", ttlMs, "NX");
  return result === "OK" ? { key, token } : null;
}

export async function releaseLock(redis: Redis, lock: Lock): Promise<void> {
  await redis.eval(RELEASE_LOCK_SCRIPT, 1, lock.key, lock.token);
}
