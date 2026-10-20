'use client'

import type { HTMLMotionProps } from 'motion/react'
import type { MouseEventHandler } from 'react'
import { cn, composeEventHandlers, dataAttr } from '../../core'
import { type A11yPanelRole, useA11yPanel } from '../../hooks/a11y/use-a11y-panel'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { usePanelState } from './panel-root'
import type { PanelOverlayProps } from './types'

/** Options for {@link usePanelSurface}. @internal */
export type PanelSurfaceOptions<P extends Pick<HTMLMotionProps<'div'>, 'animate'>> =
	PanelOverlayProps & {
		/** @defaultValue 'dialog' */
		role?: A11yPanelRole
		/** Whether the resolved surface of the panel is glass. */
		glass: boolean
		/**
		 * Gives the motion preset of the panel. `reduced` is the reduced-motion
		 * setting of the reader.
		 */
		motion: (reduced: boolean) => P
		onOpenComplete?: () => void
		/** The `aria-label` fallback of the panel. A registered title replaces it. */
		'aria-label'?: string
		/** The `onClick` of the consumer. */
		onClick?: MouseEventHandler<HTMLDivElement>
	}

/**
 * The wiring that Dialog, Sheet, and Drawer share around their animated panel.
 * It reads the open state of the root, and it gives the props of the `Overlay`,
 * the props of the panel element, and the classes of the panel that each
 * surface needs. Thus one rule holds across the family:
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
 * - A glass panel opens the glass cascade to its contents:
 *   `hannou.tint.glass` keys on `group-data-glass/glass`, which needs the named
 *   group and the attribute on one element. Rows inside then take their hover
 *   wash at double strength, because a 5% wash under a translucent panel reads
 *   as no hover. See `recipes/kiso/hannou/glass-item.ts`.
 * - A non-modal overlay turns off pointer events on its full-viewport root, so
 *   the page stays live. The panel turns them on again for itself.
 *
 * Spread `panelProps` after the props of the consumer.
 *
 * @internal
 */
export function usePanelSurface<P extends Pick<HTMLMotionProps<'div'>, 'animate'>>({
	role = 'dialog',
	glass,
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
}: PanelSurfaceOptions<P>) {
	// The root holds the state. One setter drives the Overlay and the close parts.
	const { open, setOpen, panelId } = usePanelState()

	const preset = motion(usePrefersReducedMotion())

	const { onAnimationComplete } = useOpenComplete(open, preset.animate, onOpenComplete)

	const { ariaProps, a11y } = useA11yPanel(role, modal)

	return {
		open,
		setOpen,
		panelId,
		a11y,
		overlayProps: {
			open,
			onOpenChange: setOpen,
			modal,
			dismissOnBackdrop,
			backdrop,
			container,
			initialFocus,
			returnFocusTo,
		},
		panelProps: {
			...preset,
			onAnimationComplete,
			...ariaProps,
			'aria-label': ariaProps['aria-labelledby'] ? undefined : ariaLabel,
			id: panelId,
			onClick: composeEventHandlers(onClick, (event) => event.stopPropagation(), {
				checkForDefaultPrevented: false,
			}),
			'data-glass': dataAttr(glass),
			'data-open': dataAttr(open),
		},
		panelClassName: cn(glass && 'group/glass', !modal && 'pointer-events-auto'),
	}
}
