'use client'

import type React from 'react'
import { cn } from '../../core'
import { sumi } from '../../recipes'
import { useAlert } from './context'

export function AlertDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	const { descriptionId } = useAlert()
	return (
		<p
			id={descriptionId}
			data-slot="description"
			{...props}
			className={cn(
				`mt-2 text-center text-base/6 ${sumi.usui} text-pretty sm:text-left`,
				className,
			)}
		/>
	)
}
