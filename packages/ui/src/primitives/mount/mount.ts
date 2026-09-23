'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Mount policy for a panel that spends part of its life inactive. Examples are
 * the view a cascade isn't showing, a disclosure's closed body, and a wizard
 * step off screen:
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
	 * `<Activity>` wrapper. Constant for a given policy. The wrapper stays on
	 * whether or not the panel is currently hidden. To add it only at rest would
	 * change the tree shape, and remount the subtree each switch.
	 */
	held: boolean
	/** Whether the held panel is resting — the `<Activity mode="hidden">` state. */
	hidden: boolean
	/**
	 * Whether the panel was active on its first render, frozen there. A held
	 * panel's motion entry point keys on this long after the live value moved on.
	 */
	mountedActive: boolean
	/**
	 * Latches a deferred hold to rest. Call it when the panel's close animation
	 * lands. Unconditionally is fine. It ignores a landing that arrives while the
	 * panel is active, which is the entrance of a panel that just opened. An
	 * undeferred hold hides on the `active` flip itself, and ignores the landing
	 * entirely.
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
 * it tracks a rest latch instead. A `display: none` cannot animate, so an
 * animating panel must stay live and in flow for its close transition. It drops
 * into the hidden Activity only once {@link MountHold.rest} says the transition
 * landed. Either way a panel mounting inactive starts hidden, so a held panel
 * never pays a visible first render it doesn't need.
 *
 * The latch clears during render, in React's adjust-state-during-render form. A
 * resting panel that becomes active, or whose policy stops holding it, therefore
 * wakes in the same pass that reveals it. It does not wake a commit later. The
 * latch also arms during render. An inactive panel whose policy starts to hold
 * it, or whose hold starts to defer, rests in the same pass.
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

	const mountedActive = useRef(active)

	if (active) everActive.current = true

	const held = mount !== 'active'

	// Starts latched for a panel mounting inactive under a deferred hold,
	// deferring its initial render cost; `rest` latches it again on each landing.
	const [rested, setRested] = useState(!active && held && defer)

	// The latch is only valid while its conditions are: an active panel, a policy
	// that stopped holding, or a hold that stopped deferring all clear it now —
	// no animation completion will arrive to do it.
	if (rested && (active || !held || !defer)) setRested(false)

	// The arming direction. When the policy starts to hold, or the hold starts to
	// defer, an inactive panel has no close transition in flight. No landing
	// arrives to rest it, so rest it now. A panel that goes inactive keeps the
	// latch open, because its close transition must still play.
	const deferredHold = held && defer

	const [wasDeferredHold, setWasDeferredHold] = useState(deferredHold)

	if (wasDeferredHold !== deferredHold) {
		setWasDeferredHold(deferredHold)

		if (deferredHold && !active) setRested(true)
	}

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
		mountedActive: mountedActive.current,
		rest,
	}
}
