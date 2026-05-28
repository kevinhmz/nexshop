import {
  Global,
  Inject,
  Logger,
  Module,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const logger = new Logger("RedisModule");

        const client = new Redis({
          host: config.get<string>("REDIS_HOST"),
          port: Number(config.get<string>("REDIS_PORT")),
          password: config.get<string>("REDIS_PASSWORD"),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });

        client.on("connect", () => logger.log("Redis connected"));
        client.on("ready", () => logger.log("Redis ready"));
        client.on("error", (err) =>
          logger.error(`Redis error: ${err.message}`),
        );
        client.on("end", () => logger.warn("Redis connection closed"));

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
