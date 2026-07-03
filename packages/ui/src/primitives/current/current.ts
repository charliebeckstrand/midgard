'use client'

import { useMemo } from 'react'
import { createContext } from '../../core'
import { useControllable } from '../../hooks'

/** Value carried by `CurrentContext`: the active panel `value` and its change handler. */
export type CurrentContextValue = {
	value: string | undefined
	onValueChange: ((value: string | undefined) => void) | undefined
}

/**
 * Shared "active panel" cascade used by `Tabs`, `Nav`, and any surface that
 * switches between mutually exclusive views. The owning root provides the active
 * `value` and its `onValueChange` handler; {@link CurrentContents} /
 * {@link CurrentContent} consumers compare their own `value` against the context
 * and render accordingly. `undefined` outside a provider.
 *
 * @see {@link useCurrentState}
 */
export const [CurrentContext, useCurrent] = createContext<CurrentContextValue | undefined>(
	'Current',
	{ default: undefined },
)

/**
 * Controlled / uncontrolled state owner for the current-panel cascade.
 *
 * @returns A memoized {@link CurrentContextValue} to pass straight into
 * {@link CurrentContext}; `value` follows the controlled prop or internal state
 * via `useControllable`.
 */
export function useCurrentState(props: {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
}): CurrentContextValue {
	const [value, setValue] = useControllable({
		value: props.value,
		defaultValue: props.defaultValue,
		onValueChange: props.onValueChange,
	})

	return useMemo<CurrentContextValue>(() => ({ value, onValueChange: setValue }), [value, setValue])
}

/**
 * Signals to `CurrentContent` that its `CurrentContents` parent is animating
 * height, so the panel fades in place instead of unmounting. `false` outside a
 * fading container.
 *
 * @internal
 */
export const [CurrentFadeContext, useCurrentFade] = createContext<boolean>('CurrentFade', {
	default: false,
})

/**
 * Whether the nearest enclosing {@link CurrentContent} is the active panel,
 * folded across nesting: a panel is active only when it matches its context and
 * every ancestor panel does too. Descendants read this to know they are on the
 * visible view rather than a fade-mode panel kept mounted but hidden — useful
 * for deferring work, pausing animation, or scoping registrations to the panel
 * in view. Defaults to `true` outside any panel, so ungrouped content always
 * counts as active.
 */
export const [CurrentPanelActiveContext, useCurrentPanelActive] = createContext<boolean>(
	'CurrentPanelActive',
	{ default: true },
)
