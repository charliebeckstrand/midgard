'use client'

import type { ComponentProps, ReactNode } from 'react'
import { dataAttr } from '../../core'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { useReportedChange } from '../../hooks/use-reported-change'
import { MountHold, useMountHold } from '../../primitives/mount'
import { MountPresence } from '../../primitives/mount/mount-presence'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/collapse'
import { useCollapseContext } from './context'

/**
 * Props for {@link CollapsePanel}. The outer `<div>` of the panel takes the
 * rest, except the keys that Motion gives a meaning of its own.
 */
export type CollapsePanelProps = Omit<
	ComponentProps<'div'>,
	'children' | 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
	children: ReactNode
}

/**
 * Collapsible content panel for the {@link Collapse} compound API. Reads
 * `open`, the resolved `animate` mode, and the `mount` policy from context. It
 * animates height via `AnimatePresence`. `'fade'` adds opacity, and `'slide'`
 * moves the content down with the panel edge. The `false` mode renders
 * synchronously without motion. Honors reduced-motion. The panel clips its
 * content only while its height moves, so at rest an outline, a ring, or a
 * shadow at the edge of the content shows in full. The panel stamps `data-open`
 * while it is open.
 *
 * @remarks
 * Under the default `mount="active"` the panel unmounts while closed, so
 * reopening resets its state. `always` and `lazy` instead hold it in
 * `<Activity mode="hidden">`: state preserved, effects torn down. A held panel
 * stays mounted, so it animates between its open and closed states in place
 * rather than entering and exiting. It drops into the hold only once the
 * closing height transition lands: `display: none` cannot animate, so the hold
 * has to wait for it.
 */
export function CollapsePanel({ children, className, ...props }: CollapsePanelProps) {
	const { open, animate, mount, onOpenComplete, panelProps } = useCollapseContext()

	const hold = useMountHold(open, mount, { defer: animate !== false })

	// The preset itself rather than its key, so one `undefined` covers `animate={false}`
	// and narrows every read below it.
	const preset = animate === false ? undefined : k.motion[animate]

	// The arrival target the motion library hands back on the way in, compared by
	// identity. Presets are module constants, so the identity holds.
	const { report, onAnimationComplete } = useOpenComplete(open, preset?.animate, onOpenComplete)

	// No transition to land, so the open itself is the arrival. Routed through
	// the transition watcher rather than an `open` effect, so a panel that mounts
	// already open announces nothing. The animated branches keep that contract
	// for free, because the motion library plays no entrance on mount.
	useReportedChange(open, (next) => {
		if (!preset && next) report()
	})

	// The panel takes only the id that the trigger's `aria-controls` points to.
	// The disclosure pattern gives the panel no role, and a named section is a
	// region landmark, so each panel would add one landmark to the page.
	const { id } = panelProps

	// One shape for the unheld and the held panel; only how it animates differs.
	// The consumer props spread first, so the id wiring and the motion win.
	const panel = (motionProps: object, contentProps?: object) => (
		<m.div
			data-slot="collapse-panel"
			{...props}
			id={id}
			{...motionProps}
			data-open={dataAttr(open)}
			className={className}
		>
			{contentProps ? <m.div {...contentProps}>{children}</m.div> : children}
		</m.div>
	)

	// `slide` moves the content inside the clip of the panel. The panel element
	// alone lands the transition, so the content takes no completion handler.
	const content = preset && 'content' in preset ? preset.content : undefined

	if (!preset) {
		if (!hold.present) return null

		return (
			<MountHold hold={hold} name="collapse-panel">
				<div
					data-slot="collapse-panel"
					{...props}
					id={id}
					data-open={dataAttr(open)}
					className={className}
				>
					{children}
				</div>
			</MountHold>
		)
	}

	return (
		<MountPresence
			open={open}
			hold={hold}
			preset={preset}
			name="collapse-panel"
			onAnimationComplete={onAnimationComplete}
		>
			{(motionProps, targets) => panel(motionProps, content && targets(content))}
		</MountPresence>
	)
}
