# Chat roadmap

> **Goal: an agent surface for logistics dashboards, where a reply can carry a chart, a grid, or a map.** The module ships `ChatTranscript`, `ChatMessage`, `ChatPrompt`, and the `ChatList` sidebar, over three hooks and an injected transport. It is the one module with no pure core, no benchmark, and an open row for each of its public names. This file records what ships today, the engine that must come first, and what the module must absorb after it.

## Status

The surface is real and the core is not. Five components and three hooks cover a whole agent conversation: a transcript that auto-scrolls to the newest reply, a Markdown bubble that pulses while a reply arrives, a composer with attachments and a send-to-stop toggle, and a roving-tabindex conversation list. The a11y work is done to the package's standard — a visually hidden author label on each bubble, an accessible name the composer cannot lose, and a row model that never nests one interactive control inside another. `useChatSend` takes the transport as a parameter, so the module assumes no endpoint and no wire format.

Under that surface the module holds no engine. Every other module in [`MODULES.md`](../../../docs/MODULES.md) keeps its rules in a framework-free core, and [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) gates three of them together. Chat keeps its rules inside React. [`use-chat-send.ts`](use-chat-send.ts) is 226 of the module's 908 lines, and it owns the whole transcript domain: the optimistic append, the empty reply bubble, the cumulative snapshot that replaces that bubble's text, the rollback that drops the bubble only if it never filled, the truncation `retry` runs to the last user message, and the truncate-and-replace `edit` runs from an earlier one. None of it is callable outside a render, so none of it is provable except through a mounted component.

The proof is the thinnest in the package. Chat holds 8 test files against query's 15, map's 36, chart's 52, and grid's 88, and it holds no benchmark at all against 3 to 15 for every other module. That is not a coverage number; it is a statement about which rules have a name. A rule with no name gets written twice, which is what happened to the submit guard: [`chat-prompt.tsx:97`](chat-prompt.tsx) and [`use-chat-draft.ts:56`](use-chat-draft.ts) each decide that a trimmed draft is sendable, and nothing holds the two together.

The vocabulary disagrees with itself in public. The speaker axis is `role: 'user' | 'agent'` in the data and `type: 'user' | 'assistant' | 'system'` on the component, and [`chat-transcript.tsx:40`](chat-transcript.tsx) maps between them by hand — so `system` is a state the component draws and the data cannot express. `Chat` ([`types.ts:4-6`](types.ts)) is the package's only snake_case public type. The hook reports `sending` where every component it feeds reads `streaming`. The 2026-07-22 API audit records all of it, and the chat rows are the densest open cluster it holds: P1, P2, P3, P7, P8, P9, P10, and P12.

The content model is the ceiling over everything else. `ChatContent.content` is a `string`, so a message is text and can be nothing else. An embedded chart, a tool call, a citation, and an attachment preview each need the same thing first, and none of them can be added one at a time on top of a string.

## Engine — the substrate

Every framework-free rule the chat holds must live in `engine/`, laid out like the grid, query, and map engines. The layering invariant is theirs, verbatim: no `'use client'`, no runtime `react` / `motion` / `@dnd-kit` / `@floating-ui` import, no runtime import from the module root, and no `index` barrel, because the engine is imported file-by-file. The module joins the `PURE_ENGINES` list in [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts), which is how a new engine opts in, and [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) already holds the file layout the moment the directory exists.

Two impurities decide the extraction's shape. `useChatSend` mints ids with `crypto.randomUUID()` at three call sites, and a timestamp is a clock read; both make a transform non-deterministic, and a non-deterministic transform cannot be tested by its output. So the engine takes the id as an argument and the shell mints it. That is what makes the rollback rule provable at all: the rule is "drop the reply this send opened, by id, and only while it is empty", and a test can only state it if it can name the id.

The engine grows by increment rather than at once. Increment 1 moves what exists into `types.ts`, `chat-draft.ts`, and `chat-transcript.ts`. `chat-content/`, `chat-stream/`, `chat-branch/`, and `chat-command/` land with the increments that need them, and each stays one file until a second kind earns the directory — the rule [`map-geofence.ts`](../map/engine/map-geofence.ts) already stands on.

## Increments

In order. Each one lands on its own and leaves the module whole.

### 1. Extract the engine

Move the rules; change no behaviour. `chat-transcript.ts` takes the six list transforms out of `useChatSend` — append a user message, open a reply, apply a snapshot, drop an empty reply, truncate to the last user message, and truncate to an edited one — each as `(messages, …) => messages` over an id the caller supplies. `chat-draft.ts` takes the trim-and-guard rule that `ChatPrompt` and `useChatDraft` write separately, so the composer and the draft hook can never disagree about what is sendable. `types.ts` takes the vocabulary.

