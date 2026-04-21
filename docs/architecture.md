# NexShop — Plan de Arquitectura

> E-commerce evolutivo: de monolito a cloud-native en 4 fases.
> Stack base: NestJS · Prisma · PostgreSQL · Redis · Docker · GitHub Actions

---

## Visión general

El objetivo es construir un e-commerce funcional que evolucione progresivamente para demostrar dominio en backend engineering, DevOps, y sistemas distribuidos. Cada fase agrega complejidad operacional real, no artificial.

**Infraestructura local:** Mac con Apple Silicon + UTM (VMs con Ubuntu Server ARM64).

---

## Dominio del negocio

### Módulos

| Módulo | Responsabilidad | Entidades principales |
|--------|----------------|-----------------------|
| Auth | Registro, login, JWT, roles (admin/customer) | User, Role |
| Catalog | CRUD productos, categorías, búsqueda, stock | Product, Category |
| Cart | Carrito por usuario, persistido en Redis + DB | Cart, CartItem |
| Orders | Checkout, estados de orden, historial | Order, OrderItem, OrderStatus |

### Entidades y relaciones

```
User 1──N Order
User 1──1 Cart
Cart 1──N CartItem
CartItem N──1 Product
Product N──1 Category
Order 1──N OrderItem
OrderItem N──1 Product
Order → estado: pending → confirmed → processing → shipped → delivered → cancelled
```

### Flujo principal: checkout

1. Usuario tiene items en carrito (Redis + DB sync)
2. POST /orders/checkout
3. Validar stock de cada producto (Prisma interactive transaction con `$transaction`)
4. Decrementar stock
5. Crear Order + OrderItems
6. Limpiar carrito
7. Emitir evento OrderCreated (en fase 1 es interno, en fase 2 va a message broker)
8. Retornar orden confirmada

**Nota sobre pagos:** No integramos pasarela real. Simulamos con un endpoint que acepta/rechaza basado en un flag. Esto es suficiente para demostrar el flujo y en fase 2 se puede convertir en un servicio separado.

---

## Fase 1 — Monolito en producción

### Objetivo
Tener una API funcional, dockerizada, con CI/CD, corriendo en una VM de UTM como si fuera un servidor de producción.

### Arquitectura

```
┌─────────────────────────────────────────────────┐
│                   VM (UTM - Ubuntu)              │
│                                                  │
│  ┌──────────────┐  ┌──────┐  ┌───────────────┐  │
│  │  NexShop API │──│Redis │  │  PostgreSQL    │  │
│  │  (NestJS)    │  │      │  │               │  │
│  │  :3000       │  │:6379 │  │  :5432        │  │
│  └──────────────┘  └──────┘  └───────────────┘  │
│         │                                        │
│  ┌──────────────┐                                │
│  │    Nginx     │ ← reverse proxy + SSL          │
│  │    :80/:443  │                                │
│  └──────────────┘                                │
│                                                  │
│  Todo orquestado con Docker Compose              │
└─────────────────────────────────────────────────┘
          │
    GitHub Actions → SSH deploy a la VM
```

### Stack técnico

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS con módulos bien definidos (AuthModule, CatalogModule, CartModule, OrderModule)
- **ORM:** Prisma (schema declarativo, migraciones con `prisma migrate`)
- **Auth:** JWT con access + refresh tokens, guards de NestJS
- **Validación:** class-validator + class-transformer
- **Cache:** Redis para sesiones de carrito y cache de catálogo
- **DB:** PostgreSQL 16
- **API docs:** Swagger/OpenAPI auto-generado
- **Testing:** Jest (unit) + Supertest (e2e)
- **Containerización:** Docker multi-stage build (builder → production image)
- **Reverse proxy:** Nginx con SSL self-signed (simula producción)

### Estructura del monolito

