# Pitfalls Research

**Domain:** Self-hosted home LAN app — multi-client inventory sync, browser barcode scanning, AI-assisted recipe/recommendation features (Claude API)
**Researched:** 2026-08-09
**Confidence:** MEDIUM (web-sourced, cross-checked across multiple independent sources; no official case study specific to this exact combination of features exists)

## Critical Pitfalls

### Pitfall 1: Naive polling or last-write-wins state sharing breaks the "single source of truth" promise

**What goes wrong:**
The Patron, Bartender, and Barback screens drift out of sync — a bottle gets marked empty on Barback but Patron still shows the cocktail as makeable for several seconds (or until a manual refresh), or two near-simultaneous writes (Barback decrements a bottle while Bartender fulfills an order using the same bottle) silently overwrite each other, corrupting the count.

**Why it happens:**
It's tempting to build the simplest thing first: each screen polls a REST endpoint every few seconds, or writes directly to a local SQLite file with no coordination. This works fine in a demo with one client open but breaks down with three simultaneous clients making independent reads/writes, because there's no mechanism forcing all three to reconcile against one authoritative state at the moment it changes.

**How to avoid:**
Use a single real-time push channel (WebSockets, not polling) from the server to all connected clients: every inventory-affecting write goes through one server-side mutation path that updates SQLite in a single-writer-serialized way, then broadcasts the new derived state (stock levels + makeable/not-makeable per drink) to all connected clients. Never let a client compute "makeable" locally from a possibly-stale cache — always trust the server's broadcast. Use SQLite WAL mode with `busy_timeout` and/or a single application-level write queue (e.g., a queue with concurrency 1) so concurrent writes serialize instead of racing.

**Warning signs:**
- Screens showing different makeable/not-makeable state for the same drink at the same time
- Manual refresh "fixing" a screen that was previously wrong
- `SQLITE_BUSY` errors in server logs
- Stock counts that occasionally jump by more than one unit or go negative

**Phase to address:**
Foundational/data-layer phase, before any UI is built — the inventory mutation + broadcast pipeline is the architectural backbone the whole app depends on. This must not be an afterthought bolted on after screens exist.

---

### Pitfall 2: Camera-based barcode scanning treated as a guaranteed happy path with no fallback

**What goes wrong:**
The owner points a phone camera at a liquor bottle's UPC, scanning fails to focus (barcodes are typically read at macro/close range, which many phone/tablet cameras via `getUserMedia` don't autofocus well for), or the barcode simply isn't in whatever lookup API is used, and there's no graceful way to add the bottle. This is exactly the risk flagged in project scope — "no dedicated scanner hardware."

**Why it happens:**
Demos of `BarcodeDetector`/ZXing/Quagga libraries look reliable in ideal lighting with a large, flat, well-lit code. Real-world bar bottles have wraparound labels, curved glass, glare, and low bar lighting — much harsher conditions than a demo video. Additionally, browser support for the native `BarcodeDetector` API is inconsistent (notably weak/absent on Safari, which matters here since iPad = Safari), so relying on it alone is risky for this specific device mix.

**How to avoid:**
Design scanning as an *optional accelerator*, not the primary path: always ship a manual "add bottle" flow (name/size/category typed or selected) as the baseline, with scan-to-prefill as an enhancement on top. Use a JS decoder library (ZXing-js or Quagga2) rather than relying solely on the native `BarcodeDetector` API, since it needs to work reliably in Safari on iPad/iPhone. Test scanning against actual bottles from the owner's collection early (curved glass, various label styles) rather than trusting sample barcode images.

**Warning signs:**
- Scanning works in testing with printed barcode sheets but fails on real bottles
- Long time-to-scan (>3-4 seconds) or frequent "point camera closer/farther" retries in real use
- Safari-specific console errors around `BarcodeDetector` not being defined

**Phase to address:**
The Barback/inventory-entry phase. Build and validate manual entry first; add scanning as a fast-follow enhancement, with an explicit fallback UX for scan failure (not just a spinner that never resolves).

---

### Pitfall 3: UPC lookup treated as a complete product database instead of a best-effort prefill

