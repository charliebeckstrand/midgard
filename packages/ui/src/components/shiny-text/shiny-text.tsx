'use client'

import { type AnimationPlaybackControls, animate } from 'motion'
import { motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { type ComponentPropsWithoutRef, type Ref, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useSkeleton } from '../../providers/skeleton'
import { ShinyTextSkeleton } from './shiny-text-skeleton'

export type ShinyTextProps = {
	/** Halt the sweep, leaving the shine parked off-screen so only the base color shows. */
	disabled?: boolean
	/** Seconds per sweep. @default 2 */
	speed?: number
	/** Base text color; any CSS color. @default 'currentColor' */
	color?: string
	/** Highlight color swept across the text; any CSS color. @default 'var(--color-white)' */
	shineColor?: string
	/** Gradient angle in degrees. @default 120 */
	spread?: number
	/** Reverse on each cycle instead of jumping back to the start. */
	yoyo?: boolean
	/** Pause the sweep while the pointer is over the text. */
	pauseOnHover?: boolean
	/** Travel direction of the shine. @default 'left' */
	direction?: 'left' | 'right'
	/** Seconds held between cycles. @default 0 */
	delay?: number
	ref?: Ref<HTMLSpanElement>
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'color'>

// Background-position percentages that park the shine just past each edge.
const OFF_RIGHT = 150
const OFF_LEFT = -50

/**
 * Text masked by a gradient whose highlight sweeps across it on a loop. The
 * sweep is driven by an imperative `animate()` outside any `MotionConfig`, so
 * the hook reads the OS preference directly and renders static text under
 * reduced motion (WCAG 2.3.3). Degrades to a skeleton under that provider.
 */
export function ShinyText({
	disabled = false,
	speed = 2,
	color = 'currentColor',
	shineColor = 'var(--color-white)',
	spread = 120,
	yoyo = false,
	pauseOnHover = false,
	direction = 'left',
	delay = 0,
	ref,
	className,
	children,
	...props
}: ShinyTextProps) {
	const reduceMotion = useReducedMotion()

	const skeleton = useSkeleton()

	const from = direction === 'left' ? OFF_RIGHT : OFF_LEFT

	const to = direction === 'left' ? OFF_LEFT : OFF_RIGHT

	const position = useMotionValue(from)

	const backgroundPosition = useTransform(position, (p) => `${p}% center`)

	const controlsRef = useRef<AnimationPlaybackControls | null>(null)

	useEffect(() => {
		if (disabled || reduceMotion || skeleton) return

		position.set(from)

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
	}, [disabled, reduceMotion, skeleton, from, to, speed, yoyo, delay, position])

	if (skeleton) {
		return <ShinyTextSkeleton className={className} />
	}

	return (
		<motion.span
			ref={ref}
			data-slot="shiny-text"
			className={cn('inline-block bg-clip-text text-transparent', className)}
			style={{
				backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
				backgroundSize: '200% auto',
				backgroundPosition,
			}}
			onMouseEnter={pauseOnHover ? () => controlsRef.current?.pause() : undefined}
			onMouseLeave={pauseOnHover ? () => controlsRef.current?.play() : undefined}
			{...(props as Omit<
				ComponentPropsWithoutRef<'span'>,
				'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
			>)}
		>
			{children}
		</motion.span>
	)
}
