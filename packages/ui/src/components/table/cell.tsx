'use client'

import { useState } from 'react'
import { cn, Link } from '../../core'
import { kage, ki } from '../../recipes'
import { useTableContext, useTableRowContext } from './context'

export function TableCell({ className, children, ...props }: React.ComponentPropsWithoutRef<'td'>) {
	const { bleed, dense, grid, striped } = useTableContext()
	const { href, target, title } = useTableRowContext()
	const [cellRef, setCellRef] = useState<HTMLElement | null>(null)

	return (
		<td
			ref={href ? setCellRef : undefined}
			data-slot="cell"
			{...props}
			className={cn(
				className,
				'relative px-4 first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2))',
				dense ? 'py-2.5' : 'py-4',
				// Row borders
				!striped && `border-b ${kage.usui}`,
				// Grid lines
				grid && `border-l ${kage.usui} first:border-l-0`,
				// Bleed
				!bleed && 'sm:first:pl-1 sm:last:pr-1',
			)}
		>
			{href && (
				<Link
					data-row-link
					href={href}
					target={target}
					aria-label={title}
					tabIndex={cellRef?.previousElementSibling === null ? 0 : -1}
					className={`absolute inset-0 ${ki.reset}`}
				/>
			)}
			{children}
		</td>
	)
}
