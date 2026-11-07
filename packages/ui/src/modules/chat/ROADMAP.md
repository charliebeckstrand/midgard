# Chat roadmap

> **Goal: an agent surface for logistics dashboards, where a reply can carry a chart, a grid, or a map.** The module ships a transcript, a message bubble, a composer, and a list of conversations. Two hooks drive them over a transport that the caller supplies.

## Status

The components and the hooks cover a whole agent conversation. `ChatTranscript` renders a window over its messages and follows the newest reply. `ChatMessage` draws Markdown, pulses while a reply arrives, and says when a reply failed. `ChatFeedback` rates a reply. `ChatPrompt` is a composer with attachments and a send button that turns into a stop button. `ChatList` and `ChatListItem` give a list of conversations with a roving tab stop.

`useChatSend` holds the message list and streams each reply through a `ChatTransport`. `useChatDraft` holds the text of the composer. The caller supplies the transport, so the module assumes no endpoint and no wire format. A seed message keeps the id that it carries, so a persisted conversation keeps its addresses after a reload.

`retry` and `edit` add a branch and keep the old one. A retry adds a reply beside the old reply, and an edit adds a user message beside the old message. The hook holds the transcript as a tree, and `messages` is the shown path through it. `branches` gives the siblings at each place of that path, and `showBranch` shows another one. A branch is per message, not per conversation, and a branch that shows again keeps each turn below it as the reader left it. `ChatMessage` draws a switcher such as `2 of 3` below the bubble of a message with siblings.

A message holds a string or a list of parts. `ChatPart` is a closed union of three kinds: `text`, `embed`, and `tool`. Each part carries an id that is unique in its message. A string chunk of the transport replaces the prose of the reply, and a part-list chunk merges into the reply by id. A string normalizes to one text part, so a transcript of prose needs no part list.

An `embed` part names a renderer that the app registers with `ChatEmbedProvider`. The module imports no chart, no grid, and no map, so a chat with no embed pays for none of them. A name that no renderer claims draws a stated fallback. Under the default `lazy` mount policy, a renderer waits until its block is near the viewport. The provider remembers each embed that a reader reached, so an embed whose row comes back into the window draws at once.

A `tool` part is a step that the assistant took: a label, a status, a summary, and a detail behind a disclosure. A step describes itself in text, so it needs no registry. The send settles each step that is still `running` when the stream ends, stops, or fails.

The transcript is a `log` with `aria-live="off"`. The shared announcer speaks one status string: that a reply started, and then the reply after it settles. The announcement counts each embed and does not name it, because a chart ships its own data table. The a11y corpus holds a short transcript and a windowed one, in jsdom and in Chromium.

The transcript renders only the rows near the viewport, through [`useVirtualWindow`](../../hooks/use-virtual-window.ts). Each row measures its real height, and the window keys each row by its message id. The pin to the end follows the intent of the reader, not the scroll position. [`chat-compute.bench.ts`](../../__benchmarks__/chat-compute.bench.ts) measures the transforms, and [`chat-render.bench.tsx`](../../__benchmarks__/chat-render.bench.tsx) measures the render. [`chat-transcript-window.test.tsx`](../../__tests__/browser/chat-transcript-window.test.tsx) holds the window and the pin in Chromium.

## Engine: the substrate

The framework-free rules live in [`engine/`](engine), a pure functional core:

- `types.ts` gives `ChatMessageData`.
- `chat-content/` gives the part union, the normalization of a string, the rule for empty content, and the plain-text projection. Copy, the announcement, and `retry` read that projection.
- `chat-stream.ts` folds one chunk into a reply, and settles each step that is still running.
- `chat-transcript.ts` gives the transforms from one message list to the next, and the readers that `retry` and `edit` run before them.
- `chat-branch/` gives the tree: the shown path, the branches that hide, and the rules that hide one branch and show another. A list rule acts on the shown path, so a streamed chunk costs what it costs with no branches.
- `chat-draft.ts` gives the one rule for a draft that can send. `ChatPrompt` and `useChatDraft` both read it.
- `chat-announcements.ts` gives each string that the announcer speaks.

