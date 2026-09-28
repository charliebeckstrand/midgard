'use client'

import { Activity, type ReactNode } from 'react'
import type { MountHoldState } from './mount'

/** Props for {@link MountHold}. */
export type MountHoldProps = {
	/** The panel's resolved hold, from `useMountHold`. */
	hold: MountHoldState
	/** Name for the Activity boundary, surfaced in React DevTools. */
	name?: string
	/** The panel to hold. */
	children: ReactNode
}

/**
 * Applies a {@link MountHoldState} to a panel: a held one is wrapped in `<Activity>`
 * and toggled between `visible` and `hidden`; an unheld one renders bare.
 *
 * @remarks
 * A hidden Activity keeps its subtree in the DOM at `display: none` with state
 * intact, and tears its effects down. It defers its re-renders off the visible
 * commit. They still run, just at a lower priority once the visible work has
 * landed. Presence is the caller's to gate. Render nothing when
 * {@link MountHoldState.present} is false, rather than passing an absent panel here.
 * A policy that unmounts then costs no wrapper at all.
 */
export function MountHold({ hold, name, children }: MountHoldProps) {
	if (!hold.held) return children

	return (
		<Activity mode={hold.hidden ? 'hidden' : 'visible'} name={name}>
			{children}
		</Activity>
	)
}
