'use client'

import { useMemo } from 'react'
import { createContext } from '../../core'
import { useControllable } from '../../hooks'

export type CurrentContextValue = {
	value: string | undefined
	onValueChange: ((value: string | undefined) => void) | undefined
}

/**
 * Shared "active panel" cascade used by `Tabs`, `Nav`, and any surface that
 * switches between mutually exclusive views. `CurrentContents` / `CurrentContent`
 * compare their own `value` against the context and render accordingly.
 */
export const [CurrentContext, useCurrent] = createContext<CurrentContextValue | undefined>(
	'Current',
	{ default: undefined },
)

/** Controlled / uncontrolled state owner for the current-panel cascade. Memoizes the provider value. */
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

/** Internal: signals to `CurrentContent` that its `CurrentContents` parent is animating height. */
export const [CurrentFadeContext, useCurrentFade] = createContext<boolean>('CurrentFade', {
	default: false,
})
