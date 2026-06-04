'use client'

import { useCallback, useState } from 'react'

function useSlotRegistration() {
	const [present, setPresent] = useState(false)

	const register = useCallback(() => {
		setPresent(true)

		return () => setPresent(false)
	}, [])

	return [present, register] as const
}

export type ControlA11y = {
	/** Composed `aria-describedby` — registered slot ids only, or undefined when none are rendered. */
	describedBy: string | undefined
	/** Id the Description slot renders with. */
	descriptionId: string
	/** Id the error Message slot renders with. */
	messageId: string
	/** Slot registration — Description / error Message call these on mount. */
	registerDescription: () => () => void
	registerMessage: () => () => void
}

/**
 * Field a11y scaffolding, mirroring `usePanelA11yScope`: derives the
 * Description / error-Message ids from the control id, tracks whether each slot
 * is actually rendered, and composes `aria-describedby` from only the
 * registered ids — so a field never references an id that isn't in the DOM.
 */
export function useControlA11y(id: string): ControlA11y {
	const descriptionId = `${id}-description`
	const messageId = `${id}-error`

	const [hasDescription, registerDescription] = useSlotRegistration()
	const [hasMessage, registerMessage] = useSlotRegistration()

	const describedBy =
		[hasDescription ? descriptionId : undefined, hasMessage ? messageId : undefined]
			.filter(Boolean)
			.join(' ') || undefined

	return { describedBy, descriptionId, messageId, registerDescription, registerMessage }
}
