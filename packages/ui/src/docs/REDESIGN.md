# Docs subsystem redesign

**Status:** Proposed — Track A approved to proceed, Track B deferred pending spike.
**Scope:** `packages/ui/src/docs` (the component-library docs site).
**Goal:** Considerably fewer moving parts while preserving current functionality.

This document is the output of a full audit of the docs subsystem: every file mapped, 27 behavioral invariants extracted and tied to the 14-file test contract, four candidate redesigns generated and adversarially scored, prior art researched. It records what the system does today, why the obvious simplifications fail, and the design we will actually pursue.

---

## 1. Decision record

| Decision | Choice | Consequence |
|---|---|---|
| What "fewer moving parts" means | **Sequenced: Track A now, evaluate Track B** | Land the safe plumbing consolidation first; spike the deeper concept-collapse behind a diff harness before deleting anything. |
| Code-block fidelity | **Keep resolved values** (`variant="solid"`, `value={56.25}`) | The walker's value-resolution + chrome-stripping is intended product behavior. This keeps all verbatim-source approaches off the table. |
| Immediate next step | **Write this design doc** | No code changes yet; architectural work awaits assent (CLAUDE.md 3.1). |

---

## 2. Current architecture

Build runs from `vite.docs.config.ts` (`root = src/docs`) with **five plugins**, producing **three virtual modules**, feeding a **runtime React-tree walker** and a **build-time ts-morph API engine**.

```
demos/*.tsx ──┐
              │  deriveCodePlugin (enforce:'pre')  → attaches __code to helpers
              │  componentTagsPlugin               → tags index barrels (__module/__name)
              │                                       + virtual:component-modules
              │  apiReferencePlugin (ts-morph)     → virtual:api-reference
              │  demoMetasPlugin                   → virtual:demo-metas
              ▼
   registry.ts ── lazy import.meta.glob({import:'Demo'}) + tracked promises
              ▼
   <Example> ── code ?? deriveCode(children)
                          │
                          ▼
        derive-code/ (8 files) walks the LIVE element tree:
        recognize via __module/__name tag → emit JSX tag + import + resolved props
        unrecognized → transparently unwrap (this is how docs chrome is filtered)
        __code helper → emit verbatim snippet (regex-inferred imports)
        3+ identical keyed siblings → collapse to one representative
```

### Moving-parts census

| | Current |
|---|---|
| Vite plugins | **5** (+ `virtualStubsPlugin` for vitest) |
| Virtual modules | **3** — `virtual:api-reference`, `virtual:demo-metas`, `virtual:component-modules` |
| Source files | **~58** |
| Distinct concepts a contributor must learn | **~12** |
| Demos | 112 (105 derived, 7 `code=` override) |
| Test files (the contract) | 14 (7 api-reference, 7 derive-code) |

### Highest-leverage complexity sources (ranked)

1. **Two parallel code-derivation systems that must stay in sync.** Build-time helper extraction (`plugins/derive-code/collect-helpers.ts`, raw-TS AST) and the runtime React-tree walker (`derive-code/`, 8 files) have overlapping responsibilities; divergence silently produces wrong/missing code blocks. **The #1 target.**
2. **The ts-morph API engine** — ~1,385 LOC across 14 files (`extract-references` BFS, `extract-passthrough` Omit-walking, the `extract-props`/`extract-project-props` two-pass split).
3. **The implicit "untagged ⇒ unwrap" chrome filter** — no allow-list, no marker, no lint; tagging a docs control by accident breaks every code block silently. Undocumented *and* untested (`INV-UNWRAP-UNKNOWN`).
4. **5 plugins + 3 virtual modules + the shared `virtualJsonHooks` factory.**
5. **Regex/heuristic fragility coupled to React internals** — the `.$` iteration marker, the curated `HOOK_RE`, `TAG_RE`, the `(?<!\.)` lookbehind.

---

## 3. The central finding

The instinct — "stop reconstructing JSX from the live tree; just show the authored source" (via build-time AST slice or Vite `?raw`) — was generated as three separate proposals and **all three were rejected on the same source-verified ground**. They score 5/5 on moving-part reduction and **1.7–2.0/5 on functionality**.