```
prisma/
├── schema.prisma            # Schema declarativo
├── migrations/              # Migraciones versionadas
└── seed.ts                  # Datos iniciales
src/
├── common/              # Guards, filters, interceptors, decorators
│   ├── guards/
│   ├── filters/
│   ├── interceptors/    # Logging, transform response
│   └── decorators/
├── config/              # Configuración tipada (ConfigModule)
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts    # PrismaClient como servicio inyectable
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/        # JWT strategy, local strategy
│   │   ├── guards/
│   │   └── dto/
│   ├── catalog/
│   │   ├── catalog.module.ts
│   │   ├── controllers/       # products.controller, categories.controller
│   │   ├── services/
│   │   └── dto/
│   ├── cart/
│   │   ├── cart.module.ts
│   │   ├── cart.controller.ts
│   │   ├── cart.service.ts     # Sync Redis ↔ DB
│   │   └── dto/
│   └── orders/
│       ├── orders.module.ts
│       ├── orders.controller.ts
│       ├── orders.service.ts   # Checkout con transacción ($transaction)
│       ├── dto/
│       └── events/             # EventEmitter interno
├── app.module.ts
└── main.ts
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
# Triggers: push a main

jobs:
  test:
    - Lint (ESLint)
    - Unit tests
    - E2E tests (con testcontainers o DB en CI)

  build:
    - Docker build multi-stage
    - Push a GitHub Container Registry (ghcr.io)

  deploy:
    - SSH a la VM de UTM
    - docker compose pull
    - docker compose up -d
    - Health check (curl al endpoint /health)
```

### Base de datos — Prisma

Schema declarativo en `prisma/schema.prisma`. Migraciones versionadas, nunca `db push` en producción.

```bash
# Crear migración a partir de cambios en el schema
npx prisma migrate dev --name create_users_table

# Aplicar migraciones en producción
npx prisma migrate deploy

# Generar el cliente tipado
npx prisma generate

# Seed de datos iniciales
npx prisma db seed
```

### Configuración de la VM (UTM)

- **OS:** Ubuntu Server 24.04 ARM64
- **Recursos:** 2 CPU, 4GB RAM, 20GB disco
- **Red:** Bridged networking (accesible desde el Mac host)
- **Software:** Docker + Docker Compose instalados
- **Acceso:** SSH con key-pair (no contraseña)
- **Firewall:** UFW — solo puertos 22, 80, 443

### Observabilidad (fase 1 — básica)

- **Health check:** endpoint GET /health que valida DB + Redis
- **Logging:** NestJS Logger → stdout → Docker logs
- **Métricas básicas:** response time via interceptor custom
- **Uptime:** simple cron job que hace curl al health check

### Endpoints principales

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
GET    /auth/me

GET    /products
GET    /products/:id
POST   /products          (admin)
PATCH  /products/:id      (admin)
DELETE /products/:id      (admin)

GET    /categories
POST   /categories        (admin)

GET    /cart
POST   /cart/items
PATCH  /cart/items/:id
DELETE /cart/items/:id

POST   /orders/checkout
GET    /orders
GET    /orders/:id
PATCH  /orders/:id/status (admin)
```

### Entregables fase 1

- [ ] Repo con estructura NestJS + todos los módulos
- [ ] Entidades en Prisma schema + migraciones + seeds
- [ ] CRUD completo de productos y categorías
- [ ] Auth con JWT (register, login, refresh, guards)
- [ ] Carrito con sync Redis ↔ PostgreSQL
- [ ] Checkout transaccional con control de stock
- [ ] Dockerfile multi-stage + docker-compose.yml
- [ ] GitHub Actions: test → build → deploy
- [ ] VM UTM configurada y recibiendo deploys
- [ ] Nginx como reverse proxy
- [ ] Swagger docs
- [ ] README.md + docs/phase-1.md con ADRs

---

## Fase 2 — Servicios distribuidos (selectivos)

### Objetivo
Separar solo donde hay una razón técnica real. Demostrar patrones de sistemas distribuidos sin caer en over-engineering.

### Qué se separa y por qué

| Servicio | Razón de separación |
|----------|-------------------|
| **Order Service** | Dominio transaccional complejo, necesita escalar independientemente en picos |
| **Notification Service** | Async por naturaleza, no debe bloquear el flujo principal |
| **API Gateway** | Routing, rate limiting, auth centralizada |

**Qué NO se separa:** Auth y Catalog quedan en el monolito (ahora llamado "Core Service"). No hay razón técnica para separarlos — tienen bajo acoplamiento y bajo tráfico relativo.

### Arquitectura

```
                    ┌──────────────┐
                    │  API Gateway │ ← rate limit, auth, routing
                    │  (NestJS)    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼───┐  ┌────▼─────┐  ┌──▼──────────────┐
     │   Core     │  │  Order   │  │  Notification    │
     │  Service   │  │  Service │  │  Service         │
     │ (auth +    │  │          │  │  (email sim.)    │
     │  catalog + │  │          │  │                  │
     │  cart)     │  │          │  │                  │
     └─────┬──────┘  └────┬─────┘  └────────▲────────┘
           │              │                  │
      ┌────▼────┐    ┌────▼────┐        ┌───┴────┐
      │ PG Main │    │ PG Orders│       │ Redis  │
      └─────────┘    └─────────┘       │ Pub/Sub│ ← message broker
                                        └────────┘
