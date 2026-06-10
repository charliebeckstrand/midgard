'use client'

import { useMemo } from 'react'
import { type A11yRelation, useA11yScope } from './use-a11y-scope'

const CONTROL_SLOTS = {
	label: 'labelledby',
	description: 'describedby',
	error: 'describedby',
} as const satisfies Record<string, A11yRelation>

export type A11yControl = {
	/** Composed `aria-describedby` — registered slot ids only, or undefined when none are rendered. */
	describedBy: string | undefined
	/** Composed `aria-labelledby` — the Label's id once it registers, else undefined. Lets a portalled popup (e.g. a listbox) name itself from the field's Label. */
	labelledBy: string | undefined
	/** Id the Label slot renders with. */
	labelId: string
	/** Id the Description slot renders with. */
	descriptionId: string
	/** Id the error Message slot renders with. */
	messageId: string
	/** `true` while an error Message is mounted — fields OR this into `aria-invalid` so a rendered error always marks its control invalid. */
	messageRegistered: boolean
	/**
	 * Slot registration — Label / Description / error Message call these on mount,
	 * passing the id they actually render so `aria-*` never references a dangling id.
	 */
	registerLabel: (renderedId?: string) => () => void
	registerDescription: (renderedId?: string) => () => void
	registerMessage: (renderedId?: string) => () => void
}

/**
 * Field a11y scaffolding — `useA11yScope` specialized for a labelled control.
 * Derives the Label / Description / error-Message ids from the control id,
 * tracks whether each slot is actually rendered, and composes `aria-describedby`
 * / `aria-labelledby` from only the registered ids — a field never references
 * an id absent from the DOM. Id shape: `${id}-label`, `${id}-description`,
 * `${id}-error`.
 */
export function useA11yControl(id: string): A11yControl {
	const scope = useA11yScope({ id, slots: CONTROL_SLOTS })

	return useMemo<A11yControl>(
		() => ({
			describedBy: scope.ariaProps['aria-describedby'],
			labelledBy: scope.ariaProps['aria-labelledby'],
			labelId: scope.ids.label,
			descriptionId: scope.ids.description,
			messageId: scope.ids.error,
			messageRegistered: scope.registered.error,
			registerLabel: scope.register.label,
			registerDescription: scope.register.description,
			registerMessage: scope.register.error,
		}),
		[
			scope.ariaProps['aria-describedby'],
			scope.ariaProps['aria-labelledby'],
			scope.ids.label,
			scope.ids.description,
			scope.ids.error,
			scope.registered.error,
			scope.register.label,
			scope.register.description,
			scope.register.error,
		],
	)
}
