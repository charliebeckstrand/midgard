import type { ComponentProps } from 'react'
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
} & Omit<ComponentProps<'output'>, 'className' | 'color'>

// Negative delays seat each dot at a different point in the pulse cycle;
// the wave staggers from first paint. Keyed by the (unique) delay class.
const DOT_DELAYS = [
	'motion-safe:[animation-delay:-300ms]',
	'motion-safe:[animation-delay:-150ms]',
	'motion-safe:[animation-delay:0ms]',
] as const

// The class of each dot. It takes no input, so it is built once.
const dotClass = k.dot()

/**
 * Indeterminate loading indicator: three breathing dots rendered as a live
 * `<output>` with an `sr-only` `label`. Static leaf: renders in React Server
 * Components. Without `size`, the dots take the step of the nearest density
 * scope. An explicit `size` makes the dots a density scope. Inside a
 * `<Button>`, the projection of the button sets the size of each dot, as it
 * does for a spinner.
 */
export function LoadingDots({
	size,
	color,
	label = 'Loading',
	className,
	...props
}: LoadingDotsProps) {
	return (
		<output
			data-slot="loading-dots"
			data-density={size}
			className={cn(k({ color }), className)}
			{...props}
		>
			{DOT_DELAYS.map((delay) => (
				<span
					key={delay}
					data-slot="loading-dot"
					aria-hidden="true"
					className={cn(dotClass, delay)}
				/>
			))}
			<span className="sr-only">{label}</span>
		</output>
	)
}
