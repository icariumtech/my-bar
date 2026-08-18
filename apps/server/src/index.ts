import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { ingredientsRoutes } from './routes/ingredients.js'
import { categoriesRoutes } from './routes/categories.js'
import { recipesRoutes } from './routes/recipes.js'
import { glasswareRoutes } from './routes/glassware.js'
import { tagsRoutes } from './routes/tags.js'
import { ordersRoutes } from './routes/orders.js'
import { registerSocketHub } from './ws/hub.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function buildApp() {
  const app = Fastify({ logger: true })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // T-01-03: CORS is only opened to the Vite dev origin, and only outside
  // production — production serves the SPA same-origin so no cross-origin
  // grant is needed there.
  if (process.env.NODE_ENV !== 'production') {
    app.register(fastifyCors, {
      origin: ['http://localhost:5173'],
    })
  }

  // Registered BEFORE the route plugins below — order matters. Fastify
  // decorators set on the parent instance before a child plugin registers
  // are visible inside that child's handlers via Fastify's parent-to-child
  // encapsulation; registering the hub after the routes would leave
  // `app.io` undefined inside them.
  registerSocketHub(app)

  app.register(ingredientsRoutes, { prefix: '/api/ingredients' })
  app.register(categoriesRoutes, { prefix: '/api/categories' })
  app.register(recipesRoutes, { prefix: '/api/recipes' })
  app.register(glasswareRoutes, { prefix: '/api/glassware' })
  app.register(tagsRoutes, { prefix: '/api/tags' })
  app.register(ordersRoutes, { prefix: '/api/orders' })

  // T-01-05: root is confined to the built SPA directory only, never the
  // repo root — @fastify/static rejects path traversal outside `root`.
  app.register(fastifyStatic, {
    root: path.join(__dirname, '../../barback/dist'),
    prefix: '/barback/',
  })

  // decorateReply: false is REQUIRED on this second @fastify/static
  // registration — @fastify/static only allows one `sendFile`
  // reply-decorator to be installed per Fastify instance, and omitting
  // this option on the second call throws a duplicate-decorator error at
  // boot.
  app.register(fastifyStatic, {
    root: path.join(__dirname, '../../patron/dist'),
    prefix: '/patron/',
    decorateReply: false,
  })

  return app
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const app = buildApp()
  const port = process.env.PORT ? Number(process.env.PORT) : 3000
  // 0.0.0.0: reachable from other devices (phone, iPads) on the LAN, not
  // just localhost.
  app.listen({ port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
}
