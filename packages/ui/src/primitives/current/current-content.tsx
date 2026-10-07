'use client'

import { type ComponentProps, useCallback, useEffect, useState } from 'react'
import { dataAttr } from '../../core'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/current'
import { MountHold, useMountHold } from '../mount'
import * as m from '../reduced-motion/reduced-motion-elements'
import {
	type CurrentDirection,
	CurrentPanelActiveContext,
	useCurrent,
	useCurrentAnimation,
	useCurrentDirection,
	useCurrentMount,
	useCurrentPanelActive,
	useCurrentSettled,
} from './current'

/**
 * Props for {@link CurrentContent}: the `slotPrefix` stamp, the `value` to match, and a `ref`, over `<div>` attributes.
 *
 * @remarks
 * Under a fading container the panel is a motion element, and motion gives its
 * own meaning to `onDrag`, `onDragStart`, `onDragEnd`, and `onAnimationStart`.
 * The container sets the mode, so the props omit these four keys in both modes.
 */
export type CurrentContentProps = Omit<
	ComponentProps<'div'>,
	'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
> & {
	/** Slot prefix. It gives the default anchor `data-slot="<slotPrefix>-content"`. */
	slotPrefix: string
	/** Match against the surrounding `CurrentContext`. Omit to render unconditionally. */
	value?: string
	/**
	 * Panel slot identifier. Wrappers override it to rename the anchor.
	 *
	 * @defaultValue `${slotPrefix}-content`
	 */
	'data-slot'?: string
}

/**
 * Exit hold for a panel whose mount policy would unmount it the instant it
 * stops being current. It latches when `current` flips off while `hold` applies,
 * keeping the outgoing panel mounted so its exit can play. `release` clears
 * the latch once that animation completes. The previous-value comparison runs
 * in render (React's adjust-state-during-render form) so the hold takes effect
 * in the same pass that would otherwise have unmounted the panel.
 */
function useExitHold(current: boolean, hold: boolean): [boolean, () => void] {
	const [previousCurrent, setPreviousCurrent] = useState(current)

	const [exiting, setExiting] = useState(false)

	if (previousCurrent !== current) {
		setPreviousCurrent(current)

		setExiting(!current && hold)
	}

	// The latch is only valid while its conditions are: if the container stops
	// fading (or the mount policy changes) mid-exit, release now — no animation
	// completion will arrive to do it.
	if (exiting && !hold) setExiting(false)

	const release = useCallback(() => setExiting(false), [])

	return [exiting, release]
}

/**
 * Entrance latch for an animating panel. An entering panel holds its entrance until its
 * first frame has painted. Motion takes the start time of an animation from the
 * task that creates it. An animation created in the commit of the switch thus
 * counts the render of the panel as animation time. The first frame then shows
 * the entrance partway. On iOS Safari a composited fade also fell out of step with
 * Motion and showed a second transition.
 *
 * The flip of `current` is read in render (React's adjust-state-during-render
 * form). A panel that stops being current before its entrance starts calls
 * `release` in that pass.
 *
 * @param current - Whether the panel is current.
 * @param initiallyReady - Whether the panel starts ready. A panel in the first
 * render of the container starts ready, so nothing moves on load.
 * @param release - Releases a panel that stops being current before its entrance
 * starts.
 * @returns Whether the entrance of the panel can start.
 */
function useEntranceLatch(current: boolean, initiallyReady: boolean, release: () => void): boolean {
	const [ready, setReady] = useState(initiallyReady)

	const [wasCurrent, setWasCurrent] = useState(current)

	// Whether the last render showed the panel, which is the target of its entrance.
	const [wasShown, setWasShown] = useState(current && initiallyReady)

	if (wasCurrent !== current) {
		setWasCurrent(current)

		if (current) setReady(false)
		else {
			if (!ready) setReady(true)

			// The ready flip and the switch away can land in one render. Then the
			// target stays transparent, no exit runs, and no landing releases the panel.
			if (!wasShown) release()
		}
	}

	const shown = current && ready

	if (wasShown !== shown) setWasShown(shown)

	useEffect(() => {
		if (ready || !current) return

		const id = requestAnimationFrame(() => setReady(true))

		return () => cancelAnimationFrame(id)
	}, [ready, current])

	return ready
}

/**
 * Whether a panel counts as current: an unvalued panel renders always, an
 * unvalued context keeps every panel current, and otherwise the values must
 * agree. A `null` context keeps no valued panel current.
 *
 * @internal
 */
function matchesCurrent(
	value: string | undefined,
	contextValue: string | null | undefined,
): boolean {
	return value === undefined || contextValue === undefined || contextValue === value
}

/**
 * The Motion props of an animating panel: its target, its start, and its
 * transition.
 *
 * - `fade`: the outgoing panel fades out. The incoming panel fades in after its
 *   first frame has painted, as the outgoing panel nears transparent.
 * - `slide`: the incoming panel waits beside the box until its first frame has
 *   painted, then slides in. The outgoing panel slides out to the other side.
 *
 * A panel mounting after the container settles (`entering`) starts transparent,
 * at its waiting place. Panels in the first render of the container skip the
 * entrance, so nothing moves on load.
 */
