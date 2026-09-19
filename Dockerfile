# Build the React UI first, then serve it and the API from one small Python image.
FROM node:22-alpine AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV IDEA_EVALUATOR_HOST=0.0.0.0
ENV IDEA_EVALUATOR_PORT=8787
COPY bridge/ ./bridge/
COPY --from=web-build /app/web/dist ./web/dist/
RUN mkdir -p data runs
EXPOSE 8787
VOLUME ["/app/data", "/app/runs"]
CMD ["python3", "bridge/server.py"]
