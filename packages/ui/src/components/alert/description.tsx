'use client'

import type React from 'react'
import { cn } from '../../core'
import { useAlert } from './context'

export function AlertDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	const { descriptionId } = useAlert()
	return (
		<p
			id={descriptionId}
			data-slot="description"
			{...props}
			className={cn(
				'mt-2 text-center text-base/6 text-zinc-500 text-pretty sm:text-left dark:text-zinc-400',
				className,
			)}
		/>
	)
}
