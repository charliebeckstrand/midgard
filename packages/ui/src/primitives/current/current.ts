'use client'

import {
	type RefObject,
	use,
	useCallback,
	useLayoutEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react'
import { createContext } from '../../core'
import { useControllable } from '../../hooks'
import { createKeyedStore, type KeyedStore } from '../../utilities'
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

	const [current] = useState(() => createKeyedStore((key: string) => key === value))

	useLayoutEffect(() => {
		current.publish((key) => key === value)
	}, [current, value])

	return useMemo(() => ({ current, onValueChange }), [current, onValueChange])
}

const noSubscription = () => () => {}

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

	const subscribe = useCallback(
		(listener: () => void) =>
			store && value !== undefined ? store.current.subscribe(value, listener) : noSubscription(),
		[store, value],
	)

	const read = () => (store && value !== undefined ? store.current.get(value) : false)

	const stored = useSyncExternalStore(subscribe, read, read)

	if (store) return { current: stored, onValueChange: store.onValueChange }

	// Without a store, the item reads the context. `use` can run in a condition.
	const context = use(CurrentContext)

	return {
		current: value !== undefined && context?.value === value,
		onValueChange: context?.onValueChange,
	}
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
 * Post-mount latch broadcast by a fading `CurrentContents`: a ref that flips
 * true once the container commits its initial render. A panel mounting later
 * reads it to enter from transparent, such as a `lazy` first visit or a fresh
 * `active` mount. Panels present in the container's first render skip the
 * entrance, so nothing fades on load. A ref rather than state so the flip
 * re-renders nothing. `undefined` outside a fading container.
 *
 * @internal
 */
export const [CurrentSettledContext, useCurrentSettled] = createContext<
	RefObject<boolean> | undefined
>('CurrentSettled', { default: undefined })

/**
 * Whether the nearest enclosing {@link CurrentContent} is the active panel,
 * folded across nesting. A panel is active only when it matches its context and
 * every ancestor panel does too. Descendants read this to know they are on the
 * visible view, rather than a fade-mode panel kept mounted but hidden. That is
 * useful for deferring work, pausing animation, or scoping registrations to the
 * panel in view. Defaults to `true` outside any panel, so ungrouped content always
 * counts as active.
 */
export const [CurrentPanelActiveContext, useCurrentPanelActive] = createContext<boolean>(
	'CurrentPanelActive',
	{ default: true },
)

/**
 * Mount policy for {@link CurrentContent} panels — the shared {@link Mount}
 * vocabulary, named for this cascade:
 *
 * - `always` — every panel is mounted up front and inactive ones are held (state
 *   preserved, effects paused).
 * - `lazy` — a panel is absent until it first becomes active, then held like
 *   `always`; defers the mount cost of never-visited panels.
 * - `active` — only the active panel is mounted; switching unmounts the outgoing
 *   panel and resets its state — under a fading container, once its fade-out
 *   completes.
 */
export type CurrentMount = Mount

/**
 * Mount policy broadcast from {@link CurrentContents} to its {@link CurrentContent}
 * children. Defaults to `always` outside a container, so an ungrouped panel is
 * never unmounted.
 *
 * @internal
 */
export const [CurrentMountContext, useCurrentMount] = createContext<CurrentMount>('CurrentMount', {
	default: 'always',
})
