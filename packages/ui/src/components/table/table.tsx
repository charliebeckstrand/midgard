import { Children, type ComponentProps, isValidElement, type ReactNode } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { k, type scale } from '../../recipes/kata/table'
import { TableCaption, type TableCaptionProps } from './table-caption'
import { TableScroll } from './table-scroll'

/** Visual modifiers for {@link Table}: the `size` step, full-`bleed`, `outline` borders, zebra `striped` rows, and a `hover` row wash. */
export type TableVariants = {
	/**
	 * The density step of the cell padding. Omit it to take the step of the
	 * nearest density scope. A step makes the table a density scope, and the
	 * cells take it.
	 */
	size?: ScaleStep<typeof scale>
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
 * While the table is wider than its container, the scroll container is a tab
 * stop, so a keyboard user can scroll it with the arrow keys. It then also
 * takes `role="region"` and the name of the table, from `aria-label` or
 * `aria-labelledby` in `tableProps`, else from a {@link TableCaption} child. A
 * table that fits adds no tab stop.
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

	// A caption names the scroll region too, through its id or its plain text.
	const caption = captionProps(children)

	const captionText = typeof caption?.children === 'string' ? caption.children : undefined

	return (
		<TableScroll
			density={size}
			label={tableProps?.['aria-label'] ?? (caption?.id ? undefined : captionText)}
			labelledBy={tableProps?.['aria-labelledby'] ?? caption?.id}
			className={cn(k.scroll, bleed && '-mx-4 sm:-mx-6')}
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
		</TableScroll>
	)
}

/** Finds the props of a {@link TableCaption} child, which the scroll region takes its name from. */
function captionProps(children: ReactNode): TableCaptionProps | undefined {
	for (const child of Children.toArray(children)) {
		if (isValidElement<TableCaptionProps>(child) && child.type === TableCaption) return child.props
	}

	return undefined
}
