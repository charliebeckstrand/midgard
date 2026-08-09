# Chat content model — design record

> **The open question under increment 3: is `ChatPart` the right shape?** [`ROADMAP.md`](ROADMAP.md) §3 plans to grow `ChatPart` into a flat, block-level union of five kinds. The engine landed; no wiring did. This file records the requirements the model must meet, the defects found in the planned shape, the four candidates measured against it, and what stays true whichever candidate wins. Read it before you write the wiring.

## Status

Nothing reads `chat-content/` yet, so the model is still free to change. `ChatContent.content` is a `string` ([`engine/types.ts`](engine/types.ts):7), `ChatPart` is `@internal` and absent from [`index.ts`](index.ts), and the transcript draws the string ([`chat-transcript.tsx`](chat-transcript.tsx):50). Only the pure suite ([`chat-content.test.ts`](../../__tests__/modules/chat-content.test.ts)) would need a rewrite.

The design work is not complete. Four candidates exist and one is fully judged; the record below states what is settled and what is not.

## Requirements the later increments place on the model

Each requirement is testable, and each comes from a roadmap increment rather than from taste.

**Increment 4 — the embed seam.** An `embed` part names a renderer by string key and holds its payload opaquely, because no chart, grid, or map type may appear in `ChatPart`. A part whose key has no registered renderer keeps its key and its data, and renders a stated fallback.

**Increment 5 — the stream.** Merge-by-index is sound only while parts append in order; a late citation, a tool part that turns from running to done, or any insertion moves every later index. The model must therefore give a part an identity. It must also express "this part is not complete", because a half-streamed chart must not reach a renderer as complete.

**Increment 6 — the announcement.** N snapshots of one reply must make exactly one announcement, and "a reply started" is a separate one-shot. Settled is a property of the stream, not of the parts, so either a part carries completeness or the announcement rides the hook's `streaming` transition.

**Increment 7 — the benchmark.** Fixtures must build with no clock and no random source, because the chat engine is on the purity list. Normalization must not defeat `ChatMessage`'s memo.

**Backlog — persistence.** Every part kind must serialize to JSON. The composer holds attachments as `File`, which is a live browser object and cannot serialize, so a `file` part holds a reference and a media type instead.

## Nine defects in a flat, block-level list

1. **Inline anchoring is unexpressible.** The roadmap's headline feature puts the citation *inside* a sentence ([`ROADMAP.md`](ROADMAP.md):85). A flat block list makes the citation its own block, which renders after the sentence and is a weaker feature.

2. **There is no renderer seam even given offsets.** [`markdown-renderer.tsx`](../../components/markdown/markdown-renderer.tsx) builds only elements it controls, drops raw HTML, and clears an href that is not `http(s)`, `mailto`, or `tel`. A part list does not change that; each part stays string-in, tree-out.

3. **A partial part has nowhere to live.** The flat list cannot record "this part is still filling", and merge-by-index cannot tell "part 2 changed" from "a part was inserted at 2".

4. **The projection is not a wire format.** `chatPartsText` drops a part that projects to nothing and joins with a blank line, so `['A', '', 'B']` and `['A', 'B']` give the same string. The increment-3 round-trip proof covers rendering, not persistence.

5. **A part has no identity.** Position is the only identity today, which breaks the merge under insertion, React keys for an embed that holds state, per-part view state for a collapsible tool step, and a citation target.

6. **One projection cannot serve its readers.** `chatPartsText` is declared the single reader for copy, search, and the announcement, but increment 6 needs the announcement to *exclude* a chart's data, and export needs to *include* it. The transport is a fourth reader: `retry` sends a user message's text back over the wire.

7. **Emptiness read from the projection is wrong.** A reply that holds one unfilled embed projects to `''`, so a rollback rule ported from `content === ''` ([`engine/chat-transcript.ts`](engine/chat-transcript.ts):71) would drop a reply that had already started.

8. **Flat means depth 1.** A collapsible tool step that holds prose beside an embedded grid becomes one opaque part, which the chat can neither draw with its own Markdown nor project with its own text rule.

9. **The receivers take one target.** This defect is orthogonal to the model and fatal to the headline feature: map takes `selectedRegion?: string | null` and `selectedOverlay?: { id; index? } | null`, and chart has no selection input at all. No content model can ring twelve stops until map and chart change.

## Three corrections to the roadmap

The roadmap says a second entry point needs a `package.json` change ([`ROADMAP.md`](ROADMAP.md):61). It does not: `exports` maps `./modules/*` to `./src/modules/*/index.ts`, and a Node subpath pattern matches across `/`, so `ui/modules/chat/embeds` already resolves.

The roadmap says to extend [`use-map-legend-registry.ts`](../map/use-map-legend-registry.ts) ([`ROADMAP.md`](ROADMAP.md):57). That hook is a mount-time ledger of children that register themselves, keyed by id. `ChatEmbedProvider` is a caller-supplied record read by key. They are different patterns.

The roadmap says every module holds the receiving half of a shared selection and that "nothing new is needed in them" ([`ROADMAP.md`](ROADMAP.md):85). Retract that for map and chart, per defect 9.

## The four candidates

