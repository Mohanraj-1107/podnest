# Podnest

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Podman](https://img.shields.io/badge/Podman-Containers-892CA0?logo=podman&logoColor=white)](https://podman.io)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4%20%2F%204.2-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org)
[![nginx](https://img.shields.io/badge/nginx-1.27-009639?logo=nginx&logoColor=white)](https://nginx.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![Redis](https://img.shields.io/badge/Redis-7.4-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

A laboratory project created to gain hands-on experience with containers, Podman, Podman Compose,
nginx, and communication between Spring Boot microservices.

---

## What you can learn

### 1. Writing multi-stage Containerfiles

Build and package the application in one stage, then copy only the produced artifact into a small
runtime image. The backend image compiles the sources with Maven and starts the resulting jar; the
frontend image builds the React bundle with Node and serves it from nginx. Multi-stage builds keep
the final images small and free of build tools.

### 2. Writing a Compose file that runs multiple services

Describe MySQL, Redis, two Spring Boot services, and nginx in a single Compose file. You can
practise health checks, startup ordering, environment-based configuration, named volumes for
persistent data, and private service-to-service networking.

### 3. Using nginx as a reverse proxy and as a frontend server

nginx serves the built React application as static files and proxies API requests to the correct
backend service. The project shows path-based routing to two different Spring Boot services, along
with the headers and timeouts an SSE endpoint needs so events are not buffered or cut off.

### 4. Communication between loosely coupled microservices

The order backend calls a separate notification service over HTTP after an order is committed. The
two services share no code or database, and a notification failure never fails the order. This
demonstrates best-effort, asynchronous integration between independently deployable services.

### 5. Server-Sent Events (SSE)

Work with `SseEmitter` in Java to push notifications to every connected client. The notification
service keeps a registry of open emitters, persists each event before broadcasting it, sends
heartbeat comments to keep connections alive, and exposes history so clients that connect late can
load what they missed.

### 6. Podman fundamentals

Understand containers, images, and Compose stacks, and how Podman volumes keep MySQL and Redis data
across restarts. Only nginx publishes a host port; the databases and backends stay on the internal
Compose network, which shows how service discovery and network isolation work in practice.

---

## Tech stack

| Layer | Technology | Role |
|-------|------------|------|
| Frontend | React + TypeScript (Vite) | Console UI for all APIs |
| Web server / reverse proxy | nginx | Serves the SPA and routes `/api/...` to the services |
| Backend | Spring Boot (Java 17) | REST APIs, business logic, and SSE support |
| Notification service | Spring Boot (Java 17) | Separate microservice that stores and streams notifications |
| Cache | Redis | Product caching, notes, and counters |
| Persistence | MySQL | Relational data such as products, customers, and orders |

## How to Run the podnest ? 

You can run the application using Docker Compose or Podman Compose.

1. Download the `podman-compose-prod.yaml` file.
2. Install Podman and Podman Compose or Docker and Docker Compose.
3. Open a terminal in the directory containing the YAML file.
4. Run the following command:

   ```bash
   podman-compose -p podnest -f podman-compose-prod.yaml up -d
5. Access the application at http://localhost:8090