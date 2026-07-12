'use client'

import { type HTMLMotionProps, motion } from 'motion/react'
import {
	Activity,
	type ComponentPropsWithoutRef,
	type Ref,
	useCallback,
	useRef,
	useState,
} from 'react'
import { dataAttr } from '../../core'
import { k } from '../../recipes/kata/current'
import {
	type CurrentMount,
	CurrentPanelActiveContext,
	useCurrent,
	useCurrentFade,
	useCurrentMount,
	useCurrentPanelActive,
	useCurrentSettled,
} from './current'

export type CurrentContentProps = ComponentPropsWithoutRef<'div'> & {
	/** Slot prefix stamped as `data-slot="<slotPrefix>-content"`. */
	slotPrefix: string
	/** Match against the surrounding `CurrentContext`. Omit to render unconditionally. */
	value?: string
	/** Ref to the rendered element (forwarded in both fade and non-fade modes). */
	ref?: Ref<HTMLDivElement>
}

/**
 * Exit hold for a panel whose mount policy would unmount it the instant it
 * stops being current: latches when `current` flips off while `hold` applies,
 * keeping the outgoing panel mounted so its fade-out can play; `release` clears
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
 * Rest hold for a fade-held panel (`always`/`lazy` under a fading container):
 * latches while the panel sits inactive outside a crossfade, so it can drop
 * into a hidden Activity instead of staying live at opacity 0. Starts latched
 * for a panel mounting inactive, deferring its initial render cost; `rest`
 * latches it again when a fade-out lands. The clearing comparison runs in
 * render (React's adjust-state-during-render form) so a resting panel that
 * becomes current — or stops being held — wakes in the same pass its fade-in
 * starts.
 */
function useRestHold(current: boolean, hold: boolean): [boolean, () => void] {
	const [rested, setRested] = useState(!current && hold)

	if (rested && (current || !hold)) setRested(false)

	const rest = useCallback(() => setRested(true), [])

	return [rested, rest]
}

/**
 * Lifecycle gate — which panels exist in the tree. `always` keeps all; `lazy`
 * waits for first activation; `active` keeps only the current panel, plus the
 * outgoing one while its fade-out plays.
 *
 * @internal
 */
function isPresent(
	mount: CurrentMount,
	current: boolean,
	hasBeenCurrent: boolean,
	exiting: boolean,
): boolean {
	return mount === 'always' || current || (mount === 'lazy' && hasBeenCurrent) || exiting
}

/**
 * Whether a panel counts as current: an unvalued panel renders always, an
 * unvalued context keeps every panel current, and otherwise the values must
 * agree.
 *
 * @internal
 */
function matchesCurrent(value: string | undefined, contextValue: string | undefined): boolean {
	return value === undefined || contextValue === undefined || contextValue === value
}

/**
 * Per-panel wrapper that renders when its `value` matches the surrounding
 * `CurrentContext`. The surrounding `CurrentContents` sets the mount policy: a
 * fading container animates opacity in place; a non-fading one holds inactive
 * panels via `<Activity mode="hidden">` (state preserved, effects paused),
 * lazily mounts them on first activation, or unmounts them, per its resolved
 * `mount`. Under a fading container the lifecycle edges ride the cross-fade:
 * a panel mounting after the container settles enters from transparent, an
 * `active`-mounted outgoing panel holds its unmount until the fade-out
 * completes, and a held (`always`/`lazy`) panel rests in
 * `<Activity mode="hidden">` between crossfades — live only while a fade is
 * in flight or it is the current panel.
 */
export function CurrentContent({
	slotPrefix,
	value,
	className,
	style,
	children,
	ref,
	...props
}: CurrentContentProps) {
	const context = useCurrent()

	const fade = useCurrentFade()

	const mount = useCurrentMount()

	const settled = useCurrentSettled()

	const inheritedActive = useCurrentPanelActive()

	const current = matchesCurrent(value, context?.value)

	// Fold across nesting: a panel is active only when it matches and every
	// ancestor panel does too, so a fade-mode panel kept mounted inside a hidden
	// one still reads as inactive.
	const active = inheritedActive && current

	// Lazy latch: a panel that has ever been current stays mounted thereafter.
	// Monotonic, so a re-run render is idempotent; becoming current is itself a
	// re-render, so no commit is needed to flip it.
	const hasBeenCurrent = useRef(false)

	if (current) hasBeenCurrent.current = true

	// Under a fading container, an `active`-mounted outgoing panel defers its
	// unmount until the fade-out completes, so switching cross-fades instead of
	// snapping the outgoing panel away.
	const [exiting, releaseExit] = useExitHold(current, fade && mount === 'active')

	// A fade-held panel (`always`/`lazy`) instead rests in a hidden Activity
	// between crossfades; exactly one of the two holds applies per mount policy.
	const held = fade && mount !== 'active'

	const [rested, rest] = useRestHold(current, held)

	if (!isPresent(mount, current, hasBeenCurrent.current, exiting)) return null

	if (!fade) {
		const panel = (
			<div
				ref={ref}
				data-slot={`${slotPrefix}-content`}
				className={className}
				style={style}
				{...props}
			>
				<CurrentPanelActiveContext value={active}>{children}</CurrentPanelActiveContext>
			</div>
		)

		// `active` never holds an inactive panel, so it needs no Activity wrapper.
		if (mount === 'active') return panel

		// `always`/`lazy`: hold the panel in the DOM. `Activity` preserves its
		// state while hidden but tears down effects and defers re-rendering —
		// the "mounted but not fully rendered" path.
		return <Activity mode={current ? 'visible' : 'hidden'}>{panel}</Activity>
	}

	const panel = (
		<motion.div
			ref={ref}
			// Forward caller props (id, role, aria-*) in fade mode; the cast
			// sidesteps motion's redefined animation/drag handler signatures.
			{...(props as HTMLMotionProps<'div'>)}
			data-slot={`${slotPrefix}-content`}
			data-current={dataAttr(current)}
			animate={current ? { opacity: 1 } : { opacity: 0 }}
			// A panel mounting after the container settles enters from
			// transparent; panels in the container's first render skip the
			// entrance so nothing fades on load.
			initial={settled?.current ? { opacity: 0 } : false}
			transition={k.transition}
			// Entrance completions arrive while still current and pass through; a
			// landed fade-out releases the exit hold (`active`, unmounting) or
			// rests the held panel (`always`/`lazy`, into a hidden Activity).
			onAnimationComplete={() => {
				if (current) return

				if (held) rest()
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

	if (!held) return panel

	// Held panels keep the Activity wrapper while visible too: adding it only
	// at rest would change the tree shape and remount the subtree each switch.
	return <Activity mode={rested ? 'hidden' : 'visible'}>{panel}</Activity>
}
