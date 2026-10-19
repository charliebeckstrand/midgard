'use client'

import { useComposedRefs } from 'motion/react'
import type { ComponentProps, ReactNode, RefObject } from 'react'
import { cn, composeEventHandlers, dataAttr } from '../../core'
import { useA11yPanel } from '../../hooks'
import { useIsRtl } from '../../hooks/use-is-rtl'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { panelAxis, usePanelResize } from '../../hooks/use-panel-resize'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { Overlay } from '../../primitives/overlay'
import {
	type PanelOverlayProps,
	PanelProviders,
	PanelRoot,
	type PanelRootProps,
	usePanelState,
} from '../../primitives/panel'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { useResolvedSurface } from '../../providers/glass/context'
import { k, type SheetPanelVariants } from '../../recipes/kata/sheet'
import { adaptive, type Responsive, resolveVariant } from '../../types'
import { sheetCeiling, sheetFloor } from './sheet-floor'
import { SheetHandle } from './sheet-handle'
import { SheetClose, SheetDefaultFooter } from './slots'

/** How a {@link SheetPanel} meets the screen: `flush` against its edges, or `floating` in from them. */
export type SheetLayout = 'flush' | 'floating'

/** The default `layout` of a {@link SheetPanel}: flush on a compact viewport, floating from medium. */
export const SHEET_LAYOUT = adaptive({
	compact: 'flush',
	medium: 'floating',
}) satisfies Responsive<SheetLayout>

/** Props for {@link Sheet}: the open state, controlled or uncontrolled. */
export type SheetProps = PanelRootProps

/**
 * Props for {@link SheetPanel}: portal `container`, focus, modality, and panel `side`/`width` variants.
 * The animated panel `<div>` takes the rest, except the keys that Motion gives
 * a meaning of its own. The panel sets its `id` and its ARIA wiring after the rest.
 */
export type SheetPanelProps = Omit<SheetPanelVariants, 'surface' | 'width' | 'side'> &
	PanelOverlayProps &
	Omit<
		ComponentProps<'div'>,
		'children' | 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
	> & {
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
		 * How the panel meets the screen. A `flush` panel meets the screen edges
		 * with square corners. A `floating` panel on the left or the right stands
		 * 1rem in from the edges, and a `floating` panel rounds its corners. A
		 * per-breakpoint map sets the layout from each breakpoint, mobile-first. A
		 * single value sets it at each width.
		 * @defaultValue {@link SHEET_LAYOUT}
		 */
		layout?: Responsive<SheetLayout>
		/**
		 * How wide the panel opens.
		 *
		 * The named steps are max-widths: the panel fills the screen on a phone and
		 * caps at the named width from `sm` up.
		 *
		 * `fit` takes the width of what it holds instead, capped at the screen less
		 * the inset the panel floats on. A `flush` panel (`layout`) fills the screen
		 * at each width. Pass it for a panel built around its content
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
		/**
		 * Gives the panel a drag handle. The reader can then resize it past the `width`
		 * scale.
		 *
		 * The drag sets the width directly rather than stepping between the `width`
		 * variants. The reader is deciding how much of the screen the panel gets, and
		 * the answer is wherever they let go. `width` still states where it
		 * opens, and a closed panel forgets what it was dragged to. The handle does
		 * not close the panel.
		 *
		 * @defaultValue false
		 */
		handle?: boolean
		/**
		 * Fires when the panel has finished arriving: it is in from its edge, at rest, and
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
		 * @see {@link DrawerPanelProps.onOpenComplete} for the same contract on the sibling panel.
		 */
		onOpenComplete?: () => void
		/**
		 * Opts the panel and backdrop into the translucent glass surface. Omit it to
		 * follow the ambient `<GlassProvider>`. Set `false` to keep the flat surface
		 * inside one.
		 *
		 * @defaultValue `false`, or the flag of the enclosing `<GlassProvider>`.
		 */
		glass?: boolean
		children: ReactNode
		/**
		 * The content of the footer row that the sheet shows when no `SheetFooter`
		 * is in its children. A `SheetFooter` child replaces it. Set `null` to show
		 * no footer row.
		 *
		 * @defaultValue `<SheetClose />`, the standard Close button.
		 */
		footer?: ReactNode
		/**
		 * Element to receive initial focus when the sheet opens.
		 * @defaultValue the first tabbable child.
		 */
		initialFocus?: RefObject<HTMLElement | null>
		/**
		 * Element to receive the focus when the sheet closes.
		 * @defaultValue the element that had the focus as the sheet opened.
		 */
		returnFocusTo?: RefObject<HTMLElement | null>
		/**
		 * Accessible name for sheets without a visible `SheetTitle`. Ignored once a
		 * `SheetTitle` registers.
		 */
		'aria-label'?: string
	}

/**
 * Composition root for a sheet. It holds the open state, controlled
 * (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`), and gives it to
 * `<SheetTrigger>` and `<SheetPanel>`. It renders no element. A trigger in the
 * root opens an uncontrolled sheet. Escape, the backdrop, and `<SheetClose>`
 * close it, and focus then goes back to the trigger.
 *
 * @example
 * ```tsx
 * <Sheet>
 *   <SheetTrigger>
 *     <Button>Open</Button>
 *   </SheetTrigger>
 *   <SheetPanel>
 *     <SheetTitle>Title</SheetTitle>
 *   </SheetPanel>
 * </Sheet>
 * ```
 *
 * @see {@link SheetPanel} for the surface and its props.
 */
export function Sheet(props: SheetProps) {
	return <PanelRoot {...props} />
}