Their shared load-bearing premise is *false against this codebase*:

> *"Docs-internal controls live only in `<Example actions=…>`, so slicing `children` excludes them for free."*

The evidence:

- **Chrome lives inside `children`.** `LabeledRow`/`LabeledColumn` are authored inside `<Example>` children in 6 demos (`progress`, `slider`, `icon`, `avatar`, `color`, `loading`). `labeled.tsx`'s own doc comment establishes their walker-transparency as an intentional contract. Verbatim slicing would emit `<LabeledRow label={capitalize(color)}>` plus a non-existent `ui/labeled` import.
- **The walker resolves live values to literals.** `format.ts` renders a number prop as `value={56.25}`, never `value={50 + i * 12.5}`; a state-bound prop as `value={50}`, not `value={barValue}`. **69 of 101 root demos are stateful; 45 use `.map`.** Verbatim slicing ships dangling free identifiers — non-compiling snippets.
- **`map.tsx` is decisive.** It renders a `Map as MapView` alias; its `code=` override exists specifically to emit the correct `<Map>` from `ui/map`. Any design deriving from the tree (the current walker included) needs the override or an alias-resolution step.

**Resolution:** the runtime walker's value-resolved, chrome-stripped, loop-collapsed output is a genuine feature, confirmed as intended product behavior. We keep it. "Fewer moving parts" is therefore pursued by attacking the **plumbing** (count and concepts in the build layer), not by replacing the derivation engine.

### Scorecard (1–5, averaged across functionality / simplicity / migration lenses)

| Proposal | Functionality | Moving-parts ↓ | Ergonomics | Migration | Truthfulness | **Avg** |
|---|---|---|---|---|---|---|
| **Consolidate-without-replacing** | 5.0 | 3.0 | 5.0 | 4.3 | 3.7 | **4.20** |
| SSOT verbatim extraction | 1.7 | 5.0 | 2.3 | 2.0 | 2.7 | 2.73 |
| Build-time AST slice | 2.0 | 5.0 | 2.7 | 2.0 | 2.0 | 2.73 |
| Adopt off-the-shelf (`?raw` / react-docgen) | 2.0 | 4.0 | 2.0 | 2.0 | 2.0 | 2.40 |

---

## 4. Recommended design — Track A: "Consolidated walker + explicit chrome contract"

Keep the runtime walker; collapse the build/plugin layer into one plugin; make the chrome filter explicit and tested. **Behavior-identical at runtime.**

### Changes

1. **Five plugins → one authored `docsPlugin`.** Generalize `virtual-json.ts` into a multi-module factory taking `specs: Array<{ id, generate, shouldInvalidate }>` with one keyed cache and one `resolveId`/`load`/`handleHotUpdate` dispatch. `docsPlugin()` composes the three JSON specs + the component-tags transform + the `__code` `enforce:'pre'` transform, returning a `Plugin[]` of **two** objects so the `pre` boundary survives (Vite `enforce` is plugin-wide). `docsPlugin({ vitest: true })` swaps the api-reference/demo-metas generators for empty stubs while keeping the *real* component-modules generator + tagging transform.
   - `vite.docs.config.ts`: `plugins: [docsPlugin(), react(), tailwindcss()]`.
   - `vitest.config.ts`: `[docsPlugin({ vitest: true })]`.
2. **`derive-code/` 8 → 7 files.** Absorb `walk.ts` (the only non-test-pinned module; sole consumer is `index.ts`) into `index.ts`. All 7 test-pinned modules keep their paths and exports.
3. **API engine 12 → 8 files.** Inline `build-component.ts` + `project.ts` (`openProject`) into `build-api.ts`; delete `engine/index.ts`; repoint `api-reference/index.ts` at `./engine/build-api`. The 7 pinned extractors are untouched.
4. **API-reference UI 9 → ~4 files.** Merge `type-badges` + `split-union` + `references-panel` into `type-cell.tsx` (extract a local `DefinitionSheet` helper); fold `pass-through.tsx` into `component-entry.tsx`. Presentational; no test imports these; output byte-identical.
5. **Explicit chrome contract — the one true concept removed.** Promote `INV-UNWRAP-UNKNOWN` from an undocumented "never tag a docs control" convention to an enforced rule: a vitest assertion over the tagging predicate that `moduleNameFor` returns null/false for every path under `src/docs/components/`. This converts the highest-risk silent-failure class into a regression-tested invariant. `labeled.tsx`'s "transparent to the walker" comment becomes a lint-backed guarantee.