The hook keeps its whole signature and becomes the React shell over those transforms: state, the `AbortController`, and the effect ordering stay in `use-chat-send.ts`. The public surface must not move, which is the bar query's extraction set and met. The proof is a pure `*.test.ts` per engine file, plus the existing 8 suites green and unedited — an edited suite means the move changed behaviour.

### 2. One speaker vocabulary

One breaking change, because `role` and `type` cannot move apart. `role: 'user' | 'assistant' | 'system'` becomes the single axis across the data, the component, and the recipe, and the hand-map at `chat-transcript.tsx:40` goes. `system` becomes expressible in data, which it is not today. `Chat` gives up snake_case or leaves `ui` for the gateway layer that owns the wire shape. `sending` becomes `streaming` to match every component it feeds, `onSent` states in its name that it reports a completed send rather than the submit gesture, and `useChatList` becomes `useInChatList` because it reports a nesting fact rather than list state.

This closes audit rows P1, P2, P3, P9, P10, and P12 together, and it is a `feat(ui)!` commit. It lands second because every increment after it writes the new vocabulary once instead of both.

### 3. The content model

A message becomes parts. `ChatPart` is a discriminated union — `text` first, then `embed`, `tool`, `file`, and `citation` as later increments add them — and a message carries `ChatPart[]`. The engine normalizes, so `content: string` keeps working as one text part and no caller rewrites its transcript to adopt the union. `chat-content/` owns the union, the normalization, and the plain-text projection that copy, search, and the announcement in increment 6 all read.

Every premium feature below waits on this, and the increment is deliberately dull: no new rendering, no new prop, one union and the functions over it. Prove it by the transcript that renders byte-identically before and after.

### 4. The embed seam

A chart, a grid, or a map reaches a message through a registry, and the chat module imports none of them. `ChatEmbedProvider` takes a record of renderers keyed by an embed name, a message's `embed` part names one and carries its data, and an unregistered name renders a stated fallback rather than nothing. The registry pattern is [`use-map-legend-registry.ts`](../map/use-map-legend-registry.ts), where a map overlay registers itself through context — extend it rather than invent a second one.

The dependency direction is the whole point. Chat must not import chart, grid, or map, because a chat with no embed would then pay for three of the heaviest modules in the package. It is the discipline the map module already holds when it takes its atlas as a prop and ships no geometry. Cross-module engine imports are established practice where they are genuinely needed — grid reads query, and map reads chart — so the rule is not that modules stay apart; it is that a heavy dependency must be asked for.

Callers who want the three wired for them get `ui/modules/chat/embeds`, a second entry point holding the adapters and nothing else. That has a real cost to name: [`package.json`](../../../package.json)'s `exports` maps `./modules/*` to one barrel per module, so a second entry point needs a change there, and [`docs/MODULES.md`](../../../docs/MODULES.md) states one entry point per module. Land the registry first and the adapters second, because the registry alone already answers the demo.

### 5. A stream of parts

`ChatTransport` yields `string`, and each string is the whole reply so far. An embed that arrives part-way through a reply cannot be expressed that way, so the transport widens to yield a part list beside the string. The string arm keeps its exact meaning — cumulative text, replace the bubble — so every transport written today still runs. `chat-stream/` owns both reconciliations: a string replaces the text part, and a part list merges by index, so a chart that arrives after two paragraphs does not discard them.

This is the increment that makes an agent reply a document rather than a message. It lands after the registry, because a part that names an unregistered embed must already have somewhere to land.

### 6. The reply the reader cannot see

The `streaming` pulse is visual only, so a screen-reader user is told nothing while a reply arrives, and a naive live region would be worse — it would read every snapshot of a reply that rewrites itself many times a second. The rule is to announce the settled reply once, and to announce that a reply started, not each chunk of it. The machinery exists: [`core/announcer.ts`](../../core/announcer.ts) holds one polite region for the app, and [`use-a11y-live-region.ts`](../../hooks/a11y/use-a11y-live-region.ts) is the hook over it. The transcript also takes `role="log"`, which it does not carry today.

An embed makes this sharper rather than softer. A chart in a reply announces its own hidden data table, which every chart in the package already ships, so the readout follows the embed and the transcript states only that one arrived.

### 7. Measure the transcript

Chat has no benchmark, so every claim about a long conversation is a guess. `ChatMessage` is memoized and settled bubbles skip their Markdown re-lex, which is the optimization the module already made; what is unmeasured is the transcript around them — a list that maps every message on every chunk, and a scroll effect that runs per change. Add mount, stream, and scroll benches over a 50-, 500-, and 5,000-message fixture, on the ladder the chart and grid roadmaps set: a pure-core bench for the engine transforms, a jsdom bench for the effect path, and a browser bench if a number justifies one.

