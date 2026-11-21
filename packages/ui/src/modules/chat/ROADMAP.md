# Chat roadmap

> **Goal: a conversation that survives a reload and carries files, over a transport that knows the shape of the tree.** The module is an agent surface for logistics dashboards, where a reply can carry a chart, a grid, or a map. No app uses it yet, so the docs app and the peers are the evidence for each item.

## Status

The module ships a transcript, a message bubble, a composer, a list of conversations, and two hooks. `ChatTranscript` renders a window over its messages and follows the newest reply. `ChatTranscriptSkeleton` holds the space of a transcript while it loads. `ChatMessage` draws Markdown, pulses while a reply arrives, and says when a reply failed. It takes an `actions` row and a `contextMenu`. `ChatFeedback` rates a reply. `ChatPrompt` is a composer with attachments, a picker, and a send button that turns into a stop button.

`useChatSend` holds the transcript and streams each reply through a `ChatTransport` that the caller supplies. The module assumes no endpoint and no wire format. A seed message keeps the id that it carries, so a persisted conversation keeps its addresses after a reload. `useChatDraft` holds the text of the composer and its citations as one state.

`retry` and `edit` add a branch and keep the old one. The hook holds the transcript as a tree, and `messages` is the shown path through it. `branches` gives the siblings at each place of that path, and `showBranch` shows another one. A branch that shows again keeps each turn below it as the reader left it. [`chat-branch-focus.test.tsx`](../../__tests__/browser/chat-branch-focus.test.tsx) holds the focus in the switcher across a switch.

A message holds a string or a list of parts. `ChatPart` is a closed union of `text`, `embed`, and `tool`, and each part has an id that is unique in its message. A string chunk replaces the prose of the reply, and a part-list chunk merges into the reply by id. [`chat-stream.test.ts`](../../__tests__/modules/chat-stream.test.ts) holds the fold. The send settles each `tool` step that is still `running` when the stream ends, stops, or fails.

An `embed` part names a renderer that the app registers with `ChatEmbedProvider`. The module imports no chart, no grid, and no map, so a chat with no embed pays for none of them. A name that no renderer claims draws a stated fallback. Under the default `lazy` policy, a renderer waits until its block is near the viewport, and the provider remembers each embed that a reader reached. [`chat-embed-lazy.test.tsx`](../../__tests__/modules/chat-embed-lazy.test.tsx) holds the policies.

A `text` part can hold `citations`: phrases that select in a view beside the chat. A citation addresses the Markdown source by offset, and its `quote` guards the address. `ChatCitationProvider` registers the views by `target` and holds the active citation as a controlled value. `toCategorySelection`, `toRegionSelection`, and `toStopSelection` read the selector for a chart, a map region, and a map stop. `isMarked` marks each citation that the selection of its view matches. The browser tests [`chat-citation-select.test.tsx`](../../__tests__/browser/chat-citation-select.test.tsx), [`chat-citation-map.test.tsx`](../../__tests__/browser/chat-citation-map.test.tsx), and [`chat-citation-marked.test.tsx`](../../__tests__/browser/chat-citation-marked.test.tsx) hold the round trip.

A user message can hold citations too, such as a dataset that scopes a question. `ChatPrompt` moves them across each change of the text, and a change that touches a citation dissolves it into prose. No typed or pasted text makes a citation, so a reader cannot spoof one. A trigger character of a `ChatPromptSource` opens a picker over the composer. The textarea keeps the focus and its textbox role, and the options are its active descendant through the virtual mode of `useA11yRoving`. An undo or a redo of the browser brings back the citations of the draft that it goes to. [`chat-prompt-picker.test.tsx`](../../__tests__/browser/floating-ui/chat-prompt-picker.test.tsx) holds the picker in Chromium.

The transcript is a `log` with `aria-live="off"`. The shared announcer speaks that a reply started, and then the reply after it settles. The announcement counts each embed and does not name it, because a chart ships its own data table. [`chat-announcements.test.ts`](../../__tests__/modules/chat-announcements.test.ts) holds the strings, and the a11y corpus in [`specialized.tsx`](../../__tests__/a11y/cases/specialized.tsx) holds the transcript, the prompt, the citations, and the steps.

