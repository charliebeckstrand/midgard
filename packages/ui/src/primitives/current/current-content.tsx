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
 * Per-panel wrapper that renders when its `value` matches the surrounding
 * `CurrentContext`. The surrounding `CurrentContents` sets the mount policy: a
 * fading container animates opacity in place; a non-fading one holds inactive
 * panels via `<Activity mode="hidden">` (state preserved, effects paused),
 * lazily mounts them on first activation, or unmounts them, per its resolved
 * `mount`. Under a fading container the lifecycle edges ride the cross-fade:
 * a panel mounting after the container settles enters from transparent, and an
 * `active`-mounted outgoing panel holds its unmount until the fade-out
 * completes.
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

	const current = value === undefined || context?.value === undefined || context.value === value

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

	// Lifecycle gate — which panels exist in the tree. `always` keeps all; `lazy`
	// waits for first activation; `active` keeps only the current panel, plus
	// the outgoing one while its fade-out plays.
	const present =
		mount === 'always' || current || (mount === 'lazy' && hasBeenCurrent.current) || exiting

	if (!present) return null

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

	return (
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
			// Entrance completions arrive while still current and pass through;
			// only a landed fade-out releases the exit hold.
			onAnimationComplete={() => {
				if (!current) releaseExit()
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
}
