# Wysiwyg roadmap

> **Goal: one rich text field for each place that writes Markdown.** The field, the toolbar, the Markdown bridge, the ranges, and the `wysiwyg` prop of `ChatPrompt` with its picker work. The next work is the iPhone checks.

## Status

`Wysiwyg` is a `contenteditable` field on ProseMirror. Its value is a Markdown string. The field shows the formatting of the source, and each edit gives the Markdown of the doc. `WysiwygToolbar` runs the actions of [`wysiwyg-actions.ts`](wysiwyg-actions.ts) on the selection. That table holds the message, the glyph, and the shortcut of each action. The engine holds the command of each action in [`engine/wysiwyg-commands.ts`](engine/wysiwyg-commands.ts), so the toolbar loads without the editor.

The frame, the floor, and the actions row are the ones of `Textarea`, through the kumi `multiline` group and `ControlActions`. A `<textarea>` cannot show formatting, so the field grows by CSS and not by the auto-resize script of `Textarea`. A zero-width float of `rows` lines sets its minimum height.

`ChatPrompt` takes `wysiwyg`, and its field is then a Wysiwyg with a toolbar.

A completion, such as the picker of `ChatPrompt`, reads the block of the caret from `onSelectionChange`. The block is plain text ([`engine/wysiwyg-block.ts`](engine/wysiwyg-block.ts)), so its offsets hold no Markdown syntax. `replace` of the handle changes a span of that block as one step of the undo history, and it can mark a range in the new text. The `aria-autocomplete`, `aria-haspopup`, and `aria-controls` props name the popup of the completion. ProseMirror cancels each Escape, so the field leaves Escape to the page, and a dialog or a popup over the field closes on it.

The field takes `ranges`, the `MarkdownRange` type of `Markdown`, such as the citations of a chat draft. Each range is a `range` mark of the doc. The parse places the marks with the range walk of the renderer of `Markdown`, so a range covers the same text in the field and in a message. The serializer marks the edges of each piece of a range with two characters that the doc does not hold, and then reads their offsets and removes them. `onValueChange` thus gives each range with the offsets of the new value. The rule in [`engine/wysiwyg-ranges.ts`](engine/wysiwyg-ranges.ts) removes the mark of a range that an edit touches, and the text stays. The mark has no parse rule, so no paste makes a range. [`wysiwyg-ranges.test.ts`](../../__tests__/modules/wysiwyg-ranges.test.ts) holds the bridge and the rule, and [`chat-prompt-wysiwyg-citations.test.tsx`](../../__tests__/browser/chat-prompt-wysiwyg-citations.test.tsx) holds the citations of a composer in Chromium.

The editor loads after the mount, in idle time, or at once on the first focus or press of the field ([`use-wysiwyg-editor.ts`](use-wysiwyg-editor.ts)). Until it loads, and in the server render, [`wysiwyg-static.tsx`](wysiwyg-static.tsx) draws the doc of the value with the markup of the schema, as the editor draws it. The first paint thus shows the formatting and the layout of the field. The doc and the markup are plain data with no ProseMirror: [`wysiwyg-markdown-doc.ts`](wysiwyg-markdown-doc.ts) makes the doc in the JSON form of ProseMirror, and [`wysiwyg-dom.ts`](wysiwyg-dom.ts) holds the markup of each node and mark. The engine makes its doc from the same JSON, and its schema gets its markup from the same file. Thus the engine stays out of the first load. The focus goes on to the editor when it loads.

## Engine

The engine in [`engine/`](engine) is pure. It has no `'use client'` and no runtime `react` import. It holds the schema, the commands, the input rules, and the Markdown bridge.

The bridge parses with the `lex()` of `Markdown`, so the field and a rendered message read a source the same way. The serializer writes one spelling for each construct: `**bold**`, `*italic*`, `~~strike~~`, `-` bullets, and fenced code. A value with another spelling stays as given until the reader edits it. A block or an inline construct that the schema does not hold, such as a table, raw HTML, or an image, is an atom that keeps its source byte for byte. `wysiwyg-markdown.test.ts` holds the round trip: the Markdown that the serializer writes renders as the source renders, and a second round trip changes nothing.

## Next

1. The iPhone checks: the keyboard stays up on a toolbar tap, the Bold item of the edit menu works, autocorrect at the end of a bold word, and Enter with `onEnter`.

## Not planned

- An underline action. Markdown has no underline.
- A custom action. It would put the ProseMirror types on the public surface.
- Tab to indent a list item. Tab leaves the field, as in a textarea (WCAG 2.1.2).
