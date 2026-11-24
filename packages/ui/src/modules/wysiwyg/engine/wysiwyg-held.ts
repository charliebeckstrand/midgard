import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

/**
 * The key of the held selection, and the meta of a transaction that holds a
 * range (`{ from, to }`) or lets it go (`null`).
 *
 * @internal
 */
export const HELD = new PluginKey<DecorationSet>('wysiwygHeld')

/**
 * The mark of a range that a popover of the field acts on, such as the link
 * popover. The focus is then in the popover, and the browser draws no
 * selection in the field. A range is `data-slot="wysiwyg-held"` text, and a
 * caret is an empty `data-slot="wysiwyg-held-caret"` element. Each edit moves
 * the mark with its text.
 *
 * @internal
 */
export function wysiwygHeld(): Plugin<DecorationSet> {
	return new Plugin<DecorationSet>({
		key: HELD,
		state: {
			init: () => DecorationSet.empty,
			apply: (tr, set) => {
				const meta = tr.getMeta(HELD) as { from: number; to: number } | null | undefined

				if (meta === undefined) return set.map(tr.mapping, tr.doc)

				if (meta === null) return DecorationSet.empty

				const mark =
					meta.from === meta.to
						? Decoration.widget(meta.from, heldCaret, { key: 'wysiwyg-held-caret', side: -1 })
						: Decoration.inline(meta.from, meta.to, { 'data-slot': 'wysiwyg-held' })

				return DecorationSet.create(tr.doc, [mark])
			},
		},
		props: { decorations: (state) => HELD.getState(state) },
	})
}

/** The element of a held caret. @internal */
function heldCaret(): HTMLElement {
	const caret = document.createElement('span')

	caret.dataset.slot = 'wysiwyg-held-caret'

	return caret
}
