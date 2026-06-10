'use client'

import { useMemo } from 'react'
import type { AriaProps } from '../../types'
import { type A11yRelation, useA11yScope } from './use-a11y-scope'

const PANEL_SLOTS = {
	title: 'labelledby',
	description: 'describedby',
} as const satisfies Record<string, A11yRelation>

export type A11yPanelRole = 'dialog' | 'alertdialog'

export type A11yPanelProviderValue = {
	titleId: string
	descriptionId: string
	registerTitle: (renderedId?: string) => () => void
	registerDescription: (renderedId?: string) => () => void
}

export type A11yPanel = {
	/** Spread onto the panel root: role, `aria-modal`, and the labelling refs. */
	ariaProps: AriaProps
	/** Feed into `PanelProviders` so Title / Description slots register and adopt their ids. */
	a11y: A11yPanelProviderValue
}

/**
 * Modal-panel labelling scope: `useA11yScope` specialized for dialog roots
 * (dialog, drawer, sheet). Sets `role` + `aria-modal`, derives the Title /
 * Description ids, and only wires `aria-labelledby` / `aria-describedby` once
 * those slots register. Non-modal panels omit `aria-modal` so AT keeps the
 * rest of the page reachable, matching the surface's actual focus behavior.
 */
export function useA11yPanel(role: A11yPanelRole = 'dialog', modal = true): A11yPanel {
	const scope = useA11yScope({ slots: PANEL_SLOTS })

	const ariaProps = useMemo<AriaProps>(
		() => ({ role, 'aria-modal': modal || undefined, ...scope.ariaProps }),
		[role, modal, scope.ariaProps],
	)

	const a11y = useMemo<A11yPanelProviderValue>(
		() => ({
			titleId: scope.ids.title,
			descriptionId: scope.ids.description,
			registerTitle: scope.register.title,
			registerDescription: scope.register.description,
		}),
		[scope.ids.title, scope.ids.description, scope.register.title, scope.register.description],
	)

	return { ariaProps, a11y }
}
