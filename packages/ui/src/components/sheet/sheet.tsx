'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yPanel } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { usePanelResize } from '../../hooks/use-panel-resize'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { k, type SheetPanelVariants } from '../../recipes/kata/sheet'
import { sheetFloor } from './sheet-floor'
import { SheetHandle } from './sheet-handle'

/** Props for {@link Sheet}: open-state control, portal `container`, focus, modality, and panel `side`/`width` variants. */
export type SheetProps = Omit<SheetPanelVariants, 'surface'> & {
	/** Controlled open state. Pair with `onOpenChange`. */
	open?: boolean
	/** Initial open state when uncontrolled. */
	defaultOpen?: boolean
	/**
	 * Give the panel a drag handle, so the reader can resize it past the `width`
	 * scale and throw it away toward its own edge.
	 *
	 * The drag sets the width directly rather than stepping between the `width`
	 * variants, because the reader is deciding how much of the screen the panel
	 * gets and the answer is wherever they let go. `width` still states where it
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
	 * one reports it having *landed*. Use it for anything that has to hold until the panel
	 * is actually up — measuring it, or starting work that must not compete with the slide
	 * — rather than guessing at the slide with a matching delay.
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
	 * Drain the colour from whatever shows through the backdrop. Both scrims are
	 * translucent, so the page behind stays legible while the sheet is up; this
	 * renders it in grey, marking it as the inert surface rather than merely the
	 * dimmed one. No effect where no backdrop renders (see `backdrop`).
	 *
	 * @defaultValue false
	 */
	desaturate?: boolean
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
 * the panel captures them. The panel stops click propagation to keep the portal's
 * synthetic clicks off the consumer ancestors it renders under — the backdrop is
 * a sibling, so a panel click never reaches its dismiss handler anyway — and
 * shares a single open-state setter with its dismiss affordances via
 * `PanelProviders`.
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

	const preset = k.motion[side]

	const { onAnimationComplete } = useOpenComplete(resolvedOpen, preset.animate, onOpenComplete)

	const { ariaProps, a11y } = useA11yPanel('dialog', modal ?? true)

	// A pixel width means nothing off the screen it was set on, so it stays in
	// the panel's own state and reaches nowhere: nothing outside the sheet needs
	// to hold one.
	const resize = usePanelResize({
		axis: 'width',
		open: resolvedOpen,
		onDismiss: () => setOpen(false),
		floorOf: sheetFloor,
	})

	return (
		<Overlay
			open={resolvedOpen}
			onOpenChange={setOpen}
			container={container}
			initialFocus={initialFocus}
			modal={modal}
			backdrop={backdrop}
			className={k.backdrop({ surface: resolvedSurface, desaturate })}
		>
			<motion.div
				{...preset}
				onAnimationComplete={onAnimationComplete}
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				data-slot="sheet"
				ref={handle ? resize.ref : undefined}
				onClick={(event) => event.stopPropagation()}
				// The panel eases between its `width` variants, which is right for a step
				// and wrong for a finger: eased, each frame's width becomes an animation
				// the next frame interrupts, and the edge lags the pointer.
				data-resizing={dataAttr(resize.resizing)}
				// A dragged width beats the variant's, and it is inline because it is a
				// measurement rather than a step on the scale.
				//
				// The cap goes with it, for the whole gesture and not only once a size
				// lands: the `width` variant is a max-width, so leaving it in place would
				// clamp the panel at its opening width while the drag went on reporting
				// numbers past it. Cleared before the first move, because `resizing` is
				// set on the press and the pointer moves after the render.
				style={
					handle && (resize.resizing || resize.size !== null)
						? { width: resize.size ?? undefined, maxWidth: 'none' }
						: undefined
				}
				className={cn(
					k.panel({ side, width, surface: resolvedSurface }),
					// Non-modal overlays disable pointer events on the full-viewport
					// wrapper so the page stays interactive; the panel re-enables its own.
					modal === false && 'pointer-events-auto',
					className,
				)}
			>
				<PanelProviders onOpenChange={setOpen} a11y={a11y}>
					{handle ? (
						<SheetHandle handleProps={resize.handleProps} covers={resize.covers} side={side} />
					) : null}

					{children}
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}
