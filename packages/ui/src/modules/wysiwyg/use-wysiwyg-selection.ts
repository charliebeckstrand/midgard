'use client'

import { useEffect } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { sameFieldElements } from '../../utilities/same-elements'
import type { WysiwygBlock } from './types'
import type { WysiwygEditor } from './wysiwyg-editor'

/** Whether two reports of the block of the caret are one report. @internal */
function sameBlock(a: WysiwygBlock | null, b: WysiwygBlock | null): boolean {
	if (a === null || b === null) return a === b

	return a.text === b.text && a.caret === b.caret && sameFieldElements(a.ranges, b.ranges)
}

/**
 * Reports the block of the caret ({@link WysiwygBlock}) to `onSelectionChange`
 * after each new state of the editor and each change of the focus. The block
 * is `null` while the field does not have the focus, while it is locked, and
 * while the selection is not a caret in a text block. A state that gives the
 * same block as the last report gives no report.
 *
 * @internal
 */
export function useWysiwygSelection(
	editor: WysiwygEditor | null,
	subscribe: (listener: () => void) => () => void,
	locked: boolean,
	onSelectionChange: ((block: WysiwygBlock | null) => void) | undefined,
) {
	const report = useStableEvent((block: WysiwygBlock | null) => onSelectionChange?.(block))

	const listens = onSelectionChange !== undefined

	useEffect(() => {
		if (!editor || !listens) return

		let last: WysiwygBlock | null = null

		const read = () => {
			const block = !locked && editor.view.hasFocus() ? editor.block() : null

			if (sameBlock(block, last)) return

			last = block

			report(block)
		}

		read()

		const unsubscribe = subscribe(read)

		return () => {
			unsubscribe()

			// A field that goes, or that becomes locked, holds no caret for the reader.
			if (last !== null) report(null)
		}
	}, [editor, subscribe, locked, listens, report])
}