No rule reads a clock or a random source. The shell mints each id and gives it to the rule, so a test can name the reply that one send opened. [`use-chat-send.ts`](use-chat-send.ts) is the React shell: the state, the `AbortController`, and the stream. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the invariant for this engine.

## Decisions

Each of these shapes was proposed for the content model and refuted. Do not propose one again without new evidence.

- **A model encoded in Markdown.** A user message that holds the vocabulary has the same bytes as an assistant message, so user text would draw a live embed. A part list is constructed and not parsed, so a user cannot spoof one.
- **An open discriminant.** `{ kind: string }` and `{ kind: 'embed'; name: string }` differ only in the name of the key. The open form loses the exhaustive `switch` and gives nothing in return. The `name` field of an `embed` is the open axis.
- **A projection for each purpose.** `retry` sends the projection to the transport, so the transport is one more reader of it. One projection serves the clipboard, the transport, and the announcer.
- **A flag of completeness that nothing settles.** A stopped reply would keep a part that never ends. The `tool` status is safe, because the send settles each running step on every exit.

This shape was proposed for the branches and refuted:

- **A tree of nested nodes.** Each node holds its message and the branches below it, and the shown path is a walk from the root. A chunk then copies every node above the reply, so its cost is the length of the transcript in new objects. The tree that ships keeps the shown path as a list, and the branches that hide beside it.

## Backlog

In priority order. Each entry names the gap, the shape of the fix, and where it lands.

- **One selection across the chat and the dashboard.** An agent says that twelve stops are late, and a point on that sentence must mark those stops on the map beside it. The shape is a `citation` that carries an embed name and a selector. An adapter for each module maps the selector onto the selection prop of that module. The chat drives the dashboard first. The reverse direction waits for a second consumer to ask for it.

  Two blockers sit under it. The receiving half is incomplete: a cartesian chart takes `selectedCategories`, but a map takes one `selectedRegion` and one `selectedOverlay`. And the anchor cannot render: a citation on a phrase needs a range, and [`markdown-renderer.tsx`](../../components/markdown/markdown-renderer.tsx) has no slot to draw one. Fix the renderer and the map first, then write the citation.

- **Composer commands and mentions.** A dashboard agent needs a scope, and prose is the worst way to give one. The shape is a token model in `engine/chat-command/`: a trigger character, a token span, and a resolved value. The picker sits over `CommandPalette`, which already holds the keyboard model. `ChatPrompt` has an `actions` slot but no model behind it. `@dataset` scopes a question, and `/command` runs one.

- **Persistence and resume.** The module has no history port. A conversation survives a reload only when the app stores `messages` and passes them back as `initialMessages`. The shape is a port beside the transport that loads a page of messages and appends on send. A resume also needs a durable position in a reply that a reload cut, which no part carries. The port stays a port and not an implementation, for the reason that the transport is one.

- **Attachment previews through the embed seam.** The composer shows attachments as chips, and nothing renders what they hold. A CSV preview is a grid, and an image preview is an image, so the preview uses the registry of `ChatEmbedProvider`. It lands as a `file` part with a preview that the media type selects.

- **Conversation search.** `ChatList` takes rows and gives no filter, so a long sidebar is a scroll. The plain-text projection is the index, and the query module is the filter. It lands as a prop on the list, not as a new component.

- **Export a conversation.** A reader who wants a record has only copy and paste. The grid holds an export path in `grid-export`, so the shape is the same path over the plain-text projection. An embedded grid can export itself.

## Principle

Extract before you extend. The pure core and the part union came first, so each later feature was one more member or one more rule.

Do not ship a dependency that the caller did not ask for. A chat that imports the chart, the grid, and the map for an embed that nobody uses is the failure that the registry prevents.

Measure before you rebuild. The transcript got its window only after a benchmark showed the size at which a streamed chunk overran a frame.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`../query/ROADMAP.md`](../query/ROADMAP.md) (the extraction this follows) · [`../map/ROADMAP.md`](../map/ROADMAP.md) (the engine layout and the no-payload rule) · [`../../../docs/MODULES.md`](../../../docs/MODULES.md).
