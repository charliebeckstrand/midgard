'use client'

import type React from 'react'
import { cn } from '../../core'
import { sumi } from '../../recipes'
import { useSheet } from './context'

export function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useSheet()
	return (
		<h2
			id={titleId}
			data-slot="title"
			{...props}
			className={cn(`text-lg/6 font-semibold ${sumi.base} sm:text-base/6`, className)}
		/>
	)
}
