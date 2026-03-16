'use client'

import clsx from 'clsx'
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
					className={clsx(className, '-mx-(--gutter) overflow-x-auto whitespace-nowrap')}
				>
					<div
						className={clsx('inline-block min-w-full align-middle', !bleed && 'sm:px-(--gutter)')}
					>
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
	return <thead {...props} className={clsx(className, 'text-zinc-500 dark:text-zinc-400')} />
}

export function TableBody(props: React.ComponentPropsWithoutRef<'tbody'>) {
	return <tbody {...props} />
}