```

### Patrones de sistemas distribuidos a implementar

1. **Event-driven communication:** Redis Pub/Sub (o NATS si queremos algo más robusto) para eventos como OrderCreated → Notification Service.

2. **Saga pattern (coreografía):** El checkout ahora cruza servicios. Core Service reserva stock → emite StockReserved → Order Service crea la orden → emite OrderCreated → si falla, emite OrderFailed → Core Service libera stock.

3. **Circuit breaker:** Si Order Service cae, el Gateway no sigue mandando requests. Implementar con `opossum` (librería Node.js).

4. **Retry con backoff exponencial:** Para comunicación entre servicios.

5. **Distributed tracing:** Correlation ID que viaja en headers a través de todos los servicios. Cada log incluye el correlation ID.

6. **Health checks individuales:** Cada servicio expone /health.

7. **Database per service:** Order Service tiene su propia instancia de PostgreSQL. No comparte base de datos con Core Service.

### CI/CD actualizado

- Monorepo o repos separados (preferencia: monorepo con Nx o Turborepo)
- GitHub Actions con matrix build: solo rebuilds el servicio que cambió
- Deploy independiente por servicio

### Observabilidad (fase 2 — mejorada)

- **Logging estructurado:** JSON logs con correlation ID, timestamp, service name
- **Métricas:** Prometheus + Grafana (corren en la VM)
- **Tracing:** Jaeger para distributed tracing
- **Alertas:** Grafana alerting → notificación por webhook

### Entregables fase 2

- [ ] Core Service (monolito reducido)
- [ ] Order Service independiente con su propia DB
- [ ] Notification Service
- [ ] API Gateway con rate limiting y circuit breaker
- [ ] Event bus (Redis Pub/Sub o NATS)
- [ ] Saga pattern para checkout distribuido
- [ ] Distributed tracing con correlation IDs
- [ ] Prometheus + Grafana + Jaeger corriendo en la VM
- [ ] Docker Compose actualizado con todos los servicios
- [ ] docs/phase-2.md con ADRs de separación

---

## Fase 3 — Kubernetes

### Objetivo
Migrar los servicios a Kubernetes corriendo local (en la VM de UTM), aprender orquestación de containers, auto-scaling, y operaciones de cluster.

### Setup

- **K8s distro:** K3s (ligero, perfecto para ARM64 y recursos limitados)
- **Instalación:** Single-node cluster en la VM de UTM
- **VM actualizada:** 4 CPU, 8GB RAM (K8s necesita más recursos)

### Arquitectura en K8s

```
┌─────────────────── K3s Cluster (VM UTM) ──────────────────┐
│                                                            │
│  Namespace: nexshop                                        │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ core-svc    │  │ order-svc   │  │ notification-svc │   │
│  │ Deployment  │  │ Deployment  │  │ Deployment       │   │
│  │ replicas: 2 │  │ replicas: 2 │  │ replicas: 1      │   │
│  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘   │
│         │                │                   │             │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌────────▼─────────┐   │
│  │ ClusterIP   │  │ ClusterIP   │  │ ClusterIP        │   │
│  │ Service     │  │ Service     │  │ Service          │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ PostgreSQL  │  │ PG Orders   │  │ Redis            │   │
│  │ StatefulSet │  │ StatefulSet │  │ StatefulSet      │   │
│  │ + PVC       │  │ + PVC       │  │                  │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                                                            │
│  ┌───────────────────────────────────────────────────┐     │
│  │ Ingress (Traefik — viene con K3s)                 │     │
│  │ nexshop.local → API Gateway                       │     │
│  └───────────────────────────────────────────────────┘     │
│                                                            │
│  Monitoring namespace:                                     │
│  │ Prometheus │ Grafana │ Jaeger │ (via Helm charts)       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Recursos K8s a implementar