### Authoring pattern — unchanged

Authors still write a `Demo` composing `<Example>` blocks, `export const meta = { category }`, `.map` loops, docs controls in `actions=` or as untagged children, and `code={code\`…\`}` for the 7 overrides. No new author concept, no codegen step, no per-example annotation.

`button.tsx` "Colors" — identical source, identical derived output before and after:

```tsx
<Example title="Colors" actions={<VariantListbox variants={variants} value={colorVariant} onValueChange={setColorVariant} />}>
  <Flex wrap gap="sm">
    {colors.map((color) => (
      <Button key={color} variant={colorVariant} color={color}>{color}</Button>
    ))}
  </Flex>
</Example>
```

Derived block (unchanged): `VariantListbox` is untagged-unwrapped (now lint-guaranteed), the 5 keyed Buttons collapse to one representative, `colorVariant` resolves to its live literal, `Flex` renders with its import.

### Before / after

| | Before | After (Track A) |
|---|---|---|
| Authored plugins | 5 | **1** (2 effective Vite objects) |
| Config call-sites | 5 | **1** |
| Virtual modules | 3 | 3 *(unchanged — only Track B reduces these)* |
| Source files | ~58 | **~46** (−13) |
| Runtime mechanisms | 12 | 12 *(walker preserved deliberately)* |
| Distinct concepts | ~12 | **~11** (untagged-unwrap → tested rule) |
| Broken invariants | — | **0** |
| Demos requiring edits | — | **0** |
| Test files deleted | — | **0** (1 added: chrome-contract) |

**Honest caveat:** Track A reduces *count*, not *concepts*. The two derivation systems, the ts-morph engine, and the regex heuristics all survive. Collapsing concepts is Track B.

### Migration plan — green at every step

Each phase is its own commit, green under `biome check .`, `turbo run check-types`, and scoped vitest (CLAUDE.md 3.4, 4.2).

- **Phase 0 — Multi-module factory.** Generalize `virtual-json.ts` to accept `specs[]`, keeping the single-spec signature so nothing else changes. Add a unit test for the keyed cache/invalidation. (All 14 tests untouched.)
- **Phase 1 — Explicit chrome contract FIRST.** Add `__tests__/docs/chrome-contract.test.ts` asserting the tagging predicate returns null for every `src/docs/components/` path. Lands the safety net *before* any deletion. Additive.
- **Phase 2 — Create `docsPlugin` (highest-risk).** Move `parseMeta`/`generate`, `parseReExports`/`moduleNameFor`/`buildTagSuffix`/`buildNameMap`, the `__code` transform, and the vitest stub swap into one factory returning `[pre-transform, main + multiVirtualHooks]`. Point both configs at it. Run the full gate; manually verify HMR (edit a demo, a component prop type, a docs file). **Verify the `enforce:'pre'` boundary empirically** — see Risk 1.
- **Phase 3 — Delete folded plugins.** Remove `api-reference.ts`, `demo-metas.ts`, `component-tags.ts`, `derive-code/index.ts` (shell), `virtual-stubs.ts`; shrink `plugins/index.ts`. `collect-helpers.ts` STAYS (test-pinned).
- **Phase 4 — `derive-code` 8 → 7.** Paste `walk.ts` into `derive-code/index.ts`; delete `walk.ts`. No test imports `walk.ts` — zero test edits.
- **Phase 5 — Engine 12 → 8.** Inline `build-component` + `project` into `build-api`; delete `engine/index.ts`; repoint. The 7 engine tests import extractors at unchanged paths — zero edits.
- **Phase 6 — API UI 9 → ~4.** Merge as above. Visual-diff a component page (Button) before/after to confirm `INV-API-UI-RENDER` byte-identical.
- **Phase 7 (optional, default skip).** Merge `tree`+`format`+`imports`+`snippet` into `derive-code/internals.ts` and rewrite 4 test import *lines* (assertions untouched). The only step that edits test files.

