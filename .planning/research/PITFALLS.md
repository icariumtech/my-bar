# Domain Pitfalls: Adding Docker, AI Vision, and MCP to My Bar

**Domain:** Home bar management system with containerization, AI-powered bottle recognition, and unauthenticated MCP server
**Researched:** 2026-08-19
**Overall Confidence:** MEDIUM (mix of HIGH for SDK/SQLite patterns, MEDIUM for Docker multi-stage practices and MCP patterns, LOW for specific pnpm+Docker pitfall verification)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: better-sqlite3 Native Bindings Not Compiled in pnpm Docker Build

**What goes wrong:**  
In `pnpm` 10+, postinstall scripts for native dependencies are blocked by default unless the package appears in an allow-list. When you `pnpm install` in a Docker multi-stage build, `better-sqlite3` installs its JavaScript source but **never compiles the native .node binding**. The runtime container starts, the app loads the better-sqlite3 module, and it silently fails to find the prebuilt or compiled binary at application startup.

**Why it happens:**  
- `pnpm` treats install scripts as a security risk and requires explicit opt-in for the `better-sqlite3` postinstall step
- Multi-stage Docker builds often copy the built `node_modules` from the build stage without ensuring native modules were actually compiled (not just sourced)
- ARM64 (`linux/arm64`) may lack a matching prebuilt binary for your Node version, requiring on-the-fly compilation with `node-gyp`, `python3`, and `build-essential` present at install time

**Consequences:**  
- Application crashes immediately on startup with `Error: Cannot find module '../build/Release/better_sqlite3.node'`
- Docker image builds and pushes successfully, but fails at runtime on the Pi
- This can go undetected if you only test the image on an x86_64 build machine and assume it runs on ARM64

**Prevention:**  
1. **Add `better-sqlite3` to pnpm's `allow-list` for install scripts** in the build stage's `pnpm install` command:
   ```bash
   pnpm install --frozen-lockfile --config.pnpm-shell-shim=true --config.build-from-source=true
   ```
   Or in `.npmrc`:
   ```
   shell-emulator=true
   build-from-source=better-sqlite3
   ```
2. **Ensure build tools and Python are present in the build stage** (not just the runtime stage):
   ```dockerfile
   FROM node:22-bookworm AS builder
   RUN apt-get update && apt-get install -y build-essential python3
   # ... pnpm install
   ```
3. **Test the Docker image on ARM64 before shipping** — build and run locally on ARM hardware or use a CI step that tests multi-arch builds (e.g., GitHub Actions with `docker/setup-buildx-action`)
4. **Verify the binding exists in the final image:**
   ```bash
   docker run --rm <image> find /app -name "better_sqlite3.node"
   ```

**Detection:**  
- Application fails immediately: `Error: Cannot find module '../build/Release/better_sqlite3.node'`
- Log output: `Module not found` at startup
- `docker run <image> npm run start` (or equivalent) exits with non-zero, but `docker build` succeeded with no visible error

---

### Pitfall 2: SQLite WAL File Corruption with Docker Bind-Mounted Database

**What goes wrong:**  
You deploy the app in Docker with the SQLite database file bind-mounted from the host (so data persists across container updates). The app runs fine initially, but after several days or under moderate concurrent load (Patron, Bartender, Barback screens accessing simultaneously), the database mysteriously becomes corrupted or locked (`database is locked` errors, or the .db file becomes unreadable).