The transcript renders only the rows near the viewport, through [`useVirtualWindow`](../../hooks/use-virtual-window.ts). Each row measures its real height, and the window keys each row by its message id. The pin to the end follows the intent of the reader, not the scroll position. [`chat-transcript-window.test.tsx`](../../__tests__/browser/chat-transcript-window.test.tsx) holds the window and the pin, and [`chat-transcript-scroll-confinement.test.tsx`](../../__tests__/browser/chat-transcript-scroll-confinement.test.tsx) keeps the scroll in the transcript.

## Engine

The framework-free rules live in [`engine/`](engine), a pure functional core. The engine has no `'use client'`, no runtime import of React or Motion, no runtime import from the module root, and no barrel. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the invariant.

- `types.ts` gives `ChatMessageData`.
- `chat-content/` gives the part union, the normalization of a string, the rule for empty content, and the plain-text projection. Copy, the announcement, and `retry` read that one projection.
- `chat-stream.ts` folds one chunk into a reply, and settles each step that is still running.
- `chat-transcript.ts` gives the transforms from one message list to the next, and the readers that `retry` and `edit` run before them.
- `chat-branch/` gives the tree: the shown path, the branches that hide, and the rules that hide one branch and show another. A list rule acts on the shown path, so a chunk costs what it costs with no branches.
- `chat-draft/` gives the rule for a draft that can send, and the rebase of citations across a change of the text. It also gives the trigger, the choice, and the undo history.
- `chat-citation.ts` gives the adapters from the selector of a citation to the selection prop of a view.
- `chat-announcements.ts` gives each string that the announcer speaks.

No rule reads a clock or a random source. The shell mints each id and gives it to the rule, so a test can name the reply that one send opened. [`use-chat-send.ts`](use-chat-send.ts) is the React shell: the state, the `AbortController`, and the stream.

## Features

1. **A history port, with resume (*P2*).** A conversation survives a reload only when the app stores `messages` and passes them back as `initialMessages`. `messages` is the shown path and `initialMessages` is a flat list, so a reload loses each branch that hides. Add a port beside the transport that loads the tree and appends on each send, as the thread adapters of assistant-ui do. A resume also needs a durable position in a reply that a reload cut, as the resumable streams of the Vercel AI SDK give. The port stays a port and not an implementation, for the reason that the transport is one. This adds a public API, so agree the approach first ([`CLAUDE.md`](../../../../../CLAUDE.md) §3.1). A `use-chat-send.test.ts` case that saves a tree with a hidden branch and loads it back proves it.

2. **Older history on scroll (*P2*).** A port that loads a page needs a transcript that asks for the next page. `ChatTranscript` has no callback at its start, and no rule that keeps the rows in view when rows come in above them. Add a prop that fires when the reader nears the start, as `startReached` of react-virtuoso and the `loadMore` of Stream Chat do. The window must hold the first visible row at its offset across the insert. A case in `chat-transcript-window.test.tsx` that adds rows above the view and reads the offset of the first visible row proves it.

3. **Attachments in the message (*P2*).** `ChatPrompt` shows attachments as chips, but `send` takes no files and `ChatPart` has no `file` kind. An attachment thus never gets to the message, the transcript, or the transport. Add a `file` part that `send` and `edit` carry, as the file parts of the Vercel AI SDK do. The transport gets it in its third argument. A preview comes after the part, through the registry of `ChatEmbedProvider`, with the media type as the name. A `use-chat-send.test.ts` case that sends a file and reads the part in the transport proves it.

4. **The branch context of a transport call (*P2*).** The transport gets the content, the signal, and the parts of one message. After `edit` or `retry`, it cannot tell a new turn from a replacement, and it gets no earlier turn of the shown path. A server that holds its own thread thus answers an edit as if the old branch still stood. Add a field to `ChatTransportMessage`: the shown path before the message, or the id of the message that it replaces. The `useChat` hook of the Vercel AI SDK sends the whole path for this reason. This changes the contract of the transport, so agree the approach first ([`CLAUDE.md`](../../../../../CLAUDE.md) §3.1).

