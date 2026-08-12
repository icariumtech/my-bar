import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { z } from 'zod'
import { tag, TAG_GROUP_ORDER } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { tags } from '../db/schema.js'

interface TagsRoutesOptions extends FastifyPluginOptions {
  // Injection point for tests (src/routes/tags.test.ts), same pattern as
  // categoriesRoutes/glasswareRoutes — defaults to the real db in normal
  // server boot.
  db?: typeof defaultDb
}

// D-35: read-only this phase — no owner-facing tag-CRUD UI exists yet, so
// this plugin exposes GET only.
export const tagsRoutes: FastifyPluginAsync<TagsRoutesOptions> = async (app, opts) => {
  const db = opts.db ?? defaultDb

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: {
          200: z.array(tag),
        },
      },
    },
    async () => {
      const rows = db.select().from(tags).all()
      // Sorted in application code, not SQL — the tiny row count (24) makes
      // a JS sort trivial and keeps the canonical order defined in exactly
      // one place (TAG_GROUP_ORDER).
      return rows.sort(
        (a, b) => TAG_GROUP_ORDER.indexOf(a.group) - TAG_GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name),
      )
    },
  )
}
