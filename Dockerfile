# ============ Tầng 1: build UI (React/Vite) → file tĩnh ============
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
# Copy manifest trước + npm ci → tận dụng cache layer khi chỉ đổi source
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# vite.config: build.outDir = ../backend/src/main/resources/static
# → UI build ra /app/backend/src/main/resources/static (tầng 2 lấy lại)
RUN npm run build

# ============ Tầng 2: build backend (Spring) → jar ĐÃ KÈM UI ============
FROM maven:3.9-eclipse-temurin-17 AS backend
WORKDIR /app/backend
COPY backend/ ./
# Nhét UI vừa build vào static/ TRƯỚC khi đóng jar → jar tự chứa cả UI
COPY --from=frontend /app/backend/src/main/resources/static ./src/main/resources/static
# skipTests: test cần Postgres + env → chạy ở CI riêng, không trong lúc build image
RUN mvn -B -q clean package -DskipTests

# ============ Tầng 3: runtime gọn — chỉ JRE + jar, không có Maven/Node ============
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=backend /app/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
