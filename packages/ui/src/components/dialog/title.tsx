'use client'

import clsx from 'clsx'
import type React from 'react'
import { useDialog } from './context'

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useDialog()
	return (
		<h2
			id={titleId}
			{...props}
			className={clsx(
				className,
				'text-lg/6 font-semibold text-balance text-zinc-950 sm:text-base/6 dark:text-white',
			)}
		/>
	)
}
