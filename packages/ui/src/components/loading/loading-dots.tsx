import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type LoadingDotsVariants } from '../../recipes/kata/loading'

/** Props for {@link LoadingDots}: recipe `size`/`color` plus an `sr-only` label and native `<output>` attributes. */
export type LoadingDotsProps = LoadingDotsVariants & {
	/**
	 * Accessible label announced via the visually hidden `sr-only` span.
	 * @defaultValue 'Loading'
	 */
	label?: string
	className?: string
} & Omit<ComponentPropsWithoutRef<'output'>, 'className' | 'color'>

// Negative delays seat each dot at a different point in the pulse cycle;
// the wave staggers from first paint. Keyed by the (unique) delay class.
//
// Each dot carries `data-slot="loading-dot"` so a host recipe (e.g. the button
// kata) can project a diameter onto the dots via `data-[slot=loading-dots] >
// [data-slot=loading-dot]` without also hitting the `sr-only` label span.
const DOT_DELAYS = [
	'motion-safe:[animation-delay:-300ms]',
	'motion-safe:[animation-delay:-150ms]',
	'motion-safe:[animation-delay:0ms]',
] as const

/**
 * Indeterminate loading indicator: three breathing dots rendered as a live
 * `<output>` with an `sr-only` `label`. Static leaf: renders in React Server
 * Components. `size` is explicit (recipe default `md`); inside a host that
 * projects onto the `loading-dots` slot (the button kata) the projection owns
 * the diameter and gap.
 */
export function LoadingDots({
	size,
	color,
	label = 'Loading',
	className,
	...props
}: LoadingDotsProps) {
	return (
		<output data-slot="loading-dots" className={cn(k({ size, color }), className)} {...props}>
			{DOT_DELAYS.map((delay) => (
				<span
					key={delay}
					data-slot="loading-dot"
					aria-hidden="true"
					className={cn(k.dot({ size }), delay)}
				/>
			))}
			<span className="sr-only">{label}</span>
		</output>
	)
}
