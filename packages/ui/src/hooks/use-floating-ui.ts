'use client'

import { useInteractions } from '@floating-ui/react'
import type { HTMLProps } from 'react'
import { type FloatingRole, useFloatingDismissal } from './use-floating-dismissal'
import {
	type FloatingPanelOptions,
	type FloatingPanelResult,
	useFloatingPanel,
} from './use-floating-panel'

/** Return shape of {@link useFloatingUI}: the refs, the positioned styles, the floating context, and the prop getters. */
export type FloatingUIResult = FloatingPanelResult & {
	getReferenceProps: (userProps?: HTMLProps<Element>) => Record<string, unknown>
	getFloatingProps: (userProps?: HTMLProps<HTMLElement>) => Record<string, unknown>
}

/** Options for {@link useFloatingUI}: the {@link FloatingPanelOptions} plus the open state, the dismiss wiring, and the role. */
export type FloatingUIOptions = FloatingPanelOptions & {
	/**
	 * Popup role floating-ui stamps on the floating element, plus the matching
	 * `aria-haspopup`/`aria-controls`/`aria-expanded` on the reference. Pass
	 * `null` when the component hand-rolls its own roles on inner elements (the
	 * trigger button and the panel). A role here also stamps the positioning
	 * wrapper, nesting a duplicate widget around the real one
	 * (combobox-in-combobox, listbox-in-listbox). @defaultValue 'listbox'
	 */
	role?: FloatingRole | null
}

/**
 * Floating panel with built-in dismiss and role interactions: the common
 * pattern for listbox, combobox, dropdown menu, and date picker surfaces.
 *
 * Outside-press uses a custom document-level pointerdown listener. It checks
 * the press target directly against the floating panel and reference, with no
 * false positives from sibling portals inside a `Sheet`/`Dialog`. A press
 * inside a nested floating-ui portal counts as inside, mirroring
 * floating-ui's own node-tree handling.
 *
 * @returns `useFloatingPanel`'s `{ refs, floatingStyles, context, placement, isPositioned }` plus
 * `getReferenceProps` / `getFloatingProps` prop-getters that fold in the
 * dismiss + role interactions; spread them on the reference and floating
 * elements respectively.
 */
export function useFloatingUI({
	role: roleProp = 'listbox',
	...rest
}: FloatingUIOptions): FloatingUIResult {
	const { refs, floatingStyles, context, placement, isPositioned } = useFloatingPanel(rest)

	const { dismiss, role } = useFloatingDismissal(context, refs, {
		open: rest.open,
		role: roleProp,
		dismissable: true,
	})

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	return {
		refs,
		floatingStyles,
		context,
		placement,
		isPositioned,
		getReferenceProps,
		getFloatingProps,
	}
}
