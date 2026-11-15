'use client'

import type { HTMLMotionProps } from 'motion/react'
import type { MouseEventHandler } from 'react'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { dataAttr } from '../../core/data-attr'
import { type A11yPanelRole, useA11yPanel } from '../../hooks/a11y/use-a11y-panel'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { usePanelState } from './context'
import type { PanelOverlayProps } from './types'

/**
 * The overlay knobs of a panel. The record type makes the list match
 * {@link PanelOverlayProps}: a knob that the type names and the record does
 * not have is a type error, and so is a knob that the record adds.
 */
const OVERLAY_KEYS = {
	dismissOnBackdrop: true,
	modal: true,
	backdrop: true,
	container: true,
	initialFocus: true,
	returnFocusTo: true,
} as const satisfies Record<keyof PanelOverlayProps, true>

/** The overlay knobs of a panel, with `modal` resolved. @internal */
export type PanelOverlay = PanelOverlayProps & { modal: boolean }

/**
 * Splits the props of a panel into its overlay knobs and the rest, which go to
 * the panel element. `modal` is `true` unless the consumer sets `false`.
 *
 * @internal
 */
export function splitOverlayProps<T extends PanelOverlayProps>(
	props: T,
): [overlay: PanelOverlay, rest: Omit<T, keyof PanelOverlayProps>] {
	const overlay: Record<string, unknown> = {}

	const rest: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(props)) {
		;(Object.hasOwn(OVERLAY_KEYS, key) ? overlay : rest)[key] = value
	}

	overlay.modal = props.modal ?? true

	return [overlay as PanelOverlay, rest as Omit<T, keyof PanelOverlayProps>]
}

/** The panel element options of {@link usePanelSurface}. @internal */
export type PanelSurfaceOptions<P extends Pick<HTMLMotionProps<'div'>, 'animate'>> = {
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
 * The motion of the panel element: the preset for the reduced-motion setting
 * of the reader, and the end of the open animation. The slide moves
 * `transform`, which `MotionConfig` does not hold still, so the panel reads the
 * setting itself (WCAG 2.3.3).
 */
function usePanelMotion<P extends Pick<HTMLMotionProps<'div'>, 'animate'>>(
	open: boolean,
	motion: (reduced: boolean) => P,
	onOpenComplete: (() => void) | undefined,
) {
	const preset = motion(usePrefersReducedMotion())

	const { onAnimationComplete } = useOpenComplete(open, preset.animate, onOpenComplete)

	return { ...preset, onAnimationComplete }
}

/**
 * The wiring that Dialog, Sheet, and Drawer share around their animated panel.
 * It reads the open state of the root. It takes the overlay knobs from
 * {@link splitOverlayProps} and the options of the panel element, and gives the
 * props of the `Overlay` and the props of the panel element. Thus one rule
 * holds across the family:
 *
 * - One setter, the setter of the root, drives the Overlay and the close parts.
 * - A registered title supplies `aria-labelledby` and replaces the `aria-label`
 *   fallback.
 * - A click in the panel stops at the panel, so a clickable ancestor of the
 *   root does not see it. React carries a click in the portal up the component
 *   tree. A consumer `preventDefault()` does not let the click past the panel
 *   (CONVENTIONS.md §3.9).
 * - A glass panel opens the glass cascade to its contents:
 *   `hannou.tint.glass` keys on `group-data-glass/glass`, which needs the named
 *   group and the attribute on one element. The panel kata gives the group, and
 *   the hook gives the attribute. Rows inside then take their hover wash at
 *   double strength, because a 5% wash under a translucent panel reads as no
 *   hover. See `tint.glass` in `recipes/kiso/hannou/tint.ts`.
 *
 * Spread `panelProps` after the props of the consumer.
 *
 * @internal
 */
export function usePanelSurface<P extends Pick<HTMLMotionProps<'div'>, 'animate'>>(
	overlay: PanelOverlay,
	{
		role = 'dialog',
		glass,
		motion,
		onOpenComplete,
		'aria-label': ariaLabel,
		onClick,
	}: PanelSurfaceOptions<P>,
) {
	const { open, setOpen, panelId } = usePanelState()

	const motionProps = usePanelMotion(open, motion, onOpenComplete)

	const { ariaProps, a11y } = useA11yPanel(role, overlay.modal)

	return {
		open,
		setOpen,
		panelId,
		a11y,
		overlayProps: { ...overlay, open, onOpenChange: setOpen },
		panelProps: {
			...motionProps,
			...ariaProps,
			'aria-label': ariaProps['aria-labelledby'] ? undefined : ariaLabel,
			id: panelId,
			onClick: composeEventHandlers(onClick, (event) => event.stopPropagation(), {
				checkForDefaultPrevented: false,
			}),
			'data-glass': dataAttr(glass),
			'data-open': dataAttr(open),
		},
	}
}
