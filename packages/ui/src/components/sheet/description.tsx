'use client'

import clsx from 'clsx'
import type React from 'react'
import { useSheet } from './context'

export function SheetDescription({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const { descriptionId } = useSheet()
	return (
		<div
			id={descriptionId}
			{...props}
			className={clsx(
				className,
				'flex-1 overflow-y-auto px-6 text-base/6 text-zinc-500  dark:text-zinc-400',
			)}
		/>
	)
}
