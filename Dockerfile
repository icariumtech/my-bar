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

# Drops devDependencies (vite, typescript, vitest) before the runtime copy
# (PITFALLS.md Pitfall 8).
RUN pnpm prune --prod

FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Wholesale copy — do not cherry-pick individual subdirectories, since
# pnpm's workspace node_modules is a tree of relative symlinks that breaks
# if only some directories are copied. This also preserves the exact
# monorepo-relative layout apps/server/src/index.ts expects at runtime
# (path.join(__dirname, '../../barback/dist') etc.).
COPY --from=builder /app /app

EXPOSE 3000

CMD ["node", "apps/server/dist/index.js"]
