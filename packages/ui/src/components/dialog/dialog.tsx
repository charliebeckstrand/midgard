'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yPanel, useMinWidth } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { type DialogPanelVariants, k } from '../../recipes/kata/dialog'

/** Props for {@link Dialog}: open-state control, `width` variant, placement, dismissal, and accessible naming. */
export type DialogProps = Omit<DialogPanelVariants, 'surface'> & {
	/** Controlled open state. Pair with `onOpenChange`. */
	open?: boolean
	/** Initial open state when uncontrolled. */
	defaultOpen?: boolean
	/** Fires when the open state changes (backdrop dismiss, Escape, close button). */
	onOpenChange?: (open: boolean) => void
	/**
	 * Fires once the panel has finished arriving — it is up, at rest, and covering
	 * whatever it covers.
	 *
	 * The counterpart to `onOpenChange`, which reports the state being *asked for*: this
	 * one reports it having *landed*. Use it for anything that has to hold until the panel
	 * is actually up — measuring it, or starting work that must not compete with the
	 * animation — rather than guessing at the motion with a matching delay.
	 *
	 * Deliberately named for the open, not for the animation. The panel plays a different
	 * preset on each side of the `sm` breakpoint, and reports from whichever one ran. A
	 * transition the user's reduced-motion preference collapses still resolves, and so
	 * still reports.
	 *
	 * Once per arrival, and never for a close.
	 *
	 * @see {@link DrawerProps.onOpenComplete} for the same contract on the sibling panel.
	 */
	onOpenComplete?: () => void
	/** Desktop vertical alignment of the panel within the viewport; mobile always docks to the bottom. @defaultValue 'center' */
	placement?: 'center' | 'top'
	/** Whether clicking the backdrop closes the dialog. @defaultValue true */
	dismissOnBackdrop?: boolean
	/**
	 * Opt into the glass surface treatment.
	 *
	 * @remarks Items inside — a command palette's results — take the deeper glass
	 * wash on hover and focus.
	 */
	glass?: boolean
	className?: string
	children: ReactNode
	/**
	 * Dialog role. Use `'alertdialog'` for confirmations and other prompts that
	 * require a response before proceeding.
	 * @defaultValue 'dialog'
	 */
	role?: 'dialog' | 'alertdialog'
	/**
	 * Element to receive initial focus when the dialog opens.
	 * @defaultValue the first tabbable child
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

const placementClasses = {
	center: 'sm:items-center',
	top: 'sm:items-start',
} as const

/**
 * Modal surface rendered in an `Overlay` with focus trapping and backdrop dismiss.
 * Drives open state controlled (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`),
 * animates as a bottom sheet on mobile and a centered (or `top`-aligned) panel on desktop,
 * and resolves the surface variant against the enclosing Glass provider. Compose
 * `<DialogTrigger>`, `<DialogClose>`, and the slot family (`<DialogContent>`, `<DialogHeader>`,
 * `<DialogTitle>`, `<DialogDescription>`, `<DialogBody>`, `<DialogFooter>`) within.
 *
 * @remarks
 * A registered `<DialogTitle>` supplies `aria-labelledby` and takes precedence over the
 * `aria-label` fallback. Set `role='alertdialog'` for prompts that demand a response. The
 * panel and its dismiss affordances share a single open-state setter via `PanelProviders`.
 */
export function Dialog({
	open,
	defaultOpen,
	onOpenChange,
	onOpenComplete,
	placement = 'center',
	dismissOnBackdrop = true,
	width,
	glass,
	className,
	children,
	role = 'dialog',
	initialFocus,
	'aria-label': ariaLabel,
	'data-slot': slot = 'dialog',
}: DialogProps) {
	// Controlled when `open` is passed; otherwise uncontrolled from `defaultOpen`.
	// The single setter drives the Overlay and the close affordances either way.
	const [resolvedOpen = false, setOpen] = useControllable<boolean>({
		value: open,
		defaultValue: defaultOpen ?? false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const resolvedSurface = useResolvedSurface(glass)

	const isGlass = resolvedSurface === 'glass'

	const isDesktop = useMinWidth(640)

	const preset = isDesktop ? k.motion.desktop : k.motion.mobile

	const { onAnimationComplete } = useOpenComplete(resolvedOpen, preset.animate, onOpenComplete)

	const { ariaProps, a11y } = useA11yPanel(role)

	// aria-labelledby (a registered DialogTitle) takes precedence over aria-label.
	const ariaLabelledBy = ariaProps['aria-labelledby']

	return (
		<Overlay
			open={resolvedOpen}
			onOpenChange={setOpen}
			dismissOnBackdrop={dismissOnBackdrop}
			glass={isGlass}
			initialFocus={initialFocus}
		>
			<div
				className={cn(
					'pointer-events-none fixed inset-0 flex min-h-full items-end sm:justify-center sm:p-4',
					placementClasses[placement],
				)}
			>
				<motion.div
					{...preset}
					onAnimationComplete={onAnimationComplete}
					{...ariaProps}
					aria-label={ariaLabelledBy ? undefined : ariaLabel}
					data-slot={slot}
					// Half the marker `hannou.glassItem` keys on; the `group/glass` class
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
					</PanelProviders>
				</motion.div>
			</div>
		</Overlay>
	)
}
