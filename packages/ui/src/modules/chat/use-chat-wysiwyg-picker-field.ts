'use client'

import { type RefObject, useRef, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { WysiwygBlock, WysiwygHandle } from '../wysiwyg/types'
import type { ChatCitation } from './engine/chat-content/types'
import type { TriggerChoice } from './engine/chat-draft/trigger'
import type { PickerDraft, PickerField } from './use-chat-prompt-picker'

/** Options for {@link useWysiwygPickerField}. @internal */
type WysiwygPickerFieldOptions = {
	/** The citations of the value of the composer. */
	citations: readonly ChatCitation[]
	handleRef: RefObject<WysiwygHandle<ChatCitation> | null>
}

/**
 * The draft of the block of the caret: its plain text, and each citation in it
 * with the offsets and the text of the block. A range that is not a citation of
 * the composer is not in the draft.
 *
 * @internal
 */
function blockDraft(block: WysiwygBlock, citations: readonly ChatCitation[]): PickerDraft {
	const byId = new Map(citations.map((citation) => [citation.id, citation]))

	return {
		value: block.text,
		caret: block.caret,
		citations: block.ranges.flatMap(({ id, start, end }) => {
			const citation = byId.get(id)

			return citation ? [{ ...citation, start, end, quote: block.text.slice(start, end) }] : []
		}),
	}
}

/**
 * The formatted field of a ChatPrompt as the field of its picker
 * ({@link PickerField}). The draft is the plain text of the block of the
 * caret, so a query and a label hold no Markdown syntax.
 *
 * @remarks A choice goes in through {@link WysiwygHandle.replace}, so it is
 * one step of the undo history of the editor. The field then gives the
 * citation back through `onValueChange`, with the offsets of the Markdown.
 *
 * @returns The field, `onSelectionChange` for the Wysiwyg, and `keyDraft`, the
 *   draft at the caret for a key handler.
 * @internal
 */
export function useWysiwygPickerField({ citations, handleRef }: WysiwygPickerFieldOptions) {
	const [block, setBlock] = useState<WysiwygBlock | null>(null)

	// The editable element of the field. A block comes only from the editor, so
	// the element is the element of the editor.
	const elementRef = useRef<HTMLElement | null>(null)

	// The last block that the field reported. The editor reads the selection of
	// the page and reports it before each key reaches a handler, so a key reads
	// the block of its own caret here. The state above takes it in a later render.
	const lastBlock = useRef<WysiwygBlock | null>(null)

	const onSelectionChange = useStableEvent((next: WysiwygBlock | null) => {
		elementRef.current = handleRef.current?.element ?? null

		lastBlock.current = next

		setBlock(next)
	})

	// The draft at the caret now, for a key handler.
	const keyDraft = useStableEvent(
		(): PickerDraft | null => lastBlock.current && blockDraft(lastBlock.current, citations),
	)

	const write = useStableEvent((choice: TriggerChoice) => {
		handleRef.current?.replace(choice.start, choice.tail, choice.text, choice.citation)
	})

	const field: PickerField = {
		draft: block && blockDraft(block, citations),
		elementRef,
		write,
	}

	return { field, onSelectionChange, keyDraft }
}
