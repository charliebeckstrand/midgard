# API reference redesign — usage-first prop rows

**Status:** Proposed — awaiting assent.
**Scope:** `docs/api-reference/engine` (additive) + `docs/components/api-reference` (rework). Orthogonal to [REDESIGN.md](REDESIGN.md) Tracks A/B: this changes *what* the engine extracts and *how* the UI renders it, not the plumbing that moves the data.

---

## 1. Problem

The current reference renders type algebra, not usage. Three symptoms:

1. **No prose.** Components carry JSDoc on props (`Slider.getValueText`, every annotated `DataTableColumn` member) but `PropDef` never extracts it. The table shows `name | type | default` and nothing about what the prop *does*. Required props are indistinguishable from optional ones.
2. **Complex types punt to a modal.** A prop like `columns: DataTableColumn<T>[]` renders as a badge plus a "View references" button that opens a Sheet of raw type-alias source. The reader context-switches away from the table, then mentally assembles "what do I actually write" from type definitions.
3. **Events are signatures, not calls.** `onValueChange` renders as the badge `(value: number) => void`. The information is there; the *shape of the code you write* is not — which is exactly what the derive-code blocks above the reference get right.

## 2. Design principle

**Show the call, not the type algebra.** Wherever the type string alone doesn't tell the reader what to type — event handlers, render props, object/array configs — the row expands to a small generated code block with that one prop applied to the component, in the same voice as the derived example blocks above it. Simple props (primitives, literal unions, `ReactNode`) stay as they are; a usage block for `disabled?: boolean` is noise.

This is the derive-code idea pointed at the API table: derived by default, mechanically truthful, with an authored override for the cases derivation can't serve.

## 3. Anatomy

Replace the three-column `<Table>` + Sheet with a flat list of expandable definition rows (the accordion-per-component shell, props/events partition, and pass-through note all stay):

```text
Props
──────────────────────────────────────────────────────────────
columns *        DataTableColumn<T>[]                        ⌄
  Column definitions; one entry per rendered column.
──────────────────────────────────────────────────────────────
step             number                          default: 1
──────────────────────────────────────────────────────────────
variant          line │ striped │ bordered       default: 'line'
──────────────────────────────────────────────────────────────

Events
──────────────────────────────────────────────────────────────
onValueChange    (value: number) => void                     ⌄
──────────────────────────────────────────────────────────────
```

Row anatomy:

- **Header line** — prop name (mono), required marker, type summary (badges for literal unions exactly as today; mono text for signatures and named types), default inline. The whole line is the expand trigger (`aria-expanded`, Collapse panel — same grammar as `<Example>`'s "Show code").
- **Description line** — JSDoc summary in muted text, always visible when present. Descriptions are the most-consumed content in any reference; they don't belong behind interaction.
- **Expanded panel** — present only when there's more than the header can say:
  - **Usage** — the generated snippet (§4) in a `CodeBlock`.
  - **Type definitions** — the resolved `references` cards, inline. This deletes the Sheet: definitions render adjacent to the row instead of in a modal. The external-package tooltip behavior moves into the header as-is.

A row with no description, no usage, and no references is a plain non-interactive line — most simple props. The chevron only appears where expansion exists, so density stays close to today's table.

## 4. Generated usage snippets

Generated at build time in the engine (see §6), from the `ts.Signature`/`ts.Type` directly — never by re-parsing the formatted type string. Resolution order per prop:

1. **`@example` JSDoc tag** → verbatim, dedented. The authored escape hatch, mirroring `INV-CODE-OVERRIDE`'s `code=` on `<Example>`. Wins over generation.
2. **Function type** (single call signature) → arrow handler with the signature's real parameter names, `…` placeholder body (the derive-code `PLACEHOLDER` voice):

   ```tsx
   <Slider onValueChange={(value) => …} />
   ```

   ```tsx
   <DataTable getKey={(row, index) => …} />
   ```

3. **Object / array-of-object type with project references** → skeleton literal from the resolved apparent shape: required members always, placeholder values by member type (string → `'…'`, number/literal union → first concrete value, boolean → `true`, function → `(…) => …`, `ReactNode` → `'…'`):

   ```tsx
   <DataTable columns={[{ id: '…' }]} />
   ```

4. **Anything else** → no snippet. Literal-union and primitive props are already self-describing as badges.

Formatting reuses the 80-column rule from `renderOpenTag`: inline when it fits, one prop per line otherwise. Snippets are fragments — no import block; the example blocks above the reference already establish imports.

Edge cases settled up front:

- **Generics** (`DataTableColumn<T>`): parameter names come from the signature, so `(row, index) => …` needs no `T` resolution; skeleton members format through the existing `formatPropType` fallback chain (constraint/default), same as the table.
- **Unions of functions / overloads**: no generation (signature count ≠ 1), same guard `formatFunctionType` already uses.
- **Objects with zero required members** (`DataTableColumnManagerConfig`): generation would produce `{ }` — emit nothing and rely on the inline reference card, or an authored `@example`. Don't invent "representative" optional members; a guessed skeleton is worse than none.

## 5. Data model

Three additive fields on `PropDef`; `ComponentApi` unchanged:

```ts
type PropDef = {
	name: string
	type: string
	references?: Record<string, string>
	default?: string
	externalFrom?: string
	/** JSDoc summary from the prop's declaration. */
	description?: string
	/** Absent `SymbolFlags.Optional` on the prop symbol. */
	required?: boolean
	/** Generated (or @example-authored) usage snippet. Only complex props. */
	usage?: string
}
```

`description` comes from `symbol.getDocumentationComment(checker)` in `buildPropDef`; `required` from the symbol flags (for discriminated-union props collected from multiple arms, required only when required in every arm). Both improve the reference for *every* prop immediately, and JSDoc backfill on under-documented components pays double — IDE hover and docs from one source.

## 6. Architecture fit

- **All extraction stays build-time** (`INV-API-PRECOMPUTED`). New engine module `engine/derive-usage.ts` called from `buildPropDef`, where the checker, symbol, and component name are already in hand. No runtime type-string parsing — the REDESIGN.md audit already established that string-heuristic layers are the fragility to avoid, and `splitUnion`/`unquote` in `type-cell.tsx` shrink rather than grow.
- **UI**: `props-table.tsx` + `type-cell.tsx` collapse into a `prop-row.tsx` (header + Collapse panel); `component-entry.tsx` keeps the partition and pass-through note; the Sheet, `ReferencesPanel`, and the `Table` dependency go away. Definition rows also fix the current table's mobile behavior (three forced columns).
- **Tests**: new engine tests for description/required extraction and `derive-usage` (the contract: resolution order, placeholder table, zero-required-member guard, `@example` verbatim). `INV-API-UI-RENDER` is deliberately superseded; it's pinned by no test file. All 7 existing extractor test files are untouched.
- **`virtual:api-reference` payload** grows by descriptions + snippets. Strings only, still JSON-inlined; no shape change consumers must migrate.

## 7. Implementation plan

Each phase its own commit, green under `biome check .`, `turbo run check-types`, scoped vitest.

- **Phase 1 — `description` + `required`.** Extend `extract-props.ts` + types; tests. UI renders the description line under existing table rows (small, shippable on its own).
- **Phase 2 — `derive-usage.ts`.** Generation rules + `@example` override; tests pin the §4 contract.
- **Phase 3 — Row rework.** Replace table/Sheet with expandable rows; delete dead code. Visual check on `data-table` (references + generics), `slider` (events + defaults), `button` (literal unions, the no-expansion density case).

## 8. Open questions

1. **Skeleton breadth** — required-members-only is the proposed rule (§4.3). If flagship configs like `columns` feel too thin as `{ id: '…' }`, the lever is authored `@example` tags, not looser generation. Agreed?
2. **JSDoc backfill** — descriptions render only where JSDoc exists. Worth a follow-up pass over the most-trafficked components, or leave incremental?
3. **Events with no JSDoc** — generate a stock description ("Called when …" can't be derived truthfully) or leave blank? Proposal: leave blank; the usage snippet carries the row.
