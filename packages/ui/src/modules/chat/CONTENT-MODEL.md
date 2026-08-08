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

## Judgement so far

Candidate A scored 22.5/40 across four lenses, with no fatal defect: dependency and migration 7, streaming 6, projection and a11y 5, simplicity and altitude 4.5. The altitude lens states the sharpest verdict: *survives as an architecture; fails as increment 3*. Its `id` on every part and its structural emptiness rule are forced rather than speculative; the purpose enum and the two-axis projection are not.

Candidates B, C, and D are proposed but not yet judged.

## What holds whichever candidate wins

Four items appear in every candidate and in every lens, so adopt them separately from the choice.

1. **An id on every part**, minted by the shell, not the engine. It kills merge-by-index and gives a citation a target, a collapsible step a key, and an embed a stable React key.

2. **Emptiness is structural, not projected.** Name a predicate in the engine. `dropEmptyReply` reads `content === ''` today, and that read has no honest port to a list.

3. **The projection takes a purpose.** Copy, search index, announcement, export, and the transport want different strings from the same parts.

4. **Normalize at the state boundary, not in render.** `applyReplySnapshot` mints a new object for the streaming message only, so settled bubbles keep prop identity and skip the Markdown re-lex. `toChatParts` passes an array through by reference for that reason, but a string normalized inside the transcript's `map` mints a fresh array each chunk and re-lexes every bubble.

## Open decisions

The decisive question is narrow: is a model-emitted block kind that the UI has never heard of a build failure or a runtime miss? A build failure takes the closed union and pays for increment 5. A runtime miss opens the model.

Is the inline citation the feature that justifies this work? If yes, judge every candidate against a renderer that can honour a range, and fix [`markdown-renderer.tsx`](../../components/markdown/markdown-renderer.tsx) first. If no, the block half of candidate C stands alone in three files.

Does a part id come from the client or the server? A conversation that is persisted, reloaded, and re-minted breaks every citation target.

Is the wiring one increment or two? Candidate D merges increments 3 and 4, which the roadmap holds apart on purpose.

---

**See also:** [`ROADMAP.md`](ROADMAP.md) (the increments) · [`engine/chat-content/`](engine/chat-content) (the engine that landed) · [`../../components/markdown/`](../../components/markdown) (the renderer any inline anchor must pass through).
