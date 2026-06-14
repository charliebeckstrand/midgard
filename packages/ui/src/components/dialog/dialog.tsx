'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { useA11yPanel, useMinWidth } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { type DialogPanelVariants, k } from '../../recipes/kata/dialog'

/** Props for {@link Dialog}: open-state control, surface/sizing variants, placement, dismissal, and accessible naming. */
export type DialogProps = DialogPanelVariants & {
	/** Controlled open state. Pair with `onOpenChange`. */
	open?: boolean
	/** Initial open state when uncontrolled. */
	defaultOpen?: boolean
	/** Fires when the open state changes (backdrop dismiss, Escape, close button). */
	onOpenChange?: (open: boolean) => void
	/** Desktop vertical alignment of the panel within the viewport; mobile always docks to the bottom. @defaultValue 'center' */
	placement?: 'center' | 'top'
	/** Whether clicking the backdrop closes the dialog. @defaultValue true */
	dismissOnBackdrop?: boolean
	/** Opt into the glass surface treatment, overriding the resolved `surface` variant. */
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
	placement = 'center',
	dismissOnBackdrop = true,
	surface,
	size,
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

	const resolvedSurface = useResolvedSurface(surface, glass)

	const isDesktop = useMinWidth(640)

	const { ariaProps, a11y } = useA11yPanel(role)

	// aria-labelledby (a registered DialogTitle) takes precedence over aria-label.
	const ariaLabelledBy = ariaProps['aria-labelledby']

	return (
		<Overlay
			open={resolvedOpen}
			onOpenChange={setOpen}
			dismissOnBackdrop={dismissOnBackdrop}
			glass={resolvedSurface === 'glass'}
			initialFocus={initialFocus}
		>
			<div
				className={cn(
					'pointer-events-none fixed inset-0 flex min-h-full items-end sm:justify-center sm:p-4',
					placementClasses[placement],
				)}
			>
				<motion.div
					{...(isDesktop ? k.motion.desktop : k.motion.mobile)}
					{...ariaProps}
					aria-label={ariaLabelledBy ? undefined : ariaLabel}
					data-slot={slot}
					className={cn(
						'pointer-events-auto',
						k.panel({ surface: resolvedSurface, size }),
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
