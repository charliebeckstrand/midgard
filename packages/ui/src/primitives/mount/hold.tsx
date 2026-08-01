'use client'

import { Activity, type ReactNode } from 'react'
import type { MountHold } from './mount'

/** Props for {@link Hold}. */
export type HoldProps = {
	/** The panel's resolved hold, from `useMountHold`. */
	hold: MountHold
	/** Name for the Activity boundary, surfaced in React DevTools. */
	name?: string
	/** The panel to hold. */
	children: ReactNode
}

/**
 * Applies a {@link MountHold} to a panel: a held one is wrapped in `<Activity>`
 * and toggled between `visible` and `hidden`; an unheld one renders bare.
 *
 * @remarks
 * A hidden Activity keeps its subtree in the DOM at `display: none` with state
 * intact, tears its effects down, and defers its re-renders off the visible
 * commit — they still run, just at a lower priority once the visible work has
 * landed. Presence is the caller's to gate: render nothing when
 * {@link MountHold.present} is false rather than passing an absent panel here,
 * so a policy that unmounts costs no wrapper at all.
 */
export function Hold({ hold, name, children }: HoldProps) {
	if (!hold.held) return children

	return (
		<Activity mode={hold.hidden ? 'hidden' : 'visible'} name={name}>
			{children}
		</Activity>
	)
}
