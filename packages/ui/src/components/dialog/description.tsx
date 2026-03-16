'use client'

import clsx from 'clsx'
import type React from 'react'
import { useDialog } from './context'

export function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	const { descriptionId } = useDialog()
	return (
		<p
			id={descriptionId}
			{...props}
			className={clsx(
				className,
				'mt-2 text-base/6 text-zinc-500 text-pretty sm:text-sm/6 dark:text-zinc-400',
			)}
		/>
	)
}
