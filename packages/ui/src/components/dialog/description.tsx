'use client'

import type React from 'react'
import { cn } from '../../core'
import { sumi } from '../../recipes'
import { useDialog } from './context'

export function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	const { descriptionId } = useDialog()
	return (
		<p
			id={descriptionId}
			data-slot="description"
			{...props}
			className={cn(`mt-2 text-base/6 ${sumi.usui} text-pretty`, className)}
		/>
	)
}