**What goes wrong:**
A scanned UPC returns no result, a wrong result (mismatched size/variant), or a generic/incomplete entry, and the owner is stuck re-typing everything anyway — negating the value of scanning and eroding trust in the feature.

**Why it happens:**
General-purpose UPC APIs (Go-UPC, UPCitemdb, Barcode Lookup, etc.) have partial, inconsistent coverage of liquor-specific products — craft/small-batch spirits, private-label store bottles, and regional products are the most likely gaps for a home bar's real, eclectic ~50-100 bottle collection. Some dedicated beverage-alcohol UPC databases exist but tend to be paid/niche and still won't cover everything.

**How to avoid:**
Treat any UPC lookup result as a *prefill suggestion the owner reviews and edits*, never as authoritative auto-save. Always show the matched name/size/category in an editable form before committing to inventory. Pick a UPC API (or combination) as MVP, but build the "not found, fill in manually" path with equal design care as the "found it" path — it will be hit often for this domain.

**Warning signs:**
- High rate of "not found" or clearly wrong results during initial bottle-collection entry (test with owner's actual ~50-100 bottles as an early validation step, not synthetic test data)

**Phase to address:**
Barback/inventory-entry phase, alongside barcode scanning — design the "lookup succeeded but needs editing" and "lookup failed" states as first-class UI from the start.

---

### Pitfall 4: Ingredient/recipe matching that's too literal, so makeable drinks are wrongly reported as not-makeable

**What goes wrong:**
A recipe calls for "1.5 oz gin" and inventory has "Bombay Sapphire Gin, 750ml" — if matching requires exact ingredient-name equality or doesn't reconcile units (oz vs ml vs cl vs dash vs "splash"), the system either fails to link the recipe ingredient to the inventory item, or miscalculates whether enough volume remains, undermining the core value proposition ("the inventory must be the single source of truth").

**Why it happens:**
Real recipes and real inventories use inconsistent vocabulary (brand name vs. generic category, "gin" vs "London dry gin"), inconsistent units, and inconsistent precision (fractions, dashes, splashes aren't strictly volumetric). Naive string-equality or hardcoded ml conversion misses this variability.

**How to avoid:**
Model ingredients as generic categories with brand-specific inventory items linked underneath (e.g., ingredient "gin" can be satisfied by any bottle tagged category=gin), not a flat name-match. Normalize all volumes to one internal unit (ml) at data-entry time with a small, explicit conversion table (oz, cl, dash≈0.9ml, splash≈ambiguous — treat non-volumetric units as "presence-only," not quantity-tracked, if that's simpler for MVP). Decide explicitly whether "not enough volume left" counts as not-makeable or just "makeable but low" — this is a product decision, not just an engineering one, and should be resolved before building the matching logic.

**Warning signs:**
- Drinks the owner knows are makeable show as not-makeable (or vice versa) during manual testing
- Recipes with "top with soda water" or other non-precise-volume ingredients breaking the matching logic

**Phase to address:**
The makeable/not-makeable logic phase — this is core-value-critical per PROJECT.md and deserves its own dedicated design pass with the owner's actual early recipes as test cases, not just synthetic examples.

---

### Pitfall 5: Claude API calls treated as fast, cheap, and always-available in a "real-time-ish" UI

**What goes wrong:**
A patron requests a drink that can't be made; the app calls Claude for a substitution/recommendation inline in the request path. If the API is slow (multi-second latency is normal for a real LLM call), rate-limited, or transiently erroring, the UI hangs or breaks with no graceful degradation — turning a nice-to-have AI feature into a blocking failure point for a core interaction.

**Why it happens:**
It's easy to design the happy path (call Claude, get JSON back, render it) and not design for the unhappy path, especially in a hobby/home project where the developer's own testing rarely hits rate limits or network blips. But this app has an explicit internet dependency for AI features while otherwise running LAN-only, so partial connectivity/latency issues are a realistic real-world scenario (e.g., home internet blip during a party).

**How to avoid:**
Never make AI calls synchronously block the core "can this be made" flow — that logic must work entirely from local inventory state, independent of Claude API availability. AI recommendations/substitutions/recipe-parsing should be additive/optional layers with visible loading states and a clear fallback ("Claude API rate limits are org-level (RPM/ITPM/OTPM); expect 429 with retry-after" — use the SDK's built-in retry/backoff, but also design UI copy for "recommendations unavailable right now, here's the makeable list instead"). Log request_id, latency, token counts, and cost per call from day one to catch runaway cost or latency early on modest home-server + home-internet conditions.

**Warning signs:**
- UI feels laggy or freezes specifically around "suggest something else" or "suggest a substitution" interactions
- No visible distinction in the UI between "AI is thinking" and "AI failed"
- Unexpectedly high Anthropic bill relative to expected usage (a sign of retry storms, unbounded context, or repeated redundant calls)

**Phase to address:**
Each AI-feature phase (recommendations, substitutions, recipe-photo-parsing) individually — each needs its own error/latency/cost-handling design, not a single shared assumption. Flag these phases for deeper research per the AI-integration skill (structured output schema design, retry policy, cost guardrails).

---

### Pitfall 6: AI recipe-photo parsing auto-saved without review, silently corrupting the recipe collection

**What goes wrong:**
The owner photographs a handwritten or printed recipe, Claude extracts structured data, and a wrong ingredient, wrong quantity, or hallucinated step gets saved directly into the curated recipe collection — undermining exactly the "owner wants a curated, personal recipe set" value stated in PROJECT.md.

**Why it happens:**
Claude's structured output (JSON mode / tool use) guarantees schema-valid output, not factually correct output — it can "confidently hallucinate" a plausible-looking ingredient or quantity that isn't actually in the photographed source, especially with imperfect handwriting, glare, or cropped images. This is easy to miss because the output *looks* clean and well-formatted.

**How to avoid:**
PROJECT.md already specifies "for user review/confirmation before saving" — hold this line firmly; never let this become an "auto-save with an undo" shortcut later for convenience. Keep the extraction schema flat (avoid deep nesting, which increases hallucination risk) and add a per-field confidence signal if feasible so uncertain fields are visually flagged for extra scrutiny during review. Show the original photo side-by-side with the extracted fields during confirmation so mismatches are easy to spot.

**Warning signs:**
- Recipes with quantities that don't make cocktail-ratio sense (e.g., wildly off from typical ranges) slipping through unedited
- Owner reports "I don't remember entering it that way"

**Phase to address:**
The AI recipe-import phase specifically — the review/confirm UI is not optional polish, it's the core safety mechanism for this feature and should be scoped as part of the MVP for that phase, not deferred.

---

### Pitfall 7: SD-card/consumer-grade home-server storage silently corrupting data under sustained writes

**What goes wrong:**
If the "local home server" ends up being a Raspberry Pi booting from a microSD card, the card can corrupt during a power loss or from sustained write load (SQLite WAL journaling is write-heavy), taking the whole inventory database down with it — a severe failure for a system whose entire value proposition is being the trustworthy single source of truth.

**Why it happens:**
SD cards are commodity storage designed for occasional writes (photos, media), not sustained database write patterns; power loss mid-write can corrupt filesystem structures even if the card itself survives. This is an easy blind spot because it works fine for weeks/months until the one time power blips during a party.

**How to avoid:**
If using a Raspberry Pi (or similar SBC), boot/store the database on an external SSD rather than the microSD card, and consider a small UPS with auto-shutdown if power stability is a real concern in the deployment environment. Whatever the hardware, take regular automated SQLite backups (simple file copy or `.backup` command on a schedule) so a corruption event is a "restore from this morning" annoyance, not permanent data loss.

**Warning signs:**
- Any unexplained app crash immediately after a power event
- SQLite `database disk image is malformed` errors

**Phase to address:**
Deployment/infrastructure phase — decide and document the hardware + storage + backup strategy explicitly before going live, not implicitly by whatever hardware happens to be on hand.

---

### Pitfall 8: "No auth" interpreted as "no server-side validation" instead of "no login friction"

**What goes wrong:**
Because there's no login, it's tempting to also skip server-side input validation and treat every client request as trusted, since "it's just friends and family on the home network." Then a buggy client (or a guest's phone browser tab left open, or a future public/tunnel exposure) can submit malformed orders, negative stock adjustments, or spam requests that corrupt the shared state everyone else relies on.

**Why it happens:**
No-auth is explicitly the right call per PROJECT.md's constraints (trusted home network, no commercial concerns) — but "no authentication" and "no validation" are different decisions that are easy to conflate when moving fast.

**How to avoid:**
Keep server-side validation on every write endpoint (valid stock deltas, valid recipe references, rate-limit AI-triggering endpoints specifically since those cost money per call) even though there's no login. Explicitly do not expose the server beyond the home LAN (no port-forwarding, no public tunnel) — PROJECT.md already scopes this correctly; treat "reconsider only if exposed outside the home network" as a hard line, and if that ever changes, authentication becomes non-negotiable before exposure.

**Warning signs:**
- Any endpoint that trusts a client-submitted stock count or price without server-side recomputation
- No rate-limiting on AI-calling endpoints (a stray script or curious guest could trigger a cost spike)

**Phase to address:**
Backend/API-design phase, applied consistently across every phase that adds a write endpoint — this is a standing rule, not a one-time task.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Polling instead of WebSocket push for "live" inventory | Simpler to build first | Perceived staleness/desync between screens, defeats "single source of truth" core value | Never for MVP of this app — sync trustworthiness is the stated core value |
| Client computes makeable/not-makeable locally from cached inventory | Avoids extra server logic short-term | Screens disagree with each other, exactly the failure mode PROJECT.md calls out as unacceptable | Never — always compute makeable status server-side and broadcast it |
| Auto-saving AI-parsed recipe/UPC data without review step | Faster "magic" feeling | Silent data corruption in the curated recipe/inventory collection | Never — PROJECT.md already requires review before save |
| SQLite without WAL/busy_timeout tuning | Works fine with one client open | Random `SQLITE_BUSY` failures once all three screens are active simultaneously | Only during very early single-developer prototyping, must be fixed before three-client testing |
| Running on microSD without external SSD/backups | No extra hardware purchase | Risk of total data loss on power event | Only for throwaway prototyping, not for the "real" deployed instance |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Claude API (vision/recipe parsing) | Trusting structured JSON output as factually correct because it's schema-valid | Always route through a human review/confirm step; add confidence signals where feasible |
| Claude API (recommendations/substitutions) | Calling it synchronously inline in the core "can this be made" path | Keep core inventory logic 100% local/deterministic; treat AI suggestions as an additive, gracefully-degradable layer |
| UPC lookup API | Assuming coverage includes niche/craft liquor products | Always design and test the "not found" manual-entry path as a first-class flow |
| Browser `BarcodeDetector` API | Assuming consistent cross-browser support (notably Safari on iPad) | Use a JS decoder library (ZXing-js/Quagga2) for consistent behavior across the actual target devices, or feature-detect and fall back gracefully |
| WebSocket connection on iPad Safari over long idle periods (wall-mounted kiosk) | Assuming the connection never drops | Implement reconnect-with-resync logic: on reconnect, always re-fetch full current state rather than assuming missed messages were the only diff |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Recomputing makeable/not-makeable for all ~100+ recipes on every single stock change, synchronously, on the request path | UI feels sluggish after every inventory edit | Compute incrementally (only recipes touching the changed ingredient) or debounce/batch recompute | Noticeable once recipe count is in the 100+ range PROJECT.md anticipates |
| Unbounded Claude API context (sending full recipe/inventory list on every call) | Rising per-call cost and latency as collection grows | Send only the relevant subset (e.g., makeable-adjacent recipes, not the full catalog) per AI call | As recipe/bottle collection grows toward the ~100+ scale PROJECT.md anticipates |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No server-side validation because "no auth = no need to validate" | Corrupted shared state from a buggy or malicious client on the LAN | Validate every write server-side regardless of auth status |
| Exposing the home server beyond the LAN (port-forward, tunnel) "just for convenience" | Turns a trusted-network assumption into a real public-internet attack surface with zero auth | Keep strictly LAN-only per PROJECT.md scope; require adding auth first if this ever changes |
| No rate-limiting on AI-triggering endpoints | A stray repeated request (buggy client, curious guest tapping fast) could rack up real Anthropic API cost | Debounce/rate-limit client-side and server-side on any endpoint that calls Claude |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| No visible distinction between "AI is thinking" and "AI failed" | Patron/bartender left staring at a stuck spinner during a live party moment | Explicit loading vs. error vs. fallback states for every AI-backed interaction |
| Scan-to-add flow with no manual fallback surfaced | Owner gets stuck mid-inventory-entry when scanning fails on a real bottle | Always show "or enter manually" alongside the scan button, not buried behind a failure state |
| "Not-makeable" shown with no reason | Patron/bartender can't tell what's missing, have to guess | PROJECT.md already requires showing exactly which ingredient(s) are missing — treat this as non-negotiable, not a stretch goal |

## "Looks Done But Isn't" Checklist

- [ ] **Live shared inventory:** Often missing true push-based sync — verify by opening all three interfaces simultaneously and confirming a Barback edit appears on Patron/Bartender within ~1 second without manual refresh
- [ ] **Makeable/not-makeable logic:** Often missing unit normalization and ingredient-category matching — verify with real recipes using varied units (oz, ml, dash) and inventory bottles under generic vs. brand names
- [ ] **UPC barcode scanning:** Often missing a tested fallback for scan failure — verify by attempting real bottles from the owner's actual collection, not test barcode sheets
- [ ] **AI recipe-photo import:** Often missing a genuine review/edit step (vs. a rubber-stamp "confirm" button) — verify the UI actually surfaces the original photo next to each extracted field for comparison
- [ ] **AI recommendation/substitution features:** Often missing graceful degradation — verify behavior when the API key is invalid, when offline, and when rate-limited (simulate all three)
- [ ] **No-auth write endpoints:** Often missing server-side validation — verify by sending a malformed/out-of-range request directly (bypassing the UI) and confirming it's rejected, not silently applied

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|-----------------|
| Multi-client desync from polling-based architecture | HIGH | Requires retrofitting a push-based (WebSocket) layer and a single authoritative server-side state — effectively a backend rework, best avoided rather than recovered from |
| SD-card corruption / data loss on home server | MEDIUM | Restore from last automated backup; if none exists, rebuild inventory/recipes manually (painful given "manual entry from scratch" scope) |
| Bad AI-parsed recipe saved without review | LOW | Simple manual edit/delete once caught, since it's isolated per-recipe — cost stays low only if reviewed promptly, so surface a way to spot-check recently AI-imported recipes |
| Overly literal ingredient matching causing wrong makeable/not-makeable results | MEDIUM | Requires revisiting the ingredient-to-inventory linking model (generic-category vs. brand-specific), which touches recipe data structure — better to get this right early than patch it later |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Multi-client state desync (Pitfall 1) | Foundational data-layer / inventory-sync phase | Open all 3 interfaces at once; edit inventory from one, confirm instant sync on the others |
| Barcode scanning treated as guaranteed (Pitfall 2) | Barback inventory-entry phase | Test scanning against real bottles from the collection; confirm manual-entry fallback works standalone |
| UPC lookup gaps (Pitfall 3) | Barback inventory-entry phase | Attempt lookup for a representative sample of the owner's actual ~50-100 bottles; measure hit rate |
| Ingredient/unit matching too literal (Pitfall 4) | Makeable/not-makeable logic phase | Test against real early recipes with varied units and brand vs. generic ingredient names |
| AI calls blocking core UX / no error handling (Pitfall 5) | Each AI-feature phase individually | Simulate API timeout, 429, and invalid-key conditions; confirm core inventory logic still works with AI fully down |
| AI recipe import auto-saving bad data (Pitfall 6) | AI recipe-import phase | Confirm UI requires explicit review/edit before save, with source photo visible alongside extracted fields |
| SD-card/storage corruption risk (Pitfall 7) | Deployment/infrastructure phase | Document hardware/storage choice and backup schedule before going live |
| No server-side validation on no-auth writes (Pitfall 8) | Backend/API-design phase (standing rule across all write-endpoint phases) | Send malformed requests directly to each write endpoint, confirm rejection |

## Sources

- [SQLite WAL Mode and Concurrency — Coddy](https://coddy.tech/docs/sqlite/wal-mode-and-concurrency) (MEDIUM confidence, web)
- [What to do about SQLITE_BUSY errors despite setting a timeout — Bert Hubert](https://berthub.eu/articles/posts/a-brief-post-on-sqlite3-database-locked-despite-timeout/) (MEDIUM confidence, web)
- [WebSockets vs Server-Sent Events — Ably](https://ably.com/blog/websockets-vs-sse) (MEDIUM confidence, web)
- [WebSockets vs Server-Sent-Events vs Long-Polling — RxDB](https://rxdb.info/articles/websockets-sse-polling-webrtc-webtransport.html) (MEDIUM confidence, web)
- [Using BarcodeDecoder in javascript — Minhaz's Blog](https://blog.minhazav.dev/Using-BarcodeDecoder-in-javascript/) (MEDIUM confidence, web)
- [How to Scan QR Codes in the Browser Without a Heavy Third-Party Library — Loke.dev](https://loke.dev/blog/native-barcode-detection-api) (MEDIUM confidence, web)
- [Barcodes for Wine, Beer and Spirits — International Barcodes](https://internationalbarcodes.com/barcodes-wine-beer-spirits/) (MEDIUM confidence, web)
- [U.P.C. Data 4 Beverage Alcohol](https://upcdata4spirits.com/) (MEDIUM confidence, web)
- [Problems of Self-Hosting Services on Raspberry Pi](https://thecustomizewindows.com/2024/06/problems-of-self-hosting-services-on-raspberry-pi/) (MEDIUM confidence, web)
- [Why My Raspberry Pi Keeps Eating SD Cards](https://www.petkovsky.sk/why-my-raspberry-pi-keeps-eating-sd-cards-and-what-to-do-about-it/) (MEDIUM confidence, web)
- [Structured outputs on the Claude Developer Platform — Anthropic](https://claude.com/blog/structured-outputs-on-the-claude-developer-platform) (MEDIUM confidence, web)
- [Claude API Structured Output: Three Patterns for Guaranteed JSON](https://renezander.com/blog/claude-api-structured-output/) (MEDIUM confidence, web)
- [Claude API errors — Claude Platform Docs](https://platform.claude.com/docs/en/api/errors) (MEDIUM confidence, web)
- [Rate limits — Claude Platform Docs](https://platform.claude.com/docs/en/api/rate-limits) (MEDIUM confidence, web)
- [Our approach to rate limits for the Claude API — Claude Help Center](https://support.claude.com/en/articles/8243635-our-approach-to-rate-limits-for-the-claude-api) (MEDIUM confidence, web)
- [The Optimistic UI Race Condition That Only Showed Up on the Fifth Click — DEV Community](https://dev.to/shubhradev/the-optimistic-ui-race-condition-that-only-showed-up-on-the-fifth-click-5a55) (MEDIUM confidence, web)
- [How to Deploy Secure Kiosk Browsers Without Local OS Risks — Sendwin](https://blog.send.win/how-to-deploy-secure-kiosk-browsers-without-local-os-risks/) (MEDIUM confidence, web)
- [Lock down web browsing using Kiosk Mode — text/plain](https://textslashplain.com/2022/01/06/lock-down-web-browsing-using-kiosk-mode/) (MEDIUM confidence, web)
- [MixMath - Cocktail Calculator](https://mixmath.app/) (MEDIUM confidence, web)
- Project context: `/home/gjohnson/src/my-bar/.planning/PROJECT.md`

---
*Pitfalls research for: home bar management/ordering web app (self-hosted, multi-client, AI-integrated)*
*Researched: 2026-08-09*
