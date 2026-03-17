'use client'

import type React from 'react'
import { cn } from '../../core'
import { controlInput, controlPadding, controlWrapper } from '../../recipes/control'

export type TextareaProps = {
	className?: string
	resizable?: boolean
	disabled?: boolean
	invalid?: boolean
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({
	className,
	resizable = true,
	disabled,
	invalid,
	...props
}: TextareaProps) {
	return (
		<span data-slot="control" className={cn(controlWrapper, className)}>
			<textarea
				disabled={disabled}
				data-invalid={invalid ? '' : undefined}
				{...props}
				className={cn(
					`relative block h-full min-h-11 w-full appearance-none rounded-lg sm:min-h-9 ${controlPadding}`,
					controlInput,
					resizable ? 'resize-y' : 'resize-none',
				)}
			/>
		</span>
	)
}
