'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Mount policy for a panel that spends part of its life inactive — the view a
 * cascade isn't showing, a disclosure's closed body, a wizard step off screen:
 *
 * - `always` — every panel is mounted up front and inactive ones are held
 *   (state preserved, effects paused).
 * - `lazy` — a panel is absent until it first becomes active, then held like
 *   `always`; defers the mount cost of never-visited panels.
 * - `active` — only the active panel is mounted; going inactive unmounts it and
 *   resets its state.
 */
export type Mount = 'always' | 'lazy' | 'active'

/** The hold state {@link useMountHold} resolves for one panel. */
export type MountHold = {
	/** Whether the panel exists in the tree at all. */
	present: boolean
	/**
	 * Whether the policy holds inactive panels, so this panel needs the
	 * `<Activity>` wrapper. Constant for a given policy: the wrapper stays on
	 * whether or not the panel is currently hidden, because adding it only at
	 * rest would change the tree shape and remount the subtree each switch.
	 */
	held: boolean
	/** Whether the held panel is resting — the `<Activity mode="hidden">` state. */
	hidden: boolean
	/**
	 * Latches a deferred hold to rest. Call it when the panel's close animation
	 * lands — unconditionally is fine: it ignores a landing that arrives while the
	 * panel is active (the entrance of a panel that just opened), and an
	 * undeferred hold hides on the `active` flip itself and ignores it entirely.
	 */
	rest: () => void
}

/**
 * Whether a policy guarantees every panel is in the DOM — the question a trigger
 * asks before pointing `aria-controls` at a panel it doesn't render. Only
 * `always` can answer yes: `lazy` mounts panels as they are visited, which no
 * sibling trigger can observe, and `active` keeps just the one.
 */
export function mountsEveryPanel(mount: Mount): boolean {
	return mount === 'always'
}

/**
 * Resolves whether a panel is present, held, and hidden under a {@link Mount}
 * policy — the shared lifecycle behind the current-panel cascade, disclosure
 * panels, and stepper panels.
 *
 * @remarks
 * `defer` splits the two ways a hold can hide. Undeferred, `hidden` tracks
 * `active` directly, which suits a panel that swaps without animating. Deferred,
 * it tracks a rest latch instead: `display: none` cannot animate, so an
 * animating panel must stay live and in flow for its close transition and drop
 * into the hidden Activity only once {@link MountHold.rest} says the transition
 * landed. Either way a panel mounting inactive starts hidden, so a held panel
 * never pays a visible first render it doesn't need.
 *
 * The latch clears during render (React's adjust-state-during-render form), so
 * a resting panel that becomes active — or whose policy stops holding it —
 * wakes in the same pass that reveals it rather than a commit later.
 *
 * @param active - Whether the panel is the one currently shown.
 * @param mount - The policy governing inactive panels.
 * @param options - `defer`: whether hiding waits on {@link MountHold.rest} rather
 * than following `active`. Defaults to `false`.
 * @returns The panel's resolved {@link MountHold}.
 */
export function useMountHold(
	active: boolean,
	mount: Mount,
	options?: { defer?: boolean },
): MountHold {
	const defer = options?.defer ?? false

	// Lazy latch: a panel that has ever been active stays mounted thereafter.
	// Monotonic, so a re-run render is idempotent; becoming active is itself a
	// re-render, so no commit is needed to flip it.
	const everActive = useRef(false)

	if (active) everActive.current = true

	const held = mount !== 'active'

	// Starts latched for a panel mounting inactive under a deferred hold,
	// deferring its initial render cost; `rest` latches it again on each landing.
	const [rested, setRested] = useState(!active && held && defer)

	// The latch is only valid while its conditions are: an active panel, a policy
	// that stopped holding, or a hold that stopped deferring all clear it now —
	// no animation completion will arrive to do it.
	if (rested && (active || !held || !defer)) setRested(false)

	// Owns the "only a landing that closes counts" rule, so callers can hand every
	// completion straight through instead of each restating the guard. An active
	// panel's own entrance completes too, and must not rest it.
	const rest = useCallback(() => {
		if (defer && !active) setRested(true)
	}, [defer, active])

	return {
		present: mount === 'always' || active || (mount === 'lazy' && everActive.current),
		held,
		hidden: defer ? rested : !active,
		rest,
	}
}
