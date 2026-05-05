import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { PrismaService } from "nestjs-prisma";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: "pretty",
    }),
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
