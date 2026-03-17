'use client'

import { cn } from '../../core'
import { TableProvider } from './context'

interface TableProps extends React.ComponentPropsWithoutRef<'div'> {
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
						<table className="min-w-full text-left text-sm/6 text-zinc-950 dark:text-white">
							{children}
						</table>
					</div>
				</div>
			</div>
		</TableProvider>
	)
}

export function TableHead({ className, ...props }: React.ComponentPropsWithoutRef<'thead'>) {
	return (
		<thead
			data-slot="head"
			{...props}
			className={cn('text-zinc-500 dark:text-zinc-400', className)}
		/>
	)
}

export function TableBody({ className, ...props }: React.ComponentPropsWithoutRef<'tbody'>) {
	return <tbody data-slot="body" {...props} className={className} />
}