Virtualization is the obvious answer and must not ship before the measurement says so. The chart roadmap's record holds two refuted avenues, and they are the reason its numbers are trustworthy; chat must earn the same. Measure first, and if the transcript holds at 5,000 messages, write that down and move on.

## Backlog

In priority order, after the increments. Each entry names the gap, the shape of the fix, and where it lands.

- **One selection across the chat and the dashboard.** This is the feature a logistics chat exists for, and it is nearly free once the parts land. An agent says twelve stops are late; a point on that sentence must ring those twelve stops on the map beside it. Every module already holds the receiving half — map takes `selectedRegion` and `selectedOverlay`, grid holds row selection, chart reports `onCategoryClick` — so nothing new is needed in them. The shape is a `citation` part carrying an embed name and a selector, and an adapter per module that maps the selector onto that module's own selection prop. It lands in `chat-content/` plus the adapters from increment 4, and it must read one direction first: the chat drives the dashboard, and the reverse — a picked region that writes a message — waits for a second consumer to ask.

- **Agent steps and tool calls.** A reply that ran a query must be able to show it, both because a reader needs to trust the answer and because a wrong filter is otherwise invisible. The shape is a `tool` part rendered as a collapsible step, over the `Collapse` the package already ships. The leverage is query: `formatQuerySummary` already turns a query tree into a plain line, so a tool call that filtered data renders its own filter with no new formatter. It lands as a part kind plus one renderer.

- **Branch the transcript instead of truncating it.** `retry` and `edit` both discard — the old reply is gone, and a reader who preferred it cannot get it back. The premium form keeps the discarded turn as a sibling branch under the message that forked, with a `1 of 2` switcher on the bubble. It changes the transcript from a list to a tree, so it earns `chat-branch/` and it must land after the content model rather than beside it. Say in the doc that a branch is per-message rather than per-conversation, because the other reading is a different feature.

- **Composer commands and mentions.** A dashboard agent needs a scope, and typing it in prose is the worst way to give one. The shape is a token model in `chat-command/` — a trigger character, a token span, and a resolved value — with the picker over `CommandPalette`, which already exists and already holds the keyboard model. `ChatPrompt` has an `actions` slot but no model behind it, so this is the missing half rather than a new surface. `@dataset` scopes a question; `/command` runs one.

- **Persistence and resume.** `Chat` is a wire shape with no adapter, so a conversation survives a reload only if the app writes that path itself. The shape is a history port beside the transport — load a page of messages, append on send — and a resume rule for a stream a reload cut, which needs the reply id to outlive the session. It lands beside `ChatTransport`, and it must stay a port rather than an implementation, for the reason the transport already is one.

- **Attachment previews through the embed seam.** The composer surfaces attachments as chips and nothing renders what they hold. A CSV preview is a grid and an image preview is an image, so this must reuse the registry from increment 4 rather than open a second path to the same three modules. It lands as a `file` part with a preview resolved by media type.

- **Conversation search.** `ChatList` takes rows and offers no filter, so a sidebar of two hundred conversations is a scroll. The plain-text projection from increment 3 is the index, and the query module is the filter. It lands as a prop on the list rather than a new component.

- **Reply feedback.** An agent product cannot improve without a signal, and the transcript has nowhere to put one. `ChatMessage` already takes an `actions` rail, so the shape is a small standard pair over it, plus a callback carrying the message id and the verdict. Cheap, and it stays a slot rather than a policy.

- **Export a conversation.** A reader who wants a record has copy-and-paste. Grid already holds an export path in `grid-export`, so the shape is the same one over the plain-text projection, and an embedded grid can export itself. It lands after the content model and needs nothing else.

## Principle

Extract before extending. The module's whole backlog is blocked on two things — a core the rules can live in, and a message that can hold more than a string — and every premium feature above is small once both exist and impossible before. That ordering is the roadmap's only real claim, and it is the one query's extraction already proved: `QuerySummary` was a second view over an extracted core, and it cost one file.

Do not ship the dependency the caller did not ask for. A chat that imports chart, grid, and map to support an embed nobody used is the failure mode this design exists to avoid, and the registry is what prevents it.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`../query/ROADMAP.md`](../query/ROADMAP.md) (the extraction this follows) · [`../map/ROADMAP.md`](../map/ROADMAP.md) (the engine layout and the no-payload rule) · [`../../../docs/MODULES.md`](../../../docs/MODULES.md).
