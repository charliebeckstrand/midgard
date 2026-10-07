'use client'

import { animate } from 'motion'
import { motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { type ComponentProps, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'

/**
 * Props for {@link ShinyText}; tunes the sweep animation and gradient colors atop a `<span>`.
 *
 * @remarks
 * The span is a motion element, and motion gives its own meaning to `onDrag`,
 * `onDragStart`, `onDragEnd`, and `onAnimationStart`. The props omit these
 * four keys, because a DOM handler under one of them does not get to the DOM.
 */
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
	className?: string
} & Omit<
	ComponentProps<'span'>,
	'className' | 'color' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
>

// Background-position percentages that park the shine past each edge. The
// gradient is twice the width of the text, so a higher percentage moves the
// gradient to the left, and the shine at its center goes past the left edge.
// The shine travels to the left: it starts past the right edge.
const OFF_LEFT = 150
const OFF_RIGHT = -50

/**
 * Text masked by a gradient whose highlight sweeps across it on a loop.
 *
 * @remarks
 * An imperative `animate()` outside any `MotionConfig` drives the sweep.
 * ShinyText therefore reads the OS preference through `usePrefersReducedMotion`,
 * and renders static text under reduced motion (WCAG 2.3.3).
 *
 * The sweep runs only while the text is in the viewport. Off screen it stops,
 * and it starts again from the start position when the text comes back.
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
	const reduceMotion = usePrefersReducedMotion()

	// An infinite loop runs on every frame. Off screen nobody sees it, so it stops.
	const own = useRef<HTMLSpanElement>(null)

	const inView = useInView(own)

	const composedRef = useComposedRef(ref, own)

	const position = useMotionValue(OFF_RIGHT)

	const backgroundPosition = useTransform(position, (p) => `${p}% center`)

	useEffect(() => {
		// Always re-park first: a mid-sweep `disabled` flip otherwise leaves the
		// shine frozen wherever the previous cleanup's `stop()` caught it.
		position.set(OFF_RIGHT)

		if (disabled || reduceMotion || !inView) return

		const controls = animate(position, OFF_LEFT, {
			duration: speed,
			ease: 'linear',
			repeat: Number.POSITIVE_INFINITY,
		})

		return () => controls.stop()
	}, [disabled, reduceMotion, inView, speed, position])

	return (
		<motion.span
			ref={composedRef}
			data-slot="shiny-text"
			className={cn(
				'inline-block bg-clip-text text-transparent',
				'[--shiny-text-color:var(--color-zinc-600)] dark:[--shiny-text-color:var(--color-zinc-400)]',
				// A white shine erases the glyphs on a light page, so the light shine is dark.
				'[--shiny-text-shine:var(--color-zinc-950)] dark:[--shiny-text-shine:var(--color-white)]',
				className,
			)}
			{...props}
			style={{
				...style,
				backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
				backgroundSize: '200% auto',
				backgroundPosition,
			}}
		>
			{children}
		</motion.span>
	)
}
