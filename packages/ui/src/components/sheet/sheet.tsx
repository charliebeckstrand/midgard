'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { useA11yPanel } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useIsRtl } from '../../hooks/use-is-rtl'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { panelAxis, usePanelResize } from '../../hooks/use-panel-resize'
import { Overlay } from '../../primitives/overlay'
import { type PanelOverlayProps, PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { k, type SheetPanelVariants } from '../../recipes/kata/sheet'
import { sheetCeiling, sheetFloor } from './sheet-floor'
import { SheetHandle } from './sheet-handle'

/** Props for {@link Sheet}: open-state control, portal `container`, focus, modality, and panel `side`/`width` variants. */
export type SheetProps = Omit<SheetPanelVariants, 'surface' | 'width' | 'side'> &
	PanelOverlayProps & {
		/**
		 * The edge the panel is docked to and slides in from.
		 *
		 * `start` and `end` follow the reading direction. In a right-to-left page,
		 * `start` is the right edge and `end` is the left edge. Use them for a panel
		 * that belongs to the reading order, such as navigation. `left`, `right`,
		 * `top`, and `bottom` are physical edges and do not change.
		 *
		 * The direction comes from `container`, or from the root element when the
		 * sheet portals to the body.
		 * @defaultValue 'right'
		 */
		side?: SheetPanelVariants['side'] | 'start' | 'end'
		/**
		 * How wide the panel opens.
		 *
		 * The named steps are max-widths: the panel fills the screen on a phone and
		 * caps at the named width from `sm` up.
		 *
		 * `fit` takes the width of what it holds instead, capped at the screen less
		 * the inset the panel floats on. Pass it for a panel built around its content
		 * rather than a step chosen for it. A table whose columns decide how much room
		 * they need is one. What is inside has to be able to state a width of its own.
		 * A child that fills its container instead (`<Grid>` by default) leaves the
		 * two measuring each other. Pair this with that child's own fit — see
		 * {@link GridDataProps.width}.
		 *
		 * It settles rather than travels, unlike the drawer's `fit` height. A panel
		 * docked across the screen is navigated within and swaps what it holds. This
		 * one is built around content that has a width and keeps it. A width that
		 * does move — a grid re-measuring as wider rows page in — arrives in one step.
		 *
		 * Only on the sides a width is docked across (`right`, `left`). A `top` or
		 * `bottom` sheet spans the screen, so it stays full-width.
		 * @defaultValue 'md'
		 */
		width?: SheetPanelVariants['width']
		/** Controlled open state. Pair with `onOpenChange`. */
		open?: boolean
		/** Initial open state when uncontrolled. */
		defaultOpen?: boolean
		/**
		 * Give the panel a drag handle. The reader can then resize it past the `width`
		 * scale, and throw it away toward its own edge.
		 *
		 * The drag sets the width directly rather than stepping between the `width`
		 * variants. The reader is deciding how much of the screen the panel gets, and
		 * the answer is wherever they let go. `width` still states where it
		 * opens, and a closed panel forgets what it was dragged to.
		 *
		 * @defaultValue false
		 */
		handle?: boolean
		/** Fires when the open state changes (backdrop dismiss, Escape, close button). */
		onOpenChange?: (open: boolean) => void
		/**
		 * Fires once the panel has finished arriving — it is in from its edge, at rest, and
		 * covering whatever it covers.
		 *
		 * The counterpart to `onOpenChange`, which reports the state being *asked for*: this
		 * one reports it having *landed*. Use it for anything that has to hold until
		 * the panel is actually up. That covers measuring it, or starting work that
		 * must not compete with the slide. It beats guessing at the slide with a
		 * matching delay.
		 *
		 * Deliberately named for the open, not for the animation. It reports from whichever
		 * `side` preset ran. A slide the user's reduced-motion preference collapses still
		 * resolves, and so still reports.
		 *
		 * Once per arrival, and never for a close.
		 *
		 * @see {@link DrawerProps.onOpenComplete} for the same contract on the sibling panel.
		 */
		onOpenComplete?: () => void
		/** Opt the panel and backdrop into the translucent glass surface, resolved against the ambient Glass provider. */
		glass?: boolean
		/**
		 * Drain the color from whatever shows through the backdrop. Both scrims are
		 * translucent, so the page behind stays legible while the sheet is up. This
		 * renders it in gray, marking it as the inert surface rather than merely the
		 * dimmed one. No effect where no backdrop renders (see `backdrop`).
		 *
		 * @defaultValue false
		 */
		desaturate?: boolean
		className?: string
		children: ReactNode
		/**
		 * Element to receive initial focus when the sheet opens.
		 * @defaultValue the first tabbable child
		 */
		initialFocus?: RefObject<HTMLElement | null>
		/**
		 * Accessible name for sheets without a visible `SheetTitle`. Ignored once a
		 * `SheetTitle` registers.
		 */
		'aria-label'?: string
	}

/**
 * Edge-anchored overlay panel sliding in from `side` (default `'right'`),
 * controlled via `open`/`onOpenChange` or uncontrolled via `defaultOpen`.
 * Portals to `document.body` by default, or scopes to a `container` with
 * absolute positioning and no scroll lock. Resolves the surface variant against
 * the enclosing Glass provider. Compose `<SheetTrigger>`, `<SheetClose>`, and
 * the slot family (`<SheetHeader>`, `<SheetTitle>`, `<SheetDescription>`,
 * `<SheetBody>`, `<SheetFooter>`) within.
 *
 * @remarks
 * A registered `<SheetTitle>` supplies `aria-labelledby` and takes precedence
 * over the `aria-label` fallback. Modal sheets (the default) trap focus, lock
 * body scroll, and render a blocking backdrop. `modal={false}` keeps the page
 * interactive and disables the full-viewport wrapper's pointer events, so only
 * the panel captures them. The panel stops click propagation to keep the
 * portal's synthetic clicks off the consumer ancestors it renders under. The
 * backdrop is a sibling, so a panel click never reaches its dismiss handler
 * anyway. The panel shares a single open-state setter with its dismiss
 * affordances via `PanelProviders`.
 */
export function Sheet({
	open,
	defaultOpen,
	onOpenChange,
	onOpenComplete,
	side = 'right',
	width,
	handle,
	glass,
	desaturate,
	className,
	children,
	container,
	dismissOnBackdrop,
	initialFocus,
	modal,
	backdrop,
	'aria-label': ariaLabel,
}: SheetProps) {
	// Controlled when `open` is passed; otherwise uncontrolled from `defaultOpen`.
	const [resolvedOpen = false, setOpen] = useControllable<boolean>({
		value: open,
		defaultValue: defaultOpen ?? false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const resolvedSurface = useResolvedSurface(glass)

	const rtl = useIsRtl(container)

	// The physical edge. The recipe, the slide, and the drag all key on it.
	const edge = physicalSide(side, rtl)

	const preset = k.motion[edge]

	const { onAnimationComplete } = useOpenComplete(resolvedOpen, preset.animate, onOpenComplete)

	const { ariaProps, a11y } = useA11yPanel('dialog', modal ?? true)

	// The dimension this side is docked across, which is the one the gesture moves
	// and the one the cap is measured on.
	const axis = panelAxis(edge)

	// A pixel width means nothing off the screen it was set on, so it stays in
	// the panel's own state and reaches nowhere: nothing outside the sheet needs
	// to hold one.
	const resize = usePanelResize({
		side: edge,
		open: resolvedOpen,
		onDismiss: () => setOpen(false),
		floorOf: (panel, size) => sheetFloor(panel, size, axis),
		ceilingOf: (panel, viewport) => sheetCeiling(panel, viewport, axis),
	})

	return (
		<Overlay
			open={resolvedOpen}
			onOpenChange={setOpen}
			container={container}
			initialFocus={initialFocus}
			dismissOnBackdrop={dismissOnBackdrop}
			modal={modal}
			backdrop={backdrop}
			backdropClassName={k.backdrop({ surface: resolvedSurface, desaturate })}
		>
			<motion.div
				{...preset}
				onAnimationComplete={onAnimationComplete}
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				data-slot="sheet"
				ref={handle ? resize.ref : undefined}
				onClick={(event) => event.stopPropagation()}
				// A dragged size beats the variant's, and it is inline because it is a
				// measurement rather than a step on the scale. On the axis the panel is
				// docked across, which for a sheet along the top or the bottom is its
				// height — the gesture writes that axis, so a `width` here would state a
				// number the drag never took.
				//
				// The cap goes with it, for the whole gesture and not only once a size
				// lands: the `width` variant is a max-width, so leaving it in place would
				// clamp the panel at its opening width while the drag went on reporting
				// numbers past it. Cleared before the first move, because `resizing` is
				// set on the press and the pointer moves after the render.
				style={
					handle && (resize.resizing || resize.size !== null)
						? { [axis]: resize.size ?? undefined, maxWidth: 'none' }
						: undefined
				}
				className={cn(
					k.panel({ side: edge, width, surface: resolvedSurface }),
					// Non-modal overlays disable pointer events on the full-viewport
					// wrapper so the page stays interactive; the panel re-enables its own.
					modal === false && 'pointer-events-auto',
					className,
				)}
			>
				<PanelProviders onOpenChange={setOpen} a11y={a11y}>
					{handle ? (
						<SheetHandle handleProps={resize.handleProps} covers={resize.covers} side={edge} />
					) : null}

					{children}
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}

/** The physical edge of a {@link SheetProps.side}: `start` and `end` resolve against `rtl`. */
function physicalSide(
	side: NonNullable<SheetProps['side']>,
	rtl: boolean,
): NonNullable<SheetPanelVariants['side']> {
	if (side === 'start') return rtl ? 'right' : 'left'

	if (side === 'end') return rtl ? 'left' : 'right'

	return side
}