**A. Closed union, two axes.** Keep a closed five-name union owned by the engine. Give every part a caller-minted `id`, move `citation` off the block axis onto an inline mark that a text part carries, take a purpose parameter on the projection, and hold the open axis in a *field* (`embed.name`), so the exhaustive `switch` stays a compiler check. Admits that it makes the inline anchor addressable but not renderable.

**B. Markdown-native.** Keep `content` a `string` forever. Encode embeds, tool steps, files, and citations as stock GFM — a fenced block with a `chat:<verb>` info string, and a link with a `chat:` href — and resolve them with a claim-or-fall-through renderer map on `Markdown`. Streaming stays cumulative-string, persistence is the identity function, and inline citations are ordinary link tokens. Loses compile-time exhaustiveness, which is not recoverable, and a user message that quotes the vocabulary renders as a live embed.

**C. Two-level: blocks plus marks.** A message is a list of identified blocks, and an inline citation is an offset range over a prose block's Markdown *source*, kept as a side channel rather than a nested tree. Splitting that source at marked's top-level inline token boundaries reproduces the identical token stream, so the headline anchor costs no change to `components/markdown`. Drops marks in list items, table cells, and blockquotes in v1 — and an agent asked which stops are late usually answers with a list.

**D. Open envelope, closed forms.** Close the union at two *forms*, prose and block, and hold the openness in the block's `kind` string. A block is an opaque envelope that chat can always draw, project, and roll back on, and a registry entry keyed by that string supplies the renderer, the per-purpose text, the announcement, and the export form as one definition. Its own author states the condition it needs — kinds authored outside this repo — is not met by the roadmap, and that on the roadmap as written the closed union wins.

## Judgement

Four lenses scored each candidate out of 10: streaming, projection and a11y, dependency and migration, and simplicity and altitude. B scored highest at 24.5, then A at 22.5, then C at 22, then D at 21.5 with one fatal defect.

The scores did not decide it, and the spread shows why: 3 points separate the best from the worst, and every simplicity lens returned 4.5, 4, 4, and 3. Four adversarial reviews reached the same charge in the same words — *roughly two increments too early*. Two candidates convicted themselves in their own closing paragraphs.

## Verdict

**Keep the closed union and cut it to increment 3.** `ChatPart` stays a closed `kind`-discriminated union with `text` as its only member. Every part gains an `id`. The wiring lands: `content: string | ChatPart[]`, a structural emptiness rule in place of `content === ''`, and one plain-text bridge that `retry` and the bubble share. Marks, the `embed` / `tool` / `file` kinds, the purpose enum, the completeness flag, and the merge all defer to the increments that own them.

Three facts decided it, and each is verifiable in the repo.

**The roadmap already fixed the inventory, and every candidate overran it.** [`ROADMAP.md`](ROADMAP.md):51 reads "`text` first, then `embed`, `tool`, `file`, and `citation` as later increments add them". Increment 3 ships `text`. The four candidates shipped between two and five kinds.

**The deferral is free, which is the question that matters.** Sort the proposed surface by what can be retrofitted. The `id` cannot: once parts persist, a required field is a breaking addition, and the merge, React keys, per-part view state, feedback, and citation targets all key on it. The widening cannot: it *is* the breaking change. The emptiness rule cannot. Everything else is an optional field or an optional parameter, so it can arrive later without a break.

**The headline feature is not blocked by any content model, so buying it now buys nothing.** All three inline-citation forms fail at the same place: [`markdown-renderer.tsx`](../../components/markdown/markdown-renderer.tsx) offers no injection slot, `marked` yields no absolute offsets for inline tokens, and `safeUrl` strips a `cite:` href. The blocker is the Markdown pipeline, which sits outside chat and outside every candidate. Shipping an address with no renderer is dead public API — the same charge this file levels at today's dead `chat-content/`, repeated at four times the size.

## Why the highest score lost

Candidate B took 24.5/40 and the best streaming verdict on the table, 8/10, on a byte-by-byte trace of 94 frames. Three findings killed it, and none is patchable.

It is **spoofable**. A user message that holds the fence vocabulary is byte-identical to an assistant's, so the transcript draws a live embed from user-authored text. The proposal's own mitigation makes the same string render differently by role. For a product where an agent's output drives dashboard selection, the message text must not be the control channel. A constructed part list cannot be spoofed, because it is constructed and not parsed.

Its **projection reverses an a11y guarantee**. The projection pushes `token.raw` for every non-directive token, so `'<script>alert(1)</script>'` reaches the shared polite region and the clipboard verbatim. [`markdown-renderer.tsx`](../../components/markdown/markdown-renderer.tsx) drops html, whitespace, and link-definition tokens by design; the projection puts them back through the a11y channel.

It needs a **`renderers` prop on the shared `Markdown`**, which is a new caller-supplied rendering pattern in a static leaf with six consumers. The house forms are a per-item render prop, a builder that receives defaults, or a component through `UIProvider`.

## What the judgement refuted

Record these, so no later increment re-proposes them without new evidence.

