# Wysiwyg roadmap

> **Goal: one rich text field for each place that writes Markdown.** The field, the toolbar, the Markdown bridge, and the `wysiwyg` prop of `ChatPrompt` work. The next work is the citations of a chat draft as marks of the doc.

## Status

`Wysiwyg` is a `contenteditable` field on ProseMirror. Its value is a Markdown string. The field shows the formatting of the source, and each edit gives the Markdown of the doc. `WysiwygToolbar` runs the actions of [`wysiwyg-actions.ts`](wysiwyg-actions.ts) on the selection. That table holds the message, the glyph, and the shortcut of each action. The engine holds the command of each action in [`engine/wysiwyg-commands.ts`](engine/wysiwyg-commands.ts), so the toolbar loads without the editor.

The frame, the floor, and the actions row are the ones of `Textarea`, through the kumi `multiline` group and `ControlActions`. A `<textarea>` cannot show formatting, so the field grows by CSS and not by the auto-resize script of `Textarea`. A zero-width float of `rows` lines sets its minimum height.

`ChatPrompt` takes `wysiwyg`, and its field is then a Wysiwyg with a toolbar.

The editor loads after the mount, in idle time, or at once on the first focus or press of the field ([`use-wysiwyg-editor.ts`](use-wysiwyg-editor.ts)). Until it loads, the field shows the Markdown source as text, with the same frame and the same floor. The focus goes on to the editor when it loads.

## Engine

The engine in [`engine/`](engine) is pure. It has no `'use client'` and no runtime `react` import. It holds the schema, the commands, the input rules, and the Markdown bridge.

The bridge parses with the `lex()` of `Markdown`, so the field and a rendered message read a source the same way. The serializer writes one spelling for each construct: `**bold**`, `*italic*`, `~~strike~~`, `-` bullets, and fenced code. A value with another spelling stays as given until the reader edits it. A block or an inline construct that the schema does not hold, such as a table, raw HTML, or an image, is an atom that keeps its source byte for byte. `wysiwyg-markdown.test.ts` holds the round trip: the Markdown that the serializer writes renders as the source renders, and a second round trip changes nothing.

## Next

1. A citation of a chat draft as a mark of the doc, so that `ChatPrompt` keeps its citations and its picker with `wysiwyg` ([chat roadmap](../chat/ROADMAP.md), Features 5).
2. The iPhone checks: the keyboard stays up on a toolbar tap, the Bold item of the edit menu works, autocorrect at the end of a bold word, and Enter with `onEnter`.

## Not planned

- An underline action. Markdown has no underline.
- A custom action. It would put the ProseMirror types on the public surface.
- Tab to indent a list item. Tab leaves the field, as in a textarea (WCAG 2.1.2).
