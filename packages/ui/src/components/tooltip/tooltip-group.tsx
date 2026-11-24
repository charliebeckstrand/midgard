'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { TooltipGroupContext } from './context'

/**
 * The shared state of a {@link TooltipGroup}. It holds no Floating UI, so a
 * `<Toolbar>` can open a group before the tooltip state loads.
 * @internal
 */
export type TooltipGroupStore = {
	/**
	 * Whether a tooltip of the group is open, or closed less than the grace
	 * period ago. A tooltip of a warm group opens at once, with no delay and no
	 * entrance animation.
	 */
	warm: () => boolean
	/** Calls `onChange` each time that {@link TooltipGroupStore.warm} changes. */
	subscribe: (onChange: () => void) => () => void
	/**
	 * Tells the group that a tooltip opened. The group calls `handover` of the
	 * tooltip that was open before, which closes it at once.
	 *
	 * @returns A function that tells the group that the tooltip closed. The
	 * grace period then starts.
	 */
	open: (handover: () => void) => () => void
	/**
	 * Stops the grace period and turns the group cold. A hidden `<Activity>`
	 * runs this cleanup and keeps the store, so the group must not stay warm
	 * until its next open.
	 */
	dispose: () => void
}

/**
 * Makes the store of a {@link TooltipGroup}.
 * @param readTimeout - Gives the grace period in milliseconds. The group stays
 * warm for this time after its last tooltip closes.
 * @internal
 */
export function createTooltipGroup(readTimeout: () => number): TooltipGroupStore {
	let current: (() => void) | null = null

	let warm = false

	let timer: ReturnType<typeof setTimeout> | undefined

	const listeners = new Set<() => void>()

	const setWarm = (next: boolean) => {
		if (warm === next) return

		warm = next

		for (const listener of listeners) listener()
	}

	return {
		warm: () => warm,
		subscribe: (onChange) => {
			listeners.add(onChange)

			return () => {
				listeners.delete(onChange)
			}
		},
		open: (handover) => {
			clearTimeout(timer)

			const previous = current

			current = handover

			// The handover closes the tooltip before, and its close finds that it is
			// no longer the current tooltip. Thus that close starts no grace period.
			previous?.()

			setWarm(true)

			return () => {
				if (current !== handover) return

				current = null

				timer = setTimeout(() => setWarm(false), readTimeout())
			}
		},
		dispose: () => {
			clearTimeout(timer)

			current = null

			setWarm(false)
		},
	}
}

/** Props for {@link TooltipGroup}. */
export type TooltipGroupProps = {
	/**
	 * The grace period in milliseconds. After the last tooltip of the group
	 * closes, the next tooltip of the group opens at once for this time.
	 * @defaultValue 300
	 */
	timeout?: number
	children: ReactNode
}

/**
 * Makes the `<Tooltip>`s inside it act as one set of tooltips. The first
 * tooltip opens after its `delay`. While a tooltip of the group is open, a
 * tooltip of the group opens at once, with no entrance animation. The open
 * tooltip then closes at once. After the last tooltip closes, the next one
 * opens at once until the grace period ends.
 *
 * @remarks Each `<Toolbar>` is a group, so a reader who moves along the
 * buttons of a toolbar waits for the first tooltip only. Use `TooltipGroup`
 * for another set of controls that sit next to each other. The nearest group
 * is the group of a tooltip, so a toolbar in a `TooltipGroup` is a group of
 * its own. Focus and click open a tooltip at once with or without a group,
 * but the handover and the entrance with no animation apply to them too.
 */
export function TooltipGroup({ timeout = 300, children }: TooltipGroupProps) {
	// The store reads the newest `timeout` when a grace period starts.
	const readTimeout = useStableEvent(() => timeout)

	const [store] = useState(() => createTooltipGroup(readTimeout))

	useEffect(() => store.dispose, [store])

	return <TooltipGroupContext value={store}>{children}</TooltipGroupContext>
}
