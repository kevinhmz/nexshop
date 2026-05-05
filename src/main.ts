import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import compression from "compression";

const logger = new Logger("Bootstrap");

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Security
  app.enable("trust proxy"); // útil para AWS / proxies
  app.use(helmet());
  app.use(compression());
  // app.enableCors();

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = config.get("PORT", 3000);
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}
bootstrap();
