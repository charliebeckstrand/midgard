'use client'

import { type ComponentPropsWithoutRef, type ReactNode, type Ref, useMemo } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { type DensityLevel, densityToSize } from '../../providers/density'
import { k } from '../../recipes/kata/table'
import { TableContext, type TableContextValue } from './context'

export type TableVariants = {
	/**
	 * Density level driving cell padding. Resolves through
	 * `explicit ?? Density.density ?? 'snug'` — so `<DensityProvider
	 * density="compact">`, or any density-providing surface (Card, Drawer,
	 * Popover, Group), tightens the table automatically. The explicit prop is
	 * converted to the `Step` carried by the universal Density token.
	 */
	density?: DensityLevel
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

export type TableElementProps = ComponentPropsWithoutRef<'table'> & {
	ref?: Ref<HTMLTableElement>
	[key: `data-${string}`]: string | number | boolean | undefined
}

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

/** Styled `<table>` shell that shares `grid`, `striped`, and resolved density via context to its rows and cells — `density` resolves through `explicit ?? Density.density ?? 'snug'`. */
export function Table({
	bleed,
	grid,
	striped,
	density,
	className,
	children,
	tableProps,
}: TableProps) {
	const inherited = useDensity()

	// Cell padding is a density concern, so read the density axis (not size);
	// the explicit DensityLevel prop still wins.
	const resolvedDensity = density ? densityToSize[density] : inherited.density

	const context = useMemo<TableContextValue>(
		() => ({
			density: resolvedDensity,
			grid: grid ?? false,
			striped: striped ?? false,
		}),
		[resolvedDensity, grid, striped],
	)

	return (
		<TableContext value={context}>
			<div data-slot="table" className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}>
				<table {...tableProps} className={cn(k.base, className, tableProps?.className)}>
					{children}
				</table>
			</div>
		</TableContext>
	)
}