**Acceptance gate:** full docs build + spot-check derived output on 5 representatives — `button` (`.map` + listbox), `data-table` (`code=` override), a `providers/glass` demo, a stateful-helper demo, a `pages/` demo.

---

## 5. Track B (deferred) — build-time walker relocation

The conceptually correct collapse, and the **only** path to "considerably fewer *concepts*."

Run the *unchanged* walker at build time over each demo's rendered tree, emit per-`Example` code strings into a virtual module, and have `example.tsx` look them up. This collapses the two derivation systems into one, deletes the entire runtime walker (~6 files), and removes the `.$`/regex/prop-format concepts — taking runtime mechanisms toward 0, virtual modules to 2, concepts to ~8. `INV-DERIVED-CODE`/`INV-PROP-FORMAT`/`INV-ITERATION-COLLAPSE` become build-time-equivalent output (re-point their tests at the build pass).

**Why deferred:** it requires executing 69 stateful demos (with effects, possibly portals/time-dependent state) deterministically headless (jsdom/SSR) at build to snapshot their trees. That's a real risk the safe baseline avoids.

**Gate (do not skip):** a parallel-run diff harness that renders every demo headless and diffs build-time-walker output against the current runtime-walker output across all ~420 `Example` call-sites. Review and accept the diff *before* deleting the runtime walker. Requires owner sign-off.

---

## 6. Rejected alternatives

