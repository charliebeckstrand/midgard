'use client'

import { cn } from '../../core'
import { sumi } from '../../recipes'
import { TableProvider } from './context'

export interface TableProps extends React.ComponentPropsWithoutRef<'div'> {
	bleed?: boolean
	dense?: boolean
	grid?: boolean
	striped?: boolean
}

export function Table({
	bleed = false,
	dense = false,
	grid = false,
	striped = false,
	className,
	children,
	...props
}: TableProps) {
	return (
		<TableProvider value={{ bleed, dense, grid, striped }}>
			<div className="flow-root">
				<div
					{...props}
					className={cn('-mx-(--gutter) overflow-x-auto whitespace-nowrap', className)}
				>
					<div className={cn('inline-block min-w-full align-middle', !bleed && 'sm:px-(--gutter)')}>
						<table className={`min-w-full text-left text-sm/6 ${sumi.base}`}>{children}</table>
					</div>
				</div>
			</div>
		</TableProvider>
	)
}

export function TableHead({ className, ...props }: React.ComponentPropsWithoutRef<'thead'>) {
	return <thead data-slot="head" {...props} className={cn(sumi.usui, className)} />
}

export function TableBody({ className, ...props }: React.ComponentPropsWithoutRef<'tbody'>) {
	return <tbody data-slot="body" {...props} className={className} />
}