/**
 * The edge-anchored surface of a {@link Sheet}, sliding in from `side` (default
 * `'right'`). It reads the open state of the enclosing `<Sheet>`. Portals to
 * `document.body` by default, or scopes to a `container` with absolute
 * positioning and no scroll lock. Resolves the surface variant against the
 * enclosing Glass provider. Compose `<SheetClose>` and the slot family
 * (`<SheetHeader>`, `<SheetTitle>`, `<SheetDescription>`, `<SheetBody>`,
 * `<SheetFooter>`) within. With no `<SheetFooter>` in its children, the sheet
 * shows a footer with the standard Close button.
 *
 * @remarks
 * A registered `<SheetTitle>` supplies `aria-labelledby` and takes precedence
 * over the `aria-label` fallback. Modal sheets (the default) trap focus, lock
 * body scroll, and render a blocking backdrop. `modal={false}` keeps the page
 * interactive and disables the full-viewport wrapper's pointer events, so only
 * the panel captures them. The panel stops click propagation to keep the
 * portal's synthetic clicks off the consumer ancestors it renders under. The
 * backdrop is a sibling, so a panel click never reaches its dismiss handler
 * anyway. The panel, its close parts, and its dismissal share the open-state
 * setter of the root. The panel stamps `data-open` while it is open.
 */
export function SheetPanel({
	onOpenComplete,
	side = 'right',
	layout = SHEET_LAYOUT,
	width,
	handle,
	glass,
	className,
	children,
	footer,
	container,
	dismissOnBackdrop,
	initialFocus,
	returnFocusTo,
	modal,
	backdrop,
	'aria-label': ariaLabel,
	ref,
	style,
	onClick,
	...props
}: SheetPanelProps) {
	// The root holds the state. One setter drives the Overlay and the close parts.
	const { open, setOpen, panelId } = usePanelState()

	const surface = useResolvedSurface(glass)

	const rtl = useIsRtl(container)

	// The physical edge. The recipe, the slide, and the drag all key on it.
	const edge = physicalSide(side, rtl)

	// The slide moves `transform`, which `MotionConfig` does not hold still, so the
	// panel reads the setting itself (WCAG 2.3.3).
	const preset = (usePrefersReducedMotion() ? k.still : k.motion)[edge]

	const { onAnimationComplete } = useOpenComplete(open, preset.animate, onOpenComplete)

	const { ariaProps, a11y } = useA11yPanel('dialog', modal ?? true)

	// The dimension this side is docked across, which is the one the gesture moves
	// and the one the cap is measured on.
	const axis = panelAxis(edge)

	// A pixel width means nothing off the screen it was set on, so it stays in
	// the panel's own state and reaches nowhere: nothing outside the sheet needs
	// to hold one.
	const resize = usePanelResize({
		side: edge,
		open,
		floorOf: (panel, size) => sheetFloor(panel, size, axis),
		ceilingOf: (panel, viewport) => sheetCeiling(panel, viewport, axis),
	})

	// The gesture reads the node only while the panel has a handle. A consumer
	// `ref` joins it.
	const panelRef = useComposedRefs(handle ? resize.ref : undefined, ref)

	const sized = handle && (resize.resizing || resize.size !== null)

	return (
		<Overlay
			open={open}
			onOpenChange={setOpen}
			container={container}
			initialFocus={initialFocus}
			returnFocusTo={returnFocusTo}
			dismissOnBackdrop={dismissOnBackdrop}
			modal={modal}
			backdrop={backdrop}
			backdropClassName={k.backdrop({ surface })}
		>
			<m.div
				{...props}
				{...preset}
				onAnimationComplete={onAnimationComplete}
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				id={panelId}
				// The space recipe reads this anchor, so it comes after the spread (CONVENTIONS.md §3.9).
				data-slot="sheet"
				data-open={dataAttr(open)}
				ref={panelRef}
				// A consumer's preventDefault() does not let the click past the panel (CONVENTIONS.md §3.9).
				onClick={composeEventHandlers(onClick, (event) => event.stopPropagation(), {
					checkForDefaultPrevented: false,
				})}
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
				// set on the press and the pointer moves after the render. The consumer
				// `style` comes first, so the dragged size wins.
				style={sized ? { ...style, [axis]: resize.size ?? undefined, maxWidth: 'none' } : style}
				className={cn(
					k.panel({ side: edge, width, surface }),
					resolveVariant(layout, k.layout.side[edge]),
					(width === 'fit' || width === 'full') &&
						axis === 'width' &&
						resolveVariant(layout, k.layout.width[width]),
					// Non-modal overlays disable pointer events on the full-viewport
					// wrapper so the page stays interactive; the panel re-enables its own.
					modal === false && 'pointer-events-auto',
					className,
				)}
			>
				<PanelProviders onOpenChange={setOpen} a11y={a11y}>
					{handle ? (
						<SheetHandle
							handleProps={resize.handleProps}
							covers={resize.covers}
							controls={panelId}
							side={edge}
						/>
					) : null}

					{children}
					<SheetDefaultFooter>{footer === undefined ? <SheetClose /> : footer}</SheetDefaultFooter>
				</PanelProviders>
			</m.div>
		</Overlay>
	)
}

/** The physical edge of a {@link SheetPanelProps.side}: `start` and `end` resolve against `rtl`. */
function physicalSide(
	side: NonNullable<SheetPanelProps['side']>,
	rtl: boolean,
): NonNullable<SheetPanelVariants['side']> {
	if (side === 'start') return rtl ? 'right' : 'left'

	if (side === 'end') return rtl ? 'left' : 'right'

	return side
}
