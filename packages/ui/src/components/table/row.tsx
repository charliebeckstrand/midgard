'use client'

import clsx from 'clsx'
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
				{...props}
				className={clsx(
					className,
					href &&
						'has-[[data-row-link][data-focus]]:outline-2 has-[[data-row-link][data-focus]]:-outline-offset-2 has-[[data-row-link][data-focus]]:outline-blue-500 dark:focus-within:bg-white/2.5',
					striped && 'even:bg-zinc-950/2.5 dark:even:bg-white/2.5',
					href && striped && 'hover:bg-zinc-950/5 dark:hover:bg-white/5',
					href && !striped && 'hover:bg-zinc-950/2.5 dark:hover:bg-white/2.5',
				)}
			/>
		</TableRowProvider>
	)
}

export function TableHeader({ className, ...props }: React.ComponentPropsWithoutRef<'th'>) {
	const { bleed, grid } = useTableContext()

	return (
		<th
			{...props}
			className={clsx(
				className,
				'border-b border-b-zinc-950/10 px-4 py-2 font-medium first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2)) dark:border-b-white/10',
				grid && 'border-l border-l-zinc-950/5 first:border-l-0 dark:border-l-white/5',
				!bleed && 'sm:first:pl-1 sm:last:pr-1',
			)}
		/>
	)
}
