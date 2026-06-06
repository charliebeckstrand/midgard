'use client'

import { useMemo } from 'react'
import { type A11yRelation, useA11yScope } from './use-a11y-scope'

const PANEL_SLOTS = {
	title: 'labelledby',
	description: 'describedby',
} as const satisfies Record<string, A11yRelation>

export type A11yPanelRole = 'dialog' | 'alertdialog'

export type A11yPanelProviderValue = {
	titleId: string
	descriptionId: string
	registerTitle: () => () => void
	registerDescription: () => () => void
}

export type A11yPanel = {
	/** Spread onto the panel root — role, `aria-modal`, and the labelling refs. */
	panelAriaProps: {
		role: A11yPanelRole
		'aria-modal': true
		'aria-labelledby'?: string
		'aria-describedby'?: string
	}
	/** Feed into the panel's a11y context so Title / Description slots register and adopt their ids. */
	providerValue: A11yPanelProviderValue
}

/**
 * Modal-panel labelling scope — `useA11yScope` specialized for dialog roots
 * (dialog, drawer, sheet). Sets `role` + `aria-modal`, derives the Title /
 * Description ids, and only wires `aria-labelledby` / `aria-describedby` once
 * those slots register, so the panel never references an id absent from the DOM.
 */
export function useA11yPanel(role: A11yPanelRole = 'dialog'): A11yPanel {
	const scope = useA11yScope({ slots: PANEL_SLOTS })

	const panelAriaProps = useMemo(
		() => ({ role, 'aria-modal': true as const, ...scope.aria }),
		[role, scope.aria],
	)

	const providerValue = useMemo<A11yPanelProviderValue>(
		() => ({
			titleId: scope.ids.title,
			descriptionId: scope.ids.description,
			registerTitle: scope.register.title,
			registerDescription: scope.register.description,
		}),
		[scope.ids.title, scope.ids.description, scope.register.title, scope.register.description],
	)

	return { panelAriaProps, providerValue }
}
