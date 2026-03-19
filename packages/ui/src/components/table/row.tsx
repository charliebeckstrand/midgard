'use client'

import { cn } from '../../core'
import { kage } from '../../recipes'
import { TableRowProvider, useTableContext } from './context'

export function TableRow({
	href,
	target,
	title,
	className,
	...props
}: { href?: string; target?: string; title?: string } & React.ComponentPropsWithoutRef<'tr'>) {
	const { striped } = useTableContext()

	return (
		<TableRowProvider value={{ href, target, title }}>
			<tr
				data-slot="row"
				{...props}
				className={cn(
					className,
					// Focus — link rows
					href &&
						'has-[[data-row-link][data-focus]]:outline-2 has-[[data-row-link][data-focus]]:-outline-offset-2 has-[[data-row-link][data-focus]]:outline-blue-600',
					href && 'dark:focus-within:bg-white/2.5',
					// Striped
					striped && 'even:bg-zinc-950/2.5',
					striped && 'dark:even:bg-white/2.5',
					// Hover — striped link rows
					href && striped && 'hover:bg-zinc-950/5',
					href && striped && 'dark:hover:bg-white/5',
					// Hover — non-striped link rows
					href && !striped && 'hover:bg-zinc-950/2.5',
					href && !striped && 'dark:hover:bg-white/2.5',
				)}
			/>
		</TableRowProvider>
	)
}

export function TableHeader({ className, ...props }: React.ComponentPropsWithoutRef<'th'>) {
	const { bleed, grid } = useTableContext()

	return (
		<th
			data-slot="header"
			{...props}
			className={cn(
				className,
				// Light
				`border-b ${kage.base} px-4 py-2 font-medium first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2))`,
				// Grid lines
				grid && `border-l ${kage.usui} first:border-l-0`,
				// Bleed
				!bleed && 'sm:first:pl-1 sm:last:pr-1',
			)}
		/>
	)
}
