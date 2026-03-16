'use client'

import clsx from 'clsx'
import type React from 'react'
import { useSheet } from './context'

export function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useSheet()
	return (
		<h2
			id={titleId}
			{...props}
			className={clsx(
				className,
				'text-lg/6 font-semibold text-zinc-950 sm:text-base/6 dark:text-white',
			)}
		/>
	)
}
