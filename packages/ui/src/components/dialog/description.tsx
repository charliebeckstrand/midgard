'use client'

import type React from 'react'
import { cn } from '../../core'
import { muted } from '../../recipes/text'
import { useDialog } from './context'

export function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	const { descriptionId } = useDialog()
	return (
		<p
			id={descriptionId}
			data-slot="description"
			{...props}
			className={cn(`mt-2 text-base/6 ${muted} text-pretty`, className)}
		/>
	)
}
