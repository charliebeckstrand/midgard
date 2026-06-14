'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import { motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { type ComponentPropsWithoutRef, type Ref, useEffect, useRef } from 'react'
import { cn } from '../../core'

/** Props for {@link ShinyText}; tunes the sweep animation, gradient colors, and hover behavior atop a `<span>`. */
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
	 * Base text color; any CSS color.
	 * @defaultValue `'var(--shiny-text-color)'` (zinc-600; zinc-400 in dark mode)
	 */
	color?: string
	/**
	 * Highlight color swept across the text; any CSS color.
	 * @defaultValue `'var(--color-white)'`
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
	 * Travel direction of the shine.
	 * @defaultValue `'left'`
	 */
	direction?: 'left' | 'right'
	/**
	 * Seconds held between cycles.
	 * @defaultValue 0
	 */
	delay?: number
	ref?: Ref<HTMLSpanElement>
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'color'>

// Background-position percentages that park the shine past each edge.
const OFF_RIGHT = 150
const OFF_LEFT = -50

/**
 * Text masked by a gradient whose highlight sweeps across it on a loop.
 *
 * @remarks
 * The sweep is driven by an imperative `animate()` outside any `MotionConfig`,
 * so the hook reads the OS preference directly and renders static text under
 * reduced motion (WCAG 2.3.3).
 *
 * @see {@link ShinyTextSkeleton} for the loading placeholder.
 */
export function ShinyText({
	disabled = false,
	speed = 2,
	color = 'var(--shiny-text-color)',
	shineColor = 'var(--color-white)',
	spread = 120,
	yoyo = false,
	pauseOnHover = false,
	direction = 'left',
	delay = 0,
	ref,
	className,
	children,
	onMouseEnter,
	onMouseLeave,
	...props
}: ShinyTextProps) {
	const reduceMotion = useReducedMotion()

	const from = direction === 'left' ? OFF_RIGHT : OFF_LEFT

	const to = direction === 'left' ? OFF_LEFT : OFF_RIGHT

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
			repeatDelay: delay,
		})

		controlsRef.current = controls

		return () => {
			controls.stop()

			controlsRef.current = null
		}
	}, [disabled, reduceMotion, from, to, speed, yoyo, delay, position])

	return (
		<motion.span
			ref={ref}
			data-slot="shiny-text"
			className={cn(
				'inline-block bg-clip-text text-transparent',
				'[--shiny-text-color:var(--color-zinc-600)] dark:[--shiny-text-color:var(--color-zinc-400)]',
				className,
			)}
			style={{
				backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
				backgroundSize: '200% auto',
				backgroundPosition,
			}}
			{...(props as Omit<
				ComponentPropsWithoutRef<'span'>,
				'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
			>)}
			// Composed after the spread so a consumer handler can't clobber
			// `pauseOnHover`; both run.
			onMouseEnter={(e) => {
				onMouseEnter?.(e)

				if (pauseOnHover) controlsRef.current?.pause()
			}}
			onMouseLeave={(e) => {
				onMouseLeave?.(e)

				if (pauseOnHover) controlsRef.current?.play()
			}}
		>
			{children}
		</motion.span>
	)
}
