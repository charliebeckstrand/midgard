'use client'

import { useInView } from 'motion/react'
import { type ComponentProps, useRef } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks/use-composed-ref'

/** Props for {@link ShinyText}; tunes the sweep animation and gradient colors atop a `<span>`. */
export type ShinyTextProps = {
	/**
	 * Halt the sweep, leaving the shine parked off-screen so only the base color shows.
	 * @defaultValue false
	 */
	disabled?: boolean
	/**
	 * Seconds per sweep.
	 * @defaultValue 2
	 */
	speed?: number
	/**
	 * Base text color; any CSS color. The default is zinc-600, and zinc-400 in
	 * dark mode.
	 * @defaultValue 'var(--shiny-text-color)'
	 */
	color?: string
	/**
	 * Highlight color swept across the text; any CSS color. The default is
	 * zinc-950, and white in dark mode.
	 * @defaultValue 'var(--shiny-text-shine)'
	 */
	shineColor?: string
	/**
	 * Gradient angle in degrees.
	 * @defaultValue 120
	 */
	spread?: number
} & Omit<ComponentProps<'span'>, 'color'>

/**
 * Text masked by a gradient whose highlight sweeps across it on a loop.
 *
 * @remarks
 * A CSS animation drives the sweep (`animate-shiny-text` in `ui/tailwind.css`).
 * The class is behind `motion-safe:`, so ShinyText renders static text under
 * reduced motion (WCAG 2.3.3).
 *
 * The sweep runs only while the text is in the viewport. Off screen it stops,
 * and it starts again from the start position when the text comes back.
 * Chromium paints an animated background in each frame also off screen, so the
 * class comes off when the text leaves the viewport.
 *
 * The span keeps its gradient in print (`print-color-adjust: exact`). The
 * glyphs are transparent, so a print with no background graphics otherwise
 * shows no text.
 *
 * The five tuning props are deliberate. No app consumes this component, and
 * its demo exercises every one of them. A decorative surface earns its knobs,
 * but the zero-usage rule deleted `delay`, `yoyo`, `pauseOnHover`, and `sweep`.
 *
 * @see {@link ShinyTextSkeleton} for the loading placeholder.
 */
export function ShinyText({
	disabled = false,
	speed = 2,
	color = 'var(--shiny-text-color)',
	shineColor = 'var(--shiny-text-shine)',
	spread = 120,
	ref,
	className,
	children,
	style,
	...props
}: ShinyTextProps) {
	// An infinite loop runs on every frame. Off screen nobody sees it, so it stops.
	const own = useRef<HTMLSpanElement>(null)

	const inView = useInView(own)

	const composedRef = useComposedRef(ref, own)

	return (
		<span
			ref={composedRef}
			data-slot="shiny-text"
			className={cn(
				'inline-block bg-clip-text text-transparent',
				// The gradient alone paints the transparent glyphs. A print with no
				// background graphics drops it, so the span keeps its background in print.
				'[print-color-adjust:exact]',
				'[--shiny-text-color:var(--color-zinc-600)] dark:[--shiny-text-color:var(--color-zinc-400)]',
				// A white shine erases the glyphs on a light page, so the light shine is dark.
				'[--shiny-text-shine:var(--color-zinc-950)] dark:[--shiny-text-shine:var(--color-white)]',
				inView && !disabled && 'motion-safe:animate-shiny-text',
				className,
			)}
			{...props}
			style={{
				...style,
				backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
				backgroundSize: '200% auto',
				// At rest the shine is past the right edge, where the sweep starts.
				backgroundPosition: '-50% center',
				animationDuration: `${speed}s`,
			}}
		>
			{children}
		</span>
	)
}
