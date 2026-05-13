'use client'

import { type ComponentPropsWithoutRef, type Ref, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'
import { type TableContextValue, TableProvider } from './context'

export type TableVariants = {
	dense?: boolean
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

export type TableProps = TableVariants & {
	className?: string
	/** Forwarded to the inner `<table>` element. Use for focus management or composite-widget wiring. */
	tableRef?: Ref<HTMLTableElement>
} & Omit<ComponentPropsWithoutRef<'table'>, 'className'> & {
		[key: `data-${string}`]: string | number | boolean | undefined
	}

export function Table({
	bleed,
	dense,
	grid,
	striped,
	className,
	tableRef,
	children,
	...tableHtmlAttrs
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
				<table ref={tableRef} className={cn(k.base, className)} {...tableHtmlAttrs}>
					{children}
				</table>
			</div>
		</TableProvider>
	)
}
