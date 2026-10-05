'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import { motion, useMotionValue, useTransform } from 'motion/react'
import { type ComponentProps, useEffect, useRef } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { useStableEvent } from '../../hooks/use-stable-event'

/**
 * Props for {@link ShinyText}; tunes the sweep animation, gradient colors, and hover behavior atop a `<span>`.
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
	/**
	 * Reverse on each cycle instead of jumping back to the start.
	 * @defaultValue false
	 */
	yoyo?: boolean
	/**
	 * Pause the sweep while the pointer is over the text.
	 * @defaultValue false
	 */
	pauseOnHover?: boolean
	/**
	 * Direction the shine travels: `'left'` or `'right'`.
	 * @defaultValue 'left'
	 */
	sweep?: 'left' | 'right'
	className?: string
} & Omit<
	ComponentProps<'span'>,
	'className' | 'color' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
>

// Background-position percentages that park the shine past each edge. The
// gradient is twice the width of the text, so a higher percentage moves the
// gradient to the left, and the shine at its center goes past the left edge.
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
 * The eight tuning props are deliberate. No app consumes this component, and
 * its demo exercises every one of them. A decorative surface earns its knobs,
 * so the zero-usage rule that deleted `delay` keeps the rest.
 *
 * @see {@link ShinyTextSkeleton} for the loading placeholder.
 */
export function ShinyText({
	disabled = false,
	speed = 2,
	color = 'var(--shiny-text-color)',
	shineColor = 'var(--shiny-text-shine)',
	spread = 120,
	yoyo = false,
	pauseOnHover = false,
	sweep = 'left',
	ref,
	className,
	children,
	style,
	onMouseEnter,
	onMouseLeave,
	...props
}: ShinyTextProps) {
	const reduceMotion = usePrefersReducedMotion()

	const from = sweep === 'left' ? OFF_RIGHT : OFF_LEFT

	const to = sweep === 'left' ? OFF_LEFT : OFF_RIGHT

	const position = useMotionValue(from)

	const backgroundPosition = useTransform(position, (p) => `${p}% center`)

	const controlsRef = useRef<AnimationPlaybackControls | null>(null)

	useEffect(() => {
		// Always re-park first: a mid-sweep `disabled` flip otherwise leaves the
		// shine frozen wherever the previous cleanup's `stop()` caught it.
		position.set(from)

		if (disabled || reduceMotion) return

		const controls = animate(position, to, {
			duration: speed,
			ease: 'linear',
			repeat: Number.POSITIVE_INFINITY,
			repeatType: yoyo ? 'reverse' : 'loop',
		})

		controlsRef.current = controls

		return () => {
			controls.stop()

			controlsRef.current = null
		}
	}, [disabled, reduceMotion, from, to, speed, yoyo, position])

	// A hover can pause the sweep. When `pauseOnHover` turns off during that
	// hover, the leave handler does not resume it, so resume it here.
	useEffect(() => {
		if (!pauseOnHover) controlsRef.current?.play()
	}, [pauseOnHover])

	// The handlers read the controls ref, so each is a stable event and not a
	// closure that render passes to a function.
	const pause = useStableEvent(() => {
		if (pauseOnHover) controlsRef.current?.pause()
	})

	const play = useStableEvent(() => {
		if (pauseOnHover) controlsRef.current?.play()
	})

	return (
		<motion.span
			ref={ref}
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
			// Composed after the spread so a consumer handler can't clobber
			// `pauseOnHover`. The pause is side behavior, so a consumer's
			// preventDefault() skips it (CONVENTIONS.md §3.9).
			onMouseEnter={composeEventHandlers(onMouseEnter, pause)}
			onMouseLeave={composeEventHandlers(onMouseLeave, play)}
		>
			{children}
		</motion.span>
	)
}
