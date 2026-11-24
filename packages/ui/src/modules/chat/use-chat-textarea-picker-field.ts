'use client'

import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { ChatCitation } from './engine/chat-content/types'
import type { TriggerChoice } from './engine/chat-draft/trigger'
import type { PickerField } from './use-chat-prompt-picker'

/** Options for {@link useTextareaPickerField}. @internal */
type TextareaPickerFieldOptions = {
	/** Whether a picker reads the field. A field that no picker reads holds no caret. */
	enabled: boolean
	value: string
	citations: readonly ChatCitation[]
	textareaRef: RefObject<HTMLTextAreaElement | null>
	onValueChange: (value: string, citations: readonly ChatCitation[]) => void
}

/**
 * Inserts `text` at the selection of the focused field, through the command
 * that puts the change on the undo stack. A browser that has no such command,
 * such as jsdom, changes nothing, and the draft takes the change from the
 * caller.
 *
 * @internal
 */
function insertText(text: string): void {
	try {
		document.execCommand?.('insertText', false, text)
	} catch {
		// The draft takes the change from `onValueChange`.
	}
}

/**
 * The textarea of a ChatPrompt as the field of its picker ({@link PickerField}).
 * The draft is the value of the composer, with the caret of the textarea.
 *
 * @remarks A choice goes in through `execCommand('insertText')`, so it is on
 * the undo stack of the browser. Where the command does nothing, the draft
 * takes the choice from `onValueChange` alone.
 *
 * @returns The field, and the calls that record the caret: `track` on a
 *   change, a selection, and a focus of the textarea, and `forget` on a blur.
 * @internal
 */
export function useTextareaPickerField({
	enabled,
	value,
	citations,
	textareaRef,
	onValueChange,
}: TextareaPickerFieldOptions) {
	// The offset of a collapsed selection while the textarea has the focus.
	const [caret, setCaret] = useState<number | null>(null)

	// The caret after a choice. The draft takes the choice in the next render,
	// so the caret goes there after it.
	const pendingCaret = useRef<number | null>(null)

	useLayoutEffect(() => {
		const textarea = textareaRef.current

		const next = pendingCaret.current

		if (!textarea || next === null || textarea.value !== value) return

		pendingCaret.current = null

		textarea.setSelectionRange(next, next)

		setCaret(next)
	}, [value, textareaRef])

	const write = useStableEvent((choice: TriggerChoice) => {
		const textarea = textareaRef.current

		if (!textarea) return

		// The command puts the text on the undo stack. Its input event reaches the
		// composer first, and the call after it adds the citation.
		textarea.setSelectionRange(choice.start, choice.tail)

		insertText(choice.text)

		onValueChange(choice.value, choice.citations)

		pendingCaret.current = choice.caret
	})

	const track = useCallback(
		(textarea: HTMLTextAreaElement) => {
			if (!enabled) return

			setCaret(textarea.selectionStart === textarea.selectionEnd ? textarea.selectionEnd : null)
		},
		[enabled],
	)

	const forget = useCallback(() => setCaret(null), [])

	const field: PickerField = {
		draft: caret === null ? null : { value, citations, caret },
		elementRef: textareaRef,
		write,
	}

	return { field, track, forget }
}
