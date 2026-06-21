'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { useA11yPanel } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { k, type SheetPanelVariants } from '../../recipes/kata/sheet'

/** Props for {@link Sheet}: open-state control, portal `container`, focus, modality, and panel `side`/`size`/`surface` variants. */
export type SheetProps = SheetPanelVariants & {
	/** Controlled open state. Pair with `onOpenChange`. */
	open?: boolean
	/** Initial open state when uncontrolled. */
	defaultOpen?: boolean
	/** Fires when the open state changes (backdrop dismiss, Escape, close button). */
	onOpenChange?: (open: boolean) => void
	/** Opt the panel and backdrop into the translucent glass surface, resolved against the ambient Glass provider. */
	glass?: boolean
	className?: string
	children: ReactNode
	/**
	 * Optional element to portal into. When provided, the sheet is scoped to this
	 * element (rendered with `absolute` positioning, no body scroll lock). The
	 * container must establish a positioning context (e.g. `position: relative`).
	 * @defaultValue `document.body` with full-viewport `fixed` positioning
	 */
	container?: HTMLElement | null
	/**
	 * Element to receive initial focus when the sheet opens.
	 * @defaultValue the first tabbable child
	 */
	initialFocus?: RefObject<HTMLElement | null>
	/**
	 * Modal sheets (the default) trap focus, move it into the panel on open,
	 * lock body scroll, and dim the page behind a blocking backdrop. Pass
	 * `false` for transient, pointer-driven surfaces (e.g. a hover-revealed
	 * peek) that must not steal focus or block the page: no backdrop renders
	 * (unless `backdrop` is set) and the page behind stays interactive; Escape
	 * or a pointer press outside the panel dismisses.
	 * @defaultValue true
	 */
	modal?: boolean
	/**
	 * Paint the dimming backdrop even when `modal={false}`. A non-modal sheet
	 * renders none by default; opt in to blur and dim the page behind a
	 * hover-revealed peek. The scrim stays non-interactive, so the page remains
	 * usable.
	 * @defaultValue `modal`
	 */
	backdrop?: boolean
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
 * body scroll, and render a blocking backdrop; `modal={false}` keeps the page
 * interactive and disables the full-viewport wrapper's pointer events so only
 * the panel captures them. The panel stops click propagation so taps inside it
 * never reach the backdrop dismiss handler, and shares a single open-state
 * setter with its dismiss affordances via `PanelProviders`.
 */
export function Sheet({
	open,
	defaultOpen,
	onOpenChange,
	side = 'right',
	size,
	surface,
	glass,
	className,
	children,
	container,
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

	const resolvedSurface = useResolvedSurface(surface, glass)

	const { ariaProps, a11y } = useA11yPanel('dialog', modal ?? true)

	return (
		<Overlay
			open={resolvedOpen}
			onOpenChange={setOpen}
			container={container}
			initialFocus={initialFocus}
			modal={modal}
			backdrop={backdrop}
			className={k.backdrop({ surface: resolvedSurface })}
		>
			<motion.div
				{...k.motion[side]}
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				data-slot="sheet"
				onClick={(event) => event.stopPropagation()}
				className={cn(
					k.panel({ side, size, surface: resolvedSurface }),
					// Non-modal overlays disable pointer events on the full-viewport
					// wrapper so the page stays interactive; the panel re-enables its own.
					modal === false && 'pointer-events-auto',
					className,
				)}
			>
				<PanelProviders onOpenChange={setOpen} a11y={a11y}>
					{children}
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}