function panelMotion(
	animation: 'fade' | 'slide',
	state: {
		current: boolean
		ready: boolean
		entering: boolean
		direction: CurrentDirection
		reducedMotion: boolean
	},
) {
	const { current, ready, entering, direction, reducedMotion } = state

	if (animation === 'fade') {
		return {
			animate: { opacity: current && ready ? 1 : 0 },
			initial: entering ? { opacity: 0 } : false,
			transition: current ? k.fade.enter : k.fade.exit,
		} as const
	}

	const { slide } = k

	// The move to the waiting place is not shown, so it is instant. The slide
	// moves `transform`, which `MotionConfig` does not hold still, so reduced
	// motion takes the still copy (WCAG 2.3.3).
	const motion = reducedMotion ? slide.still : slide.transition

	if (!current)
		return { animate: slide.away(-direction), initial: false, transition: motion } as const

	return {
		animate: ready ? slide.shown : slide.away(direction),
		initial: entering ? slide.away(direction) : false,
		transition: ready ? motion : k.instant,
	} as const
}

/**
 * Per-panel wrapper that renders when its `value` matches the surrounding
 * `CurrentContext`. The surrounding `CurrentContents` sets the mount policy and
 * the animation. An animating container fades or slides the panels. A still one
 * holds inactive panels via `<Activity mode="hidden">` (state preserved, effects
 * paused), lazily mounts them on first activation, or unmounts them. The
 * resolved `mount` decides.
 *
 * Under `fade` the outgoing panel fades out, and the incoming panel fades in as
 * the outgoing panel nears transparent. Under `slide` the two panels slide side
 * by side, in the direction that `CurrentContents` reads from their document
 * order, and each panel fades across its slide. The lifecycle edges ride that
 * switch:
 *
 * - a panel mounting after the container settles enters from its transparent
 *   start, and its entrance starts on the frame after its first paint
 * - an `active`-mounted outgoing panel holds its unmount until its exit
 *   completes
 * - a held (`always`/`lazy`) panel rests in `<Activity mode="hidden">` between
 *   switches, live only while an animation is in flight or it is the current
 *   panel
 */
export function CurrentContent({
	slotPrefix,
	value,
	className,
	style,
	children,
	ref,
	'data-slot': slotProp,
	...props
}: CurrentContentProps) {
	// Resolved here and not as a parameter default, which the React Compiler
	// cannot reorder.
	const slot = slotProp ?? `${slotPrefix}-content`

	const context = useCurrent()

	const animation = useCurrentAnimation()

	const mount = useCurrentMount()

	const settled = useCurrentSettled()

	const direction = useCurrentDirection()

	const reducedMotion = usePrefersReducedMotion()

	const inheritedActive = useCurrentPanelActive()

	const current = matchesCurrent(value, context?.value)

	// Fold across nesting: a panel is active only when it matches and every
	// ancestor panel does too, so a panel that an animating container keeps
	// mounted inside a hidden one still reads as inactive.
	const active = inheritedActive && current

	// Presence, the lazy latch, and the Activity hold — shared with the
	// disclosure and stepper panels. An animating container defers the hide to
	// the rest latch, since `display: none` can't animate; a still one hides
	// on the switch itself.
	const hold = useMountHold(current, mount, { defer: animation !== false })

	// Under an animating container, an `active`-mounted outgoing panel defers
	// its unmount until its exit completes, so the outgoing panel animates
	// instead of snapping away. Held panels take the rest latch instead;
	// exactly one of the two applies per mount policy.
	const [exiting, releaseExit] = useExitHold(current, animation !== false && mount === 'active')

	// A panel that stops being current before its entrance starts is still
	// transparent, so no exit lands to release it. The latch releases it.
	const entering = Boolean(settled?.current)

	const ready = useEntranceLatch(current, !entering, () => {
		if (hold.held) hold.rest()
		else releaseExit()
	})

	if (!hold.present && !exiting) return null

	if (animation === false) {
		// `MountHold` wraps only when the policy holds inactive panels: `active` gets
		// the bare div, `always`/`lazy` get it inside an Activity that preserves
		// state while hidden but tears down effects and defers re-rendering.
		return (
			<MountHold hold={hold} name={`${slotPrefix}-content`}>
				<div ref={ref} data-slot={slot} className={className} style={style} {...props}>
					<CurrentPanelActiveContext value={active}>{children}</CurrentPanelActiveContext>
				</div>
			</MountHold>
		)
	}

	const panel = (
		<m.div
			ref={ref}
			{...props}
			data-slot={slot}
			data-current={dataAttr(current)}
			{...panelMotion(animation, { current, ready, entering, direction, reducedMotion })}
			// Entrance completions arrive while still current and pass through; a
			// landed exit releases the exit hold (`active`, unmounting) or
			// rests the held panel (`always`/`lazy`, into a hidden Activity).
			onAnimationComplete={() => {
				if (current) return

				// `hold.rest` ignores a landing on an active panel, but the exit
				// release does not, so the current-panel guard stays.
				if (hold.held) hold.rest()
				else releaseExit()
			}}
			// Caller style is preserved under the positioning keys, matching the
			// still branch; the positioning wins on collision.
			style={
				current
					? { ...style, position: 'relative' }
					: { ...style, position: 'absolute', top: 0, left: 0, right: 0 }
			}
			inert={!current}
			className={className}
		>
			<CurrentPanelActiveContext value={active}>{children}</CurrentPanelActiveContext>
		</m.div>
	)

	// Held panels keep the Activity wrapper while visible too: adding it only
	// at rest would change the tree shape and remount the subtree each switch.
	return (
		<MountHold hold={hold} name={`${slotPrefix}-content`}>
			{panel}
		</MountHold>
	)
}
