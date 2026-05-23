import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  PrismaHealthIndicator,
} from "@nestjs/terminus";
import { PrismaService } from "src/prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaIndicator: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get("live")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([
      async () => this.prismaIndicator.pingCheck("database", this.prisma),
      async () => this.memory.checkHeap("memory_heap", 300 * 1024 * 1024), // 300MB
      async () => this.memory.checkRSS("memory_rss", 500 * 1024 * 1024), // 500MB
      async () =>
        this.disk.checkStorage("disk", {
          path: "/",
          thresholdPercent: 0.85, // fail if >85% used
        }),
    ]);
  }
}
