'use client'

import { useComposedRefs } from 'motion/react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core/cn'
import { usePanelFit } from '../../hooks/use-panel-fit'
import { useResponsiveValue } from '../../hooks/use-responsive-value'
import { HeightMotionContext } from '../../primitives/height-motion/context'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders, PanelRoot, type PanelRootProps } from '../../primitives/panel'
import type { PanelOverlayProps } from '../../primitives/panel/types'
import { usePanelSurface } from '../../primitives/panel/use-panel-surface'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { useResolvedSurface } from '../../providers/glass/context'
import { type DialogPanelVariants, k } from '../../recipes/kata/dialog'
import { adaptive, type Responsive, withInitial } from '../../utilities/responsive'
import { dialogCeiling } from './dialog-ceiling'
import { DialogClose, DialogDefaultFooter } from './slots'

/** Where a {@link DialogPanel} sits: docked to the `bottom` edge, or floating at the `center` or the `top`. */
export type DialogAlign = 'bottom' | 'center' | 'top'

/** The default `align` of a {@link DialogPanel}: docked to the bottom edge on a compact viewport, centered from medium. */
export const DIALOG_ALIGN = adaptive({
	compact: 'bottom',
	medium: 'center',
}) satisfies Responsive<DialogAlign>

/** How a {@link DialogPanel} takes its height: `auto` snaps to its content, and `fit` travels to it. */
export type DialogHeight = 'auto' | 'fit'

/** Props for {@link Dialog}: the open state, controlled or uncontrolled. */
export type DialogProps = PanelRootProps

/**
 * Props for {@link DialogPanel}: the `width` variant, align, dismissal, the
 * surface, and accessible naming. The animated panel `<div>` takes the rest,
 * except the keys that Motion gives a meaning of its own. The panel sets its
 * `id` and its ARIA wiring after the rest.
 */
export type DialogPanelProps = Omit<DialogPanelVariants, 'surface'> &
	PanelOverlayProps &
	Omit<
		ComponentProps<'div'>,
		'children' | 'role' | 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
	> & {
		/**
		 * Fires when the panel has finished arriving: it is up, at rest, and covering
		 * whatever it covers.
		 *
		 * The counterpart to `onOpenChange`, which reports the state being *asked for*: this
		 * one reports it having *landed*. Use it for anything that has to hold until the panel
		 * is actually up. That means measuring it, or starting work that must not compete
		 * with the animation. Either beats guessing at the motion with a matching delay.
		 *
		 * Deliberately named for the open, not for the animation. The panel plays a different
		 * preset for each `align`, and reports from whichever one ran. A
		 * transition the user's reduced-motion preference collapses still resolves, and so
		 * still reports.
		 *
		 * Once per arrival, and never for a close.
		 *
		 * @see {@link DrawerPanelProps.onOpenComplete} for the same contract on the sibling panel.
		 */
		onOpenComplete?: () => void
		/**
		 * Where the panel sits: `bottom` docks it to the bottom edge as a sheet,
		 * and `center` and `top` float it in the middle or near the top. The motion
		 * follows: a sheet slides up, and a floating panel fades in. A
		 * per-breakpoint map sets the place from each breakpoint, mobile-first. A
		 * single value sets it at each width.
		 * @defaultValue {@link DIALOG_ALIGN}
		 */
		align?: Responsive<DialogAlign>
		/**
		 * How the panel takes the height of its content. The panel is as tall as
		 * its content in both, up to a cap.
		 *
		 * With `auto`, a change of the content changes the height in one step. A
		 * docked `auto` panel stops at 85% of the screen.
		 *
		 * With `fit`, the panel measures each new height and travels to it, as a
		 * Drawer with `height="fit"` does. A docked `fit` panel goes up to the top
		 * edge of the screen when its content asks for that much, and squares its
		 * top corners there. A floating panel stops 1rem short of each edge with
		 * either value. Use `fit` for a panel whose content
		 * swaps, such as the steps under a breadcrumb, or a Segment between two
		 * views of different heights. Content that animates its own height, such
		 * as an Accordion or a Collapse, then moves the panel on each frame. The
		 * travel takes no time under reduced motion.
		 *
		 * @defaultValue 'auto'
		 */
		height?: DialogHeight
		/**
		 * Opts into the glass surface treatment. Omit it to follow the ambient
		 * `<GlassProvider>`. Set `false` to keep the flat surface inside one.
		 *
		 * @remarks Items inside (a command palette's results) take the deeper glass
		 * wash on hover and focus.
		 *
		 * @defaultValue `false`, or the flag of the enclosing `<GlassProvider>`.
		 */
		glass?: boolean
		children: ReactNode
		/**
		 * The content of the footer row that the dialog shows when no `DialogFooter`
		 * is in its children. A `DialogFooter` child replaces it. Set `null` to show
		 * no footer row.
		 *
		 * @defaultValue `<DialogClose />`, the standard Close button.
		 */
		footer?: ReactNode
		/**
		 * Dialog role. Use `'alertdialog'` for confirmations and other prompts that
		 * require a response before proceeding.
		 * @defaultValue 'dialog'
		 */
		role?: 'dialog' | 'alertdialog'
		/**
		 * Accessible name for dialogs without a visible `DialogTitle` (e.g. a command
		 * palette). Ignored once a `DialogTitle` registers.
		 */
		'aria-label'?: string
		/** Root slot identifier. Wrappers override it to stamp their own name. */
		'data-slot'?: string
	}