5. **An edit flow in the docs (*P2*).** `useChatSend` gives `edit`, but no docs example calls it. The Edit entry in [`with-context-menu.tsx`](../../docs/pages/modules/chat/with-context-menu.tsx) has no action. Add an example to the Conversation tab. Its action loads the text and the citations of the message into `useChatDraft` with `setValue`, and its submit calls `edit`. The example tells if the composer route is enough, or if the bubble needs an inline editor, as the edit composer of assistant-ui is. `ChatTranscript` renders its rows itself, so an inline editor needs a new prop, and the example decides that.

## Pattern cleanup

1. **The heading offset in a component file (*P2*).** `MESSAGE_HEADING_OFFSET` is exported from [`chat-tool.tsx`](chat-tool.tsx), and [`chat-message.tsx`](chat-message.tsx) and [`chat-cited-text.tsx`](chat-cited-text.tsx) import it from there. [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §9.2 puts a constant that more than one component reads in a constants file. Move it to `chat-constants.ts` at the module root, as `button-constants.ts` holds `lockedProps`.

2. **`onCite` beside `cited` (*P2*).** `ChatCitationProvider` holds the active citation in `cited` and reports a change through `onCite`. [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §4.9 names that callback `onCitedChange`. `prop-vocabulary-boundary.test.ts` does not see the pair, because its stem test needs `onX` beside `x`. The rename breaks a public export, so agree it first ([`CLAUDE.md`](../../../../../CLAUDE.md) §3.1). Update the TSDoc, the docs pages, and the `chat` entry of [`MODULES.md`](../../../docs/MODULES.md) in the same commit.

3. **"Called" in the TSDoc of an event (*P2*).** `ChatDraftOptions.onSubmit` in [`use-chat-draft.ts`](use-chat-draft.ts), `ChatSendOptions.onSent` and `onError` in [`use-chat-send.ts`](use-chat-send.ts), and `onCite` in [`chat-citation-provider.tsx`](chat-citation-provider.tsx) open with "Called". [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §13.9 opens an event prop with "Fires when", and the other props of the module do. Rewrite the four openings. No gate reads TSDoc openings, so review holds the rule.

4. **Nested ternaries (*P2*).** `statusText` in [`chat-prompt-picker.tsx`](chat-prompt-picker.tsx) nests three ternaries, and the row `className` in [`chat-transcript.tsx`](chat-transcript.tsx) nests two. [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §8.4 splits a nested ternary into named steps. Split each one. Biome `style/noNestedTernary` can hold the fix, first in an override for this module, and later in the whole package as its own decision.

5. **A measured ratio in TSDoc (*P2*).** The TSDoc of `ChatEmbedRegistry.mount` in [`types.ts`](types.ts) says that a chart on each reply costs about seven times as much to mount. [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §12.6 keeps a measurement out of a comment, because later code makes it wrong. Keep the reason in words, and record the number in a dated section of the [browser benchmarks README](../../__benchmarks__/browser/README.md) with `chat-render.bench.tsx` as its bench.

6. **Function names that do not start with a verb (*P3*).** [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §8.5 starts each function name with a verb. The engine and the shell have names that start with a noun, such as `chatBranches`, `draftContent`, `draftCitations`, `userContent`, `duplicateMessageIds`, `activeTrigger`, `historyStep`, `embedCount`, and `startingParts`. Rename the internal names, such as `getBranches` and `findActiveTrigger`. The public `chatContentText` stays, because its rename breaks an export for no gain to the caller. No gate reads the first word of a name, and a verb list for such a gate is the open question.

## Performance

1. **The draft rules on each keystroke (*P3*).** Each change of the composer runs `rebaseCitations`, `recordDraft`, and `activeTrigger`, and an undo runs `stepDraft` over a history of up to `DRAFT_HISTORY_LIMIT` drafts. These rules are on the input path, so their cost counts toward INP. [`chat-compute.bench.ts`](../../__benchmarks__/chat-compute.bench.ts) measures none of them. Add cases for a long draft with many citations and a full history. Change a rule only when the bench shows a cost near a frame.

2. **The branches on each chunk (*P3*).** `useChatSend` runs `chatBranches` on each new tree, and a chunk makes a new tree. Each fork then runs `findLastIndex` over the path from its end. The bench has one fork near the end, so a long transcript with forks near its start has no number. Add that case to `chat-compute.bench.ts`. If it costs, key the memo on `tree.forks` and the held ids of the path, which a chunk does not change.

## Accessibility and testing

1. **The a11y corpus misses four surfaces (*P2*).** [`specialized.tsx`](../../__tests__/a11y/cases/specialized.tsx) has no `ChatList` with `ChatListItem` rows and actions, no `ChatFeedback`, no message with a branch switcher, and no `ChatPrompt` with `sources`. The sweeps thus do not read their names, their roles, or their contrast. Add one entry for each, and the open state of the picker where the corpus can hold it.

2. **A branch switch says nothing about its position (*P2*).** The position text of [`chat-message-branch.tsx`](chat-message-branch.tsx), such as `2 of 3`, is not live, and the button names do not hold it. A press on Next version thus gives a screen reader no status (WCAG 4.1.3). The announcer then speaks the last reply of the transcript, which can be far below the switched message. Speak the new position on a switch, and decide whether the last reply speaks too. A case in `chat-transcript.test.tsx` with `expectAnnouncement` proves each half.

## Not planned

- **A model encoded in Markdown.** A user message that holds the vocabulary has the same bytes as an assistant message, so user text would draw a live embed. A part list is constructed and not parsed, so a user cannot spoof one.

- **An open discriminant.** `{ kind: string }` loses the exhaustive `switch` and gives nothing in return. The `name` field of an `embed` is the open axis.

- **A projection for each purpose.** One projection serves the clipboard, the transport, and the announcer, so the three cannot disagree.

- **A citation as a kind of part.** A citation is a phrase of a block and not a block. As a kind, it adds an arm that draws nothing to each rule over the parts.

- **A citation encoded in the Markdown.** A reader could type a live anchor. A citation is constructed, and it addresses the source by offset.

- **A citation as a cross-filter selection.** A cross-filter selection filters each tile, so a cited bar would be the only bar. A citation marks, and the cross-filter selections stay with the tiles.

- **A selection that the chat holds.** The selection belongs to the view. `ChatCitationProvider` is controlled, so a dashboard does not read its own state out of a chat context.

- **A token type for the composer.** A mention such as `@dataset` is a constructed phrase with an address and a payload, which is a citation. A second type would copy the offsets, the quote guard, and the renderer.

- **A contenteditable composer.** It needs an editor library, and it loses the native IME, undo, and mobile input of a `<textarea>`. The draft holds its citations as offsets.

- **A picker over `CommandPalette`.** The palette is a modal dialog that owns its input. The picker composes `useA11yRoving` in virtual mode on the textarea, which the palette also composes.

- **A tree of nested nodes.** A chunk would copy each node above the reply, so its cost would be the length of the transcript in new objects. The tree keeps the shown path as a list, and the hidden branches beside it.

- **A `reasoning` kind of part.** The reasoning parts of the Vercel AI SDK and assistant-ui are a step with a detail behind a disclosure. A `tool` part with `detail` already draws that.

- **Suggested replies in the module.** The quick replies of Intercom are buttons that call `send`. An app composes them from `Button` and `useChatSend`, and the module holds no policy for them.

- **A filter of `ChatList`, and an export of a conversation.** `ChatList` renders its children and holds no conversation, so the app filters its own rows. `chatContentText` already gives the text of each message to an export of the app.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`../query/ROADMAP.md`](../query/ROADMAP.md) (the extraction this follows) · [`../map/ROADMAP.md`](../map/ROADMAP.md) (the engine layout and the no-payload rule) · [`../../../docs/MODULES.md`](../../../docs/MODULES.md).
