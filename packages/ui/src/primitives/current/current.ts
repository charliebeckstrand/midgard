'use client'

import { type RefObject, use, useMemo } from 'react'
import { createContext } from '../../core'
import { useControllable } from '../../hooks'
import { keyMatcher, useKeyedStore, useKeyedValue } from '../../hooks/use-keyed-store'
import type { KeyedStore } from '../../utilities'
import type { Mount } from '../mount'

/** Value carried by `CurrentContext`: the active panel `value` and its change handler. */
export type CurrentContextValue = {
	/**
	 * The active panel value. `null` means controlled with none active, so no
	 * valued panel is current. `undefined` means an unvalued context, so every
	 * panel is current.
	 */
	value: string | null | undefined
	/** Fires with the newly active value, or `null` once none is active (CONVENTIONS §7.3). */
	onValueChange: ((value: string | null) => void) | undefined
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
 * via `useControllable`. A controlled `null` stays `null`.
 */
export function useCurrentState(props: {
	/** Controlled active value. `undefined` leaves it uncontrolled; `null` keeps it controlled with none active (CONVENTIONS §7.3). */
	value?: string | null
	defaultValue?: string
	onValueChange?: (value: string | null) => void
}): CurrentContextValue {
	const [value, setValue] = useControllable({
		value: props.value,
		defaultValue: props.defaultValue,
		onValueChange: props.onValueChange,
	})

	// `useControllable` folds `null` into `undefined`. Carry the controlled
	// `null` past it, so "none active" does not read as an unvalued context.
	const contextValue = props.value === null ? null : value

	return useMemo<CurrentContextValue>(
		() => ({ value: contextValue, onValueChange: setValue }),
		[contextValue, setValue],
	)
}

/**
 * The current-item store that a root gives to its items, next to
 * {@link CurrentContext}.
 *
 * @internal
 */
export type CurrentStore = {
	/** Whether each value is the current value. An item subscribes to its own value. */
	current: KeyedStore<string, boolean>
	/** The change handler of the root. */
	onValueChange: ((value: string | null) => void) | undefined
}

/**
 * Carries the {@link CurrentStore} of the nearest root. The value keeps its
 * identity when the current value changes, so a change does not render each
 * item. `undefined` outside a root that gives a store.
 *
 * @internal
 */
export const [CurrentStoreContext] = createContext<CurrentStore | undefined>('CurrentStore', {
	default: undefined,
})

/**
 * Makes the {@link CurrentStore} of a root from its {@link CurrentContextValue}.
 *
 * @returns A store that keeps its identity while `onValueChange` keeps its
 * identity. Pass it into {@link CurrentStoreContext}.
 *
 * @remarks
 * The hook publishes the current value in a layout effect. A change therefore
 * calls only the listeners of the value that stops being current and of the
 * value that becomes current.
 *
 * @internal
 */
export function useCurrentStore(state: CurrentContextValue): CurrentStore {
	const { value, onValueChange } = state

	const current = useKeyedStore(value, keyMatcher)

	return useMemo(() => ({ current, onValueChange }), [current, onValueChange])
}

/**
 * Reads whether `value` is the current value, and the change handler of the
 * root.
 *
 * @returns `current`, which is `false` for an unvalued item, and `onValueChange`.
 *
 * @remarks
 * Under a root that gives a {@link CurrentStore}, the item subscribes to its own
 * value. It then renders only when its own `current` changes. Under a
 * {@link CurrentContext} alone, the item reads the context.
 *
 * @internal
 */
export function useCurrentItem(value: string | undefined): {
	current: boolean
	onValueChange: ((value: string | null) => void) | undefined
} {
	const store = use(CurrentStoreContext)

	const stored = useKeyedValue(store?.current ?? null, value, false)

	if (store) return { current: stored, onValueChange: store.onValueChange }

	// Without a store, the item reads the context. `use` can run in a condition.
	const context = use(CurrentContext)

	return {
		current: value !== undefined && context?.value === value,
		onValueChange: context?.onValueChange,
	}
}

/**
 * How a `CurrentContents` animates a panel switch: `fade` fades the outgoing
 * panel out and the incoming panel in, `slide` slides the two panels side by
 * side, and `false` swaps them with no animation.
 *
 * @internal
 */
export type CurrentAnimation = 'fade' | 'slide' | false

/**
 * Signals to `CurrentContent` how its `CurrentContents` parent animates a
 * switch. An animating panel stays mounted through its exit instead of
 * unmounting at once. `false` outside an animating container.
 *
 * @internal
 */
export const [CurrentAnimationContext, useCurrentAnimation] = createContext<CurrentAnimation>(
	'CurrentAnimation',
	{ default: false },
)

/**
 * Post-mount latch broadcast by an animating `CurrentContents`: a ref that flips
 * true once the container commits its initial render. A panel mounting later
 * reads it to enter from transparent, such as a `lazy` first visit or a fresh
 * `active` mount. Panels present in the container's first render skip the
 * entrance, so nothing fades on load. A ref rather than state so the flip
 * re-renders nothing. `undefined` outside an animating container.
 *
 * @internal
 */
export const [CurrentSettledContext, useCurrentSettled] = createContext<
	RefObject<boolean> | undefined
>('CurrentSettled', { default: undefined })

/**
 * The side a switch travels to: `1` when the incoming panel comes after the
 * outgoing panel in the reading order, and `-1` when it comes before it.
 *
 * @internal
 */
export type CurrentDirection = 1 | -1

/**
 * The direction of the last panel switch, broadcast by an animating
 * `CurrentContents`. The incoming panel slides in from that side, and the
 * outgoing panel slides out to the other side. `1` outside an animating
 * container.
 *
 * @internal
 */
export const [CurrentDirectionContext, useCurrentDirection] = createContext<CurrentDirection>(
	'CurrentDirection',
	{ default: 1 },
)

/**
 * Whether the nearest enclosing {@link CurrentContent} is the active panel,
 * folded across nesting. A panel is active only when it matches its context and
 * every ancestor panel does too. Descendants read this to know they are on the
 * visible view, rather than a panel that an animating container keeps mounted but hidden. That is
 * useful for deferring work, pausing animation, or scoping registrations to the
 * panel in view. Defaults to `true` outside any panel, so ungrouped content always
 * counts as active.
 */
export const [CurrentPanelActiveContext, useCurrentPanelActive] = createContext<boolean>(
	'CurrentPanelActive',
	{ default: true },
)

/**
 * Mount policy broadcast from {@link CurrentContents} to its {@link CurrentContent}
 * children. Defaults to `always` outside a container, so an ungrouped panel is
 * never unmounted.
 *
 * @internal
 */
export const [CurrentMountContext, useCurrentMount] = createContext<Mount>('CurrentMount', {
	default: 'always',
})
