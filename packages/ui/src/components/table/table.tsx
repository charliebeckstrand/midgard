'use client'

import { type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { type TableContextValue, TableProvider } from './context'
import { k } from './variants'

export type TableVariants = {
	dense?: boolean
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

export type TableProps = TableVariants & {
	className?: string
	children?: ReactNode
}

export function Table({ bleed, dense, grid, striped, className, children }: TableProps) {
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
				<table className={cn(k.base, className)}>{children}</table>
			</div>
		</TableProvider>
	)
}
