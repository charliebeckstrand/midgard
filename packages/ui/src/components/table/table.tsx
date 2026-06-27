import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { cn } from '../../core'
// Deep import on purpose: context.ts is the directive-free level
// vocabulary (DensityLevel, densityToSize); the barrel would pull the
// client DensityProvider into the graph.
import { type DensityLevel, densityToSize } from '../../providers/density/context'
import { k } from '../../recipes/kata/table'

/** Visual modifiers for {@link Table}: `density`, full-`bleed`, `outline` borders, zebra `striped` rows, and a `hover` row wash. */
export type TableVariants = {
	/**
	 * Density level driving cell padding. Explicit: the table projects the
	 * resolved padding onto its descendant cells.
	 * @defaultValue 'snug'
	 */
	density?: DensityLevel
	bleed?: boolean
	/** Draw hairline borders around every cell. @defaultValue false */
	outline?: boolean
	/**
	 * Zebra-stripe the body rows. `true` shades even rows (equivalent to
	 * `'even'`); pass `'odd'` to shade odd rows instead.
	 * @defaultValue false
	 */
	striped?: boolean | 'odd' | 'even'
	/**
	 * Wash the body row under the pointer with the standard hover tint,
	 * projected from the `<table>` onto its `tbody` rows. An interactive
	 * variant, so it out-cascades the {@link TableVariants.striped} shade on the
	 * hovered row. Header rows are untouched.
	 * @defaultValue false
	 */
	hover?: boolean
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
 * The table owns `density`, `outline`, `striped`, and `hover` and projects
 * them onto descendant rows and cells, so TableBody, TableCell, and
 * TableHeader read no context.
 *
 * @remarks
 * Projection reaches descendant cells through DOM selectors, not React
 * context, so the native table semantics (`<thead>`/`<tbody>`/`<th scope>`)
 * stay intact for assistive tech. Pass `role="grid"` via `tableProps` only
 * for composite-widget tables that add a roving keyboard model.
 * @see {@link TableVariants} for the modifier axes.
 * @see {@link TableLoading} and {@link TableEmpty} for the loading and empty bodies.
 */
export function Table({
	bleed,
	outline,
	striped,
	hover,
	density,
	className,
	children,
	tableProps,
}: TableProps) {
	// 'snug' maps to the md step.
	const step = densityToSize[density ?? 'snug']

	// `true` keeps the historical default of shading even rows.
	const stripe = striped === true ? 'even' : striped

	return (
		<div data-slot="table" className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}>
			<table
				{...tableProps}
				data-density={step}
				className={cn(
					k.base,
					k.projection.density[step],
					outline && k.projection.outline,
					stripe && k.projection.striped[stripe],
					hover && k.projection.hover,
					className,
					tableProps?.className,
				)}
			>
				{children}
			</table>
		</div>
	)
}