- **Deployments:** Para cada servicio stateless (core, order, notification, gateway)
- **StatefulSets:** Para PostgreSQL y Redis (datos persistentes)
- **Services:** ClusterIP para comunicación interna
- **Ingress:** Traefik (incluido en K3s) para exponer la API
- **ConfigMaps:** Variables de configuración por entorno
- **Secrets:** Credenciales de DB, JWT secret
- **PersistentVolumeClaims:** Storage para PostgreSQL
- **HorizontalPodAutoscaler:** Escalar pods basado en CPU/memoria
- **NetworkPolicies:** Restringir comunicación entre namespaces
- **Liveness/Readiness probes:** Health checks nativos de K8s

### CI/CD en K8s

- GitHub Actions buildea la imagen → push a GHCR
- Deploy con `kubectl apply` o Kustomize (overlays por env)
- Rolling updates con `maxSurge: 1, maxUnavailable: 0`
- Rollback: `kubectl rollout undo`

### Herramientas extra

- **Helm:** Para instalar Prometheus stack, Grafana, Jaeger
- **Kustomize:** Para manejar configs por entorno (dev, staging, prod)
- **Lens o K9s:** CLI/GUI para inspeccionar el cluster

### Entregables fase 3

- [ ] K3s instalado y corriendo en VM UTM
- [ ] Manifiestos K8s para todos los servicios
- [ ] StatefulSets para PostgreSQL y Redis con PVCs
- [ ] Ingress configurado con Traefik
- [ ] HPA configurado para al menos un servicio
- [ ] Prometheus + Grafana via Helm
- [ ] CI/CD actualizado para deploy a K8s
- [ ] docs/phase-3.md con ADRs de migración

---

## Fase 4 — Migración a AWS

### Objetivo
Llevar todo a AWS usando servicios managed donde tenga sentido, manteniendo Kubernetes pero ahora en EKS.

### Arquitectura en AWS

```
┌─────────────────────── AWS ───────────────────────────┐
│                                                        │
│  Route 53 (DNS)                                        │
│       │                                                │
│  ALB (Application Load Balancer)                       │
│       │                                                │
│  ┌────▼─────────────── EKS Cluster ──────────────┐     │
│  │                                                │     │
│  │  core-svc    order-svc    notification-svc     │     │
│  │  (pods)      (pods)       (pods)               │     │
│  │                                                │     │
│  └────────────────────────────────────────────────┘     │
│       │              │              │                   │
│  ┌────▼────┐    ┌────▼────┐   ┌────▼────┐              │
│  │ RDS     │    │ RDS     │   │ Elasti- │              │
│  │ PG main │    │ PG ord. │   │ Cache   │              │
│  └─────────┘    └─────────┘   │ (Redis) │              │
│                               └─────────┘              │
│                                                        │
│  ECR (Container Registry)                              │
│  CloudWatch (Logs + Métricas)                          │
│  S3 (imágenes de productos, backups)                   │
│  SQS/SNS (reemplaza Redis Pub/Sub para eventos)        │
│  Secrets Manager (credenciales)                        │
│  IAM (roles para pods via IRSA)                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Servicios AWS a usar

| Servicio local | Reemplazo AWS | Razón |
|---------------|---------------|-------|
| PostgreSQL (Docker) | RDS PostgreSQL | Backups automáticos, replicas, patching |
| Redis (Docker) | ElastiCache | Managed, cluster mode si escala |
| Redis Pub/Sub | SQS + SNS | Durabilidad de mensajes, dead-letter queues |
| Docker Registry (GHCR) | ECR | Integración nativa con EKS |
| K3s | EKS | Managed control plane |
| Traefik Ingress | AWS ALB Ingress Controller | Integración con Route 53, ACM (SSL) |
| Prometheus/Grafana | CloudWatch + Prometheus managed | Reduce overhead operacional |
| Self-signed SSL | ACM (Certificate Manager) | SSL real, renovación automática |

### Infraestructura como código

- **Terraform:** Para provisionar toda la infra de AWS (VPC, subnets, EKS, RDS, ElastiCache, etc.)
- **Estructura:**

```
infra/
├── modules/
│   ├── vpc/
│   ├── eks/
│   ├── rds/
│   ├── elasticache/
│   ├── ecr/
│   └── monitoring/
├── environments/
│   ├── staging/
│   │   └── main.tf
│   └── production/
│       └── main.tf
└── backend.tf        # S3 + DynamoDB para tfstate
```

### CI/CD final

```
Push a main
    │
    ├── Test (lint + unit + e2e)
    │
    ├── Build → Push a ECR
    │
    ├── Terraform plan (si cambió infra/)
    │
    ├── Deploy a staging (kubectl apply)
    │      │
    │      └── Smoke tests automatizados
    │
    └── Deploy a production (manual approval)
           │
           └── Canary deployment o blue/green
