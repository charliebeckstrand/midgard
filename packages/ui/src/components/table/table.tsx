'use client'

import { type ReactNode, type Ref, type TableHTMLAttributes, useMemo } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { type DensityLevel, densityToSize } from '../../providers/density'
import { k } from '../../recipes/kata/table'
import { type TableContextValue, TableProvider } from './context'

export type TableVariants = {
	/**
	 * Density level driving cell padding. Resolves through
	 * `explicit ?? Density ?? 'snug'` — so `<Density density="compact">`,
	 * or any size-providing surface (Card, Drawer, Popover, Group), tightens
	 * the table automatically. Internally the resolved value is converted to
	 * the `Step` shared with every other size-aware component.
	 */
	density?: DensityLevel
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

export type TableElementProps = TableHTMLAttributes<HTMLTableElement> & {
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

	const resolvedSize = density ? densityToSize[density] : inherited.size

	const context = useMemo<TableContextValue>(
		() => ({
			size: resolvedSize,
			grid: grid ?? false,
			striped: striped ?? false,
		}),
		[resolvedSize, grid, striped],
	)

	return (
		<TableProvider value={context}>
			<div data-slot="table" className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}>
				<table {...tableProps} className={cn(k.base, className, tableProps?.className)}>
					{children}
				</table>
			</div>
		</TableProvider>
	)
}