**The purpose-parameterized projection** (`'copy' | 'index' | 'announce'`), proposed by three candidates, dies at the first call site each one converts. `retry` becomes `chatContentText(lastUser.content)` with the purpose defaulted to copy, and that string is the wire payload sent back to the model. The transport is a fourth reader with needs unlike the three enumerated, so a user message holding a file part would retry to the model as `[report.csv](https://…)`. The multi-reader problem is real; this is the wrong cut of it.

**Per-part completeness flags** (`partial`, `status`, `closed`) die in all four candidates for one reason: nothing settles them. `stop` returns early at [`use-chat-send.ts`](use-chat-send.ts):156 with no transform, the catch path only drops the empty reply, and `finally` only clears the controller and the flag. A stopped or failed reply strands a part as forever unfinished, which renders as a permanent skeleton.

**An open discriminant** dies on a substitution test: `{ id; kind: string; alt; data }` and `{ id; kind: 'embed'; name: string; alt; data }` are field-for-field identical and differ only in whether the registry key is spelled `kind` or `name`. The open form surrenders the compiler-checked exhaustive switch and buys nothing.

**Shipping `tool` and `file` kinds now** fails on the module's own send path: `appendUserMessage` and `truncateToEditedMessage` take `content: string`, so a file part is unconstructible by the path that would create it and silently deleted by the path that edits it.

**Keeping what is on disk** was considered and refuted. `chat-content/` is dead — nothing outside its own test imports it — and increment 4 cannot land without somewhere to put an embed.

## The three items that hold

Adopt these whatever else changes. An earlier draft of this file named a fourth, a purpose on the projection; the judgement refuted it, and the section above records why.

1. **An id on every part.** For the string arm the engine uses a fixed `TEXT_PART_ID`, not a minted one, so the engine keeps its no-clock, no-random rule and a cumulative snapshot stays unambiguous: increment 5 replaces the text that one name points to, so a string chunk arriving after a chart can neither delete the chart nor open a second running text.

2. **Emptiness is structural.** Write it as a private switch with no default arm, so a later kind cannot join the emptiness rule as silence — the discipline `partText` already documents.

3. **Normalize at the state boundary, not in render.** [`chat-transcript.tsx`](chat-transcript.tsx) changes zero lines: `message.content` passes through unnormalized, which keeps the shallow memo intact for 5,000 settled bubbles at zero per-render allocation.

## The change the verdict asks for

Eleven files, one of them a test, and the commit is `feat(ui)!`.

`engine/chat-content/types.ts` gains the `id` field and drops `@internal`. `normalize.ts` gains `TEXT_PART_ID`, the private `isEmptyPart` switch, and the exported `isEmptyContent`. `text.ts` gains `chatContentText(content: string | ChatPart[])`; `partText` and `chatPartsText` are not edited. `engine/types.ts`:7 becomes `content: string | ChatPart[]`. `engine/chat-transcript.ts`:71 swaps `content === ''` for `isEmptyContent`, and the other six transforms are untouched. `chat-message.tsx` widens `children` and renders one `<Markdown>` over the bridge. `use-chat-send.ts`:201 wraps `lastUser.content` in the bridge, and nothing else in the streaming path moves. `index.ts` gains three names.

The proof the roadmap asked for becomes literally true rather than hoped for: one wrapper, one lex, one `data-slot`, one margin scope. `chat-transcript-transforms.test.ts`, `use-chat-send.test.ts`, `chat-transcript.test.tsx`, and `chat-message.test.tsx` all pass unedited, because their fixtures build string content throughout. Only `chat-content.test.ts` is edited.

No change is needed to [`docs/MODULES.md`](../../../docs/MODULES.md) — it indexes module names, not symbols — nor to `package.json`, `biome.json`, or the admin route.

## Open decisions

These are calls the judgement cannot make, and each is a decision for the repo owner.

**Does a part id survive the client?** [`use-chat-send.ts`](use-chat-send.ts):118 overwrites a caller-supplied id with a fresh `crypto.randomUUID()` when it seeds `initialMessages`, so a conversation persisted with part ids and reloaded through the hook is re-keyed at mount. That defeats every per-part target the id exists to hold.

**Does the gateway payload get a parse boundary?** The admin route casts the fetched JSON with no runtime validation. Today a wrong wire shape gives a wrong string in a bubble; after the widening, a gateway that starts returning arrays type-checks in silence.

**Is `ChatContent` the right name?** Its own TSDoc says "A single message in a chat", so it is a message and not content, and it holds a field named `content` whose type lives in a directory named `chat-content/`. A reader meets three names on one axis.

**Which live channel carries a reply in increment 6?** `role="log"` implies polite semantics over content as it is added, and [`core/announcer.ts`](../../core/announcer.ts) writes one whole string into a shared `aria-atomic` region. Two channels over one reply is a double read. No content model settles this.

**When is the map and chart retraction written?** [`ROADMAP.md`](ROADMAP.md):85 is wrong today, per defect 9. Retract it now, or when the adapters land.

---

**See also:** [`ROADMAP.md`](ROADMAP.md) (the increments) · [`engine/chat-content/`](engine/chat-content) (the engine that landed) · [`../../components/markdown/`](../../components/markdown) (the renderer any inline anchor must pass through).
