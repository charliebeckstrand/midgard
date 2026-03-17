'use client'

import type React from 'react'
import { cn } from '../../core'
import { controlInput, controlWrapper } from '../../recipes/control'

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
					'relative block h-full min-h-11 w-full appearance-none rounded-lg px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:min-h-9 sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
					controlInput,
					resizable ? 'resize-y' : 'resize-none',
				)}
			/>
		</span>
	)
}