**Why it happens:**  
- SQLite WAL mode (`journal_mode = WAL`) uses shared memory (mmap'd `.db-shm` file) for IPC between processes/threads
- When the database directory is bind-mounted from the host into Docker, the `.db`, `.db-wal`, and `.db-shm` files must all live on the same filesystem
- **If the host filesystem is a network mount (CIFS, NFS) or has fsync delays (Docker Desktop on Mac/Windows via 9p/virtiofs), WAL coordination breaks and corruption occurs**
- Additionally, if only the `.db` file is mounted (not the entire `data/` directory), the `.db-wal` and `.db-shm` files may be created inside the container's overlay filesystem and **not persist across restarts**, leading to stale lock files and corruption on next start
- Concurrent writes from multiple connections on the host and inside the container can race if they don't share the same WAL coordination

**Consequences:**  
- Orders, inventory changes, or recipes silently fail to save
- The app appears to work but data rolls back unexpectedly
- After a container restart or pod eviction, the database is unrecoverable without manual intervention
- This is especially damaging because SQLite corruption is often silent until a specific query hits it

**Prevention:**  
1. **Bind-mount the entire database directory, not just the .db file:**
   ```yaml
   # docker-compose.yml
   volumes:
     - ./data:/app/data  # Mount the directory, not /app/data/my-bar.db
   ```
   This ensures `.db`, `.db-wal`, and `.db-shm` all persist and coordinate correctly.

2. **On local home network (Linux host), WAL mode is safe.** Ensure:
   - Host filesystem is ext4 or similar (not network-mounted)
   - Container and host share the same kernel/inode space (not Docker Desktop on Mac/Windows)

3. **Test WAL + concurrent access before shipping:**
   ```bash
   # In tests, run both the app and a concurrent reader/writer
   # Verify no "database is locked" after 10+ minutes
   ```

4. **Add application-level recovery:** If `database is locked` errors occur, implement automatic retry with exponential backoff and a human alert after 3 consecutive failures

5. **Monitor for `.db-wal` file size growth** — if it's always >100MB and never shrinking, checkpoints are failing and corruption risk is high

**Detection:**  
- App logs: `database is locked` or `attempt to write a readonly database`
- SQLite file corruption errors: `Error: file is encrypted or is not a database`
- `.db-wal` or `.db-shm` files missing after container restart (sign of incorrect mount point)
- Inventory changes appear to save but don't persist after a refresh

---

### Pitfall 3: Claude Vision HEIC Format Rejection and iPhone Photo Orientation Mismatch

**What goes wrong:**  
The Barback opens the app on their iPhone, takes a photo of a bottle to add it to inventory (using the phone's native camera), and uploads it directly to the Claude Vision API. Claude silently rejects the image or processes an upside-down/sideways version, returning incorrect bottle data or a generic error that the user sees as "couldn't identify this bottle."

**Why it happens:**  
- iPhones save photos in **HEIC format by default** (Apple's proprietary codec, smaller file size)
- Claude Vision does NOT support HEIC; it only accepts JPEG, PNG, GIF, WebP
- If you attempt to send HEIC directly, the API returns an error, but the web form may not surface it clearly to the user
- When HEIC is converted to JPEG on the client side (or server side) **without proper EXIF rotation handling**, the image can be saved in the wrong orientation (upside down, sideways)
- HEIC files store rotation as EXIF metadata, but conversion tools sometimes ignore this metadata, resulting in images that appear rotated when Claude tries to analyze them
- Rotated images confuse Claude Vision's product identification — labels may be unreadable, or the model misidentifies the bottle entirely

**Consequences:**  
- Users are frustrated by "couldn't identify" errors on perfectly clear photos
- Barback falls back to manual entry, defeating the purpose of photo recognition
- If the photo is occasionally processed (wrong orientation but still analyzable), Claude might return data for a different bottle with high confidence, leading to wrong inventory entries
- On a wall-mounted or kiosk device, users may not understand why a clear photo fails and blame the app

**Prevention:**  
1. **Detect HEIC format before upload and convert to JPEG with proper EXIF rotation:**
   ```typescript
   // In the Barback React component (apps/barback)
   const file = input.files[0];
   if (file.type === 'image/heic' || file.type === 'image/heif') {
     const jpegBlob = await convertHEICtoJPEG(file, { quality: 0.85, maxWidth: 1024 });
     // Use jpegBlob instead of file
   }
   ```
   Use a library like `heic2any` (client-side) or `sharp`/`ImageMagick` (server-side) to handle conversion.

2. **Strip and reapply EXIF orientation during conversion:**
   ```typescript
   import sharp from 'sharp';
   const jpegBuffer = await sharp(heicBuffer)
     .rotate()  // Auto-rotate based on EXIF
     .jpeg({ quality: 85 })
     .toBuffer();
   ```

3. **Validate image before sending to Claude:**
   - Ensure it's one of the supported formats (JPEG, PNG, GIF, WebP)
   - Check file size: stay under 5 MB for Claude API; converting HEIC → JPEG at ~1024px width typically yields ~200–400 KB
   - Log which format was uploaded and which format was sent to Claude (helps debug orientation issues)

4. **Provide clear feedback to the user:**
   - "Processing photo…" while converting
   - If Claude fails to identify, show: "Couldn't identify this bottle. Try a clearer angle or manual entry."
   - Offer a fallback: "Or enter the bottle details manually"

5. **Add orientation metadata to the request:**
   - Include EXIF orientation in the prompt: "This photo was taken on an iPhone. It has been rotated to upright orientation."
   - This helps Claude compensate if any rotation metadata is lost

**Detection:**  
- User uploads HEIC file; app crashes or shows a "file format not supported" error
- User uploads a photo but Claude returns generic response ("I see an object") with low confidence
- Database has entries for wrong bottles (user uploaded photo of Jameson, but Barback lists it as some other brand)
- Log shows: `[ERROR] Unsupported image format` for any HEIC file

---

### Pitfall 4: Confident Hallucination in Claude Vision Bottle Identification Leading to Wrong Inventory Entries

**What goes wrong:**  
The Barback takes a photo of a bottle (any bottle, doesn't matter which), sends it to Claude Vision with the prompt "Identify this bottle," and Claude returns a valid-looking response: `{ "name": "Maker's Mark", "category": "bourbon", "abv": 45 }` — but the bottle in the photo is actually **Knob Creek** or something entirely different. Because the structured response is valid JSON and Claude returned it with high confidence, the app saves this to the database as-is, and now the inventory has the wrong bottle recorded.

**Why it happens:**  
- Claude Vision can hallucinate — it returns plausible-sounding, well-formed data even when it's not certain or the image is ambiguous
- "Confident hallucination" is the specific failure mode: the response looks authoritative (valid schema, plausible data) so you assume it's correct, but it's actually wrong
- Real-world photos of bottles are challenging: labels can be partially obscured, lighting can make text unreadable, or the photo angle makes the brand name hard to see
- LLMs are trained to be helpful and complete, so if they're not certain, they'll guess — and the guess is returned with the same confidence markers as actual data
- Without an explicit confidence score or uncertainty flag in Claude's output, the app has no way to distinguish "I'm very sure this is Jameson" from "I'm guessing this might be some kind of whiskey"

**Consequences:**  
- Inventory becomes unreliable (Patron orders a drink, Bartender looks it up, but the ingredient list is for a different bottle)
- Bartender spends time tracking down missing ingredients that don't actually exist in the database
- Makeable status is wrong (the recipe calls for "Maker's Mark" but the database has "Knob Creek" under that slot)
- Silent data corruption — the database looks clean, but it's wrong

**Prevention:**  
1. **Require human review before saving Claude Vision output:**
   - Show the identified bottle (name, photo, category) to the Barback with a confirmation prompt
   - "Claude identified this as Maker's Mark, bourbon, 45% ABV. Is this correct? [Confirm] [Edit]"
   - Only save if the user explicitly confirms
   - This is a **non-negotiable UX gate** for write operations involving Claude Vision

2. **Add a confidence score to the Claude Vision call:**
   ```typescript
   const response = await client.messages.parse({
     model: 'claude-opus-5-20250804',
     max_tokens: 1024,
     messages: [{
       role: 'user',
       content: [{
         type: 'image',
         source: { type: 'base64', media_type: 'image/jpeg', data: base64Image }
       }, {
         type: 'text',
         text: 'Identify this bottle. Respond with name, category, and abv. Also include a confidence score (0-100) for your identification.'
       }]
     }],
     output_config: {
       format: 'json_schema',
       json_schema: z.object({
         name: z.string(),
         category: z.string(),
         abv: z.number(),
         confidence: z.number().min(0).max(100),
         notes: z.string() // e.g., "Label was partially obscured"
       })
     }
   });
   
   if (response.confidence < 70) {
     // Show "Low confidence" badge, suggest manual verification
   }
   ```

3. **Implement a fallback to manual entry:**
   - If Claude's confidence is below a threshold, default to manual entry instead of auto-filling
   - "Claude couldn't confidently identify this. Enter it manually or try another angle."

4. **Store Claude's reasoning/notes:**
   - Save the `notes` field with each bottle (e.g., "Label was partially obscured; guessing from bottle shape and color")
   - This helps the Barback verify the entry is correct

5. **Never auto-update existing inventory:**
   - If the app is re-analyzing a photo for an ingredient that's already in stock, never silently update it
   - This prevents overwriting correct data with a hallucinated correction

**Detection:**  
- Database queries return wrong ingredient data (e.g., "Knob Creek" listed as "Maker's Mark")
- Barback manually corrects Claude's identification repeatedly for the same bottles
- Patron orders fail because makeable status is based on wrong ingredient data
- Log shows: `[VISION] Confidence: 42% for Maker's Mark (but user said it was actually X)`

---

## Moderate Pitfalls

### Pitfall 5: Schema Mismatch Between Unstructured Recipe Input and App's Structured Schema

**What goes wrong:**  
The Barback shares a recipe link or pastes a screenshot of a recipe into the MCP server (via Claude Code or a Claude Chat session), intending to add it to My Bar. Claude parses the recipe and returns:
```json
{
  "name": "Old Fashioned",
  "ingredients": [
    {"name": "bourbon", "quantity": "2", "unit": "oz"},
    {"name": "sugar cube", "quantity": "1"},
    {"name": "bitters", "quantity": "2", "dashes"}
  ],
  "method": "Stir bourbon, sugar, and bitters with ice..."
}
```

But My Bar's ingredient schema requires:
```json
{
  "ingredientId": "uuid",
  "quantity": 2,
  "unit": "oz",
  "substitutableFrom": ["ingredient-id-2", "ingredient-id-3"]
}
```

And the app's category system has no concept of "sugar cube" vs. "sugar syrup" — they're different ingredients. Claude tries to map the unstructured recipe to the structured schema and creates entries with null IDs, missing units, or categorizes "sugar cube" incorrectly as "liqueur" or just guesses.

**Why it happens:**  
- Recipes in the real world (blogs, PDFs, screenshots) use natural language: "2 oz bourbon," "a dash of bitters," "1 sugar cube"
- My Bar's schema requires referential integrity: every ingredient must exist in the ingredient table and have a valid category
- Claude can parse natural language well, but has no knowledge of My Bar's specific ingredient database (what ingredients exist, which categories, which are substitutable)
- The MCP server has write access but no veto gate — Claude can create recipes with orphaned ingredient references or make up new ingredients
- There's no transaction rollback if Claude makes a mistake mid-recipe (e.g., creates 5 ingredients correctly, then fails on the 6th)

**Consequences:**  
- Malformed recipes in the database with missing or orphaned ingredient references
- The app crashes or shows errors when trying to render the recipe (null dereference on ingredientId)
- Makeable status computation fails because it can't resolve ingredient dependencies
- Database becomes corrupted with invalid foreign keys (if not using constraints) or constraint violations (if constraints are enforced)
- The Barback has to manually fix the recipe in the UI, defeating the purpose of the import

**Prevention:**  
1. **MCP server must validate all imported recipes against the live ingredient database:**
   ```typescript
   // In MCP server implementation
   async function createRecipe(importedRecipe: unknown) {
     const validated = recipeSchema.parse(importedRecipe); // Validate format
     
     // Map ingredient names to live ingredient IDs
     const resolvedIngredients = validated.ingredients.map((ing) => {
       const dbIngredient = await db.query.ingredients.findFirst({
         where: eq(schema.ingredients.name, ing.name)
       });
       if (!dbIngredient) {
         throw new Error(`Ingredient "${ing.name}" not found in database. Add it first.`);
       }
       return { ingredientId: dbIngredient.id, quantity: ing.quantity, unit: ing.unit };
     });
     
     // Only save if all ingredients resolved
     await db.insert(schema.recipes).values({ ...validated, ingredients: resolvedIngredients });
   }
   ```

2. **Provide Claude with a list of valid ingredients and categories:**
   - When creating the MCP tool definition, include the current ingredient list in the system prompt or as a tool parameter
   - "You must use one of these exact ingredient names: bourbon, sugar, lime juice, bitters, ..."
   - This reduces hallucination and helps Claude map "sugar cube" to the correct existing ingredient

3. **Implement a two-step import with human verification:**
   - Step 1: Claude parses the recipe and returns a proposed import (with unmapped ingredients flagged)
   - Step 2: User reviews and maps any unmapped ingredients, then confirms
   - Only save after explicit confirmation
   - This prevents silent bad data

4. **Use structured output with strict schema validation:**
   ```typescript
   output_config: {
     format: 'json_schema',
     json_schema: z.object({
       name: z.string(),
       ingredients: z.array(z.object({
         name: z.enum(['bourbon', 'sugar', 'lime juice', ...]), // Exact enums
         quantity: z.number(),
         unit: z.enum(['oz', 'ml', 'dash', 'barspoon'])
       })),
       method: z.string()
     })
   }
   ```
   This forces Claude to pick from the allowed set instead of inventing new values.

5. **Add database constraints and transaction rollback:**
   - Use `FOREIGN KEY` constraints on ingredient IDs
   - Wrap recipe creation in a transaction; rollback if any ingredient ID is invalid
   - This prevents the database from ever accepting malformed data

6. **Log all MCP write operations with details:**
   - Who called it (MCP client), what was requested, what was validated, what was saved
   - Makes debugging import failures much faster

**Detection:**  
- Recipe appears in the database but Patron/Bartender screens show errors when loading it
- Makeable status computation fails with "ingredientId not found" errors
- Database query returns recipes with null or missing ingredient IDs
- Log shows: `[MCP] Recipe import failed: Ingredient "sugar cube" not mapped`

---

### Pitfall 6: MCP Server Write Access Without Rate Limiting or Audit Trail

**What goes wrong:**  
A Claude Code session connects to the unauthenticated MCP server with write-access tools (create recipe, add ingredient, edit inventory). By accident or via prompt injection, Claude makes 500 calls in rapid succession, creating 500 duplicate or malformed recipes. The operation completes before anyone notices, and now the database is polluted with garbage data. There's no audit log, so you don't know when it happened, who initiated it, or what was created.

**Why it happens:**  
- MCP servers typically have no rate limiting — they assume the client (Claude, another LLM, a developer) is trusted
- My Bar's existing REST API also has no authentication, so there's no natural place to add rate limits without rewriting the API
- Without an audit trail, you have no visibility into MCP operations; the database just has new data and you don't know the source or timestamp
- Claude can get into loops (retry/backoff logic) or prompt-injection scenarios where it calls a tool repeatedly trying to achieve a goal

**Consequences:**  
- Database bloated with duplicate or garbage data (50 copies of the same recipe with slightly different names)
- Manual cleanup required: identify and delete malformed data, restore from backup if necessary
- Barback's UI becomes cluttered with junk recipes, making it hard to find real ones
- Trust in the MCP system is destroyed; feature gets disabled and falls back to manual entry

**Prevention:**  
1. **Implement rate limiting at the MCP server level:**
   ```typescript
   // MCP server middleware
   const rateLimiter = new Map<string, { count: number; resetAt: number }>();
   
   function checkRateLimit(clientId: string, limit: number = 10, windowMs: number = 60000) {
     const now = Date.now();
     const record = rateLimiter.get(clientId) || { count: 0, resetAt: now + windowMs };
     
     if (now > record.resetAt) {
       record.count = 0;
       record.resetAt = now + windowMs;
     }
     
     record.count++;
     rateLimiter.set(clientId, record);
     
     if (record.count > limit) {
       throw new Error(`Rate limit exceeded: ${limit} calls per minute`);
     }
   }
   ```
   - Set conservative limits: 10 writes per minute for recipe/ingredient creation
   - Reject with a clear error message: "Too many requests; wait before trying again"

2. **Add comprehensive audit logging:**
   ```typescript
   // Every MCP write operation
   async function auditLog(operation: string, clientId: string, input: unknown, result: unknown, error?: Error) {
     await db.insert(schema.auditLog).values({
       timestamp: new Date(),
       operation,
       clientId,
       inputData: JSON.stringify(input),
       resultData: JSON.stringify(result),
       errorMessage: error?.message,
       success: !error
     });
   }
   ```
   - Log: timestamp, operation type, caller ID, input, result, success/failure
   - Makes debugging MCP issues trivial and provides accountability

3. **Separate read and write permissions:**
   - Read operations (list recipes, get ingredient) → unlimited
   - Write operations (create, edit, delete) → rate-limited and audited
   - Make this explicit in MCP tool definitions

4. **Implement a human-approval gate for high-risk operations:**
   - Delete ingredient, delete recipe: require confirmation before executing
   - This prevents accidental deletion loops

5. **Alert on suspicious patterns:**
   - If more than 5 recipes are created in 10 seconds, pause and alert
   - If a single MCP call creates more than 20 ingredients, flag as potential loop

**Detection:**  
- Database has sudden influx of duplicate recipes with auto-incremented names
- Barback reports: "The MCP created 50 copies of 'Margarita' somehow"
- No way to trace back where the data came from (missing audit log)
- MCP operation appears to succeed but database state is inconsistent

---

### Pitfall 7: Docker Multi-Stage Build Not Preserving pnpm Store Cache Across Layers

**What goes wrong:**  
You set up a multi-stage Docker build: Stage 1 installs dependencies with `pnpm install`, Stage 2 builds the frontend bundles, and Stage 3 copies artifacts to a final runtime image. Each time you rebuild, even if `pnpm-lock.yaml` hasn't changed, `pnpm install` runs again from scratch, downloading ~500MB of packages and taking 3–5 minutes. This makes local development and CI/CD slow, and defeats the purpose of layered caching.

**Why it happens:**  
- pnpm's package store defaults to `~/.pnpm-store`, which lives in the build container's ephemeral filesystem
- Without explicit caching, each Docker layer rebuild starts with an empty store
- The `pnpm install` command doesn't know to reuse packages from a previous build
- Docker's native layer cache can cache the `RUN pnpm install` line, but if `pnpm-lock.yaml` changes (even unrelated changes), the entire install re-runs

**Consequences:**  
- Every `docker build` takes 3–5 minutes, even for minor code changes
- CI/CD pipelines are slow (GitHub Actions build times spike)
- Developers avoid rebuilding images locally, leading to stale builds
- Push to Raspberry Pi takes longer, delaying deployments

**Prevention:**  
1. **Use Docker BuildKit cache mounts to persist the pnpm store:**
   ```dockerfile
   # Dockerfile
   # Enable BuildKit: DOCKER_BUILDKIT=1 docker build .
   
   FROM node:22-bookworm AS dependencies
   
   # Copy only lock file
   COPY pnpm-lock.yaml .
   COPY .npmrc .
   
   # Install with cached store
   RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
       pnpm install --frozen-lockfile --recursive
   
   # Copy built node_modules to next stage
   FROM node:22-bookworm AS builder
   COPY --from=dependencies /app/node_modules ./node_modules
   COPY . .
   RUN pnpm run build
   
   # Final stage
   FROM node:22-slim
   COPY --from=builder /app/dist ./dist
   ```

2. **Ensure the cache mount target matches pnpm's store location:**
   - Default store: `/pnpm/store` (use `pnpm config get store-dir` to check)
   - If you set a custom `PNPM_HOME` or `store-dir`, update the cache mount target

3. **Separate dependency installation from code copy:**
   - Copy `pnpm-lock.yaml` and `.npmrc` **before** copying source code
   - This way, if only source changes (not dependencies), the install layer is cached and reused
   - Build layer (transpile, bundle) runs on top of the cached install layer

4. **Use `pnpm install --frozen-lockfile`:**
   - Prevents pnpm from downloading or modifying `pnpm-lock.yaml`
   - Makes the build deterministic and reproducible

5. **Layer frontend builds separately if they're slow:**
   ```dockerfile
   # After node_modules are installed
   
   # Build each frontend in its own stage
   FROM dependencies AS build-patron
   COPY packages ./packages
   COPY apps/patron ./apps/patron
   RUN pnpm --filter @my-bar/patron build
   
   FROM dependencies AS build-bartender
   COPY packages ./packages
   COPY apps/bartender ./apps/bartender
   RUN pnpm --filter @my-bar/bartender build
   # ... etc
   
   # Then copy all built artifacts to final image
   FROM node:22-slim
   COPY --from=build-patron /app/apps/patron/dist ./public/patron
   COPY --from=build-bartender /app/apps/bartender/dist ./public/bartender
   # ... etc
   ```

**Detection:**  
- `docker build` output shows `Step X/Y : RUN pnpm install --frozen-lockfile` taking 3+ minutes even when lock file didn't change
- No "CACHED" label on the pnpm install step in build output
- Subsequent builds of the same commit take the same time as the first build

---

## Minor Pitfalls

### Pitfall 8: Image Size Bloat from Multi-Frontend Monorepo

**What goes wrong:**  
The final Docker image is 800MB+, too large to push to the Pi efficiently or store on a small SD card. The image contains all three frontend builds (Patron, Bartender, Barback), their dev dependencies, source maps, and Node modules that aren't needed at runtime.

**Why it happens:**  
- Building all three React apps and bundling them with their dependencies creates 3 × ~100MB bundles
- Dev dependencies (TypeScript, webpack, testing libraries) are ~200MB and still present in the final image if not stripped
- Source maps and .map files add 50–100MB and provide no value in production
- The runtime image doesn't need Vite, TypeScript compiler, or build tools

**Prevention:**  
1. **Remove dev dependencies from the final image:**
   ```dockerfile
   # In the final stage, only install production dependencies
   FROM node:22-slim
   COPY package.json pnpm-lock.yaml .
   RUN pnpm install --prod --frozen-lockfile
   # Copy only the built bundles and server code
   ```

2. **Strip source maps in production builds:**
   ```typescript
   // vite.config.ts
   export default {
     build: {
       sourcemap: false, // or: process.env.NODE_ENV === 'production' ? false : true
       minify: 'terser'
     }
   };
   ```

3. **Use a scratch or distroless final stage for static files:**
   ```dockerfile
   FROM gcr.io/distroless/base-debian12
   COPY --from=builder /app/dist /dist
   ```
   This removes all OS tooling and reduces image size by 100–200MB.

4. **Build frontends in CI, commit only the dist bundles:**
   - If disk space is extremely tight, avoid including source code in the production image
   - Copy only `dist/` folders, not `src/`, `tsconfig.json`, etc.

**Detection:**  
- `docker images` shows size > 500MB for this single-machine app
- `docker history <image>` shows large layer for node_modules or source code

---

### Pitfall 9: SQLite Write Timeout Under Concurrent Load During Claude Vision Calls

**What goes wrong:**  
When Claude Vision is processing a bottle photo (5–10 second API call), the Barback interface is slow to save the result. If they close the browser tab while Claude is still analyzing, the MCP server might still try to save the result, leading to a database lock. Alternatively, if the Patron and Bartender screens are both making requests while a Vision call is in progress, the database locks up with `SQLITE_BUSY` or `database is locked` errors.

**Why it happens:**  
- SQLite serializes writes across the entire database (unlike Postgres which can handle concurrent writes)
- Claude Vision calls are I/O-bound (waiting for Claude API response), blocking the server's event loop or holding a transaction open
- If the code does not release the database connection during the Vision API call, the database is locked for the entire 5–10 seconds
- Under concurrent load (multiple screens refreshing simultaneously), write requests queue up, timeout, and fail

**Prevention:**  
1. **Release the database connection before making external API calls:**
   ```typescript
   // In the Fastify endpoint for adding a bottle after Vision analysis
   
   // BAD: Locks DB for the entire Vision call
   async function identifyBottle(file: Buffer) {
     const db = getDb();
     db.exec('BEGIN TRANSACTION');
     
     const visionResult = await claude.vision(file); // 5-10s delay, DB LOCKED
     
     db.exec('INSERT INTO ingredients ...');
     db.exec('COMMIT');
   }
   
   // GOOD: Vision call happens outside transaction
   async function identifyBottle(file: Buffer) {
     const visionResult = await claude.vision(file); // No DB lock
     
     const db = getDb();
     db.exec('BEGIN TRANSACTION');
     db.exec('INSERT INTO ingredients ...');
     db.exec('COMMIT');
   }
   ```

2. **Set reasonable connection timeout values:**
   ```typescript
   const db = new Database(':memory:'); // or file path
   db.exec('PRAGMA busy_timeout = 5000'); // Wait up to 5s for lock
   ```
   Default is very short; increase to 5–10 seconds for kiosk apps.

3. **Implement retry logic with exponential backoff:**
   ```typescript
   async function saveWithRetry(fn: () => void, maxRetries: number = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         fn();
         return;
       } catch (e) {
         if (i === maxRetries - 1) throw e;
         await new Promise(r => setTimeout(r, 100 * Math.pow(2, i))); // 100ms, 200ms, 400ms
       }
     }
   }
   ```

4. **Use better-sqlite3's transaction helpers:**
   ```typescript
   const insert = db.prepare('INSERT INTO ingredients (name, category) VALUES (?, ?)');
   const transaction = db.transaction((name: string, category: string) => {
     insert.run(name, category);
   });
   transaction('Jameson', 'Irish Whiskey'); // Automatic rollback on error
   ```

**Detection:**  
- Logs show: `SQLITE_BUSY` or `database is locked` errors during Vision calls
- Adding a bottle works sometimes but fails randomly under concurrent load
- Barback reports: "It takes 30s to save a photo"

---

### Pitfall 10: MCP Server Connection Instability Over Home Network

**What goes wrong:**  
The Claude Code session connects to the MCP server on the home Pi. The connection works briefly, but after a few minutes of inactivity or a wifi handoff, the connection drops. Claude gets cryptic `transport error` or `connection timeout` messages and the user has to manually reconnect.

**Why it happens:**  
- MCP servers assume a stable, local connection (e.g., same machine or LAN)
- The Pi may sleep the network interface, or the router may drop idle TCP connections
- The MCP client (Claude Code) doesn't have built-in reconnection logic
- If the home network is flaky or the Pi is on wifi (instead of Ethernet), packet loss can cause silent disconnections

**Consequences:**  
- User frustration: "MCP stopped working mid-recipe import"
- Feature is unreliable and gets disabled
- Workaround: manual entry instead of MCP import

**Prevention:**  
1. **Implement heartbeat/keepalive in the MCP server:**
   ```typescript
   // MCP server
   setInterval(() => {
     // Send a no-op ping to keep connection alive
     server.emit('ping');
   }, 30000); // Every 30s
   ```

2. **Use TCP keepalive options:**
   ```typescript
   const server = net.createServer((socket) => {
     socket.setKeepAlive(true, 60000); // TCP keepalive every 60s
   });
   ```

3. **Provide clear error messages to the user:**
   - "MCP connection lost. Reconnect?" with a retry button
   - Don't silently fail; surface the issue

4. **Deploy the MCP server to a stable location:**
   - Prefer Ethernet over wifi on the Pi
   - Ensure the Pi doesn't sleep or power-down the network interface
   - Add a systemd service that restarts the MCP server on crash:
     ```ini
     [Unit]
     Description=My Bar MCP Server
     
     [Service]
     ExecStart=/usr/bin/node /app/mcp-server/dist/index.js
     Restart=on-failure
     RestartSec=5
     ```

**Detection:**  
- Claude Code logs show: `connection timeout` or `transport error` after 5+ minutes
- MCP commands work initially but fail on retry

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Docker Build & Test (Phase 5)** | better-sqlite3 native bindings fail on ARM64; WAL corruption on first deploy | Test image on ARM64 hardware before shipping; verify `.node` binding exists; ensure full data/ directory is bind-mounted |
| **Docker Build & Test (Phase 5)** | Multi-stage Dockerfile doesn't cache pnpm store; builds take 3–5 min every time | Use BuildKit cache mounts with `RUN --mount=type=cache,id=pnpm,target=/pnpm/store` |
| **AI Vision Phase (Phase 6)** | iPhone photos arrive in HEIC; Claude receives upside-down images | Detect and convert HEIC to JPEG client-side with proper EXIF rotation before upload |
| **AI Vision Phase (Phase 6)** | Claude confidently hallucinates wrong bottle names; bad data saved silently | Require human review before saving Vision output; add confidence score and fallback to manual entry if <70% |
| **MCP Server Phase (Phase 7)** | Unstructured recipe input maps to wrong ingredient IDs; recipes broken | Validate all imports against live ingredient database; provide Claude with exact ingredient list; implement two-step import with human verification |
| **MCP Server Phase (Phase 7)** | No rate limiting or audit; Claude accidentally creates 500 duplicate recipes | Implement per-minute write rate limits (e.g., 10 ops/min); log all MCP operations with timestamp, caller, input, result |
| **MCP Server Phase (Phase 7)** | MCP connection drops after 5 min; Claude Code can't reach server | Implement TCP keepalive + heartbeat; deploy to Ethernet connection on Pi; add systemd auto-restart |
| **SQLite Operations (all phases)** | Vision API calls block database; Patron/Bartender screens timeout | Release DB connection before Vision API call; set `PRAGMA busy_timeout`; implement retry with exponential backoff |
| **Image Size (Docker Phase)** | Final image 800MB+; can't push to Pi efficiently | Remove dev dependencies in final stage; disable source maps; use distroless base image |

---

## Sources

### Docker, pnpm, ARM64, and better-sqlite3

- [Better-SQLite3 Setup for Node.js](https://www.nxsi.io/guides/better-sqlite3)
- [Compiling SQLite for Multi-Arch Docker](https://simonemms.com/blog/2020/02/25/compiling-sqlite-for-multi-arch-docker)
- [[BUG] Docker ARM64 v3.8.4 fails to start - better-sqlite3 native binding missing](https://github.com/diegosouzapw/OmniRoute/issues/2771)
- [[Bug] Native module error - better-sqlite3 bindings not found with pnpm](https://github.com/kottster/kottster/issues/94)
- [Broken with PNPM 10.x: "Could not locate the bindings file"](https://github.com/WiseLibs/better-sqlite3/issues/1378)
- [Better Auth + better-sqlite3 under pnpm](https://firdausng.com/posts/integrating-better-auth-better-sqlite3-drizzle-pnpm)
- [pnpm Docker Docs](https://pnpm.io/docker)
- [Optimal multi-stage Docker builds with TurboRepo and PNPM](https://fintlabs.medium.com/optimized-multi-stage-docker-builds-with-turborepo-and-pnpm-for-nodejs-microservices-in-a-monorepo-c686fdcf051f)
- [Depot: Optimal Dockerfile for Node.js with pnpm](https://depot.dev/docs/container-builds/optimal-dockerfiles/node-pnpm-dockerfile)

### SQLite, WAL Mode, and Docker

- [SQLite on Network Share - Sonarr Issue #1886](https://github.com/Sonarr/Sonarr/issues/1886)
- [How To Corrupt An SQLite Database File](https://www.sqlite.org/howtocorrupt.html)
- [SQLite WAL Mode Across Docker Containers Sharing a Volume](https://simonwillison.net/2026/Apr/7/sqlite-wal-docker-containers/)
- [Does SQLite Work With Docker?](https://www.stackcompat.dev/docker-with-sqlite/)
- [How to Run SQLite in Docker](https://oneuptime.com/blog/post/2026-02-08-how-to-run-sqlite-in-docker-when-and-how/view)
- [SQLite User Forum: Concurrent Access from Sandboxed Processes](https://sqlite.org/forum/info/3103f8fb9ab4a322fbe8df8ea00d345cd59350bc0f00faef5a3cb8c2465b1509)

### Claude Vision and Image Handling

- [Vision - Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Best Practices for Using Vision with Claude](https://platform.claude.com/cookbook/multimodal-best-practices-for-vision)
- [ClaudeLog: Supported Image Upload Types](https://claudelog.com/faqs/claude-code-supported-image-upload-types/)
- [HEIC Attachments Exceed Read Tool's 256KB Limit - Claude Plugins Issue #1656](https://github.com/anthropics/claude-code/issues/1656)
- [[FEATURE] Auto-convert HEIC/HEIF Attachments to JPEG - Claude Code Issue #76492](https://github.com/anthropics/claude-code/issues/76492)
- [Claude Vision API: Image Analysis At Production Scale](https://www.developersdigest.tech/blog/claude-vision-api-production-guide)
- [Reduce Hallucinations - Claude Platform Docs](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- [How to Reduce Claude Hallucinations](https://www.aicodex.to/articles/claude-hallucination-prevention)

### MCP Security, Write Access, and Schema Validation

- [Model Context Protocol (MCP) Server Security Best Practices](https://tyk.io/learning-center/mcp-server-security-ai-enterprise-guide/)
- [MCP Security - OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- [MCP Security Considerations - WRITER](https://writer.com/engineering/mcp-security-considerations/)
- [Agentic MCP Security Best Practices - Cloud Security Alliance](https://labs.cloudsecurityalliance.org/agentic/agentic-mcp-security-best-practices-v1/)
- [Is that Allowed? Authentication and Authorization in MCP - Stack Overflow](https://stackoverflow.blog/2026/01/21/is-that-allowed-authentication-and-authorization-in-model-context-protocol/)
- [4 Security Vulnerabilities in MCP Server's Tool Schema](https://agenticcontrolplane.com/blog/mcp-schema-vulnerabilities)
- [Tools Specification - Model Context Protocol](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [How to Build MCP Servers for Your Internal Data - FreeCodeCamp](https://www.freecodecamp.org/news/how-to-build-mcp-servers-for-your-internal-data/)

---

## Summary

The three new features (Docker, AI Vision, MCP server) each introduce specific failure modes:

1. **Docker on ARM64/Pi:** Native binding compilation, WAL file corruption with bind mounts, multi-stage caching
2. **Claude Vision:** HEIC format rejection, orientation bugs, confident hallucination on bottle identification
3. **MCP Server:** Write access without auth/rate-limiting, schema mismatch between unstructured recipes and structured app data, connection instability

**Key prevention strategies:**
- **Docker:** Enable pnpm native postinstall scripts, test images on ARM64 hardware, bind-mount entire data directory for WAL coordination, use BuildKit cache mounts
- **Vision:** Auto-convert HEIC→JPEG client-side, add human review gate before saving Claude output, include confidence score, provide fallback to manual entry
- **MCP:** Validate imports against live schema, rate-limit write operations, implement audit logging, provide explicit ingredient list to Claude

None of these are insurmountable, but all require explicit preventive action during implementation. Skipping these will result in silent data corruption, unreliable features, or failed deployments.
