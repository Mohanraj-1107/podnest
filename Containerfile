# ---------- Stage 1: build the Spring Boot jar ----------
FROM docker.io/library/maven:3.9-eclipse-temurin-17 AS build

WORKDIR /workspace

# Resolve dependencies first so this layer is reused while only sources change.
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline

COPY src ./src
RUN mvn -B -ntp clean package

# ---------- Stage 2: runtime ----------
FROM docker.io/library/eclipse-temurin:17-jre


RUN groupadd --system spring && useradd --system --gid spring spring


WORKDIR /app

# The build produces a single bootable jar; the .original file is not matched.
COPY --from=build /workspace/target/*.jar /app/app.jar

USER spring:spring

EXPOSE 8080

# JVM reads JAVA_TOOL_OPTIONS automatically, e.g. -Xms256m -Xmx512m.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]