import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/table'
import { Box } from '../../structure/box'

/** Visual modifiers for {@link Table}: the `size` step, full-`bleed`, `outline` borders, zebra `striped` rows, and a `hover` row wash. */
export type TableVariants = {
	/**
	 * Step for the cell padding. The table opens a density scope at this step,
	 * and the cells take it. Omit it to follow the nearest density scope, and `md`
	 * outside one.
	 */
	size?: Step
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
 * The table owns `outline`, `striped`, and `hover` and projects them onto
 * descendant rows and cells. A `size` makes the scroll container a density
 * scope (Box `density`), so the cells and size-aware client children take its
 * step. Without a `size`, the cells follow the nearest scope around the
 * table. TableBody, TableCell, and TableHeader read
 * no context.
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
	size,
	className,
	children,
	tableProps,
}: TableProps) {
	// `true` keeps the historical default of shading even rows.
	const stripe = striped === true ? 'even' : striped

	return (
		// Known gap: the scroll container takes no `tabIndex` and carries no
		// accessible name, so a keyboard-only user cannot scroll an overflowing
		// table (WCAG 2.1.1). Modern Chromium focuses overflow scrollers on its
		// own; other engines do not.
		<Box
			data-slot="table"
			density={size}
			className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}
		>
			<table
				{...tableProps}
				className={cn(
					k.base,
					outline && k.projection.outline,
					stripe && k.projection.striped[stripe],
					hover && k.projection.hover,
					className,
					tableProps?.className,
				)}
			>
				{children}
			</table>
		</Box>
	)
}
