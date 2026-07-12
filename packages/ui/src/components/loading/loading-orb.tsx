'use client'

import { motion, type TargetAndTransition, type Transition, useReducedMotion } from 'motion/react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type LoadingOrbVariants } from '../../recipes/kata/loading'

/** Props for {@link LoadingOrb}: recipe `size`, the loading `color` axis extended with `rainbow`, an `sr-only` label, and native `<output>` attributes. */
export type LoadingOrbProps = Omit<LoadingOrbVariants, 'color'> & {
	/**
	 * Orb colour. Chromatic values share the loading colour axis; `rainbow`
	 * fills the blob with a luminous base swept by a slow pastel gradient.
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

// Luminous base under the rainbow sweep: white centre easing to a pale violet
// rim so the blob keeps a defined edge on light surfaces.
const RAINBOW_BASE =
	'radial-gradient(circle at 50% 42%, var(--color-white) 0%, var(--color-violet-100) 60%, var(--color-violet-200) 100%)'

// The sweep layer is oversized (inset -90%) and its conic focal point sits at
// 28% 28% of that expanse — outside the visible blob — so no colour-wedge
// convergence is ever in frame; only smooth bands drift through.
const RAINBOW_SWEEP =
	'conic-gradient(from 0deg at 28% 28%, var(--color-teal-300), var(--color-sky-300), var(--color-violet-400), var(--color-pink-300), var(--color-teal-300))'

// A soft bright centre keeps the blob reading as lit from within; it fades
// out well before the silhouette so the sweep owns the edges.
const RAINBOW_GLOW =
	'radial-gradient(circle at 45% 40%, rgb(255 255 255 / 0.7) 0%, transparent 42%)'

// The silhouette morphs in place — asymmetric radii with a slight swell, no
// rotation. Stops are uneven so the cycle reads as organic rather than a
// metronome; first and last match for a seamless loop.
const MORPH_RADII = [
	'66% 34% 58% 42% / 46% 64% 36% 54%',
	'40% 60% 44% 56% / 62% 38% 60% 40%',
	'56% 44% 66% 34% / 38% 60% 40% 62%',
	'44% 56% 38% 62% / 58% 42% 64% 36%',
	'66% 34% 58% 42% / 46% 64% 36% 54%',
]

const MORPH_ANIMATE: TargetAndTransition = {
	borderRadius: MORPH_RADII,
	scale: [0.96, 1.04, 0.93, 1.02, 0.96],
}

const MORPH_TRANSITION: Transition = {
	duration: 4.2,
	ease: 'easeInOut',
	repeat: Number.POSITIVE_INFINITY,
}

const SWEEP_TRANSITION: Transition = {
	duration: 14,
	ease: 'linear',
	repeat: Number.POSITIVE_INFINITY,
}

/**
 * Indeterminate loading indicator: a gradient blob that continuously morphs
 * in place — an organic wobble, never a spin. Rendered as a live `<output>`
 * with an `sr-only` `label`. Client component (framer `motion.*`), unlike its
 * static {@link LoadingSpinner} / {@link LoadingDots} siblings. `size` is
 * explicit (recipe default `md`).
 *
 * @remarks
 * The loop reads `prefers-reduced-motion` via `useReducedMotion` and rests as
 * a static circular orb when reduction is requested (WCAG 2.3.3).
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
				data-slot="loading-orb-blob"
				className="absolute inset-[3%] overflow-hidden rounded-full"
				style={{ background: rainbow ? RAINBOW_BASE : MONO_SPHERE }}
				animate={reduceMotion ? undefined : MORPH_ANIMATE}
				transition={MORPH_TRANSITION}
			>
				{rainbow && (
					<>
						<motion.span
							className="absolute inset-[-90%] opacity-80"
							style={{ background: RAINBOW_SWEEP }}
							animate={reduceMotion ? undefined : { rotate: 360 }}
							transition={SWEEP_TRANSITION}
						/>
						<span className="absolute inset-0" style={{ background: RAINBOW_GLOW }} />
					</>
				)}
			</motion.span>
			<span className="sr-only">{label}</span>
		</output>
	)
}
