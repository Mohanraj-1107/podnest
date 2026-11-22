# podnest
A project lab created to learn and experiment with Nginx, containers, Podman, Podman Compose, and Spring Boot microservice communication.


# Spring Boot + MySQL + Redis demo

A small Spring Boot service with **five groups of dummy CRUD APIs** that show two different
storage strategies:

| # | API group | Storage | What it demonstrates |
|---|-----------|---------|----------------------|
| 1 | `/api/v1/products` | MySQL + Redis | JPA CRUD with a cache-aside read cache and cache eviction on writes |
| 2 | `/api/v1/customers` | MySQL | Plain relational CRUD, unique email, validation |
| 3 | `/api/v1/orders` | MySQL | Many-to-one relation to customers, server-side totals, status updates |
| 4 | `/api/v1/notes` | Redis only | CRUD on a Redis hash of JSON documents (no database at all) |
| 5 | `/api/v1/redis` | Redis | Server info, cache inspection/eviction, atomic counters |

A React + TypeScript console in [`frontend/`](frontend) exercises all five groups.

Stack: Java 17, Spring Boot 3.4.2 (Web, Data JPA, Data Redis, Validation), MySQL 8+, Redis 7+,
Hibernate, Lettuce, JUnit 5 + Mockito. The UI uses React 18, Vite and TypeScript. Build with the
included Maven Wrapper, so Maven does not need to be installed.

---

## Quick start

### Run the full stack with Podman

```bash
podman compose -p crud-demo up -d --build
```

This builds and starts MySQL 8.4, Redis 7.4, the Spring Boot API and the nginx/React UI.
Open <http://localhost:8090>. The UI proxies API calls to `http://localhost:8090/api/v1/...`.

