'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useOpenChange } from '../../hooks/use-open-change'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { MountHold, useMountHold } from '../../primitives/mount'
import { heldMotionProps } from '../../primitives/mount/mount-held-motion'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/collapse'
import { useCollapseContext } from './context'

/** Props for {@link CollapsePanel}. */
export type CollapsePanelProps = {
	children: ReactNode
	className?: string
}

/**
 * Collapsible content panel for the {@link Collapse} compound API. Reads
 * `open`, the resolved `animate` mode, and the `mount` policy from context. It
 * animates height (plus opacity for `'fade'`) via `AnimatePresence`; the
 * `false` mode renders synchronously without motion. Honors reduced-motion.
 *
 * @remarks
 * Under the default `mount="active"` the panel unmounts while closed, so
 * reopening resets its state. `always` and `lazy` instead hold it in
 * `<Activity mode="hidden">` — state preserved, effects torn down. A held panel
 * stays mounted, so it animates between its open and closed states in place
 * rather than entering and exiting. It drops into the hold only once the
 * closing height transition lands: `display: none` cannot animate, so the hold
 * has to wait for it.
 */
export function CollapsePanel({ children, className }: CollapsePanelProps) {
	const { open, animate, mount, onOpenComplete, panelProps } = useCollapseContext()

	const hold = useMountHold(open, mount, { defer: animate !== false })

	// The preset itself rather than its key, so one `undefined` covers `animate={false}`
	// and narrows every read below it.
	const preset = animate === false ? undefined : k.motion[animate]

	// The arrival target the motion library hands back on the way in, compared by
	// identity. Presets are module constants, so the identity holds.
	const { report, onAnimationComplete } = useOpenComplete(open, preset?.animate, onOpenComplete)

	// No transition to land, so the open itself is the arrival. Routed through the
	// transition watcher rather than an `open` effect, so a panel that mounts already
	// open announces nothing — the contract the animated branches keep for free,
	// because the motion library plays no entrance on mount.
	useOpenChange(open, (next) => {
		if (!preset && next) report()
	})

	// The panel takes only the id that the trigger's `aria-controls` points to.
	// The disclosure pattern gives the panel no role, and a named section is a
	// region landmark, so each panel would add one landmark to the page.
	const { id } = panelProps

	// The panel's identity — element, a11y wiring, classes — is one shape across
	// every branch below; only how it animates (or whether it does) differs.
	const panel = (motionProps: object) => (
		<motion.div
			id={id}
			data-slot="collapse-panel"
			{...motionProps}
			className={cn(k.panel, className)}
		>
			{children}
		</motion.div>
	)

	if (!preset) {
		if (!hold.present) return null

		return (
			<MountHold hold={hold} name="collapse-panel">
				<div id={id} data-slot="collapse-panel" className={cn(k.panel, className)}>
					{children}
				</div>
			</MountHold>
		)
	}

	// `active` unmounts the closed panel, so its exit rides `AnimatePresence` and
	// the recipe's enter/exit pair applies as written.
	if (!hold.held) {
		return (
			<ReducedMotion>
				<AnimatePresence initial={false}>
					{open && panel({ ...preset, onAnimationComplete })}
				</AnimatePresence>
			</ReducedMotion>
		)
	}

	if (!hold.present) return null

	return (
		<ReducedMotion>
			<MountHold hold={hold} name="collapse-panel">
				{panel(heldMotionProps(preset, open, hold, onAnimationComplete))}
			</MountHold>
		</ReducedMotion>
	)
}
