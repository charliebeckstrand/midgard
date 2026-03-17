'use client'

import type React from 'react'
import { cn } from '../../core'
import { muted } from '../../recipes/text'
import { useSheet } from './context'

export function SheetDescription({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	const { descriptionId } = useSheet()
	return (
		<div
			id={descriptionId}
			data-slot="description"
			{...props}
			className={cn(`flex-1 overflow-y-auto px-6 text-base/6 ${muted}`, className)}
		/>
	)
}
