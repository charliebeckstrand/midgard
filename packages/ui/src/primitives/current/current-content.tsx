'use client'

import { type HTMLMotionProps, motion } from 'motion/react'
import { Activity, type ComponentPropsWithoutRef, type Ref, useRef } from 'react'
import { dataAttr } from '../../core'
import { k } from '../../recipes/kata/current'
import {
	CurrentPanelActiveContext,
	useCurrent,
	useCurrentFade,
	useCurrentMount,
	useCurrentPanelActive,
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
 * Per-panel wrapper that renders when its `value` matches the surrounding
 * `CurrentContext`. The surrounding `CurrentContents` sets the mount policy: a
 * fading container animates opacity in place; a non-fading one holds inactive
 * panels via `<Activity mode="hidden">` (state preserved, effects paused),
 * lazily mounts them on first activation, or unmounts them, per its resolved
 * `mount`.
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

	// Lifecycle gate — which panels exist in the tree. `always` keeps all; `lazy`
	// waits for first activation; `active` keeps only the current panel.
	const present = mount === 'always' || current || (mount === 'lazy' && hasBeenCurrent.current)

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
			initial={false}
			transition={k.transition}
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
