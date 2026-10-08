'use client'

import type { ReactNode, RefObject } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yPanel, useMinBreakpoint } from '../../hooks'
import { useOpenComplete } from '../../hooks/use-open-complete'
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
import { type DialogPanelVariants, k } from '../../recipes/kata/dialog'
import { DialogClose, DialogDefaultFooter } from './slots'

/** Props for {@link Dialog}: the open state, controlled or uncontrolled. */
export type DialogProps = PanelRootProps

/**
 * Props for {@link DialogPanel}: the `width` variant, align, dismissal, the
 * surface, and accessible naming.
 */
export type DialogPanelProps = Omit<DialogPanelVariants, 'surface'> &
	PanelOverlayProps & {
		/**
		 * Fires once the panel has finished arriving — it is up, at rest, and covering
		 * whatever it covers.
		 *
		 * The counterpart to `onOpenChange`, which reports the state being *asked for*: this
		 * one reports it having *landed*. Use it for anything that has to hold until the panel
		 * is actually up. That means measuring it, or starting work that must not compete
		 * with the animation. Either beats guessing at the motion with a matching delay.
		 *
		 * Deliberately named for the open, not for the animation. The panel plays a different
		 * preset on each side of the `sm` breakpoint, and reports from whichever one ran. A
		 * transition the user's reduced-motion preference collapses still resolves, and so
		 * still reports.
		 *
		 * Once per arrival, and never for a close.
		 *
		 * @see {@link DrawerPanelProps.onOpenComplete} for the same contract on the sibling panel.
		 */
		onOpenComplete?: () => void
		/** Desktop vertical alignment of the panel within the viewport; mobile always docks to the bottom. @defaultValue 'center' */
		align?: 'center' | 'top'
		/**
		 * Opt into the glass surface treatment. Omit it to follow the ambient
		 * `<GlassProvider>`. Set `false` to keep the flat surface inside one.
		 *
		 * @remarks Items inside — a command palette's results — take the deeper glass
		 * wash on hover and focus.
		 */
		glass?: boolean
		className?: string
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
		 * Element to receive initial focus when the dialog opens.
		 * @defaultValue the first tabbable child.
		 */
		initialFocus?: RefObject<HTMLElement | null>
		/**
		 * Accessible name for dialogs without a visible `DialogTitle` (e.g. a command
		 * palette). Ignored once a `DialogTitle` registers.
		 */
		'aria-label'?: string
		/** Root slot identifier. Wrappers override it to stamp their own name. */
		'data-slot'?: string
	}

const alignClasses = {
	center: 'sm:items-center',
	top: 'sm:items-start',
} as const

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
 * backdrop dismiss. It reads the open state of the enclosing `<Dialog>`. It animates
 * as a bottom sheet on mobile and a centered (or `top`-aligned) panel on desktop. The
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
 * Dialog. With a `container`, the panel stays in the box of that element. The `sm`
 * breakpoint, which selects the layout and the motion, still reads the viewport.
 */
export function DialogPanel({
	onOpenComplete,
	align = 'center',
	dismissOnBackdrop,
	appear,
	modal = true,
	backdrop,
	container,
	width,
	glass,
	className,
	children,
	footer,
	role = 'dialog',
	initialFocus,
	'aria-label': ariaLabel,
	'data-slot': slot = 'dialog',
}: DialogPanelProps) {
	// The root holds the state. One setter drives the Overlay and the close parts.
	const { open, setOpen, panelId } = usePanelState()

	const resolvedSurface = useResolvedSurface(glass)

	const isGlass = resolvedSurface === 'glass'

	const isDesktop = useMinBreakpoint('sm')

	// The phone slide moves `transform`, which `MotionConfig` does not hold still,
	// so the panel reads the setting itself (WCAG 2.3.3).
	const presets = usePrefersReducedMotion() ? k.still : k.motion

	const preset = isDesktop ? presets.desktop : presets.mobile

	const { onAnimationComplete } = useOpenComplete(open, preset.animate, onOpenComplete)

	const { ariaProps, a11y } = useA11yPanel(role, modal)

	// aria-labelledby (a registered DialogTitle) takes precedence over aria-label.
	const ariaLabelledBy = ariaProps['aria-labelledby']

	return (
		<Overlay
			open={open}
			onOpenChange={setOpen}
			dismissOnBackdrop={dismissOnBackdrop}
			appear={appear}
			modal={modal}
			backdrop={backdrop}
			container={container}
			backdropClassName={k.backdrop({ surface: resolvedSurface })}
			initialFocus={initialFocus}
		>
			<div
				className={cn(
					// The overlay root is positioned in both modes, so the wrapper fills the
					// root: the part of the screen that the reader sees, or the `container`.
					'pointer-events-none absolute inset-0 flex min-h-full items-end sm:justify-center sm:p-4',
					alignClasses[align],
				)}
			>
				<m.div
					{...preset}
					onAnimationComplete={onAnimationComplete}
					{...ariaProps}
					aria-label={ariaLabelledBy ? undefined : ariaLabel}
					id={panelId}
					data-slot={slot}
					// React carries a click in the portal up the component tree. Stop it at
					// the panel, so a clickable ancestor of the Dialog does not see it.
					onClick={(event) => event.stopPropagation()}
					// Half the marker `hannou.tint.glass` keys on; the `group/glass` class
					// below is the other half. See `recipes/kiso/hannou/glass-item.ts`. A
					// command palette's rows hover inside this panel, not inside a popover.
					data-glass={dataAttr(isGlass)}
					className={cn(
						'pointer-events-auto',
						isGlass && 'group/glass',
						k.panel({ surface: resolvedSurface, width }),
						className,
					)}
				>
					<PanelProviders onOpenChange={setOpen} a11y={a11y}>
						{children}
						<DialogDefaultFooter>
							{footer === undefined ? <DialogClose /> : footer}
						</DialogDefaultFooter>
					</PanelProviders>
				</m.div>
			</div>
		</Overlay>
	)
}
