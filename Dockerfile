FROM node:20-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED="1"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

FROM base AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm generate:tools
RUN pnpm build

FROM base AS runtime

ENV NODE_ENV="production"

COPY --from=build /app /app

EXPOSE 3000

CMD ["pnpm", "--filter", "@tool-platform/web", "exec", "next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
