import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// bartender-done-still-broken: bartender-done-button-no-effect (d658aab) and
// bartender-done-list-not-clearing (055f3eb) were both fixed, unit-tested,
// and committed in source — but `apps/bartender/dist` (the static bundle
// @fastify/static actually serves under `/bartender/`, per index.ts below)
// was never rebuilt afterward. That bundle is the ONLY thing a real LAN
// device (iPad/phone) can reach, since the Vite dev server binds to
// localhost only (no `server.host` override in vite.config.ts) — so real
// devices kept hitting the original pre-fix bugs while dev-server/curl
// reproduction looked fixed. This guards specifically against that class of
// gap recurring: if either of the two files that gap actually bit is edited
// again without a rebuild, the currently-served bundle is stale relative to
// a known-fixed source file, and this test fails until
// `pnpm --filter bartender build` runs.
//
// If `apps/bartender/dist` doesn't exist yet at all (fresh clone, never
// built), newestAssetMtime() returns 0 and every case fails — that's
// intentional: it's the same "the deployed artifact doesn't reflect this
// fix" state this test exists to catch, just at its most extreme.
describe('bartender static bundle freshness (apps/server serves apps/bartender/dist under /bartender/)', () => {
  const distDir = path.join(__dirname, '../../bartender/dist')

  function newestAssetMtime(): number {
    const assetsDir = path.join(distDir, 'assets')
    if (!fs.existsSync(assetsDir)) return 0
    return fs
      .readdirSync(assetsDir)
      .map((f) => fs.statSync(path.join(assetsDir, f)).mtimeMs)
      .reduce((max, t) => Math.max(max, t), 0)
  }

  const fixedSourceFiles = [
    ['../../bartender/src/api/client.ts', 'd658aab — Content-Type on bodyless requests'],
    ['../../bartender/src/api/useMarkOrderDone.ts', '055f3eb — optimistic orders cache update'],
  ] as const

  it.each(fixedSourceFiles)('dist/assets is not older than %s (%s)', (relPath) => {
    const srcMtime = fs.statSync(path.join(__dirname, relPath)).mtimeMs
    const distMtime = newestAssetMtime()

    expect(distMtime).toBeGreaterThanOrEqual(srcMtime)
  })
})
