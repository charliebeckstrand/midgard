'use client'

import type { HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { dataAttr } from '../../core/data-attr'
import { type A11yPanelRole, useA11yPanel } from '../../hooks/a11y/use-a11y-panel'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { useReaderSurface } from '../../providers/glass/context'
import { k } from '../../recipes/kata/panel'
import { Overlay } from '../overlay'
import * as m from '../reduced-motion/reduced-motion-elements'
import { usePanelState } from './context'
import { PanelProviders } from './panel-providers'
import type { PanelOverlayProps } from './types'

/** A motion preset of a panel: the props that its slide gives to the animated element. */
type PanelMotion = Pick<HTMLMotionProps<'div'>, 'animate'>

/**
 * Props for {@link PanelSurface}: the `Overlay` knobs of the panel, the wiring
 * of the family, and the props of the animated panel element.
 *
 * @internal
 */
export type PanelSurfaceProps<P extends PanelMotion> = PanelOverlayProps &
	Omit<HTMLMotionProps<'div'>, 'children'> & {
		/** @defaultValue 'dialog' */
		role?: A11yPanelRole
		/**
		 * Gives the motion preset of the panel. `reduced` is the reduced-motion
		 * setting of the reader.
		 */
		motion: (reduced: boolean) => P
		onOpenComplete?: () => void
		/** The `aria-label` fallback of the panel. A registered title replaces it. */
		'aria-label'?: string
		/**
		 * The classes of a box between the `Overlay` and the panel. With no value,
		 * the panel is a direct child of the `Overlay`.
		 */
		boxClassName?: string
		children: ReactNode
	}

/**
 * The surface that Dialog, Sheet, and Drawer share: the `Overlay`, the animated
 * panel, and the contexts of its slots. It reads the open state of the root.
 * A panel gives its own props to the surface as they are, so one rule holds
 * across the family:
 *
 * - `modal` is `true` unless the consumer sets `false`.
 * - The slide moves `transform`, which `MotionConfig` does not hold still, so
 *   the panel reads the reduced-motion setting itself (WCAG 2.3.3).
 * - A registered title supplies `aria-labelledby` and replaces the `aria-label`
 *   fallback.
 * - A click in the panel stops at the panel, so a clickable ancestor of the
 *   root does not see it. React carries a click in the portal up the component
 *   tree. A consumer `preventDefault()` does not let the click past the panel
 *   (CONVENTIONS.md §3.9).
 * - The surface reads the Surfaces setting of the reader. The backdrop follows
 *   it, and is the backdrop of the panel group for each family.
 * - A glass panel opens the glass cascade to its contents:
 *   `hannou.tint.glass` keys on `group-data-glass/glass`, which needs the named
 *   group and the attribute on one element. Rows inside then take their hover
 *   wash at double strength, because a 5% wash under a translucent panel reads
 *   as no hover. See `tint.glass` in `recipes/kiso/hannou/tint.ts`.
 * - A non-modal overlay turns off pointer events on its full-viewport root, so
 *   the page stays live. The panel turns them on again for itself.
 *
 * The wiring comes after the other props of the panel element, so the `id`, the
 * ARIA props, the motion, and the click handler are always those of the
 * family. The panel stamps `data-open` while it is open.
 *
 * @internal
 */
export function PanelSurface<P extends PanelMotion>({
	role = 'dialog',
	motion,
	onOpenComplete,
	'aria-label': ariaLabel,
	onClick,
	modal = true,
	dismissOnBackdrop,
	backdrop,
	container,
	initialFocus,
	returnFocusTo,
	boxClassName,
	children,
	...props
}: PanelSurfaceProps<P>) {
	// The root holds the state. One setter drives the Overlay and the close parts.
	const { open, setOpen, panelId } = usePanelState()

	// The Surfaces setting of the reader sets the glass cascade and the backdrop.
	// The backdrop of each family is the one of the panel group.
	const surface = useReaderSurface()

	const preset = motion(usePrefersReducedMotion())

	const { onAnimationComplete } = useOpenComplete(open, preset.animate, onOpenComplete)

	const { ariaProps, a11y } = useA11yPanel(role, modal)

	const panel = (
		<m.div
			{...props}
			{...preset}
			onAnimationComplete={onAnimationComplete}
			{...ariaProps}
			aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
			id={panelId}
			onClick={composeEventHandlers(onClick, (event) => event.stopPropagation(), {
				checkForDefaultPrevented: false,
			})}
			data-glass={dataAttr(surface === 'glass')}
			data-open={dataAttr(open)}
		>
			<PanelProviders onOpenChange={setOpen} a11y={a11y}>
				{children}
			</PanelProviders>
		</m.div>
	)

	return (
		<Overlay
			open={open}
			onOpenChange={setOpen}
			modal={modal}
			dismissOnBackdrop={dismissOnBackdrop}
			backdrop={backdrop}
			container={container}
			initialFocus={initialFocus}
			returnFocusTo={returnFocusTo}
			backdropClassName={k({ surface }).backdrop}
		>
			{boxClassName === undefined ? panel : <div className={boxClassName}>{panel}</div>}
		</Overlay>
	)
}
