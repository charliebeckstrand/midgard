'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type LoadingOrbVariants } from '../../recipes/kata/loading'

/** Props for {@link LoadingOrb}: recipe `size`, the loading `color` axis extended with `rainbow`, an `sr-only` label, and native `<output>` attributes. */
export type LoadingOrbProps = Omit<LoadingOrbVariants, 'color'> & {
	/**
	 * Orb colour. Chromatic values share the loading colour axis; `rainbow`
	 * swaps the monochrome sphere for a slowly revolving spectrum blend.
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
	'radial-gradient(circle at 33% 30%, color-mix(in oklab, currentColor 40%, white) 0%, currentColor 70%)'

// Spectrum blend interpolated in oklch so neighbouring hues stay vivid where
// sRGB interpolation would grey out; the first and last stops match so the
// seam disappears while the layer revolves.
const RAINBOW_SPHERE =
	'conic-gradient(from 0deg in oklch, var(--color-rose-400), var(--color-amber-300), var(--color-lime-300), var(--color-cyan-300), var(--color-blue-400), var(--color-violet-400), var(--color-rose-400))'

// The conic layer has no inherent light source, so a separate specular
// highlight restores the spherical read — and stays put while the spectrum
// revolves beneath it.
const RAINBOW_HIGHLIGHT =
	'radial-gradient(circle at 33% 30%, rgb(255 255 255 / 0.6) 0%, transparent 55%)'

// One shared cycle keeps the halo's bloom and the core's swell in phase — the
// layers inhale and exhale together.
const BREATHE = {
	duration: 2.4,
	ease: 'easeInOut',
	repeat: Number.POSITIVE_INFINITY,
} as const

const REVOLVE = {
	duration: 6,
	ease: 'linear',
	repeat: Number.POSITIVE_INFINITY,
} as const

/**
 * Indeterminate loading indicator: a gradient sphere that breathes — the core
 * swells against a blurred halo that blooms in phase. Rendered as a live
 * `<output>` with an `sr-only` `label`. Client component (framer `motion.*`),
 * unlike its static {@link LoadingSpinner} / {@link LoadingDots} siblings.
 * `size` is explicit (recipe default `md`).
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

	const sphere = rainbow ? RAINBOW_SPHERE : MONO_SPHERE

	return (
		<output
			data-slot="loading-orb"
			className={cn(k.orb({ size, color: rainbow ? 'current' : color }), className)}
			{...props}
		>
			<motion.span
				aria-hidden="true"
				data-slot="loading-orb-halo"
				className="absolute -inset-[15%] rounded-full opacity-40 blur-xs"
				style={{ background: sphere }}
				animate={reduceMotion ? undefined : { scale: [1, 1.25, 1], opacity: [0.3, 0.65, 0.3] }}
				transition={BREATHE}
			/>
			<motion.span
				aria-hidden="true"
				data-slot="loading-orb-core"
				className="absolute inset-0 rounded-full"
				animate={reduceMotion ? undefined : { scale: [1, 1.12, 1] }}
				transition={BREATHE}
			>
				<motion.span
					className="absolute inset-0 rounded-full"
					style={{ background: sphere }}
					animate={rainbow && !reduceMotion ? { rotate: 360 } : undefined}
					transition={REVOLVE}
				/>
				{rainbow && (
					<span
						className="absolute inset-0 rounded-full"
						style={{ background: RAINBOW_HIGHLIGHT }}
					/>
				)}
			</motion.span>
			<span className="sr-only">{label}</span>
		</output>
	)
}
