FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline
COPY src src
RUN mvn -B -ntp verify
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S mobioff && adduser -S mobioff -G mobioff
USER mobioff
COPY --from=build /app/target/mobioff-demo-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
