'use client'

import { useMemo } from 'react'
import { type A11yRelation, useA11yScope } from './use-a11y-scope'

const CONTROL_SLOTS = {
	description: 'describedby',
	error: 'describedby',
} as const satisfies Record<string, A11yRelation>

export type A11yControl = {
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
 * Field a11y scaffolding — `useA11yScope` specialized for a labelled control.
 * Derives the Description / error-Message ids from the control id, tracks
 * whether each slot is actually rendered, and composes `aria-describedby` from
 * only the registered ids — so a field never references an id that isn't in the
 * DOM. Ids preserve the legacy shape (`${id}-description`, `${id}-error`).
 */
export function useA11yControl(id: string): A11yControl {
	const scope = useA11yScope({ id, slots: CONTROL_SLOTS })

	return useMemo<A11yControl>(
		() => ({
			describedBy: scope.aria['aria-describedby'],
			descriptionId: scope.ids.description,
			messageId: scope.ids.error,
			registerDescription: scope.register.description,
			registerMessage: scope.register.error,
		}),
		[
			scope.aria['aria-describedby'],
			scope.ids.description,
			scope.ids.error,
			scope.register.description,
			scope.register.error,
		],
	)
}
