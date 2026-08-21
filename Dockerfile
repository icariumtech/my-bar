# Multi-stage build for the my-bar monorepo (Fastify server + Patron/
# Bartender/Barback Vite SPAs). Both stages use node:22-slim (D-Stack).

FROM node:22-slim AS builder

# Fallback so better-sqlite3 can compile its native binding from source if
# no prebuilt matches this platform/Node ABI. pnpm-workspace.yaml's
# allowBuilds already permits its postinstall step to run (PITFALLS.md
# Pitfall 1).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Pin the exact pnpm version this repo's pnpm-lock.yaml (lockfileVersion
# 9.0) was generated with — keep this version string in sync with Plan
# 05-02's CI workflow.
RUN corepack enable && corepack prepare pnpm@11.17.0 --activate

WORKDIR /app

# Copy only the manifests needed to resolve the workspace dependency graph
# first, so this install layer stays cached across source-only rebuilds
# (PITFALLS.md Pitfall 7's layer-separation technique).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/barback/package.json ./apps/barback/package.json
COPY apps/patron/package.json ./apps/patron/package.json
COPY apps/bartender/package.json ./apps/bartender/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

# Builds @my-bar/shared, then server + all three Vite SPAs, preserving the
# apps/*/dist monorepo-relative layout the runtime expects.
RUN pnpm -r build

FROM node:22-slim AS runtime

# Same fallback as the builder stage: better-sqlite3 (a real @my-bar/server
# runtime dependency) may need to compile its native binding from source in
# this stage too if no prebuilt matches this platform/Node ABI (PITFALLS.md
# Pitfall 1).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.17.0 --activate

ENV NODE_ENV=production

WORKDIR /app

# A fresh --prod install directly in the runtime stage, not a prune-and-copy
# of the builder's node_modules. `pnpm prune --prod` followed by copying the
# workspace's symlink tree across stages proved fragile in practice — it
# dropped `fastify` (a real @my-bar/server prod dependency) at runtime with
# ERR_MODULE_NOT_FOUND, caught on first real deployment. A fresh filtered
# install avoids relying on prune's cross-stage symlink integrity entirely.
# --filter @my-bar/server... installs only @my-bar/server and its workspace
# dependency chain (@my-bar/shared) — not barback/patron/bartender's
# devDependency-heavy React/Vite toolchains, which the running container
# never needs (their build output is static files, already produced in the
# builder stage). All manifests are copied (not just server's) because
# pnpm-lock.yaml's importers section expects every workspace package listed
# there to have a package.json on disk.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/barback/package.json ./apps/barback/package.json
COPY apps/patron/package.json ./apps/patron/package.json
COPY apps/bartender/package.json ./apps/bartender/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --prod --frozen-lockfile --filter @my-bar/server...

# drizzle-kit as a standalone global CLI (npm, not pnpm) — deliberately NOT
# added to @my-bar/server's pnpm-managed dependency graph. It's a devDependency
# there for local `pnpm db:push`, and pulling it in via pnpm would drag in
# devDependency-tier resolution for the whole filtered install; a global npm
# install keeps it isolated and this stage's pnpm install --prod above still
# excludes every other devDependency. Version pinned to match
# apps/server/package.json's devDependencies.drizzle-kit.
RUN npm install -g drizzle-kit@0.31.10

# Only the built artifacts the running server actually needs: its own dist,
# the three frontend SPA bundles it serves via @fastify/static, and the
# @my-bar/shared package's compiled output (its package.json "main" points
# at ./dist/index.js, resolved through the workspace symlink pnpm install
# just created above).
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/barback/dist ./apps/barback/dist
COPY --from=builder /app/apps/patron/dist ./apps/patron/dist
COPY --from=builder /app/apps/bartender/dist ./apps/bartender/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Schema source drizzle-kit needs at container startup (see
# docker-entrypoint.sh) — schema.ts has no local imports (drizzle-orm/
# sqlite-core only), so this is the complete set of source files required.
COPY apps/server/drizzle.config.ts ./apps/server/drizzle.config.ts
COPY apps/server/src/db/schema.ts ./apps/server/src/db/schema.ts

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
