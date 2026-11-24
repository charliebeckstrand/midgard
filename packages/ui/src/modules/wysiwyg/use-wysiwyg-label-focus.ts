'use client'

import { useEffect } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'

/**
 * Moves the focus to the field on a click of its Label. A `<label for>` does
 * not focus an element that is not labelable, such as a `contenteditable`
 * element. A click on a control in the Label, or on a Label that holds the
 * field, does nothing.
 *
 * @param labelId - The id of the Label, or `undefined` for none.
 * @param focus - Moves the focus to the field.
 * @internal
 */
export function useWysiwygLabelFocus(labelId: string | undefined, focus: () => void): void {
	const handleClick = useStableEvent((event: MouseEvent) => {
		const label = event.currentTarget as Element

		const target = event.target as Element

		if (target.closest('a, button, input, select, textarea, [contenteditable]')) return

		if (label.querySelector('[role="textbox"]')) return

		focus()
	})

	useEffect(() => {
		const label = labelId ? document.getElementById(labelId) : null

		label?.addEventListener('click', handleClick)

		return () => label?.removeEventListener('click', handleClick)
	}, [labelId, handleClick])
}
