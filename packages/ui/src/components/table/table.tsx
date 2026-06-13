import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../core'
// Deep import on purpose: context.ts is the directive-free level
// vocabulary (DensityLevel, densityToSize); the barrel would pull the
// client DensityProvider into the graph.
import { type DensityLevel, densityToSize } from '../../providers/density/context'
import { k } from '../../recipes/kata/table'

/** Visual modifiers for {@link Table}: `density`, full-`bleed`, `grid` borders, and zebra `striped` rows. */
export type TableVariants = {
	/**
	 * Density level driving cell padding. Explicit. The table projects the
	 * resolved padding onto its descendant cells. @default 'snug' (the md step)
	 */
	density?: DensityLevel
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

/** Attributes spread onto the underlying `<table>` element, including a `ref` and arbitrary `data-*` keys. */
export type TableElementProps = ComponentPropsWithoutRef<'table'> & {
	ref?: Ref<HTMLTableElement>
	[key: `data-${string}`]: string | number | boolean | undefined
}

/** Props for {@link Table}: the {@link TableVariants} modifiers plus a `tableProps` escape hatch onto the `<table>` element. */
export type TableProps = TableVariants & {
	className?: string
	children?: ReactNode
	/**
	 * Props spread onto the underlying `<table>` element. Use to attach a ref,
	 * keyboard handlers, or ARIA attributes (e.g. `role="grid"` for composite
	 * widgets) directly to the semantic element.
	 */
	tableProps?: TableElementProps
}

/**
 * Styled `<table>` shell. Static leaf: renders in React Server Components.
 * The table owns `density`, `grid`, and `striped` and projects them onto
 * descendant rows and cells, so TableBody, TableCell, and TableHeader read
 * no context.
 */
export function Table({
	bleed,
	grid,
	striped,
	density,
	className,
	children,
	tableProps,
}: TableProps) {
	// 'snug' maps to the md step.
	const step = densityToSize[density ?? 'snug']

	return (
		<div data-slot="table" className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}>
			<table
				{...tableProps}
				data-density={step}
				className={cn(
					k.base,
					k.projection.density[step],
					grid && k.projection.grid,
					striped && k.projection.striped,
					className,
					tableProps?.className,
				)}
			>
				{children}
			</table>
		</div>
	)
}
