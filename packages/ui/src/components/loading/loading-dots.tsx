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
const DOT_DELAYS = [
	'motion-safe:[animation-delay:-300ms]',
	'motion-safe:[animation-delay:-150ms]',
	'motion-safe:[animation-delay:0ms]',
] as const

/**
 * Indeterminate loading indicator: three breathing dots rendered as a live
 * `<output>` with an `sr-only` `label`. Static leaf: renders in React Server
 * Components. `size` is explicit (recipe default `md`).
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
				<span key={delay} aria-hidden="true" className={cn(k.dot({ size }), delay)} />
			))}
			<span className="sr-only">{label}</span>
		</output>
	)
}
