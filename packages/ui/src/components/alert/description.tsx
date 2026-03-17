'use client'

import type React from 'react'
import { cn } from '../../core'
import { muted } from '../../recipes/text'
import { useAlert } from './context'

export function AlertDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	const { descriptionId } = useAlert()
	return (
		<p
			id={descriptionId}
			data-slot="description"
			{...props}
			className={cn(`mt-2 text-center text-base/6 ${muted} text-pretty sm:text-left`, className)}
		/>
	)
}
