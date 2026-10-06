'use client'

import { motion } from 'motion/react'
import { type ComponentProps, useCallback, useEffect, useState } from 'react'
import { dataAttr } from '../../core'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { k } from '../../recipes/kata/current'
import { MountHold, useMountHold } from '../mount'
import {
	CurrentPanelActiveContext,
	useCurrent,
	useCurrentDirection,
	useCurrentFade,
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
 * keeping the outgoing panel mounted so its fade-out can play. `release` clears
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
 * Entrance latch for a fading panel. An entering panel holds its slide until its
 * first frame has painted. Motion takes the start time of an animation from the
 * task that creates it. An animation created in the commit of the switch thus
 * counts the render of the panel as animation time. The first frame then shows
 * the slide partway. On iOS Safari a composited fade also fell out of step with
 * Motion and showed a second transition.
 *
 * The flip of `current` is read in render (React's adjust-state-during-render
 * form). A panel that stops being current before its slide starts calls
 * `release` in that pass.
 *
 * @param current - Whether the panel is current.
 * @param initiallyReady - Whether the panel starts ready. A panel in the first
 * render of the container starts ready, so nothing moves on load.
 * @param release - Releases a panel that stops being current before its slide
 * starts.
 * @returns Whether the slide of the panel can start.
 */
function useEntranceLatch(current: boolean, initiallyReady: boolean, release: () => void): boolean {
	const [ready, setReady] = useState(initiallyReady)

	const [wasCurrent, setWasCurrent] = useState(current)

	// Whether the last render showed the panel, which is the target of its fade.
	const [wasShown, setWasShown] = useState(current && initiallyReady)

	if (wasCurrent !== current) {
		setWasCurrent(current)

		if (current) setReady(false)
		else {
			if (!ready) setReady(true)

			// The ready flip and the switch away can land in one render. Then the fade
			// target stays at 0, no fade-out runs, and no landing releases the panel.
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
 * Per-panel wrapper that renders when its `value` matches the surrounding
 * `CurrentContext`. The surrounding `CurrentContents` sets the mount policy. A
 * fading container slides the panels and fades them. A non-fading one holds inactive
 * panels via `<Activity mode="hidden">` (state preserved, effects paused),
 * lazily mounts them on first activation, or unmounts them. The resolved
 * `mount` decides.
 *
 * Under a fading container the two panels slide side by side, in the direction
 * that `CurrentContents` reads from their document order. The outgoing panel
 * slides out to one side, and the incoming panel slides in from the other side.
 * Each panel fades across its slide. The panels never overlap, and the box never
 * shows empty. The lifecycle edges ride that switch:
 *
 * - a panel mounting after the container settles enters from its transparent
 *   waiting place, and its slide starts on the frame after its first paint
 * - an `active`-mounted outgoing panel holds its unmount until its slide
 *   completes
 * - a held (`always`/`lazy`) panel rests in `<Activity mode="hidden">` between
 *   switches, live only while a slide is in flight or it is the current panel
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

	const fade = useCurrentFade()

	const mount = useCurrentMount()

	const settled = useCurrentSettled()

	const direction = useCurrentDirection()

	// The slide moves `transform`, which `MotionConfig` does not hold still, so the
	// panel reads the setting itself (WCAG 2.3.3).
	const reducedMotion = usePrefersReducedMotion()

	const inheritedActive = useCurrentPanelActive()

	const current = matchesCurrent(value, context?.value)

	// Fold across nesting: a panel is active only when it matches and every
	// ancestor panel does too, so a fade-mode panel kept mounted inside a hidden
	// one still reads as inactive.
	const active = inheritedActive && current

	// Presence, the lazy latch, and the Activity hold — shared with the
	// disclosure and stepper panels. A fading container defers the hide to the
	// rest latch, since `display: none` can't fade; a non-fading one hides
	// on the switch itself.
	const hold = useMountHold(current, mount, { defer: fade })

	// Under a fading container, an `active`-mounted outgoing panel defers its
	// unmount until the fade-out completes, so the outgoing panel fades instead
	// of snapping away. Held panels take the rest latch instead;
	// exactly one of the two applies per mount policy.
	const [exiting, releaseExit] = useExitHold(current, fade && mount === 'active')

	// A panel that stops being current before its fade starts is still
	// transparent, so no fade-out lands to release it. The latch releases it.
	const ready = useEntranceLatch(current, !settled?.current, () => {
		if (hold.held) hold.rest()
		else releaseExit()
	})

	if (!hold.present && !exiting) return null

	if (!fade) {
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
		<motion.div
			ref={ref}
			{...props}
			data-slot={slot}
			data-current={dataAttr(current)}
			// The incoming panel waits beside the box until its first frame has
			// painted, then slides in. The outgoing panel slides out to the other
			// side.
			animate={current ? (ready ? k.shown : k.away(direction)) : k.away(-direction)}
			// A panel mounting after the container settles enters from its
			// waiting place; panels in the container's first render skip the
			// entrance so nothing moves on load.
			initial={settled?.current ? k.away(direction) : false}
			// The move to the waiting place is not shown, so it is instant.
			transition={current && !ready ? k.instant : reducedMotion ? k.still : k.slide}
			// Entrance completions arrive while still current and pass through; a
			// landed fade-out releases the exit hold (`active`, unmounting) or
			// rests the held panel (`always`/`lazy`, into a hidden Activity).
			onAnimationComplete={() => {
				if (current) return

				// `hold.rest` ignores a landing on an active panel, but the exit
				// release does not, so the current-panel guard stays.
				if (hold.held) hold.rest()
				else releaseExit()
			}}
			// Caller style is preserved under the positioning keys, matching the
			// non-fade branch; the positioning wins on collision.
			style={
				current
					? { ...style, position: 'relative' }
					: { ...style, position: 'absolute', top: 0, left: 0, right: 0 }
			}
			inert={!current}
			className={className}
		>
			<CurrentPanelActiveContext value={active}>{children}</CurrentPanelActiveContext>
		</motion.div>
	)

	// Held panels keep the Activity wrapper while visible too: adding it only
	// at rest would change the tree shape and remount the subtree each switch.
	return (
		<MountHold hold={hold} name={`${slotPrefix}-content`}>
			{panel}
		</MountHold>
	)
}
