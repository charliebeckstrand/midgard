'use client'

import { type ReactNode, type Ref, type TableHTMLAttributes, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'
import { type TableContextValue, TableProvider } from './context'

export type TableVariants = {
	dense?: boolean
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

export type TableElementProps = TableHTMLAttributes<HTMLTableElement> & {
	ref?: Ref<HTMLTableElement>
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
	dense,
	grid,
	striped,
	className,
	children,
	tableProps,
}: TableProps) {
	const ctx = useMemo<TableContextValue>(
		() => ({
			bleed: bleed ?? false,
			dense: dense ?? false,
			grid: grid ?? false,
			striped: striped ?? false,
		}),
		[bleed, dense, grid, striped],
	)

	return (
		<TableProvider value={ctx}>
			<div data-slot="table" className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}>
				<table {...tableProps} className={cn(k.base, className, tableProps?.className)}>
					{children}
				</table>
			</div>
		</TableProvider>
	)
}
