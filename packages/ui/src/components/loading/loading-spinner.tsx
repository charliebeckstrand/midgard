import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k, type LoadingSpinnerVariants } from '../../recipes/kata/loading'

/** Props for {@link LoadingSpinner}: recipe `size`/`color` plus an `sr-only` label and native `<output>` attributes. */
export type LoadingSpinnerProps = LoadingSpinnerVariants & {
	/**
	 * Accessible label announced via the visually hidden `sr-only` span.
	 * @defaultValue 'Loading'
	 */
	label?: string
	className?: string
} & Omit<ComponentProps<'output'>, 'className' | 'color'>

const SPINNER_SVG = (
	<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full">
		<circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
		<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
	</svg>
)

/**
 * Indeterminate loading indicator rendered as a live `<output>` with an
 * `sr-only` `label`. Static leaf: renders in React Server Components. Without
 * `size`, the spinner takes the step of the nearest density scope, and `md`
 * outside one. An explicit `size` makes the spinner its own scope. Inside a
 * control affix slot, a `<Button>`, or a `<SidebarItem>`, the projection of
 * the parent sets the size. A `<Badge>` is a density host: its projection sets
 * the size of a spinner with no `size`.
 */
export function LoadingSpinner({
	size,
	color,
	label = 'Loading',
	className,
	...props
}: LoadingSpinnerProps) {
	return (
		<output
			data-slot="loading-spinner"
			data-density={size}
			className={cn(k.spinner({ color }), className)}
			{...props}
		>
			{SPINNER_SVG}
			<span className="sr-only">{label}</span>
		</output>
	)
}