/**
 * Composition root for a modal dialog. It holds the open state, controlled
 * (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`), and gives it to
 * `<DialogTrigger>` and `<DialogPanel>`. It renders no element. A trigger in the
 * root opens an uncontrolled dialog. Escape, the backdrop, and `<DialogClose>`
 * close it, and focus then goes back to the trigger.
 *
 * @example
 * ```tsx
 * <Dialog>
 *   <DialogTrigger>
 *     <Button>Open</Button>
 *   </DialogTrigger>
 *   <DialogPanel>
 *     <DialogTitle>Title</DialogTitle>
 *   </DialogPanel>
 * </Dialog>
 * ```
 *
 * @see {@link DialogPanel} for the surface and its props.
 */
export function Dialog(props: DialogProps) {
	return <PanelRoot {...props} />
}

/**
 * The surface of a {@link Dialog}, rendered in an `Overlay` with focus trapping and
 * backdrop dismiss. It reads the open state of the enclosing `<Dialog>`. By default it
 * is a bottom sheet on a compact viewport and a centered panel from medium (`align`). The
 * surface variant resolves against the enclosing Glass provider. Compose `<DialogClose>`
 * and the slot family (`<DialogContent>`, `<DialogHeader>`, `<DialogTitle>`,
 * `<DialogDescription>`, `<DialogBody>`, `<DialogFooter>`) within. With no
 * `<DialogFooter>` in its children, the dialog shows a footer with the standard Close
 * button.
 *
 * @remarks
 * A registered `<DialogTitle>` supplies `aria-labelledby` and takes precedence over the
 * `aria-label` fallback. Set `role='alertdialog'` for prompts that demand a response. The
 * panel, its close parts, and its dismissal share the open-state setter of the root.
 * A click in the panel stops at the panel, so it does not reach a clickable ancestor of the
 * Dialog. With a `container`, the panel stays in the box of that element. The
 * breakpoints of `align`, which select the layout and the motion, still read the viewport. The
 * panel stamps `data-open` while it is open.
 */
export function DialogPanel({
	onOpenComplete,
	align: alignProp = DIALOG_ALIGN,
	dismissOnBackdrop,
	modal,
	backdrop,
	container,
	width,
	height = 'auto',
	glass,
	className,
	children,
	footer,
	role = 'dialog',
	initialFocus,
	returnFocusTo,
	'aria-label': ariaLabel,
	'data-slot': slot = 'dialog',
	onClick,
	ref,
	...props
}: DialogPanelProps) {
	const surface = useResolvedSurface(glass)

	// A map with no `initial` value docks there, in the CSS and in the motion alike.
	const align = withInitial(alignProp, 'bottom')

	const docked = useResponsiveValue(align, 'bottom') === 'bottom'

	const { setOpen, a11y, overlayProps, panelProps, panelClassName } = usePanelSurface({
		role,
		glass: surface === 'glass',
		motion: (reduced) => (reduced ? k.still : k.motion)[docked ? 'mobile' : 'desktop'],
		onOpenComplete,
		'aria-label': ariaLabel,
		onClick,
		modal,
		dismissOnBackdrop,
		backdrop,
		container,
		initialFocus,
		returnFocusTo,
	})

	// A `fit` panel travels between the heights of its content. No drag holds
	// the height of a dialog.
	const fit = usePanelFit({
		enabled: height === 'fit',
		dragged: false,
		getCeiling: dialogCeiling,
		transition: k.fit,
	})

	// The fit reads the node. A consumer `ref` joins it.
	const panelRef = useComposedRefs(fit.ref, ref)

	const slots = k({ surface, width, align, height })

	return (
		<Overlay {...overlayProps} backdropClassName={slots.backdrop}>
			<div className={slots.box}>
				<m.div
					data-slot={slot}
					{...props}
					{...panelProps}
					ref={panelRef}
					// A command palette's rows hover inside this panel, not inside a popover,
					// so they take the glass wash that the panel opens.
					className={cn('pointer-events-auto', panelClassName, slots.base, className)}
				>
					<PanelProviders onOpenChange={setOpen} a11y={a11y}>
						{/* Content that moves its own height tells a `fit` panel, which then follows it. An
						`auto` panel gives `null`, so its content does not tell a `fit` panel outside it. */}
						<HeightMotionContext value={height === 'fit' ? fit.host : null}>
							{children}
							<DialogDefaultFooter>
								{footer === undefined ? <DialogClose /> : footer}
							</DialogDefaultFooter>
						</HeightMotionContext>
					</PanelProviders>
				</m.div>
			</div>
		</Overlay>
	)
}
