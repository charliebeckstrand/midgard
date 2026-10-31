'use client'

import type { RefObject } from 'react'
import { createContext } from '../../core'
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
 * How a `CurrentContents` animates a panel switch. `fade` fades the outgoing
 * panel out and the incoming panel in. `slide` slides the two panels side by
 * side, and `false` swaps them with no animation.
 *
 * @internal
 */
export type CurrentAnimation = 'fade' | 'slide' | false

/**
 * What an animating `CurrentContents` tells its `CurrentContent` children.
 *
 * @internal
 */
export type CurrentContentsState = {
	/**
	 * How the container animates a switch. An animating panel stays mounted
	 * through its exit instead of unmounting at once.
	 */
	animation: CurrentAnimation
	/** The mount policy of the container. */
	mount: Mount
	/**
	 * Post-mount latch: a ref that flips true once the container commits its
	 * initial render. A panel mounting later reads it to enter from
	 * transparent, such as a `lazy` first visit or a fresh `active` mount.
	 * Panels present in the first render of the container skip the entrance, so
	 * nothing fades on load. A ref rather than state so the flip re-renders
	 * nothing. `undefined` outside an animating container.
	 */
	settled: RefObject<boolean> | undefined
	/**
	 * The direction of the last panel switch. The incoming panel slides in from
	 * that side, and the outgoing panel slides out to the other side. `1`
	 * outside an animating container.
	 */
	direction: CurrentDirection
}

/**
 * The side a switch travels to. It is `1` when the incoming panel comes after
 * the outgoing panel in the reading order, and `-1` when it comes before it.
 *
 * @internal
 */
export type CurrentDirection = 1 | -1

/**
 * The {@link CurrentContentsState} of a still container. It is also the value
 * outside a container: no animation, and the `always` mount policy, so an
 * ungrouped panel is never unmounted.
 *
 * @internal
 */
export const STILL_CONTENTS: CurrentContentsState = {
	animation: false,
	mount: 'always',
	settled: undefined,
	direction: 1,
}

/**
 * Carries the {@link CurrentContentsState} from {@link CurrentContents} to its
 * {@link CurrentContent} children. {@link STILL_CONTENTS} outside a container.
 *
 * @internal
 */
export const [CurrentContentsContext, useCurrentContents] = createContext<CurrentContentsState>(
	'CurrentContents',
	{ default: STILL_CONTENTS },
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
 * How an `href` matches the current path. `exact` matches the path of the
 * `href` alone. `prefix` also matches each path under it, such as
 * `/users/42` for `/users`, so a section root stays current on its sub-pages.
 */
export type PathMatch = 'exact' | 'prefix'

/**
 * Whether each `href` matches the current path, one store for each
 * {@link PathMatch}. An item subscribes to its own `href`.
 *
 * @internal
 */
export type PathnameStore = Record<PathMatch, KeyedStore<string, boolean>>

/**
 * Carries the {@link PathnameStore} of the nearest `UIProvider` that has a
 * `pathname`. The value keeps its identity when the path changes, so a
 * navigation does not render each item. `undefined` outside such a provider.
 *
 * @internal
 */
export const [PathnameContext] = createContext<PathnameStore | undefined>('Pathname', {
	default: undefined,
})