```

### Consideraciones de costo

Para mantener costos bajos (es un proyecto de portafolio):
- **EKS:** ~$75/mes solo el control plane
- **EC2 (worker nodes):** t4g.medium (~$30/mes) — ARM64, consistente con desarrollo local
- **RDS:** db.t4g.micro (~$15/mes, free tier si es cuenta nueva)
- **ElastiCache:** cache.t4g.micro (~$12/mes)
- **Tip:** Usar spot instances para workers, apagar staging fuera de horario con un cron

**Presupuesto estimado:** ~$130-180/mes con todo corriendo. Se puede bajar a ~$75 apagando staging.

### Entregables fase 4

- [ ] Terraform para toda la infra AWS
- [ ] EKS cluster corriendo con los servicios migrados
- [ ] RDS + ElastiCache reemplazando DBs locales
- [ ] SQS/SNS reemplazando Redis Pub/Sub
- [ ] ECR como registry
- [ ] ALB + Route 53 + ACM para SSL real
- [ ] CloudWatch para logs y métricas
- [ ] CI/CD completo: test → build → staging → production
- [ ] docs/phase-4.md con ADRs de migración

---

## Documentación en el repo

```
docs/
├── architecture.md          ← este documento (versión resumida en el repo)
├── adr/
│   ├── 001-nestjs-monolith.md
│   ├── 002-prisma-schema-migrations.md
│   ├── 003-redis-cart-strategy.md
│   ├── 004-service-separation.md
│   ├── ...
├── phase-1.md               ← estado, decisiones, aprendizajes
├── phase-2.md
├── phase-3.md
├── phase-4.md
├── api.md                   ← complemento a Swagger
├── runbook.md               ← cómo operar: deploy, rollback, troubleshoot
└── diagrams/                ← exportados de los diagramas de arquitectura
```

### Formato ADR (Architecture Decision Record)

```markdown
# ADR-001: Usar NestJS como framework

## Estado
Aceptado

## Contexto
Necesitamos un framework Node.js que soporte inyección de dependencias,
módulos bien definidos, y que facilite la transición a microservicios.

## Decisión
Usamos NestJS porque su sistema de módulos mapea 1:1 con bounded contexts,
tiene soporte nativo para microservicios (transport layer),
y TypeScript es first-class citizen.

## Consecuencias
- (+) Estructura consistente entre desarrolladores
- (+) Transición a microservicios solo requiere cambiar el transport layer
- (-) Curva de aprendizaje para decoradores y DI
- (-) Más boilerplate que Express puro
```

---

## Estrategia de acceso para entrevistadores

| Fase | Cómo mostrar el proyecto |
|------|-------------------------|
| 1-3 (local) | GitHub repo + README con GIFs/screenshots + video demo corto (Loom o similar). Opcionalmente Cloudflare Tunnel para demo en vivo temporal. |
| 4 (AWS) | URL pública real. Dominio opcional (~$12/año) para toque profesional, o usar el DNS del ALB directamente. |

Lo que más revisan los entrevistadores: calidad del código, commits atómicos, documentación, y ADRs. La URL pública es un plus, no un requisito.

---

## Timeline estimado

| Fase | Duración estimada | Prerrequisitos |
|------|------------------|----------------|
| Fase 1 | 3-4 semanas | VM UTM lista, Node.js instalado |
| Fase 2 | 3-4 semanas | Fase 1 completa y estable |
| Fase 3 | 2-3 semanas | Fase 2 completa |
| Fase 4 | 2-3 semanas | Fase 3 completa, cuenta AWS |

**Total estimado: 10-14 semanas**

---

## Próximo paso

Iniciar fase 1: scaffolding del proyecto NestJS + configuración de la VM.