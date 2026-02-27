FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates python3 make g++ git \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/public ./public

RUN npm run build

RUN groupadd --system app && useradd --system --gid app --create-home app
RUN mkdir -p /app/data /workspace/.tools/npm && chown -R app:app /app /workspace

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV DB_PATH=/app/data/app.sqlite
ENV WORKSPACE_ROOT=/workspace
ENV EXECUTION_TIMEOUT_MS=30000
ENV NPM_CONFIG_PREFIX=/workspace/.tools/npm
ENV PATH=/workspace/.tools/npm/bin:${PATH}

USER app

EXPOSE 8080
CMD ["npm", "start"]
