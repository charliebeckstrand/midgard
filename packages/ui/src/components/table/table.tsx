import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import { DensityScope } from '../../primitives/density'
// Deep import on purpose: context.ts is the directive-free level
// vocabulary (DensityLevel, densityToSize); the barrel would pull the
// client DensityProvider into the graph.
import { type DensityLevel, densityToSize } from '../../providers/density/context'
import { k } from '../../recipes/kata/table'

/** Visual modifiers for {@link Table}: `density`, full-`bleed`, `outline` borders, zebra `striped` rows, and a `hover` row wash. */
export type TableVariants = {
	/**
	 * Density level driving cell padding. The table projects the padding onto
	 * its descendant cells and opens a density scope. Static cell content
	 * follows the scope through `data-density`, and client cell content through
	 * context. Omit it to follow the nearest density scope, or `'snug'` outside
	 * a scope.
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
export type TableElementProps = ComponentProps<'table'> & {
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
 * TableHeader read no context. Without `density`, the table follows the
 * nearest density scope.
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
	const step = density && densityToSize[density]

	// `true` keeps the historical default of shading even rows.
	const stripe = striped === true ? 'even' : striped

	return (
		// Known gap: the scroll container takes no `tabIndex` and carries no
		// accessible name, so a keyboard-only user cannot scroll an overflowing
		// table (WCAG 2.1.1). Modern Chromium focuses overflow scrollers on its
		// own; other engines do not.
		<div data-slot="table" className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}>
			<table
				{...tableProps}
				data-density={step}
				className={cn(
					k.base,
					k.projection.density({ size: step }),
					outline && k.projection.outline,
					stripe && k.projection.striped[stripe],
					hover && k.projection.hover,
					className,
					tableProps?.className,
				)}
			>
				<DensityScope scale={step}>{children}</DensityScope>
			</table>
		</div>
	)
}
