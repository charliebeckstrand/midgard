'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type LoadingOrbVariants } from '../../recipes/kata/loading'

/** Props for {@link LoadingOrb}: recipe `size`, the loading `color` axis extended with `rainbow`, an `sr-only` label, and native `<output>` attributes. */
export type LoadingOrbProps = Omit<LoadingOrbVariants, 'color'> & {
	/**
	 * Orb colour. Chromatic values share the loading colour axis; `rainbow`
	 * swaps the monochrome sphere for a luminous aurora blend of drifting
	 * pastel tints.
	 * @defaultValue 'current'
	 */
	color?: NonNullable<LoadingOrbVariants['color']> | 'rainbow'
	/**
	 * Accessible label announced via the visually hidden `sr-only` span.
	 * @defaultValue 'Loading'
	 */
	label?: string
	className?: string
} & Omit<ComponentPropsWithoutRef<'output'>, 'className' | 'color'>

// Spherical shading from a single gradient: a lightened highlight offset
// toward the upper left over a currentColor body, so the recipe's colour axis
// drives every monochrome value.
const MONO_SPHERE =
	'radial-gradient(circle at 33% 30%, color-mix(in oklab, currentColor 50%, white) 0%, currentColor 58%)'

// Luminous base under the aurora tints: white centre easing to a pale violet
// rim so the orb keeps a defined edge on light surfaces.
const RAINBOW_BASE =
	'radial-gradient(circle at 50% 42%, var(--color-white) 0%, var(--color-violet-100) 62%, var(--color-violet-200) 100%)'

// Each tint is an off-centre soft radial; rotating its layer about the orb's
// centre orbits the blob. Durations are deliberately co-prime-ish and
// directions alternate so the tints drift and blend organically instead of
// reading as one spinning wheel.
const RAINBOW_TINTS = [
	{
		background: 'radial-gradient(circle at 30% 72%, var(--color-teal-300) 0%, transparent 80%)',
		duration: 4.8,
		direction: 1,
	},
	{
		background: 'radial-gradient(circle at 72% 62%, var(--color-pink-300) 0%, transparent 80%)',
		duration: 6.4,
		direction: -1,
	},
	{
		background: 'radial-gradient(circle at 52% 20%, var(--color-violet-400) 0%, transparent 78%)',
		duration: 7.6,
		direction: 1,
	},
	{
		background: 'radial-gradient(circle at 76% 30%, var(--color-sky-300) 0%, transparent 75%)',
		duration: 5.6,
		direction: -1,
	},
] as const

// A soft bright centre over the drifting tints keeps the orb reading as one
// lit sphere. Kept small and translucent so the tints' falloff washes through
// the middle rather than leaving a fixed white hole.
const RAINBOW_GLOW =
	'radial-gradient(circle at 45% 40%, rgb(255 255 255 / 0.65) 0%, transparent 38%)'

// One shared cycle keeps the halo's bloom and the core's swell in phase — the
// layers inhale and exhale together.
const BREATHE = {
	duration: 2.4,
	ease: 'easeInOut',
	repeat: Number.POSITIVE_INFINITY,
} as const

/**
 * Indeterminate loading indicator: a gradient sphere that breathes — the core
 * swells against a subtle blurred halo that blooms in phase. Rendered as a
 * live `<output>` with an `sr-only` `label`. Client component (framer
 * `motion.*`), unlike its static {@link LoadingSpinner} / {@link LoadingDots}
 * siblings. `size` is explicit (recipe default `md`).
 *
 * @remarks
 * The loop reads `prefers-reduced-motion` via `useReducedMotion` and rests as
 * a static orb when reduction is requested (WCAG 2.3.3).
 */
export function LoadingOrb({
	size,
	color = 'current',
	label = 'Loading',
	className,
	...props
}: LoadingOrbProps) {
	const reduceMotion = useReducedMotion()

	const rainbow = color === 'rainbow'

	return (
		<output
			data-slot="loading-orb"
			className={cn(k.orb({ size, color: rainbow ? 'current' : color }), className)}
			{...props}
		>
			<motion.span
				aria-hidden="true"
				data-slot="loading-orb-halo"
				className="absolute inset-[-8%] rounded-full opacity-15 blur-xs"
				style={{ background: rainbow ? RAINBOW_BASE : MONO_SPHERE }}
				animate={reduceMotion ? undefined : { scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }}
				transition={BREATHE}
			/>
			<motion.span
				aria-hidden="true"
				data-slot="loading-orb-core"
				className="absolute inset-0 overflow-hidden rounded-full"
				animate={reduceMotion ? undefined : { scale: [1, 1.12, 1] }}
				transition={BREATHE}
			>
				{rainbow ? (
					<>
						<span className="absolute inset-0" style={{ background: RAINBOW_BASE }} />
						{RAINBOW_TINTS.map(({ background, duration, direction }) => (
							<motion.span
								key={background}
								className="absolute inset-0"
								style={{ background }}
								animate={reduceMotion ? undefined : { rotate: 360 * direction }}
								transition={{ duration, ease: 'linear', repeat: Number.POSITIVE_INFINITY }}
							/>
						))}
						<span className="absolute inset-0" style={{ background: RAINBOW_GLOW }} />
					</>
				) : (
					<span className="absolute inset-0" style={{ background: MONO_SPHERE }} />
				)}
			</motion.span>
			<span className="sr-only">{label}</span>
		</output>
	)
}