- **SSOT verbatim extraction & build-time AST slice** — rest on the false "chrome lives only in `actions=`" premise (§3). Leak `ui/labeled` imports into ~6 demos and dangling identifiers across 69 stateful + 45 mapped demos; break `map.tsx`. Win on count by discarding the exact behavior the docs site exists to provide.
- **Vite `?raw` / off-the-shelf adoption** — same verbatim flaw, plus prior art confirms no off-the-shelf tool fits: `react-docgen-typescript`'s flat `typeToString` cannot reproduce the engine's per-prop references map, the affirmative pass-through note with omitted-key tracking, or the project-prop filter (rdt #335 drops inherited props under exactly this repo's `Omit<P> & {…}` composition). `?raw` shows the whole file including chrome — so it needs an AST slicer on top, at which point it *is* the slice proposal. The recommendation keeps the ts-morph engine bespoke and merely flattens it (Phase 5).
- **Full build-time walker relocation as the committed plan** — correct, but carries execute-at-build risk; deferred to Track B behind the diff harness.

---

## 7. Risks

1. **`enforce:'pre'` is load-bearing and subtly justified.** `docsPlugin` returns `Plugin[]` to preserve the `pre` boundary; collapsing the two for tidiness silently moves `__code` attachment after JSX transform and breaks snippet extraction with no failing unit test. Add a load-bearing comment naming the real boundary. **Note:** with `@vitejs/plugin-react@6` on Vite 8, JSX lowering is oxc-internal (not a userland Babel `transform`), so the original `pre`-ordering rationale is stale — verify the actual boundary empirically in Phase 2.
2. **One factory concentrates blast radius.** A bug in the shared multi-module cache/HMR dispatch now breaks all three virtual modules + tagging + `__code` at once. Phase 0 isolates the factory behind its own commit + test.
3. **"5 → 1" is partly cosmetic.** Vite still registers 2 effective objects across two order phases. Honest headline: **5 → 2-effective, ~58 → ~46 files.** Don't oversell.
4. **Track A removes ~1 concept.** If "considerably fewer moving parts" means *concepts*, the baseline under-delivers and Track B becomes necessary — at materially higher risk.
5. **`map.tsx`'s alias** means any tree-deriving design needs the `code=` override or an alias-resolution step. Keep it handled.

---

## 8. Open questions (owner)

1. After Track A lands, sanction the Track B spike (headless render of 69 stateful demos + parallel-diff harness)?
2. Enforce the chrome rule as a Biome lint rule, a CI grep, or a vitest assertion? (Recommended: vitest assertion — lowest cost, fails in the test run.) — *leaning vitest unless you object.*
3. Are the 7 `code=` overrides permanent escape hatches, or a backlog to eliminate? (`map.tsx`'s is load-bearing and cannot be removed without alias resolution regardless of design.)

---

## Appendix — the invariant contract (27)

Any redesign must keep these green or consciously replace them. IDs are the grading rubric used above.

| ID | Behavior | Pinned by |
|---|---|---|
|`INV-LAZY-CHUNKS`|Each of the 112 demos loads as its own per-route chunk; navigating to a demo is the only thing that imports its module. import.meta.glob in registry.ts uses { import: 'Demo' } so only the named Demo export resolves, never a default. Demo metadata (name, category) and component API data are available WITHOUT importing any demo module.|No unit test (build-shape invariant); enforced structurally by registry.ts loaders + demo-metas plugin. A redesign must keep metadata extraction out-of-band from demo evaluation.|
|`INV-NO-SUSPENSE-FLASH`|Navigation never flashes a blank/fallback frame. main.tsx awaits registry.initialPreload before createRoot; App uses useDeferredValue(route) to keep the prior demo on screen until the next chunk lands; Suspense fallback is null; loadDemo tags each promise with status/value/reason so React use() returns synchronously for already-settled chunks.|No unit test; behavioral. Pinned only by code in registry.ts (loadDemo) + app.tsx + main.tsx.|
|`INV-HOVER-PREFETCH`|Sidebar items call preloadDemo(id) on mouseenter/focus, warming the chunk before the user clicks/navigates.|No unit test; pinned by sidebar.tsx + registry.preloadDemo.|
|`INV-HASH-ROUTING`|Routing is hash-based via useSyncExternalStore on 'hashchange'. navigate() uses history.pushState + a manual HashChangeEvent dispatch to update the route WITHOUT the browser's scroll side effect; subscribers stay in sync. Scroll resets to top on demo change.|No unit test; pinned by hooks/use-hash.ts + app.tsx scroll effect.|
|`INV-THEME-DENSITY-PERSIST`|Theme (light/dark/system) and density (compact/snug/loose) persist to localStorage across reloads; theme applies a .dark class to root and tracks OS preference in system mode (bootstrapped in index.html to avoid FOUC). Density defaults to snug.|No unit test; pinned by hooks/use-theme.ts, hooks/use-density.ts, index.html.|
|`INV-DERIVED-CODE`|When an <Example> has no explicit code= prop, deriveCode(children) reconstructs a JSX code block by walking the live rendered React tree. Returns null when the subtree contains no recognized (tagged) components, in which case no code block is shown. deriveCode is memoized on [code, children].|src/__tests__/docs/derive-code/index.test.tsx.|
|`INV-CODE-OVERRIDE`|An explicit code= string on <Example> is used verbatim and bypasses derivation entirely. 7 demos use this via the code`` template tag (data-table, credit-card-input, code, map, odometer, mask-input, pdf-viewer).|example.tsx (code ?? derived) + the 7 demo files; index.test.tsx covers the __code-snippet path.|
|`INV-TAG-RESOLUTION`|The runtime walker recognizes a component iff its element.type carries BOTH __module and __name as strings. Partial tags, non-string tags, null, and untagged functions all resolve to undefined.|src/__tests__/docs/derive-code/registry.test.ts.|
|`INV-UNWRAP-UNKNOWN`|Unrecognized (untagged) components are transparently unwrapped: the walker recurses into their children rather than emitting a tag. This keeps docs-internal controls and local demo wrappers OUT of derived code. Corollary: docs-internal controls must NEVER be tagged.|Indirectly via index.test.tsx + tree.test.tsx. **Promoted to an explicit test in Track A Phase 1.**|
|`INV-PASSTHROUGH-FLATTEN`|Fragment and intrinsic HTML elements are pass-through: flattened away, element children surfaced, text leaves coalesced into the surrounding buffer, preserving source order. Adjacent text joined with a single space; whitespace-only text dropped.|src/__tests__/docs/derive-code/tree.test.tsx + index.test.tsx.|
|`INV-TAGGED-PROVIDER-RENDERED`|Tagged provider/layout wrappers (GlassProvider → providers/glass, DensityProvider) are rendered WITH their import, NOT unwrapped. Deliberate exception to INV-UNWRAP-UNKNOWN.|src/__tests__/docs/derive-code/index.test.tsx.|
|`INV-ITERATION-COLLAPSE`|A run of 3+ identical sibling renders collapses to ONE representative iff all siblings carry an explicit React key (detected via the '.$' marker Children.toArray inserts). Authored repetition without keys is preserved; distinct keyed siblings are all kept.|src/__tests__/docs/derive-code/index.test.tsx.|
|`INV-PROP-FORMAT`|Prop serialization: drop undefined/null/false; true → bare key; string → double-quoted (or {JSON} for quote/newline); number → {n}; functions → dropped; element props → nested self-closing JSX (if it resolves to a name); array-of-primitives → JSON array; flat object of primitives → object literal (`{ initial: 1, sm: 2 }`, responsive props), bare identifier keys, non-identifier keys (`2xl`) quoted; else (Date, nested/non-primitive object, array-of-objects, empty object) → `{...}` placeholder. children/className/key/ref always stripped. renderOpenTag inlines ≤80 cols else one prop per line.|src/__tests__/docs/derive-code/format.test.ts.|
|`INV-SNIPPET-VERBATIM`|PascalCase JSX-returning helpers in demos/*.tsx (excluding default export) get their full source attached as __code at build time; the walker emits it verbatim (after reindent) instead of an opaque tag, inferring imports.|snippet.test.ts + plugins/derive-code collect-helpers.test.ts.|
|`INV-SNIPPET-SELFCONTAINED`|A helper's __code is self-contained: sibling top-level type aliases/interfaces/non-JSX consts it references by whole-word name are prepended in source order; sibling JSX helpers are NOT pulled in; only referenced preambles included.|src/__tests__/docs/derive-code/collect-helpers.test.ts.|
|`INV-SNIPPET-IMPORTS`|Snippet imports inferred by regex: JSX opening tags resolved against registry.byName (virtual:component-modules), plus a curated React hook allowlist matched as bare identifiers with a (?<!\.) lookbehind. Must cover React 19 hooks (use, useActionState, useOptimistic, useFormStatus).|snippet.test.ts (collectSnippetImports) + index.test.tsx.|
|`INV-IMPORT-ASSEMBLY`|Final code = import block + blank line + JSX (or just imports if JSX empty). Imports dedupe per (module,name); modules sorted; names sorted within a statement; 'react' keeps a bare specifier, everything else becomes 'ui/<module>'.|src/__tests__/docs/derive-code/imports.test.ts.|
|`INV-API-PRECOMPUTED`|Component prop API fully pre-computed at build time (buildApi over one ts-morph Project), inlined via virtual:api-reference as Record<componentDirName, ComponentApi[]>. At runtime getComponentApi(id) is a plain lookup — no async, no parsing.|The 7 api-reference test files + registry.getComponentApi + plugins/api-reference.ts.|
|`INV-API-PUBLIC-EXPORTS`|Only PascalCase VALUE re-exports from components/*/index.ts barrels are components: non-PascalCase, per-specifier type-only, whole-statement export type {}, and export * are skipped; names dedupe; aliases win over local names.|src/__tests__/docs/api-reference/find-components.test.ts.|
|`INV-API-TYPE-EXTRACTION`|Props type is the first param of the innermost callable after unwrapping forwardRef/memo; type-to-string prefers named aliases, preserves generics, single-quotes string literals, strips '\| undefined' from optionals. Inline destructured defaults harvested with source quoting. never branches filtered. Missing decls → empty props. Props whose authored type is a TypeReference to a project-source alias/interface keep that source text (`Responsive<number>`, `GridGap`, `ButtonVariants`) instead of the expanded apparent type; mapped types likewise keep source text; inline anonymous unions and node_modules / built-in references still flow through the formatter unchanged.|src/__tests__/docs/api-reference/{format-type,extract-defaults,extract-project-props,extract-props}.test.ts.|
|`INV-API-PASSTHROUGH`|HTML pass-through detected only with a props annotation: ComponentPropsWith(out)Ref / *HTMLAttributes / PolymorphicProps recognized, HTML element classes map to tags (HTMLHeadingElement → h1), Omit<> carries omitted keys, intersections walked, Pick skipped, repeats dedupe by merging omitted-key sets, PolymorphicProps exposes href.|src/__tests__/docs/api-reference/{extract-passthrough,ts-utils}.test.ts.|
|`INV-API-REFERENCES`|Type references resolve recursively: every PascalCase type name in a formatted prop type resolves to its definition (alias → RHS, interface/object → apparent shape one member per line), transitively with a visited set; excludes node_modules/built-ins/recipe-engine internals; PascalCase tokens inside string literals are NOT harvested. Authored project-alias names preserved by INV-API-TYPE-EXTRACTION reach this resolver, so a `Responsive<number>` prop now surfaces a `Responsive` card where the previously-expanded inline object produced none.|src/__tests__/docs/api-reference/extract-references.test.ts.|
|`INV-API-JSDOC`|Each PropDef carries optional `description` (TSDoc summary via getDocumentationComment, tags stripped), `required` (present⇒true; absent⇒optional, via SymbolFlags.Optional with a questionToken fallback), `example` (`@example`), and `deprecated` (`@deprecated` message, or `true` when bare) from the prop symbol's TSDoc; ComponentApi carries an optional `description` from the component function's TSDoc. Defaults precedence: inline destructuring default > `@default` / `@defaultValue` tag.|src/__tests__/docs/api-reference/extract-props.test.ts.|
|`INV-API-UI-RENDER`|ApiReference renders ComponentApi[] as an accordion; each panel leads with the component `description`, then props/events partitioned (EVENT_PROP regex) and sorted separately. Each prop is a description-first card (PropList/PropRow): name + `required`/`deprecated` badges, the prose summary, then a metadata row with the type and default, and `@example` as a CodeBlock. Type rendering via TypeCell is unchanged: referenced types expand through a non-blocking Sheet; external types show a hover tooltip naming the package; unions split on top-level \| into badges; multi-line aliases render as CodeBlock. Pass-through notes below the lists.|Presentational; behavior pinned by components/api-reference/*.|
|`INV-DEMO-META-SHAPE`|Every demo exports exactly one Demo component and a meta object; meta parsed at build time from `export const meta = { name?, category? }`, keeping ONLY known keys with string-literal values. Missing category → 'Other'; missing name derived from filename. Subfolder demos namespace their id (pages/x → pages-x).|plugins/demo-metas.ts + registry.ts. (112/112 demos export meta.)|
|`INV-VITEST-STUBS`|Under vitest, virtual:api-reference and virtual:demo-metas are stubbed with empty defaults; virtual:component-modules is produced for real (so registry.byType/byName tests work against the real components dir). The docs build never uses the stubs.|vitest.config.ts plugin set; relied on by every derive-code/registry test.|
|`INV-HMR-INVALIDATION`|All three JSON virtual modules invalidate on file change via shouldInvalidate: api-reference on *.ts(x) outside docs/, demo-metas on demos/*.tsx, component-modules on any file under srcDir. Cache reset + module graph entry invalidated.|virtual-json.ts + each plugin's predicate.|
|`INV-PLUGIN-ORDER`|deriveCodePlugin runs enforce:'pre' so __code is attached to raw demo source before JSX transform; componentTagsPlugin's transform appends tagging to component/provider/layout barrels; tagging only mutates object/function values lacking an existing __module, wrapped in try/catch.|vite.docs.config.ts plugin order + buildTagSuffix + derive-code enforce:'pre'.|