MySQL, Redis and the backend stay on the compose network and are not published on the host. See
[Run the full stack with Podman](#run-the-full-stack-with-podman) for logs, ports and configuration.

### Run without containers

Point the app at an existing MySQL/Redis instance (see [Configuration](#configuration)):

```bash
# Windows
.\mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```

Or build the jar and run it:

```bash
.\mvnw.cmd clean package
java -jar target/spring-mysql-redis-demo-0.0.1-SNAPSHOT.jar
```

The app starts on <http://localhost:8080>. Tables are created automatically by Hibernate
(`spring.jpa.hibernate.ddl-auto=update`), and a few demo rows are inserted on first start.

### Try it

```bash
curl http://localhost:8080/api/v1/products
curl http://localhost:8080/api/v1/notes
curl http://localhost:8080/api/v1/redis/info
```

With the Podman stack, use port `8090` instead:

```bash
curl http://localhost:8090/api/v1/products
```

`api.http` contains ready-to-run requests for IntelliJ IDEA / VS Code REST Client.

To use the UI instead, start the React console described in [React frontend](#react-frontend).

---

## Configuration

Everything has a working default; override with environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `SERVER_PORT` | `8080` | HTTP port |
| `MYSQL_URL` | `jdbc:mysql://localhost:3306/demo_db?...` | JDBC URL (`createDatabaseIfNotExist=true`) |
| `MYSQL_USER` | `demo` | MySQL user |
| `MYSQL_PASSWORD` | `demo123` | MySQL password |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(empty)* | Redis password |
| `PRODUCT_CACHE_TTL_SECONDS` | `60` | TTL of cached product data |
| `SHOW_SQL` | `false` | Log generated SQL |

If you already have a local MySQL with `root` / `root`, run:

```powershell
$env:MYSQL_USER='root'; $env:MYSQL_PASSWORD='root'; .\mvnw.cmd spring-boot:run
```

The demo only creates its own tables and Redis keys prefixed with `demo:`.

---

## React frontend

`frontend/` is a Vite + React + TypeScript console with a page for each API group:

* **Dashboard** — record counts, storage map, Redis status and latest orders
* **Products** — table + create/edit modals, cache status and a “clear cache” action
* **Customers** — table + create/edit modals
* **Orders** — customer filter, server-calculated total preview, inline status changes
* **Notes** — card grid backed only by Redis
* **Redis tools** — server stats, demo key inspection, product cache flush, live counters

### Run it

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to `http://localhost:8080`, so no CORS setup is
needed. If the backend runs on another port, override the proxy target:

```powershell
$env:VITE_PROXY_TARGET='http://localhost:8081'; npm run dev
```

or create `frontend/.env.local` containing `VITE_PROXY_TARGET=http://localhost:8081`.

### Production build

```bash
npm run build
```

The static bundle is written to `frontend/dist/`. Serve it from any web server and point it at the
same origin as the API (or add `VITE_API_BASE` at build time).

---

## Run the full stack with Podman

The container files build everything from source, so the host only needs Podman:

| File | Purpose |
|------|---------|
| `Containerfile` | Multi-stage backend build: Maven compiles and packages the jar, then a JRE image runs `java -jar /app/app.jar` |
| `frontend/Containerfile` | Multi-stage frontend build: Node produces `dist/`, then nginx serves it |
| `frontend/nginx.conf` | nginx configuration: serve the SPA and reverse-proxy `/api/` to the backend |
| `compose.yaml` | The four-service stack (MySQL, Redis, backend, frontend) |

Request flow:

```
browser -> localhost:8090 -> frontend (nginx :80)
                              |-- /              -> React static files
                              `-- /api/v1/...    -> backend:8080
                                                      |-- mysql:3306
                                                      `-- redis:6379
```

Only the frontend publishes a host port. MySQL, Redis and the backend stay on the compose network,
so the stack does not collide with services already listening on 3306, 6379 or 8080.

### 1. Prerequisites

```bash
podman --version
podman machine start          # Windows/macOS, after the one-time `podman machine init`
podman compose version        # or: podman-compose --version
```

`podman compose` needs a compose provider. If it is not installed, either install
[`podman-compose`](https://github.com/containers/podman-compose)
(`pipx install podman-compose`) or Docker Compose, which Podman can delegate to.

### 2. Build and start

```bash
cd spring-mysql-redis-demo
podman compose -p crud-demo up -d --build
podman compose -p crud-demo ps
```

With `podman-compose` instead of `podman compose`:

```bash
podman-compose -p crud-demo up -d --build
```

The first build downloads Maven and npm dependencies, so it takes a few minutes. Compose starts
MySQL and Redis first, waits for their health checks, then starts the backend, and finally nginx.

Open <http://localhost:8090>. To use another port, set `FRONTEND_PORT`:

```powershell
$env:FRONTEND_PORT="9000"
podman compose -p crud-demo up -d
```

or create a `.env` file next to `compose.yaml`:

```dotenv
FRONTEND_PORT=9000
```

### 3. Override configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `FRONTEND_PORT` | `8090` | Host port for nginx |
| `DEMO_DB_NAME` | `demo_db` | MySQL database created on first start |
| `DEMO_DB_USER` | `demo` | Application database user |
| `DEMO_DB_PASSWORD` | `demo123` | Application database password |
| `DEMO_DB_ROOT_PASSWORD` | `root123` | MySQL root password |
| `PRODUCT_CACHE_TTL_SECONDS` | `60` | Product cache TTL |

The `DEMO_DB_*` names intentionally differ from the `MYSQL_*` variables the backend reads, so a
`MYSQL_USER` exported in your shell cannot leak into the container configuration.

### 4. Build the images on their own

```bash
podman build -t localhost/crud-demo-backend:latest .
podman build -t localhost/crud-demo-frontend:latest ./frontend
```

Running the backend image by itself still needs reachable MySQL and Redis containers, so the compose
file is the recommended path. The frontend image expects a host named `backend` on the same network,
which compose provides.

### 5. Logs, stop and reset

```bash
# follow application logs
podman compose -p crud-demo logs -f backend frontend

# stop and remove the containers (named volumes survive)
podman compose -p crud-demo down

# also delete MySQL and Redis data
podman compose -p crud-demo down -v
```

After changing Java or frontend sources, rebuild with `up -d --build`. Because the container files
copy the project into the build stages, no bind mounts are used and SELinux relabeling is not
needed. If you add a bind mount later on Fedora/RHEL, append `:Z` to the volume path.

---

## API reference

Base URL: `http://localhost:8080/api/v1`

### Products — MySQL + Redis cache

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List all (cached as `demo:products:all`, TTL 60 s) |
| GET | `/products/{id}` | Get one (cached as `demo:product:{id}`) |
| GET | `/products/search?name=key` | Case-insensitive name search (not cached) |
| POST | `/products` | Create |
| PUT | `/products/{id}` | Update |
| DELETE | `/products/{id}` | Delete |

```bash
curl -X POST http://localhost:8080/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop Stand","description":"Aluminium","price":49.90,"stock":25}'
```

Writes evict `demo:products:all` and the affected `demo:product:{id}` key, so the next read
repopulates the cache from MySQL. If Redis is unreachable the API still works: cache errors are
logged and treated as misses.

### Customers — MySQL

| Method | Path |
|--------|------|
| GET | `/customers` |
| GET | `/customers/{id}` |
| POST | `/customers` |
| PUT | `/customers/{id}` |
| DELETE | `/customers/{id}` |

Request body:

```json
{"name":"Dana Lee","email":"dana@example.com","phone":"+1-555-0199"}
```

Emails are unique (duplicate → `409 Conflict`) and validated. Deleting a customer that still has
orders returns `409` as well.

### Orders — MySQL

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | All orders |
| GET | `/orders?customerId=1` | Orders of one customer |
| GET | `/orders/{id}` | One order |
| POST | `/orders` | Create (total computed by the server, status `CREATED`) |
| PUT | `/orders/{id}` | Update items |
| PATCH | `/orders/{id}/status` | Change status (`CREATED`, `PAID`, `SHIPPED`, `CANCELLED`) |
| DELETE | `/orders/{id}` | Delete |

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"productName":"27-inch Monitor","quantity":2,"unitPrice":219.00}'
```

`totalPrice` is always `quantity × unitPrice`; client-supplied totals are ignored.

### Notes — Redis only

Stored as JSON fields in the Redis hash `demo:notes`; nothing is written to MySQL.

| Method | Path |
|--------|------|
| GET | `/notes` |
| GET | `/notes/{id}` |
| POST | `/notes` |
| PUT | `/notes/{id}` |
| DELETE | `/notes/{id}` |

```bash
curl -X POST http://localhost:8080/api/v1/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Shopping list","content":"Milk, coffee"}'
```

Note ids are UUID strings generated by the server.

### Redis admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/redis/info` | `PING`, Redis version, DB size, uptime |
| GET | `/redis/cache/keys?pattern=demo:*` | Inspect demo keys (patterns must start with `demo:`) |
| DELETE | `/redis/cache` | Delete all `demo:product*` cache entries |
| POST | `/redis/counters/{name}/increment?by=1` | Atomically increment a counter |
| GET | `/redis/counters/{name}` | Read a counter (missing → `0`) |
| DELETE | `/redis/counters/{name}` | Delete a counter |

Counter names may only contain letters, digits, `_` and `-` (max 40 chars).

---

## Error format

All handled errors return a consistent JSON body:

```json
{
  "timestamp": "2026-01-01T10:15:30Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/products",
  "details": {"price": "price must be zero or positive"}
}
```

`404` for missing ids, `400` for validation/bad input, `409` for duplicate or referenced records,
`500` for unexpected failures.

---

## Tests

```bash
.\mvnw.cmd test
```

The five unit tests mock the repositories/cache, so **no MySQL or Redis is required**:

* `ProductServiceTest` — mapping, not-found handling, cache eviction on create
* `OrderServiceTest` — server-side total calculation, missing customer handling

---

## Project structure

```
spring-mysql-redis-demo/
├── Containerfile                 # Backend image: Maven build -> jar -> JRE runtime
├── compose.yaml                  # Full Podman stack (MySQL, Redis, backend, frontend)
├── api.http                      # Sample requests
├── pom.xml
├── frontend/                     # React + TypeScript console (Vite)
│   ├── Containerfile             # Frontend image: Vite build -> nginx
│   ├── nginx.conf                # SPA + /api reverse proxy
│   ├── src
│   │   ├── api.ts                # typed API client
│   │   ├── components/           # layout, icons, shared UI
│   │   ├── pages/                # dashboard, products, customers, orders, notes, redis
│   │   └── styles.css
│   └── vite.config.ts            # dev proxy to the Spring Boot API
└── src
    ├── main/java/com/example/demo
    │   ├── DemoApplication.java
    │   ├── cache/RedisJsonCache.java      # cache-aside helper (JSON + TTL)
    │   ├── common/                        # error model, exception handler, landing endpoint
    │   ├── config/DataSeeder.java         # demo data on first start
    │   ├── customer/                      # MySQL CRUD
    │   ├── note/                          # Redis-only CRUD
    │   ├── order/                         # MySQL CRUD with relation
    │   ├── product/                       # MySQL CRUD + Redis cache
    │   └── redisadmin/                    # Redis info, cache tools, counters
    ├── main/resources/application.yml
    └── test/java/...                      # unit tests
```

## Design notes / limitations

* This is a demo: no authentication, no pagination, no migrations tool (Hibernate creates the
  schema). A production setup would add Flyway/Liquibase, Spring Security, proper pagination and
  metrics, and would use `SCAN` instead of `KEYS` for cache inspection.
* Product caching is explicit cache-aside via `RedisJsonCache` (JSON values, TTL, eviction) rather
  than `@Cacheable`, so the Redis keys and failure handling are easy to see and test.
* Cache reads fail open: if Redis is down, product endpoints fall back to MySQL. The Redis-only
  note/counter endpoints require Redis, as expected.
