FROM gradle:8.14-jdk21 AS build

WORKDIR /workspace
COPY settings.gradle build.gradle ./
COPY src ./src
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=neon
EXPOSE 9898

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
