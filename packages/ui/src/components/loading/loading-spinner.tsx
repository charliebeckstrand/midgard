import type { ComponentPropsWithoutRef } from 'react'
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
} & Omit<ComponentPropsWithoutRef<'output'>, 'className' | 'color'>

const SPINNER_SVG = (
	<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full">
		<circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
		<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
	</svg>
)

/**
 * Indeterminate loading indicator rendered as a live `<output>` with an
 * `sr-only` `label`. Static leaf: renders in React Server Components. `size`
 * is explicit (recipe default `md`); inside a control affix slot the slot's
 * projection owns it.
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
			className={cn(k.spinner({ size, color }), className)}
			{...props}
		>
			{SPINNER_SVG}
			<span className="sr-only">{label}</span>
		</output>
	)
}
