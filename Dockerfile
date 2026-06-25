FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Resolve dependencies in a cached layer — only re-runs when pom.xml changes.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

# Build the application (deps already cached above).
COPY src ./src
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
COPY --chown=appuser:appgroup --from=build /app/target/*.jar app.jar
USER appuser
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
